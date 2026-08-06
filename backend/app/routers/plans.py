import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import DailyPlan, DailyPlanItem, Sprint, Task
from app.schemas import (
    DailyPlanCreate,
    DailyPlanRead,
    DailyPlanUpdate,
    PlanItemAdd,
    PlanItemRead,
    PlanItemUpdate,
    PlanSuggestion,
    TaskRead,
    TodayPlanResponse,
)

router = APIRouter(prefix="/api/plans", tags=["plans"])

# A task planned this many days without finishing is no longer a slip, it's a
# signal — the UI escalates the badge past this point.
CHRONIC_SLIP_THRESHOLD = 3


def close_stale_plans(db: Session) -> int:
    """
    Resolve any plan whose day has passed.

    Runs lazily on access rather than on a midnight timer: a local app isn't
    running at midnight, so a scheduled job would simply be missed. Every plan
    endpoint calls this first, which makes it self-healing after the app has
    been closed for days.
    """
    today = dt.date.today()
    stale = db.execute(
        select(DailyPlan).where(DailyPlan.plan_date < today, DailyPlan.closed_at.is_(None))
    ).scalars().all()

    for plan in stale:
        for item in plan.items:
            if item.outcome != "planned":
                continue  # already resolved by hand
            item.outcome = "done" if item.task and item.task.status == "done" else "slipped"
        plan.closed_at = dt.datetime.now()
        slipped = sum(1 for i in plan.items if i.outcome == "slipped")
        log_activity(
            db, "plan", plan.id, "closed",
            {"date": plan.plan_date.isoformat(), "slipped": slipped, "total": len(plan.items)},
        )

    if stale:
        db.commit()
    return len(stale)


def _slip_counts(db: Session, task_ids: list[int]) -> dict[int, int]:
    """How many closed plans each task slipped off. Derived, never stored."""
    if not task_ids:
        return {}
    rows = db.execute(
        select(DailyPlanItem.task_id, func.count())
        .where(DailyPlanItem.task_id.in_(task_ids), DailyPlanItem.outcome == "slipped")
        .group_by(DailyPlanItem.task_id)
    ).all()
    return {task_id: count for task_id, count in rows}


def _container_names(db: Session) -> dict[int, str]:
    return {s.id: s.name for s in db.execute(select(Sprint)).scalars().all()}


def _serialise(db: Session, plan: DailyPlan) -> DailyPlanRead:
    names = _container_names(db)
    slips = _slip_counts(db, [i.task_id for i in plan.items])
    return DailyPlanRead(
        id=plan.id,
        plan_date=plan.plan_date,
        focus=plan.focus,
        closed_at=plan.closed_at,
        created_at=plan.created_at,
        items=[
            PlanItemRead(
                id=i.id,
                task_id=i.task_id,
                outcome=i.outcome,
                pinned=i.pinned,
                source=i.source,
                sort_order=i.sort_order,
                carried_from_plan_id=i.carried_from_plan_id,
                task=TaskRead.model_validate(i.task),
                container_name=names.get(i.task.sprint_id),
                # Exclude this plan's own slip so today's badge reflects history.
                slip_count=max(slips.get(i.task_id, 0) - (1 if i.outcome == "slipped" else 0), 0),
            )
            for i in plan.items
        ],
    )


def build_suggestions(db: Session, exclude_task_ids: set[int] | None = None) -> list[PlanSuggestion]:
    """
    What's worth considering today, most-urgent signal first.

    Ordered so previously-slipped work leads: if you keep failing to do
    something, that deserves a decision before anything new gets added.
    """
    exclude = exclude_task_ids or set()
    today = dt.date.today()
    names = _container_names(db)

    open_tasks = db.execute(
        select(Task).where(Task.status != "done").order_by(Task.sort_order, Task.created_at)
    ).scalars().all()
    slips = _slip_counts(db, [t.id for t in open_tasks])

    suggestions: list[PlanSuggestion] = []
    for task in open_tasks:
        if task.id in exclude:
            continue
        if slips.get(task.id):
            reason = "slipped"
        elif task.status == "in_progress":
            reason = "in_progress"
        elif task.due_date and task.due_date < today:
            reason = "overdue"
        elif task.due_date and task.due_date == today:
            reason = "due"
        else:
            continue
        suggestions.append(
            PlanSuggestion(
                task=TaskRead.model_validate(task),
                container_name=names.get(task.sprint_id),
                reason=reason,
                slip_count=slips.get(task.id, 0),
            )
        )

    rank = {"slipped": 0, "overdue": 1, "in_progress": 2, "due": 3}
    suggestions.sort(key=lambda s: (rank[s.reason], -s.slip_count))
    return suggestions


