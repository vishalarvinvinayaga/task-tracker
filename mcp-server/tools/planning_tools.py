import datetime as dt

from sqlalchemy import select

from app.models import ActivityLog, Sprint, SprintGoal, Task, TimeLog
from app_instance import mcp
from tools._common import jsonable, session, sprint_dict, task_dict


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
        "days_remaining": (sprint.end_date - dt.date.today()).days,
    }


@mcp.tool()
def get_today_plan() -> dict:
    """Get today's plan: active sprint summary, today's tasks (due today or in progress),
    current punch-in status, today's hours worked, and inbox item count. This is the
    main 'plan my day' tool."""
    with session() as db:
        sprint = db.execute(select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")).scalar_one_or_none()
        today = dt.date.today()
        today_tasks = []
        if sprint:
            tasks = db.execute(select(Task).where(Task.sprint_id == sprint.id)).scalars().all()
            today_tasks = [task_dict(t) for t in tasks if t.due_date == today or t.status == "in_progress"]

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
        sprint = db.get(Sprint, sprint_id) if sprint_id else db.execute(select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")).scalar_one_or_none()
        if not sprint:
            return {"error": "No sprint found"}
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

        sprint = db.execute(select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")).scalar_one_or_none()
        today_planned = []
        blocked = []
        if sprint:
            tasks = db.execute(select(Task).where(Task.sprint_id == sprint.id)).scalars().all()
            today_planned = [task_dict(t) for t in tasks if t.status == "in_progress" or t.due_date == now.date()]
            cutoff = now - dt.timedelta(days=2)
            blocked = [
                task_dict(t)
                for t in tasks
                if t.priority in ("high", "urgent") and t.status != "done" and t.updated_at < cutoff
            ]

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
