import datetime as dt

from sqlalchemy import select

from app.models import ActivityLog, Sprint, SprintGoal, Task, TimeLog
from app_instance import mcp
from tools._common import jsonable, session, sprint_dict, task_dict


def _active_sprint(db) -> Sprint | None:
    """The running time-boxed sprint, if the user works in cycles at all."""
    return db.execute(
        select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")
    ).scalar_one_or_none()


def _sprint_stats(db, sprint: Sprint) -> dict:
    tasks = db.execute(select(Task).where(Task.sprint_id == sprint.id)).scalars().all()
    done = [t for t in tasks if t.status == "done"]
    goals = db.execute(select(SprintGoal).where(SprintGoal.sprint_id == sprint.id)).scalars().all()
    return {
        **sprint_dict(sprint),
        "task_count": len(tasks),
        "done_count": len(done),
        "estimated_hours": sum(float(t.estimated_hours or 0) for t in tasks),
        "actual_hours": sum(float(t.actual_hours or 0) for t in tasks),
        "goals": [{"title": g.title, "progress_pct": g.progress_pct} for g in goals],
        # Lists aren't time-boxed, so there's no countdown to report.
        "days_remaining": (sprint.end_date - dt.date.today()).days if sprint.end_date else None,
    }


def _with_container(db, tasks: list[Task]) -> list[dict]:
    """Task payloads annotated with the container they came from.

    Planning spans every container, so 'which list is this from?' stops being
    obvious and has to be stated.
    """
    names = {s.id: s.name for s in db.execute(select(Sprint)).scalars().all()}
    return [{**task_dict(t), "container": names.get(t.sprint_id)} for t in tasks]


def _actionable_today(db, today: dt.date) -> list[Task]:
    """
    Everything worth looking at today, across sprints *and* lists.

    Previously this only searched the active sprint, so anyone planning with
    plain lists got an empty plan.
    """
    tasks = db.execute(
        select(Task).where(Task.status != "done").order_by(Task.sort_order, Task.created_at)
    ).scalars().all()
    return [t for t in tasks if t.status == "in_progress" or (t.due_date and t.due_date <= today)]


@mcp.tool()
def get_today_plan() -> dict:
    """Get today's plan: active sprint summary, today's tasks (due today or in progress),
    current punch-in status, today's hours worked, and inbox item count. This is the
    main 'plan my day' tool."""
    from app.models import DailyPlan
    from app.routers.plans import build_suggestions, close_stale_plans

    with session() as db:
        close_stale_plans(db)
        sprint = _active_sprint(db)
        today = dt.date.today()
        # Spans every container — a sprint is optional, not a prerequisite.
        today_tasks = _with_container(db, _actionable_today(db, today))

        # A committed plan is the source of truth for the day; the computed
        # list above is only what's *available* to plan from.
        plan = db.execute(select(DailyPlan).where(DailyPlan.plan_date == today)).scalar_one_or_none()
        committed = None
        if plan:
            committed = {
                "focus": plan.focus,
                "items": [
                    {
                        "task_id": i.task_id,
                        "title": i.task.title,
                        "status": i.task.status,
                        "pinned": i.pinned,
                        "source": i.source,
                    }
                    for i in plan.items
                ],
            }
        suggestions = [
            {"task_id": s.task.id, "title": s.task.title, "reason": s.reason, "slip_count": s.slip_count}
            for s in build_suggestions(db, {i.task_id for i in plan.items} if plan else None)
        ]

        open_session = db.execute(
            select(TimeLog).where(TimeLog.log_type == "punch_in", TimeLog.end_time.is_(None))
        ).scalar_one_or_none()
        punched_in = open_session is not None

        day_start = dt.datetime.combine(today, dt.time.min)
        day_end = dt.datetime.combine(today, dt.time.max)
        completed_today = db.execute(
            select(TimeLog).where(TimeLog.log_type == "punch_in", TimeLog.start_time.between(day_start, day_end), TimeLog.end_time.is_not(None))
        ).scalars().all()
        hours_today = sum(float(t.duration_hours or 0) for t in completed_today)
        if open_session:
            hours_today += (dt.datetime.now() - open_session.start_time).total_seconds() / 3600

        from app.models import InboxItem

        inbox_count = db.execute(select(InboxItem).where(InboxItem.resolved_to.is_(None))).scalars().all()

        return jsonable({
            "active_sprint": _sprint_stats(db, sprint) if sprint else None,
            # The plan actually committed for today, or null if not planned yet.
            "committed_plan": committed,
            # Worth planning but not yet committed — offer these, don't assume.
            "suggestions": suggestions,
            "today_tasks": today_tasks,
            "punched_in": punched_in,
            "hours_worked_today": round(hours_today, 2),
            "inbox_count": len(inbox_count),
        })


@mcp.tool()
def get_sprint_summary(sprint_id: int | None = None) -> dict:
    """Get a summary of a sprint (defaults to the active sprint): name, dates, goals with
    progress, task counts by status, estimated vs actual hours, and days remaining."""
    with session() as db:
        sprint = db.get(Sprint, sprint_id) if sprint_id else _active_sprint(db)
        if not sprint:
            return {
                "error": "No active sprint.",
                "hint": "Tasks may still be in lists — use get_today_plan, which covers every container.",
            }
        tasks = db.execute(select(Task).where(Task.sprint_id == sprint.id)).scalars().all()
        by_status: dict[str, int] = {}
        for t in tasks:
            by_status[t.status] = by_status.get(t.status, 0) + 1
        return {**_sprint_stats(db, sprint), "tasks_by_status": by_status}


