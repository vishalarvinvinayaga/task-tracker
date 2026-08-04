from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import log_activity
from app.database import get_db
from app.models import Sprint, Tag, Task, Template
from app.schemas import TaskCreate, TaskDetail, TaskMove, TaskRead, TaskUpdate
from app.tag_utils import resolve_tags

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _active_sprint_id(db: Session) -> int:
    sprint = db.execute(select(Sprint).where(Sprint.status == "active")).scalar_one_or_none()
    if not sprint:
        raise HTTPException(400, "No active sprint. Specify sprint_id or activate a sprint first.")
    return sprint.id


@router.get("", response_model=list[TaskRead])
def list_tasks(
    sprint_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    task_type: str | None = None,
    tag_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Task)
    if sprint_id is not None:
        stmt = stmt.where(Task.sprint_id == sprint_id)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    if priority is not None:
        stmt = stmt.where(Task.priority == priority)
    if task_type is not None:
        stmt = stmt.where(Task.task_type == task_type)
    if tag_id is not None:
        stmt = stmt.join(Task.tags).where(Tag.id == tag_id)
    stmt = stmt.order_by(Task.sort_order, Task.created_at)
    return db.execute(stmt).scalars().unique().all()


@router.get("/{task_id}", response_model=TaskDetail)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    chain = []
    cursor = task
    while cursor.carried_from_task_id:
        parent = db.get(Task, cursor.carried_from_task_id)
        if not parent:
            break
        chain.append(TaskRead.model_validate(parent))
        cursor = parent

    return TaskDetail(
        **TaskRead.model_validate(task).model_dump(),
        sprint_name=task.sprint.name if task.sprint else None,
        carry_chain=chain,
    )


@router.post("", response_model=TaskRead, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"tag_ids"})
    sprint_id = data.pop("sprint_id", None) or _active_sprint_id(db)

    template: Template | None = None
    if payload.template_id:
        template = db.get(Template, payload.template_id)
        if template and template.template_type == "task":
            title_prefix = template.content_json.get("title_prefix")
            if title_prefix and not data["title"].startswith(title_prefix):
                data["title"] = f"{title_prefix}{data['title']}"
            data.setdefault("priority", template.content_json.get("default_priority", data["priority"]))

    task = Task(sprint_id=sprint_id, **data)
    tag_ids = list(payload.tag_ids)
    if template and template.template_type == "task":
        default_tag_names = template.content_json.get("default_tags", [])
        if default_tag_names:
            existing = {t.name: t for t in db.execute(select(Tag).where(Tag.name.in_(default_tag_names))).scalars().all()}
            for name in default_tag_names:
                if name not in existing:
                    tag = Tag(name=name)
                    db.add(tag)
                    db.flush()
                    existing[name] = tag
            tag_ids += [existing[n].id for n in default_tag_names]
    task.tags = resolve_tags(db, tag_ids)
    db.add(task)
    db.flush()
    log_activity(db, "task", task.id, "created", {"title": task.title, "sprint_id": sprint_id})

    if template and template.template_type == "task":
        for subtask_name in template.content_json.get("subtasks", []):
            child = Task(
                sprint_id=sprint_id,
                title=f"{task.title} — {subtask_name}",
                priority=task.priority,
                template_id=template.id,
            )
            db.add(child)
            db.flush()
            log_activity(db, "task", child.id, "created", {"title": child.title, "parent_task_id": task.id})

    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")

    data = payload.model_dump(exclude_unset=True, exclude={"tag_ids"})
    old_status = task.status
    for key, value in data.items():
        setattr(task, key, value)
    if payload.tag_ids is not None:
        task.tags = resolve_tags(db, payload.tag_ids)

    db.flush()
    if "status" in data and data["status"] != old_status:
        log_activity(db, "task", task.id, "status_changed", {"from": old_status, "to": data["status"]})
    else:
        log_activity(db, "task", task.id, "updated", {k: v for k, v in data.items()})
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/move", response_model=TaskRead)
def move_task(task_id: int, payload: TaskMove, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    old_status = task.status
    task.status = payload.status
    if payload.sort_order is not None:
        task.sort_order = payload.sort_order
    db.flush()
    if payload.status != old_status:
        log_activity(db, "task", task.id, "status_changed", {"from": old_status, "to": payload.status})
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()
