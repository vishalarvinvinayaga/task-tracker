import datetime as dt

from sqlalchemy import select

from app.activity import log_activity
from app.models import Task, TimeLog
from app_instance import mcp
from tools._common import jsonable, session


def _open_session(db):
    return db.execute(select(TimeLog).where(TimeLog.log_type == "punch_in", TimeLog.end_time.is_(None))).scalar_one_or_none()


@mcp.tool()
def punch_in(notes: str | None = None) -> dict:
    """Punch in (start the work clock)."""
    with session() as db:
        if _open_session(db):
            return {"error": "Already punched in"}
        entry = TimeLog(log_type="punch_in", start_time=dt.datetime.now(), notes=notes)
        db.add(entry)
        db.flush()
        log_activity(db, "time", entry.id, "punch_in", {"notes": notes})
        return jsonable({"id": entry.id, "start_time": entry.start_time})


@mcp.tool()
def punch_out(notes: str | None = None) -> dict:
    """Punch out (close the current open punch_in entry, computing session duration)."""
    with session() as db:
        entry = _open_session(db)
        if not entry:
            return {"error": "Not currently punched in"}
        entry.end_time = dt.datetime.now()
        entry.duration_hours = round((entry.end_time - entry.start_time).total_seconds() / 3600, 2)
        if notes:
            entry.notes = notes
        db.flush()
        log_activity(db, "time", entry.id, "punch_out", {"duration_hours": float(entry.duration_hours)})
        return jsonable({"id": entry.id, "duration_hours": entry.duration_hours})


@mcp.tool()
def get_time_status() -> dict:
    """Check whether currently punched in, current session duration, and today's total hours worked."""
    with session() as db:
        entry = _open_session(db)
        today = dt.date.today()
        day_start = dt.datetime.combine(today, dt.time.min)
        day_end = dt.datetime.combine(today, dt.time.max)
        completed = db.execute(
            select(TimeLog).where(TimeLog.log_type == "punch_in", TimeLog.start_time.between(day_start, day_end), TimeLog.end_time.is_not(None))
        ).scalars().all()
        total = sum(float(t.duration_hours or 0) for t in completed)
        if entry:
            total += (dt.datetime.now() - entry.start_time).total_seconds() / 3600
            return jsonable({"punched_in": True, "session_start": entry.start_time, "today_total_hours": round(total, 2)})
        return jsonable({"punched_in": False, "today_total_hours": round(total, 2)})


@mcp.tool()
def log_task_time(task_id: int, duration_hours: float, notes: str | None = None) -> dict:
    """Log a chunk of time spent on a specific task (adds to its actual_hours)."""
    with session() as db:
        task = db.get(Task, task_id)
        if not task:
            return {"error": f"Task {task_id} not found"}
        end = dt.datetime.now()
        start = end - dt.timedelta(hours=duration_hours)
        entry = TimeLog(task_id=task_id, log_type="task_time", start_time=start, end_time=end, duration_hours=duration_hours, notes=notes)
        db.add(entry)

        prior = db.execute(select(TimeLog).where(TimeLog.task_id == task_id, TimeLog.log_type == "task_time")).scalars().all()
        task.actual_hours = sum(float(t.duration_hours or 0) for t in prior) + duration_hours

        db.flush()
        log_activity(db, "time", entry.id, "task_time_logged", {"task_id": task_id, "duration_hours": duration_hours})
        return jsonable({"id": entry.id, "task_id": task_id, "duration_hours": duration_hours, "task_actual_hours": float(task.actual_hours)})
