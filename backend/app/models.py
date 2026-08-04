from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    CheckConstraint,
    Computed,
    Date,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


# ============================================================
# 1. SPRINTS
# ============================================================
class Sprint(Base):
    __tablename__ = "sprints"
    __table_args__ = (
        CheckConstraint("status IN ('planned', 'active', 'closed')", name="ck_sprints_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    goals_summary: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="planned")
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    tasks: Mapped[list["Task"]] = relationship(back_populates="sprint", cascade="all, delete-orphan")
    goals: Mapped[list["SprintGoal"]] = relationship(back_populates="sprint", cascade="all, delete-orphan")
    retro: Mapped["SprintRetro | None"] = relationship(back_populates="sprint", uselist=False, cascade="all, delete-orphan")


# ============================================================
# 2. SPRINT GOALS
# ============================================================
class SprintGoal(Base):
    __tablename__ = "sprint_goals"
    __table_args__ = (
        CheckConstraint("progress_pct BETWEEN 0 AND 100", name="ck_sprint_goals_progress"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sprint_id: Mapped[int] = mapped_column(ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    progress_pct: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    sprint: Mapped["Sprint"] = relationship(back_populates="goals")


# ============================================================
# 3. SPRINT RETROS
# ============================================================
class SprintRetro(Base):
    __tablename__ = "sprint_retros"

    id: Mapped[int] = mapped_column(primary_key=True)
    sprint_id: Mapped[int] = mapped_column(ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False, unique=True)
    went_well: Mapped[str | None] = mapped_column(Text)
    needs_improvement: Mapped[str | None] = mapped_column(Text)
    action_items: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    sprint: Mapped["Sprint"] = relationship(back_populates="retro")


# ============================================================
# 4. TASKS
# ============================================================
class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("status IN ('todo', 'in_progress', 'review', 'done')", name="ck_tasks_status"),
        CheckConstraint("priority IN ('low', 'medium', 'high', 'urgent')", name="ck_tasks_priority"),
        CheckConstraint("task_type IN ('general', 'development')", name="ck_tasks_type"),
        Index("idx_tasks_sprint", "sprint_id"),
        Index("idx_tasks_status", "status"),
        Index("idx_tasks_due_date", "due_date"),
        Index("idx_tasks_carried", "carried_from_task_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sprint_id: Mapped[int] = mapped_column(ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description_md: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="todo")
    priority: Mapped[str] = mapped_column(Text, nullable=False, server_default="medium")
    task_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="general")

    ticket_id: Mapped[str | None] = mapped_column(Text)
    ticket_url: Mapped[str | None] = mapped_column(Text)

    estimated_hours: Mapped[float | None] = mapped_column(Numeric)
    actual_hours: Mapped[float | None] = mapped_column(Numeric)

    due_date: Mapped[dt.date | None] = mapped_column(Date)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    carried_from_task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"))
    template_id: Mapped[int | None] = mapped_column(ForeignKey("templates.id", ondelete="SET NULL"))

    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    sprint: Mapped["Sprint"] = relationship(back_populates="tasks")
    notes: Mapped[list["Note"]] = relationship(back_populates="task")
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship(secondary="task_tags", back_populates="tasks")
    time_logs: Mapped[list["TimeLog"]] = relationship(back_populates="task")


# ============================================================
# 5. NOTES
# ============================================================
class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (
        CheckConstraint("note_type IN ('general', 'meeting', 'standup', 'retro')", name="ck_notes_type"),
        CheckConstraint("source IN ('manual', 'claude_code', 'claude_desktop')", name="ck_notes_source"),
        Index("idx_notes_task", "task_id"),
        Index("idx_notes_type", "note_type"),
        Index("idx_notes_source", "source"),
        Index("idx_notes_search_vector", "search_vector", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content_md: Mapped[str | None] = mapped_column(Text)
    note_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="general")
    attendees: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default="manual")
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_md,''))", persisted=True),
    )

    task: Mapped["Task | None"] = relationship(back_populates="notes")
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="note", cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship(secondary="note_tags", back_populates="notes")


# ============================================================
# 6. NOTE LINKS
# ============================================================
class NoteLink(Base):
    __tablename__ = "note_links"
    __table_args__ = (
        CheckConstraint("link_type IN ('reference', 'related', 'followup')", name="ck_note_links_type"),
        UniqueConstraint("from_note_id", "to_note_id", name="uq_note_links_from_to"),
        Index("idx_note_links_from", "from_note_id"),
        Index("idx_note_links_to", "to_note_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    from_note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    to_note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    link_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="reference")
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    from_note: Mapped["Note"] = relationship(foreign_keys=[from_note_id])
    to_note: Mapped["Note"] = relationship(foreign_keys=[to_note_id])


# ============================================================
# 7. KB ARTICLES
# ============================================================
class KbArticle(Base):
    __tablename__ = "kb_articles"
    __table_args__ = (
        Index("idx_kb_category", "category"),
        Index("idx_kb_search_vector", "search_vector", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content_md: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(Text)
    source_note_id: Mapped[int | None] = mapped_column(ForeignKey("notes.id", ondelete="SET NULL"))
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_md,''))", persisted=True),
    )

    source_note: Mapped["Note | None"] = relationship(foreign_keys=[source_note_id])
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="kb_article", cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship(secondary="kb_tags", back_populates="kb_articles")


# ============================================================
# 8. ATTACHMENTS
# ============================================================
class Attachment(Base):
    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint("source IN ('upload', 'claude_code', 'clipboard')", name="ck_attachments_source"),
        CheckConstraint(
            "(task_id IS NOT NULL AND note_id IS NULL AND kb_article_id IS NULL) OR "
            "(task_id IS NULL AND note_id IS NOT NULL AND kb_article_id IS NULL) OR "
            "(task_id IS NULL AND note_id IS NULL AND kb_article_id IS NOT NULL)",
            name="ck_attachments_one_parent",
        ),
        Index("idx_attachments_task", "task_id"),
        Index("idx_attachments_note", "note_id"),
        Index("idx_attachments_kb", "kb_article_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    note_id: Mapped[int | None] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"))
    kb_article_id: Mapped[int | None] = mapped_column(ForeignKey("kb_articles.id", ondelete="CASCADE"))
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str | None] = mapped_column(Text)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default="upload")
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    task: Mapped["Task | None"] = relationship(back_populates="attachments")
    note: Mapped["Note | None"] = relationship(back_populates="attachments")
    kb_article: Mapped["KbArticle | None"] = relationship(back_populates="attachments")


