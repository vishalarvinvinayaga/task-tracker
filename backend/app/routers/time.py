import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import Task, TimeLog
from app.schemas import PunchRequest, TaskTimeCreate, TimeBreakdownEntry, TimeLogRead, TimeStatus

router = APIRouter(prefix="/api/time", tags=["time"])


def _open_session(db: Session) -> TimeLog | None:
    return db.execute(
        select(TimeLog).where(TimeLog.log_type == "punch_in", TimeLog.end_time.is_(None))
    ).scalar_one_or_none()


def _today_bounds() -> tuple[dt.datetime, dt.datetime]:
    today = dt.datetime.now().date()
    start = dt.datetime.combine(today, dt.time.min)
    end = dt.datetime.combine(today, dt.time.max)
    return start, end


@router.get("", response_model=list[TimeLogRead])
def list_logs(task_id: int | None = None, log_type: str | None = None, db: Session = Depends(get_db)):
    stmt = select(TimeLog)
    if task_id is not None:
        stmt = stmt.where(TimeLog.task_id == task_id)
    if log_type is not None:
        stmt = stmt.where(TimeLog.log_type == log_type)
    stmt = stmt.order_by(TimeLog.start_time.desc())
    return db.execute(stmt).scalars().all()


@router.get("/status", response_model=TimeStatus)
def get_status(db: Session = Depends(get_db)):
    session = _open_session(db)
    start, end = _today_bounds()
    completed_today = db.execute(
        select(TimeLog).where(TimeLog.log_type == "punch_in", TimeLog.start_time.between(start, end), TimeLog.end_time.is_not(None))
    ).scalars().all()
    total = sum(float(t.duration_hours or 0) for t in completed_today)

    if session:
        elapsed = (dt.datetime.now() - session.start_time).total_seconds() / 3600
        total += elapsed
        return TimeStatus(punched_in=True, session_start=session.start_time, session_duration_hours=round(elapsed, 2), today_total_hours=round(total, 2))
    return TimeStatus(punched_in=False, today_total_hours=round(total, 2))


@router.post("/punch/in", response_model=TimeLogRead, status_code=201)
def punch_in(payload: PunchRequest, db: Session = Depends(get_db)):
    if _open_session(db):
        raise HTTPException(409, "Already punched in")
    entry = TimeLog(log_type="punch_in", start_time=dt.datetime.now(), notes=payload.notes)
    db.add(entry)
    db.flush()
    log_activity(db, "time", entry.id, "punch_in", {"notes": payload.notes})
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/punch/out", response_model=TimeLogRead)
def punch_out(payload: PunchRequest, db: Session = Depends(get_db)):
    session = _open_session(db)
    if not session:
        raise HTTPException(400, "Not currently punched in")
    session.end_time = dt.datetime.now()
    session.duration_hours = round((session.end_time - session.start_time).total_seconds() / 3600, 2)
    if payload.notes:
        session.notes = payload.notes
    db.flush()
    log_activity(db, "time", session.id, "punch_out", {"duration_hours": float(session.duration_hours)})
    db.commit()
    db.refresh(session)
    return session


@router.post("/task", response_model=TimeLogRead, status_code=201)
def log_task_time(payload: TaskTimeCreate, db: Session = Depends(get_db)):
    task = db.get(Task, payload.task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    end = dt.datetime.now()
    start = end - dt.timedelta(hours=payload.duration_hours)
    entry = TimeLog(
        task_id=payload.task_id,
        log_type="task_time",
        start_time=start,
        end_time=end,
        duration_hours=payload.duration_hours,
        notes=payload.notes,
    )
    db.add(entry)

    total = db.execute(
        select(TimeLog).where(TimeLog.task_id == payload.task_id, TimeLog.log_type == "task_time")
    ).scalars().all()
    task.actual_hours = sum(float(t.duration_hours or 0) for t in total) + payload.duration_hours

    db.flush()
    log_activity(db, "time", entry.id, "task_time_logged", {"task_id": payload.task_id, "duration_hours": payload.duration_hours})
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/breakdown", response_model=list[TimeBreakdownEntry])
def breakdown(period: str = "week", db: Session = Depends(get_db)):
    now = dt.datetime.now()
    if period == "day":
        start = dt.datetime.combine(now.date(), dt.time.min)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now - dt.timedelta(days=7)

    entries = db.execute(
        select(TimeLog).where(TimeLog.log_type == "task_time", TimeLog.start_time >= start)
    ).scalars().all()

    totals: dict[str, float] = {}
    colors: dict[str, str] = {}
    for entry in entries:
        task = db.get(Task, entry.task_id) if entry.task_id else None
        tags = task.tags if task else []
        if not tags:
            totals["Untagged"] = totals.get("Untagged", 0) + float(entry.duration_hours or 0)
            colors["Untagged"] = "#6B7280"
            continue
        share = float(entry.duration_hours or 0) / len(tags)
        for tag in tags:
            totals[tag.name] = totals.get(tag.name, 0) + share
            colors[tag.name] = tag.color

    return [TimeBreakdownEntry(tag_name=name, color=colors[name], hours=round(hours, 2)) for name, hours in totals.items()]
