from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import Sprint, SprintGoal, SprintRetro, Task
from app.schemas import (
    SprintCloseRequest,
    SprintCreate,
    SprintGoalCreate,
    SprintGoalRead,
    SprintGoalUpdate,
    SprintRead,
    SprintRetroRead,
    SprintRetroUpsert,
    SprintUpdate,
    SprintWithStats,
)

router = APIRouter(prefix="/api/sprints", tags=["sprints"])


def _with_stats(db: Session, sprint: Sprint) -> SprintWithStats:
    task_count = db.execute(select(func.count()).select_from(Task).where(Task.sprint_id == sprint.id)).scalar_one()
    done_count = db.execute(
        select(func.count()).select_from(Task).where(Task.sprint_id == sprint.id, Task.status == "done")
    ).scalar_one()
    goals = db.execute(select(SprintGoal).where(SprintGoal.sprint_id == sprint.id)).scalars().all()
    return SprintWithStats(
        **SprintRead.model_validate(sprint).model_dump(),
        task_count=task_count,
        done_count=done_count,
        goals=[SprintGoalRead.model_validate(g) for g in goals],
    )


@router.get("", response_model=list[SprintWithStats])
def list_sprints(db: Session = Depends(get_db)):
    sprints = db.execute(select(Sprint).order_by(Sprint.start_date.desc())).scalars().all()
    return [_with_stats(db, s) for s in sprints]


@router.get("/{sprint_id}", response_model=SprintWithStats)
def get_sprint(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.get(Sprint, sprint_id)
    if not sprint:
        raise HTTPException(404, "Sprint not found")
    return _with_stats(db, sprint)


@router.post("", response_model=SprintRead, status_code=201)
def create_sprint(payload: SprintCreate, db: Session = Depends(get_db)):
    if payload.status == "active":
        existing = db.execute(select(Sprint).where(Sprint.status == "active")).scalar_one_or_none()
        if existing:
            raise HTTPException(409, f"Sprint '{existing.name}' (id={existing.id}) is already active")
    sprint = Sprint(**payload.model_dump())
    db.add(sprint)
    db.flush()
    log_activity(db, "sprint", sprint.id, "created", {"name": sprint.name})
    db.commit()
    db.refresh(sprint)
    return sprint


@router.put("/{sprint_id}", response_model=SprintRead)
def update_sprint(sprint_id: int, payload: SprintUpdate, db: Session = Depends(get_db)):
    sprint = db.get(Sprint, sprint_id)
    if not sprint:
        raise HTTPException(404, "Sprint not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("status") == "active" and sprint.status != "active":
        existing = db.execute(
            select(Sprint).where(Sprint.status == "active", Sprint.id != sprint_id)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(409, f"Sprint '{existing.name}' (id={existing.id}) is already active. Close it first.")

    old_status = sprint.status
    for key, value in data.items():
        setattr(sprint, key, value)
    db.flush()
    if "status" in data and data["status"] != old_status:
        log_activity(db, "sprint", sprint.id, "status_changed", {"from": old_status, "to": data["status"]})
    else:
        log_activity(db, "sprint", sprint.id, "updated", data)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.delete("/{sprint_id}", status_code=204)
def delete_sprint(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.get(Sprint, sprint_id)
    if not sprint:
        raise HTTPException(404, "Sprint not found")
    db.delete(sprint)
    db.commit()


@router.post("/{sprint_id}/close", response_model=SprintRead)
def close_sprint(sprint_id: int, payload: SprintCloseRequest, db: Session = Depends(get_db)):
    sprint = db.get(Sprint, sprint_id)
    if not sprint:
        raise HTTPException(404, "Sprint not found")
    next_sprint = db.get(Sprint, payload.next_sprint_id)
    if not next_sprint:
        raise HTTPException(404, "Target sprint not found")

    for task_id in payload.carry_task_ids:
        task = db.get(Task, task_id)
        if not task or task.sprint_id != sprint_id:
            continue
        carried = Task(
            sprint_id=next_sprint.id,
            title=task.title,
            description_md=task.description_md,
            status="todo",
            priority=task.priority,
            task_type=task.task_type,
            ticket_id=task.ticket_id,
            ticket_url=task.ticket_url,
            estimated_hours=task.estimated_hours,
            due_date=task.due_date,
            carried_from_task_id=task.id,
            tags=list(task.tags),
        )
        db.add(carried)
        db.flush()
        log_activity(db, "task", carried.id, "carried_over", {"from_task_id": task.id, "from_sprint_id": sprint_id})

    sprint.status = "closed"
    db.flush()
    log_activity(db, "sprint", sprint.id, "closed", {"carried_count": len(payload.carry_task_ids)})
    db.commit()
    db.refresh(sprint)
    return sprint


@router.get("/{sprint_id}/goals", response_model=list[SprintGoalRead])
def list_goals(sprint_id: int, db: Session = Depends(get_db)):
    return db.execute(select(SprintGoal).where(SprintGoal.sprint_id == sprint_id)).scalars().all()


@router.post("/{sprint_id}/goals", response_model=SprintGoalRead, status_code=201)
def create_goal(sprint_id: int, payload: SprintGoalCreate, db: Session = Depends(get_db)):
    if not db.get(Sprint, sprint_id):
        raise HTTPException(404, "Sprint not found")
    goal = SprintGoal(sprint_id=sprint_id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{sprint_id}/goals/{goal_id}", response_model=SprintGoalRead)
def update_goal(sprint_id: int, goal_id: int, payload: SprintGoalUpdate, db: Session = Depends(get_db)):
    goal = db.get(SprintGoal, goal_id)
    if not goal or goal.sprint_id != sprint_id:
        raise HTTPException(404, "Goal not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{sprint_id}/goals/{goal_id}", status_code=204)
def delete_goal(sprint_id: int, goal_id: int, db: Session = Depends(get_db)):
    goal = db.get(SprintGoal, goal_id)
    if not goal or goal.sprint_id != sprint_id:
        raise HTTPException(404, "Goal not found")
    db.delete(goal)
    db.commit()


@router.get("/{sprint_id}/retro", response_model=SprintRetroRead | None)
def get_retro(sprint_id: int, db: Session = Depends(get_db)):
    return db.execute(select(SprintRetro).where(SprintRetro.sprint_id == sprint_id)).scalar_one_or_none()


@router.put("/{sprint_id}/retro", response_model=SprintRetroRead)
def upsert_retro(sprint_id: int, payload: SprintRetroUpsert, db: Session = Depends(get_db)):
    if not db.get(Sprint, sprint_id):
        raise HTTPException(404, "Sprint not found")
    retro = db.execute(select(SprintRetro).where(SprintRetro.sprint_id == sprint_id)).scalar_one_or_none()
    if not retro:
        retro = SprintRetro(sprint_id=sprint_id, **payload.model_dump())
        db.add(retro)
    else:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(retro, key, value)
    db.commit()
    db.refresh(retro)
    return retro