# ============================================================
# 9. TAGS
# ============================================================
class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    color: Mapped[str] = mapped_column(Text, nullable=False, server_default="#6B7280")

    tasks: Mapped[list["Task"]] = relationship(secondary="task_tags", back_populates="tags")
    notes: Mapped[list["Note"]] = relationship(secondary="note_tags", back_populates="tags")
    kb_articles: Mapped[list["KbArticle"]] = relationship(secondary="kb_tags", back_populates="tags")


# ============================================================
# 10. TAG JOINS
# ============================================================
class TaskTag(Base):
    __tablename__ = "task_tags"
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class NoteTag(Base):
    __tablename__ = "note_tags"
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class KbTag(Base):
    __tablename__ = "kb_tags"
    kb_article_id: Mapped[int] = mapped_column(ForeignKey("kb_articles.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


# ============================================================
# 11. TIME LOGS
# ============================================================
class TimeLog(Base):
    __tablename__ = "time_logs"
    __table_args__ = (
        CheckConstraint("log_type IN ('punch_in', 'punch_out', 'task_time')", name="ck_time_logs_type"),
        Index("idx_time_logs_task", "task_id"),
        Index("idx_time_logs_type", "log_type"),
        Index("idx_time_logs_start", "start_time"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"))
    log_type: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[dt.datetime] = mapped_column(nullable=False)
    end_time: Mapped[dt.datetime | None] = mapped_column()
    duration_hours: Mapped[float | None] = mapped_column(Numeric)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    task: Mapped["Task | None"] = relationship(back_populates="time_logs")


# ============================================================
# 12. TEMPLATES
# ============================================================
class Template(Base):
    __tablename__ = "templates"
    __table_args__ = (
        CheckConstraint("template_type IN ('task', 'meeting_note', 'sprint')", name="ck_templates_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    template_type: Mapped[str] = mapped_column(Text, nullable=False)
    content_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


# ============================================================
# 13. RECURRING TASKS
# ============================================================
class RecurringTask(Base):
    __tablename__ = "recurring_tasks"
    __table_args__ = (
        CheckConstraint("frequency IN ('daily', 'weekly', 'monthly')", name="ck_recurring_frequency"),
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_recurring_dow"),
        CheckConstraint("day_of_month BETWEEN 1 AND 31", name="ck_recurring_dom"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("templates.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description_md: Mapped[str | None] = mapped_column(Text)
    frequency: Mapped[str] = mapped_column(Text, nullable=False)
    day_of_week: Mapped[int | None] = mapped_column(Integer)
    day_of_month: Mapped[int | None] = mapped_column(Integer)
    tag_names: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(server_default="true")
    last_created_at: Mapped[dt.datetime | None] = mapped_column()
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())


# ============================================================
# 14. INBOX
# ============================================================
class InboxItem(Base):
    __tablename__ = "inbox_items"
    __table_args__ = (
        CheckConstraint("resolved_to IN ('task', 'note', 'kb', 'dismissed')", name="ck_inbox_resolved_to"),
        Index("idx_inbox_resolved", "resolved_to"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    resolved_to: Mapped[str | None] = mapped_column(Text)
    resolved_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    resolved_at: Mapped[dt.datetime | None] = mapped_column()


# ============================================================
# 15. ACTIVITY LOG
# ============================================================
class ActivityLog(Base):
    __tablename__ = "activity_log"
    __table_args__ = (
        CheckConstraint(
            "entity_type IN ('sprint', 'task', 'note', 'kb', 'time', 'inbox', 'attachment')",
            name="ck_activity_entity_type",
        ),
        Index("idx_activity_entity", "entity_type", "entity_id"),
        Index("idx_activity_created", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    detail_json: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())


# ============================================================
# 16. USER PROFILE
# Single-row table: this is a single-user local tool. Created by the
# first-run setup wizard; edited later from the Settings page.
# ============================================================
class UserProfile(Base):
    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, server_default="UTC")
    theme_preset: Mapped[str] = mapped_column(Text, nullable=False, server_default="indigo")
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