@mcp.tool()
def get_standup() -> dict:
    """Generate standup material: yesterday's completed tasks and key activity, today's
    planned tasks, and any tasks that look blocked (high/urgent priority with no update
    in 2+ days)."""
    with session() as db:
        now = dt.datetime.now()
        yesterday_start = dt.datetime.combine(now.date() - dt.timedelta(days=1), dt.time.min)
        yesterday_end = dt.datetime.combine(now.date() - dt.timedelta(days=1), dt.time.max)

        yesterday_activity = db.execute(
            select(ActivityLog).where(ActivityLog.created_at.between(yesterday_start, yesterday_end)).order_by(ActivityLog.created_at)
        ).scalars().all()
        completed_yesterday = db.execute(
            select(Task).where(Task.status == "done", Task.updated_at.between(yesterday_start, yesterday_end))
        ).scalars().all()

        # Standup covers everything in flight, not just the current sprint.
        today_planned = _with_container(db, _actionable_today(db, now.date()))

        cutoff = now - dt.timedelta(days=2)
        stalled = db.execute(
            select(Task).where(
                Task.status != "done",
                Task.priority.in_(("high", "urgent")),
                Task.updated_at < cutoff,
            )
        ).scalars().all()
        blocked = _with_container(db, stalled)

        return jsonable({
            "yesterday_completed": [task_dict(t) for t in completed_yesterday],
            "yesterday_activity": [
                {"entity_type": a.entity_type, "action": a.action, "detail": a.detail_json} for a in yesterday_activity
            ],
            "today_planned": today_planned,
            "blocked": blocked,
        })


@mcp.tool()
def get_weekly_summary(week_offset: int = 0) -> dict:
    """Get a weekly summary: tasks completed, hours logged, time breakdown by tag, and
    carried-over task count. week_offset=0 is this week, -1 is last week, etc."""
    with session() as db:
        today = dt.date.today()
        week_start_date = today - dt.timedelta(days=(today.weekday() + 1) % 7) + dt.timedelta(weeks=week_offset)
        week_end_date = week_start_date + dt.timedelta(days=6)
        week_start = dt.datetime.combine(week_start_date, dt.time.min)
        week_end = dt.datetime.combine(week_end_date, dt.time.max)

        completed = db.execute(
            select(Task).where(Task.status == "done", Task.updated_at.between(week_start, week_end))
        ).scalars().all()
        carried = db.execute(
            select(Task).where(Task.carried_from_task_id.is_not(None), Task.created_at.between(week_start, week_end))
        ).scalars().all()
        time_entries = db.execute(
            select(TimeLog).where(TimeLog.log_type == "task_time", TimeLog.start_time.between(week_start, week_end))
        ).scalars().all()

        breakdown: dict[str, float] = {}
        for entry in time_entries:
            task = db.get(Task, entry.task_id) if entry.task_id else None
            tags = task.tags if task else []
            if not tags:
                breakdown["Untagged"] = breakdown.get("Untagged", 0) + float(entry.duration_hours or 0)
                continue
            share = float(entry.duration_hours or 0) / len(tags)
            for tag in tags:
                breakdown[tag.name] = breakdown.get(tag.name, 0) + share

        return jsonable({
            "week_start": week_start_date,
            "week_end": week_end_date,
            "tasks_completed": len(completed),
            "hours_logged": round(sum(float(e.duration_hours or 0) for e in time_entries), 2),
            "time_breakdown": {k: round(v, 2) for k, v in breakdown.items()},
            "carried_tasks": len(carried),
        })


@mcp.tool()
def commit_daily_plan(
    task_ids: list[int],
    focus: str | None = None,
    replace_unpinned: bool = True,
) -> dict:
    """Write today's actual plan — the tasks committed to for today.

    Use this instead of saving a plan as a note: a plan is a commitment that
    gets tracked, so unfinished items are flagged as slipped when the day ends.

    Items the user pinned (kept deliberately) are never removed. By default
    re-planning replaces only the unpinned items, so calling this again to
    refine the day preserves the user's own choices. Pass replace_unpinned=False
    to add to the plan without removing anything.

    Call get_today_plan first to see what's already planned and what's suggested.
    """
    from app.models import DailyPlan, DailyPlanItem
    from app.routers.plans import build_suggestions, close_stale_plans

    with session() as db:
        close_stale_plans(db)
        today = dt.date.today()
        plan = db.execute(select(DailyPlan).where(DailyPlan.plan_date == today)).scalar_one_or_none()

        if plan is None:
            plan = DailyPlan(plan_date=today, focus=focus)
            db.add(plan)
            db.flush()
        elif focus is not None:
            plan.focus = focus

        if replace_unpinned:
            for item in list(plan.items):
                if not item.pinned:
                    db.delete(item)
            db.flush()

        kept = {i.task_id for i in plan.items if i.pinned}
        # Guard against every duplicate route: tasks already on the plan
        # (pinned or not, when replace_unpinned is False) and repeats within
        # the incoming list itself. (plan_id, task_id) is UNIQUE.
        present = {i.task_id for i in plan.items}
        order = max((i.sort_order for i in plan.items), default=-1) + 1
        added = []
        for task_id in task_ids:
            if task_id in present or not db.get(Task, task_id):
                continue
            db.add(DailyPlanItem(plan_id=plan.id, task_id=task_id, source="claude", sort_order=order))
            present.add(task_id)
            added.append(task_id)
            order += 1

        db.commit()
        db.refresh(plan)

        return jsonable({
            "plan_date": plan.plan_date,
            "focus": plan.focus,
            "committed": [
                {"task_id": i.task_id, "title": i.task.title, "pinned": i.pinned, "source": i.source}
                for i in plan.items
            ],
            "added": added,
            "kept_pinned": sorted(kept),
            "still_suggested": [
                {"task_id": s.task.id, "title": s.task.title, "reason": s.reason}
                for s in build_suggestions(db, {i.task_id for i in plan.items})
            ],
        })
