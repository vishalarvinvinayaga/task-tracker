from __future__ import annotations

import datetime as dt
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# ---------------- Tags ----------------


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    color: str


class TagCreate(BaseModel):
    name: str
    color: str = "#6B7280"


# ---------------- Sprints ----------------

SprintStatus = Literal["planned", "active", "closed"]


class SprintGoalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sprint_id: int
    title: str
    progress_pct: int
    created_at: dt.datetime


class SprintGoalCreate(BaseModel):
    title: str
    progress_pct: int = 0


class SprintGoalUpdate(BaseModel):
    title: str | None = None
    progress_pct: int | None = None


class SprintRetroRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sprint_id: int
    went_well: str | None
    needs_improvement: str | None
    action_items: str | None
    created_at: dt.datetime


class SprintRetroUpsert(BaseModel):
    went_well: str | None = None
    needs_improvement: str | None = None
    action_items: str | None = None


class SprintCreate(BaseModel):
    name: str
    goals_summary: str | None = None
    start_date: dt.date
    end_date: dt.date
    status: SprintStatus = "planned"


class SprintUpdate(BaseModel):
    name: str | None = None
    goals_summary: str | None = None
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    status: SprintStatus | None = None


class SprintRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    goals_summary: str | None
    start_date: dt.date
    end_date: dt.date
    status: str
    created_at: dt.datetime
    updated_at: dt.datetime


class SprintWithStats(SprintRead):
    task_count: int = 0
    done_count: int = 0
    goals: list[SprintGoalRead] = []


class SprintCloseRequest(BaseModel):
    carry_task_ids: list[int] = Field(default_factory=list)
    next_sprint_id: int


# ---------------- Tasks ----------------

TaskStatus = Literal["todo", "in_progress", "review", "done"]
TaskPriority = Literal["low", "medium", "high", "urgent"]
TaskType = Literal["general", "development"]


class TaskCreate(BaseModel):
    title: str
    description_md: str | None = None
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    task_type: TaskType = "general"
    ticket_id: str | None = None
    ticket_url: str | None = None
    estimated_hours: float | None = None
    due_date: dt.date | None = None
    sprint_id: int | None = None
    tag_ids: list[int] = Field(default_factory=list)
    template_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description_md: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    task_type: TaskType | None = None
    ticket_id: str | None = None
    ticket_url: str | None = None
    estimated_hours: float | None = None
    actual_hours: float | None = None
    due_date: dt.date | None = None
    sort_order: int | None = None
    tag_ids: list[int] | None = None


class TaskMove(BaseModel):
    status: TaskStatus
    sort_order: int | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sprint_id: int
    title: str
    description_md: str | None
    status: str
    priority: str
    task_type: str
    ticket_id: str | None
    ticket_url: str | None
    estimated_hours: float | None
    actual_hours: float | None
    due_date: dt.date | None
    sort_order: int
    carried_from_task_id: int | None
    template_id: int | None
    created_at: dt.datetime
    updated_at: dt.datetime
    tags: list[TagRead] = []


class TaskDetail(TaskRead):
    sprint_name: str | None = None
    carry_chain: list[TaskRead] = []


# ---------------- Notes ----------------

NoteType = Literal["general", "meeting", "standup", "retro"]
NoteSource = Literal["manual", "claude_code", "claude_desktop"]
LinkType = Literal["reference", "related", "followup"]


class NoteCreate(BaseModel):
    title: str
    content_md: str | None = None
    task_id: int | None = None
    note_type: NoteType = "general"
    attendees: str | None = None
    source: NoteSource = "manual"
    tag_ids: list[int] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    title: str | None = None
    content_md: str | None = None
    task_id: int | None = None
    note_type: NoteType | None = None
    attendees: str | None = None
    tag_ids: list[int] | None = None


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int | None
    title: str
    content_md: str | None
    note_type: str
    attendees: str | None
    source: str
    created_at: dt.datetime
    updated_at: dt.datetime
    tags: list[TagRead] = []


class NoteSearchResult(BaseModel):
    id: int
    title: str
    snippet: str
    note_type: str
    created_at: dt.datetime


class NoteLinkCreate(BaseModel):
    to_note_id: int
    link_type: LinkType = "reference"


class NoteLinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    from_note_id: int
    to_note_id: int
    link_type: str
    created_at: dt.datetime


# ---------------- KB ----------------


class KbArticleCreate(BaseModel):
    title: str
    content_md: str | None = None
    category: str | None = None
    source_note_id: int | None = None
    tag_ids: list[int] = Field(default_factory=list)


class KbArticleUpdate(BaseModel):
    title: str | None = None
    content_md: str | None = None
    category: str | None = None
    tag_ids: list[int] | None = None


class KbArticleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content_md: str | None
    category: str | None
    source_note_id: int | None
    created_at: dt.datetime
    updated_at: dt.datetime
    tags: list[TagRead] = []


class KbSearchResult(BaseModel):
    id: int
    title: str
    snippet: str
    category: str | None
    created_at: dt.datetime


class PromoteNoteRequest(BaseModel):
    category: str | None = None


# ---------------- Attachments ----------------

AttachmentSource = Literal["upload", "claude_code", "clipboard"]


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int | None
    note_id: int | None
    kb_article_id: int | None
    file_name: str
    file_path: str
    file_type: str | None
    file_size_bytes: int | None
    source: str
    created_at: dt.datetime


# ---------------- Time logs ----------------

LogType = Literal["punch_in", "punch_out", "task_time"]


class TimeLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int | None
    log_type: str
    start_time: dt.datetime
    end_time: dt.datetime | None
    duration_hours: float | None
    notes: str | None
    created_at: dt.datetime


class PunchRequest(BaseModel):
    notes: str | None = None


class TaskTimeCreate(BaseModel):
    task_id: int
    duration_hours: float
    notes: str | None = None


class TimeStatus(BaseModel):
    punched_in: bool
    session_start: dt.datetime | None = None
    session_duration_hours: float | None = None
    today_total_hours: float = 0


class TimeBreakdownEntry(BaseModel):
    tag_name: str
    color: str
    hours: float


# ---------------- Templates ----------------

TemplateType = Literal["task", "meeting_note", "sprint"]


class TemplateCreate(BaseModel):
    name: str
    template_type: TemplateType
    content_json: dict[str, Any]


class TemplateUpdate(BaseModel):
    name: str | None = None
    content_json: dict[str, Any] | None = None


class TemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    template_type: str
    content_json: dict[str, Any]
    created_at: dt.datetime
    updated_at: dt.datetime


# ---------------- Recurring tasks ----------------

Frequency = Literal["daily", "weekly", "monthly"]


class RecurringTaskCreate(BaseModel):
    template_id: int | None = None
    title: str
    description_md: str | None = None
    frequency: Frequency
    day_of_week: int | None = None
    day_of_month: int | None = None
    tag_names: str | None = None
    active: bool = True


class RecurringTaskUpdate(BaseModel):
    title: str | None = None
    description_md: str | None = None
    frequency: Frequency | None = None
    day_of_week: int | None = None
    day_of_month: int | None = None
    tag_names: str | None = None
    active: bool | None = None


class RecurringTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    template_id: int | None
    title: str
    description_md: str | None
    frequency: str
    day_of_week: int | None
    day_of_month: int | None
    tag_names: str | None
    active: bool
    last_created_at: dt.datetime | None
    created_at: dt.datetime


# ---------------- Inbox ----------------

ResolveTarget = Literal["task", "note", "kb", "dismissed"]


class InboxItemCreate(BaseModel):
    content: str


class InboxItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content: str
    resolved_to: str | None
    resolved_id: int | None
    created_at: dt.datetime
    resolved_at: dt.datetime | None


class InboxResolveRequest(BaseModel):
    resolve_to: ResolveTarget
    target_data: dict[str, Any] | None = None


# ---------------- Activity log ----------------


class ActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    entity_type: str
    entity_id: int
    action: str
    detail_json: dict[str, Any] | None
    created_at: dt.datetime


# ---------------- Dashboard / planning ----------------


class TodayPlan(BaseModel):
    active_sprint: SprintWithStats | None
    today_tasks: list[TaskRead]
    time_status: TimeStatus
    inbox_count: int


class StandupSummary(BaseModel):
    yesterday_completed: list[TaskRead]
    yesterday_activity: list[ActivityLogRead]
    today_planned: list[TaskRead]
    blocked: list[TaskRead]


class WeeklySummary(BaseModel):
    week_start: dt.date
    week_end: dt.date
    tasks_completed: int
    hours_logged: float
    time_breakdown: list[TimeBreakdownEntry]
    carried_tasks: int
    sprint_progress_delta: float | None = None


# ---------------- Send-to-task (Claude Code pipeline) ----------------


class SendToTaskRequest(BaseModel):
    task_id: int
    content_md: str
    title: str | None = None


# ---------------- User profile ----------------

ThemePreset = Literal["indigo", "emerald", "rose", "cyan", "amber", "slate"]


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    timezone: str
    theme_preset: str
    created_at: dt.datetime
    updated_at: dt.datetime


class UserProfileCreate(BaseModel):
    name: str
    timezone: str = "UTC"
    theme_preset: ThemePreset = "indigo"


class UserProfileUpdate(BaseModel):
    name: str | None = None
    timezone: str | None = None
    theme_preset: ThemePreset | None = None
