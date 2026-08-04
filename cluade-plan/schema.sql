-- ============================================================
-- Personal Planner — Database Schema
-- SQLite 3.x | All timestamps stored as ISO 8601 UTC strings
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. SPRINTS
-- A sprint is a time-boxed work cycle. All tasks live inside one.
-- ============================================================
CREATE TABLE sprints (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,                           -- e.g. "Sprint 12 — Aimee Webhook Overhaul"
    goals_summary   TEXT,                                    -- free-text summary of what this sprint aims to achieve
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'planned'           -- planned | active | closed
                    CHECK (status IN ('planned', 'active', 'closed')),
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    updated_at      TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. SPRINT GOALS
-- Discrete, trackable objectives within a sprint.
-- ============================================================
CREATE TABLE sprint_goals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id       INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,                           -- e.g. "Ship Aimee staging webhook routing"
    progress_pct    INTEGER NOT NULL DEFAULT 0               -- 0-100, manually updated or derived
                    CHECK (progress_pct BETWEEN 0 AND 100),
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 3. SPRINT RETROSPECTIVES
-- One retro per sprint, filled at sprint close.
-- ============================================================
CREATE TABLE sprint_retros (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id           INTEGER NOT NULL UNIQUE REFERENCES sprints(id) ON DELETE CASCADE,
    went_well           TEXT,                                -- markdown
    needs_improvement   TEXT,                                -- markdown
    action_items        TEXT,                                -- markdown
    created_at          TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 4. TASKS
-- The core work unit. Always belongs to a sprint.
-- ============================================================
CREATE TABLE tasks (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id           INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description_md      TEXT,                                -- markdown body
    status              TEXT NOT NULL DEFAULT 'todo'
                        CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    priority            TEXT NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    task_type           TEXT NOT NULL DEFAULT 'general'
                        CHECK (task_type IN ('general', 'development')),

    -- Development task fields (nullable, only used when task_type = 'development')
    ticket_id           TEXT,                                -- e.g. "AIMEE-347"
    ticket_url          TEXT,                                -- e.g. "https://jira.aventusoft.com/browse/AIMEE-347"

    -- Time tracking
    estimated_hours     REAL,
    actual_hours        REAL,

    -- Scheduling
    due_date            DATE,
    sort_order          INTEGER NOT NULL DEFAULT 0,

    -- Carry-over tracking
    carried_from_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,

    -- Template origin (nullable)
    template_id         INTEGER REFERENCES templates(id) ON DELETE SET NULL,

    created_at          TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    updated_at          TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tasks_sprint      ON tasks(sprint_id);
CREATE INDEX idx_tasks_status      ON tasks(status);
CREATE INDEX idx_tasks_due_date    ON tasks(due_date);
CREATE INDEX idx_tasks_carried     ON tasks(carried_from_task_id);

-- ============================================================
-- 5. NOTES
-- Standalone or task-linked. Supports meeting notes, standups,
-- general notes, and content pushed from Claude Code.
-- ============================================================
CREATE TABLE notes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER REFERENCES tasks(id) ON DELETE SET NULL,   -- nullable: standalone if NULL
    title           TEXT NOT NULL,
    content_md      TEXT,                                              -- markdown body
    note_type       TEXT NOT NULL DEFAULT 'general'
                    CHECK (note_type IN ('general', 'meeting', 'standup', 'retro')),
    attendees       TEXT,                                              -- comma-separated names (meeting notes)
    source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual', 'claude_code', 'claude_desktop')),
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    updated_at      TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notes_task    ON notes(task_id);
CREATE INDEX idx_notes_type    ON notes(note_type);
CREATE INDEX idx_notes_source  ON notes(source);

-- ============================================================
-- 6. NOTE LINKS
-- Connects notes to other notes (bidirectional graph).
-- ============================================================
CREATE TABLE note_links (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    from_note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    to_note_id      INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    link_type       TEXT NOT NULL DEFAULT 'reference'
                    CHECK (link_type IN ('reference', 'related', 'followup')),
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now')),

    -- Prevent duplicate links in the same direction
    UNIQUE(from_note_id, to_note_id)
);

CREATE INDEX idx_note_links_from ON note_links(from_note_id);
CREATE INDEX idx_note_links_to   ON note_links(to_note_id);

-- ============================================================
-- 7. KNOWLEDGE BASE ARTICLES
-- Long-lived reference content. Can be promoted from a note.
-- ============================================================
CREATE TABLE kb_articles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    content_md      TEXT,                                    -- markdown body
    category        TEXT,                                    -- e.g. "Aimee Architecture", "Immigration"
    source_note_id  INTEGER REFERENCES notes(id) ON DELETE SET NULL,  -- if promoted from a note
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    updated_at      TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_kb_category ON kb_articles(category);

-- ============================================================
-- 8. ATTACHMENTS
-- Files attached to tasks, notes, or KB articles.
-- Polymorphic: exactly one of task_id / note_id / kb_article_id is set.
-- ============================================================
CREATE TABLE attachments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    note_id         INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    kb_article_id   INTEGER REFERENCES kb_articles(id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,                           -- original file name
    file_path       TEXT NOT NULL,                           -- relative path under ./attachments/
    file_type       TEXT,                                    -- MIME type or extension
    file_size_bytes INTEGER,
    source          TEXT NOT NULL DEFAULT 'upload'
                    CHECK (source IN ('upload', 'claude_code', 'clipboard')),
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now')),

    -- Ensure exactly one parent is set
    CHECK (
        (task_id IS NOT NULL AND note_id IS NULL AND kb_article_id IS NULL) OR
        (task_id IS NULL AND note_id IS NOT NULL AND kb_article_id IS NULL) OR
        (task_id IS NULL AND note_id IS NULL AND kb_article_id IS NOT NULL)
    )
);

CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_attachments_note ON attachments(note_id);
CREATE INDEX idx_attachments_kb   ON attachments(kb_article_id);

-- ============================================================
-- 9. TAGS
-- Universal tag definitions. Color-coded workstream labels.
-- ============================================================
CREATE TABLE tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,                     -- e.g. "Aimee", "Hemotag", "Immigration"
    color           TEXT NOT NULL DEFAULT '#6B7280'           -- hex color for UI rendering
);

-- ============================================================
-- 10. TAG JOINS
-- Separate join tables for clean foreign keys.
-- ============================================================
CREATE TABLE task_tags (
    task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE note_tags (
    note_id     INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE kb_tags (
    kb_article_id INTEGER NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    tag_id        INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (kb_article_id, tag_id)
);

-- ============================================================
-- 11. TIME LOGS
-- Punch in/out and per-task time tracking.
-- ============================================================
CREATE TABLE time_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER REFERENCES tasks(id) ON DELETE SET NULL,  -- null = general punch in/out
    log_type        TEXT NOT NULL
                    CHECK (log_type IN ('punch_in', 'punch_out', 'task_time')),
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP,                               -- null if currently active
    duration_hours  REAL,                                    -- computed on punch_out or task stop
    notes           TEXT,                                    -- optional context
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_time_logs_task  ON time_logs(task_id);
CREATE INDEX idx_time_logs_type  ON time_logs(log_type);
CREATE INDEX idx_time_logs_start ON time_logs(start_time);

-- ============================================================
-- 12. TEMPLATES
-- Reusable structures for tasks, meeting notes, and sprints.
-- ============================================================
CREATE TABLE templates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,                            -- e.g. "1:1 with Brent", "New Aimee Agent"
    template_type   TEXT NOT NULL
                    CHECK (template_type IN ('task', 'meeting_note', 'sprint')),
    content_json    TEXT NOT NULL,                            -- JSON blob with structure and defaults
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    updated_at      TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 13. RECURRING TASKS
-- Auto-generated tasks on a schedule.
-- ============================================================
CREATE TABLE recurring_tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id     INTEGER REFERENCES templates(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description_md  TEXT,
    frequency       TEXT NOT NULL
                    CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    day_of_week     INTEGER CHECK (day_of_week BETWEEN 0 AND 6),    -- 0=Sun, used with weekly
    day_of_month    INTEGER CHECK (day_of_month BETWEEN 1 AND 31),  -- used with monthly
    tag_names       TEXT,                                            -- comma-separated, auto-applied
    active          INTEGER NOT NULL DEFAULT 1,                      -- 1=active, 0=paused
    last_created_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 14. INBOX
-- Quick-capture items. Triaged into tasks, notes, KB, or dismissed.
-- ============================================================
CREATE TABLE inbox_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    content         TEXT NOT NULL,                            -- raw captured text
    resolved_to     TEXT CHECK (resolved_to IN ('task', 'note', 'kb', 'dismissed')),
    resolved_id     INTEGER,                                 -- id in the target table
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    resolved_at     TIMESTAMP
);

CREATE INDEX idx_inbox_resolved ON inbox_items(resolved_to);

-- ============================================================
-- 15. ACTIVITY LOG
-- Append-only audit trail of every action in the system.
-- ============================================================
CREATE TABLE activity_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type     TEXT NOT NULL
                    CHECK (entity_type IN ('sprint', 'task', 'note', 'kb', 'time', 'inbox', 'attachment')),
    entity_id       INTEGER NOT NULL,
    action          TEXT NOT NULL,                            -- created | updated | status_changed | attached | linked | deleted
    detail_json     TEXT,                                     -- JSON with change details, e.g. {"from": "todo", "to": "in_progress"}
    created_at      TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_activity_entity  ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at);

-- ============================================================
-- FULL-TEXT SEARCH (FTS5)
-- Enables fast search across notes and KB from the MCP server.
-- ============================================================
CREATE VIRTUAL TABLE notes_fts USING fts5(
    title,
    content_md,
    content='notes',
    content_rowid='id'
);

CREATE VIRTUAL TABLE kb_fts USING fts5(
    title,
    content_md,
    content='kb_articles',
    content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, title, content_md) VALUES (new.id, new.title, new.content_md);
END;

CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content_md) VALUES ('delete', old.id, old.title, old.content_md);
END;

CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content_md) VALUES ('delete', old.id, old.title, old.content_md);
    INSERT INTO notes_fts(rowid, title, content_md) VALUES (new.id, new.title, new.content_md);
END;

CREATE TRIGGER kb_ai AFTER INSERT ON kb_articles BEGIN
    INSERT INTO kb_fts(rowid, title, content_md) VALUES (new.id, new.title, new.content_md);
END;

CREATE TRIGGER kb_ad AFTER DELETE ON kb_articles BEGIN
    INSERT INTO kb_fts(kb_fts, rowid, title, content_md) VALUES ('delete', old.id, old.title, old.content_md);
END;

CREATE TRIGGER kb_au AFTER UPDATE ON kb_articles BEGIN
    INSERT INTO kb_fts(kb_fts, rowid, title, content_md) VALUES ('delete', old.id, old.title, old.content_md);
    INSERT INTO kb_fts(rowid, title, content_md) VALUES (new.id, new.title, new.content_md);
END;

-- ============================================================
-- SEED DATA — Default tags for workstreams
-- ============================================================
INSERT INTO tags (name, color) VALUES
    ('Aimee',       '#3B82F6'),   -- blue
    ('Hemotag',     '#EF4444'),   -- red
    ('Immigration', '#F59E0B'),   -- amber
    ('Content',     '#8B5CF6'),   -- purple
    ('Research',    '#10B981');    -- green

-- ============================================================
-- SEED DATA — Starter templates
-- ============================================================
INSERT INTO templates (name, template_type, content_json) VALUES
    ('1:1 Meeting', 'meeting_note', json('{"sections": ["Updates", "Discussion Points", "Action Items", "Decisions Made"]}')),
    ('Team Standup', 'meeting_note', json('{"sections": ["Yesterday", "Today", "Blockers"]}')),
    ('Sprint Planning', 'meeting_note', json('{"sections": ["Sprint Goal", "Task Breakdown", "Capacity Check", "Risks"]}')),
    ('Sprint Retro', 'meeting_note', json('{"sections": ["What Went Well", "What Needs Improvement", "Action Items"]}')),
    ('New Aimee Agent', 'task', json('{"subtasks": ["Prompt engineering", "ElevenLabs agent config", "Knowledge base setup", "Twilio routing", "Testing & QA"]}'));