def get_or_none(db: Session, plan_date: dt.date) -> DailyPlan | None:
    return db.execute(select(DailyPlan).where(DailyPlan.plan_date == plan_date)).scalar_one_or_none()


@router.get("/today", response_model=TodayPlanResponse)
def today(db: Session = Depends(get_db)):
    """
    Today's plan, or the suggestions to build one from.

    `plan` stays null until the day is explicitly committed — a plan should be
    a decision, not something that appears just because you opened the page.
    """
    close_stale_plans(db)
    plan = get_or_none(db, dt.date.today())
    if plan:
        planned_ids = {i.task_id for i in plan.items}
        return TodayPlanResponse(plan=_serialise(db, plan), suggestions=build_suggestions(db, planned_ids))
    return TodayPlanResponse(plan=None, suggestions=build_suggestions(db))


@router.post("/today", response_model=DailyPlanRead, status_code=201)
def commit_today(payload: DailyPlanCreate, db: Session = Depends(get_db)):
    close_stale_plans(db)
    today_date = dt.date.today()
    if get_or_none(db, today_date):
        raise HTTPException(409, "Today's plan already exists — add or remove items instead.")

    plan = DailyPlan(plan_date=today_date, focus=payload.focus)
    db.add(plan)
    db.flush()
    _attach(db, plan, payload.task_ids, pinned=True, source=payload.source)

    db.flush()
    log_activity(db, "plan", plan.id, "created", {"date": today_date.isoformat(), "items": len(payload.task_ids)})
    db.commit()
    db.refresh(plan)
    return _serialise(db, plan)


def _attach(db: Session, plan: DailyPlan, task_ids: list[int], *, pinned: bool, source: str) -> list[DailyPlanItem]:
    """Add tasks to a plan, skipping unknown ids and ones already present."""
    # (plan_id, task_id) is UNIQUE, so guard against tasks already on the plan
    # *and* repeats within the incoming list.
    existing = {i.task_id for i in plan.items}
    order = max((i.sort_order for i in plan.items), default=-1) + 1
    added = []
    for task_id in task_ids:
        if task_id in existing or not db.get(Task, task_id):
            continue
        item = DailyPlanItem(
            plan_id=plan.id, task_id=task_id, pinned=pinned, source=source, sort_order=order
        )
        db.add(item)
        existing.add(task_id)
        added.append(item)
        order += 1
    return added


@router.get("", response_model=list[DailyPlanRead])
def history(limit: int = 30, db: Session = Depends(get_db)):
    close_stale_plans(db)
    plans = db.execute(
        select(DailyPlan).order_by(DailyPlan.plan_date.desc()).limit(limit)
    ).scalars().all()
    return [_serialise(db, p) for p in plans]


@router.get("/{plan_id}", response_model=DailyPlanRead)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    close_stale_plans(db)
    plan = db.get(DailyPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    return _serialise(db, plan)


@router.put("/{plan_id}", response_model=DailyPlanRead)
def update_plan(plan_id: int, payload: DailyPlanUpdate, db: Session = Depends(get_db)):
    plan = db.get(DailyPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)
    db.commit()
    db.refresh(plan)
    return _serialise(db, plan)


@router.post("/{plan_id}/items", response_model=DailyPlanRead, status_code=201)
def add_item(plan_id: int, payload: PlanItemAdd, db: Session = Depends(get_db)):
    plan = db.get(DailyPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    if plan.closed_at:
        raise HTTPException(400, "That day is closed — its plan is a historical record.")
    if not db.get(Task, payload.task_id):
        raise HTTPException(404, "Task not found")

    _attach(db, plan, [payload.task_id], pinned=payload.pinned, source=payload.source)
    db.commit()
    db.refresh(plan)
    return _serialise(db, plan)


@router.patch("/{plan_id}/items/{item_id}", response_model=DailyPlanRead)
def update_item(plan_id: int, item_id: int, payload: PlanItemUpdate, db: Session = Depends(get_db)):
    item = db.get(DailyPlanItem, item_id)
    if not item or item.plan_id != plan_id:
        raise HTTPException(404, "Plan item not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    plan = db.get(DailyPlan, plan_id)
    return _serialise(db, plan)


@router.delete("/{plan_id}/items/{item_id}", response_model=DailyPlanRead)
def remove_item(plan_id: int, item_id: int, db: Session = Depends(get_db)):
    plan = db.get(DailyPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    if plan.closed_at:
        raise HTTPException(400, "That day is closed — its plan is a historical record.")
    item = db.get(DailyPlanItem, item_id)
    if not item or item.plan_id != plan_id:
        raise HTTPException(404, "Plan item not found")
    db.delete(item)
    db.commit()
    db.refresh(plan)
    return _serialise(db, plan)
