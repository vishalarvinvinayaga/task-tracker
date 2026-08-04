import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, TimeLog

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/trends")
def get_trends(days: int = 14, db: Session = Depends(get_db)):
    """Daily trend series for the last N days: tasks completed per day and hours logged per day."""
    today = dt.date.today()
    start_date = today - dt.timedelta(days=days - 1)
    start_dt = dt.datetime.combine(start_date, dt.time.min)

    completed_rows = db.execute(
        select(func.date(Task.updated_at).label("day"), func.count().label("n"))
        .where(Task.status == "done", Task.updated_at >= start_dt)
        .group_by(func.date(Task.updated_at))
    ).all()
    completed_by_day = {row.day: row.n for row in completed_rows}

    hours_rows = db.execute(
        select(func.date(TimeLog.start_time).label("day"), func.sum(TimeLog.duration_hours).label("h"))
        .where(TimeLog.log_type == "task_time", TimeLog.start_time >= start_dt)
        .group_by(func.date(TimeLog.start_time))
    ).all()
    hours_by_day = {row.day: float(row.h or 0) for row in hours_rows}

    series = []
    for i in range(days):
        day = start_date + dt.timedelta(days=i)
        series.append({
            "date": day.isoformat(),
            "tasks_completed": completed_by_day.get(day, 0),
            "hours_logged": round(hours_by_day.get(day, 0), 2),
        })
    return series
