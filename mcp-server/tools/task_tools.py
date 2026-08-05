import datetime as dt

from sqlalchemy import select

from app.activity import log_activity
from app.models import Sprint, Tag, Task
from app_instance import mcp
from tools._common import jsonable, session, task_dict


def _resolve_tags(db, names: list[str] | None) -> list[Tag]:
    if not names:
        return []
    existing = {t.name: t for t in db.execute(select(Tag).where(Tag.name.in_(names))).scalars().all()}
    tags = []
    for name in names:
        tag = existing.get(name)
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        tags.append(tag)
    return tags


@mcp.tool()
def add_task(
    title: str,
    description: str | None = None,
    priority: str = "medium",
    task_type: str = "general",
    ticket_id: str | None = None,
    ticket_url: str | None = None,
    tags: list[str] | None = None,
    due_date: str | None = None,
    estimated_hours: float | None = None,
    sprint_id: int | None = None,
) -> dict:
    """Add a task to a sprint (defaults to the active sprint if sprint_id is omitted).
    priority: low|medium|high|urgent. task_type: general|development. due_date: YYYY-MM-DD."""
    with session() as db:
        if sprint_id is None:
            sprint = db.execute(select(Sprint).where(Sprint.status == "active", Sprint.container_type == "sprint")).scalar_one_or_none()
            if not sprint:
                return {"error": "No active sprint. Specify sprint_id or activate a sprint first."}
            sprint_id = sprint.id
        elif not db.get(Sprint, sprint_id):
            return {"error": f"Sprint {sprint_id} not found"}

        task = Task(
            sprint_id=sprint_id,
            title=title,
            description_md=description,
            priority=priority,
            task_type=task_type,
            ticket_id=ticket_id,
            ticket_url=ticket_url,
            due_date=dt.date.fromisoformat(due_date) if due_date else None,
            estimated_hours=estimated_hours,
        )
        task.tags = _resolve_tags(db, tags)
        db.add(task)
        db.flush()
        log_activity(db, "task", task.id, "created", {"title": task.title, "source": "mcp"})
        return task_dict(task)


@mcp.tool()
def update_task(
    task_id: int,
    status: str | None = None,
    priority: str | None = None,
    title: str | None = None,
    description: str | None = None,
    ticket_id: str | None = None,
    ticket_url: str | None = None,
    actual_hours: float | None = None,
    due_date: str | None = None,
) -> dict:
    """Update fields on an existing task. Only provided fields are changed.
    status: todo|in_progress|review|done."""
    with session() as db:
        task = db.get(Task, task_id)
        if not task:
            return {"error": f"Task {task_id} not found"}

        old_status = task.status
        if status is not None:
            task.status = status
        if priority is not None:
            task.priority = priority
        if title is not None:
            task.title = title
        if description is not None:
            task.description_md = description
        if ticket_id is not None:
            task.ticket_id = ticket_id
        if ticket_url is not None:
            task.ticket_url = ticket_url
        if actual_hours is not None:
            task.actual_hours = actual_hours
        if due_date is not None:
            task.due_date = dt.date.fromisoformat(due_date)

        db.flush()
        if status is not None and status != old_status:
            log_activity(db, "task", task.id, "status_changed", {"from": old_status, "to": status})
        else:
            log_activity(db, "task", task.id, "updated", {"source": "mcp"})
        return task_dict(task)


@mcp.tool()
def get_task_details(task_id: int) -> dict:
    """Get full details for a task: fields, tags, notes, attachments, time logs, and
    carry-over history."""
    with session() as db:
        task = db.get(Task, task_id)
        if not task:
            return {"error": f"Task {task_id} not found"}

        chain = []
        cursor = task
        while cursor.carried_from_task_id:
            parent = db.get(Task, cursor.carried_from_task_id)
            if not parent:
                break
            chain.append(task_dict(parent))
            cursor = parent

        return jsonable({
            **task_dict(task),
            "sprint_name": task.sprint.name if task.sprint else None,
            "notes": [{"id": n.id, "title": n.title, "content_md": n.content_md} for n in task.notes],
            "attachments": [{"id": a.id, "file_name": a.file_name} for a in task.attachments],
            "time_logs": [
                {"log_type": t.log_type, "duration_hours": t.duration_hours, "start_time": t.start_time} for t in task.time_logs
            ],
            "carry_chain": chain,
        })


@mcp.tool()
def move_task(task_id: int, status: str) -> dict:
    """Shorthand to update just a task's status. status: todo|in_progress|review|done."""
    with session() as db:
        task = db.get(Task, task_id)
        if not task:
            return {"error": f"Task {task_id} not found"}
        old_status = task.status
        task.status = status
        db.flush()
        if status != old_status:
            log_activity(db, "task", task.id, "status_changed", {"from": old_status, "to": status})
        return task_dict(task)
