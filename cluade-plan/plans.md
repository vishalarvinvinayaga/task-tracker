# Personal Command Center — Project Plan

> A local-first personal productivity system with sprint tracking, notes, knowledge base, time clock, and a conversational AI interface via MCP. Built for a single user. Runs entirely on your laptop.

---

## 1. Project overview

This is a personal planner application that gives you two ways to interact with the same data:

1. **Web UI** — a Next.js app at `localhost:3000` for visual sprint boards, calendar, notes, and dashboards
2. **Claude Desktop / Claude Code** — connected via an MCP server, so you can talk to your planner conversationally ("plan my day", "add a task to the Aimee sprint", "summarize this week's meeting notes")

Both interfaces read and write to a single SQLite database. All data stays local. No cloud, no accounts, no subscriptions.

---

## 2. Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14+ (App Router), React 18+, TypeScript | Server components + API routes in one project |
| Styling | Tailwind CSS 3+ | Fast iteration, utility-first, dark mode support |
| Database | SQLite 3 via `better-sqlite3` | Zero-config, single file, WAL mode for concurrent reads |
| Markdown | `react-md-editor` or `@uiw/react-md-editor` | Rich markdown editing for notes and KB articles |
| MCP Server | TypeScript, `@modelcontextprotocol/sdk`, stdio transport | Connects Claude Desktop and Claude Code to the planner |
| File storage | Local `./data/attachments/` directory | Files referenced by path in the database |
| Search | SQLite FTS5 | Full-text search across notes and KB, auto-synced via triggers |

### Key constraints

- Node.js 18+ required
- No external databases — SQLite only
- No authentication — single user, local only
- No cloud APIs — everything runs offline (MCP connects to Claude Desktop which handles the AI)
- Dark mode must be supported from day one

---

## 3. Project structure

```
personal-planner/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout with sidebar navigation
│   ├── page.tsx                  # Dashboard (home/today view)
│   ├── sprints/
│   │   ├── page.tsx              # Sprint list view
│   │   └── [id]/
│   │       ├── page.tsx          # Sprint detail — kanban board
│   │       └── retro/
│   │           └── page.tsx      # Sprint retrospective
│   ├── tasks/
│   │   └── [id]/
│   │       └── page.tsx          # Task detail — notes, attachments, time
│   ├── calendar/
│   │   └── page.tsx              # Calendar day/week view
│   ├── notes/
│   │   ├── page.tsx              # All notes list with search
│   │   └── [id]/
│   │       └── page.tsx          # Note editor with linking
│   ├── kb/
│   │   ├── page.tsx              # Knowledge base browser
│   │   └── [id]/
│   │       └── page.tsx          # KB article editor
│   ├── inbox/
│   │   └── page.tsx              # Quick capture inbox triage
│   ├── templates/
│   │   └── page.tsx              # Template management
│   └── api/                      # API routes (Next.js Route Handlers)
│       ├── sprints/
│       │   ├── route.ts          # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts      # GET, PUT, DELETE
│       │       ├── close/
│       │       │   └── route.ts  # POST — close sprint, carry tasks
│       │       ├── goals/
│       │       │   └── route.ts  # CRUD for sprint goals
│       │       └── retro/
│       │           └── route.ts  # CRUD for sprint retro
│       ├── tasks/
│       │   ├── route.ts          # GET (list/filter), POST (create)
│       │   └── [id]/
│       │       ├── route.ts      # GET, PUT, DELETE
│       │       ├── notes/
│       │       │   └── route.ts  # GET, POST notes for a task
│       │       └── attachments/
│       │           └── route.ts  # GET, POST attachments for a task
│       ├── notes/
│       │   ├── route.ts          # GET (list/search), POST (create)
│       │   ├── [id]/
│       │   │   ├── route.ts      # GET, PUT, DELETE
│       │   │   └── links/
│       │   │       └── route.ts  # POST (link notes), GET (get links)
│       │   └── search/
│       │       └── route.ts      # GET — FTS5 search
│       ├── kb/
│       │   ├── route.ts          # GET (list/filter), POST (create)
│       │   ├── [id]/
│       │   │   └── route.ts      # GET, PUT, DELETE
│       │   └── search/
│       │       └── route.ts      # GET — FTS5 search
│       ├── tags/
│       │   └── route.ts          # CRUD for tags
│       ├── time/
│       │   ├── route.ts          # GET (logs), POST (punch in/out)
│       │   ├── punch/
│       │   │   └── route.ts      # POST — punch in or out
│       │   └── status/
│       │       └── route.ts      # GET — current punch-in status
│       ├── inbox/
│       │   ├── route.ts          # GET (list), POST (capture)
│       │   └── [id]/
│       │       └── resolve/
│       │           └── route.ts  # POST — triage to task/note/kb
│       ├── templates/
│       │   └── route.ts          # CRUD for templates
│       ├── recurring/
│       │   └── route.ts          # CRUD for recurring tasks
│       ├── activity/
│       │   └── route.ts          # GET — activity log with filters
│       └── attachments/
│           ├── route.ts          # POST — upload file
│           └── [id]/
│               └── route.ts      # GET — serve file
├── components/                   # Shared React components
│   ├── layout/
│   │   ├── Sidebar.tsx           # Main navigation sidebar
│   │   ├── Header.tsx            # Page header with breadcrumbs
│   │   └── CommandBar.tsx        # Cmd+K quick action bar
│   ├── sprint/
│   │   ├── KanbanBoard.tsx       # Drag-and-drop kanban columns
│   │   ├── KanbanCard.tsx        # Individual task card on board
│   │   ├── SprintHeader.tsx      # Sprint name, dates, progress bar
│   │   └── SprintGoals.tsx       # Goal list with progress
│   ├── task/
│   │   ├── TaskDetail.tsx        # Full task view panel
│   │   ├── TaskForm.tsx          # Create/edit task form
│   │   ├── TaskNotes.tsx         # Notes thread within a task
│   │   └── TicketBadge.tsx       # Jira/external ticket link badge
│   ├── notes/
│   │   ├── NoteEditor.tsx        # Markdown editor component
│   │   ├── NoteCard.tsx          # Note preview card
│   │   ├── NoteLinkSelector.tsx  # UI for linking notes together
│   │   └── PromoteToKB.tsx       # One-click promote note to KB
│   ├── calendar/
│   │   ├── DayView.tsx           # Single day with time slots
│   │   └── WeekView.tsx          # Week overview
│   ├── time/
│   │   ├── PunchClock.tsx        # Punch in/out button with timer
│   │   └── TimeBreakdown.tsx     # Pie chart by workstream
│   ├── inbox/
│   │   ├── QuickCapture.tsx      # Universal input box
│   │   └── InboxItem.tsx         # Triage card with action buttons
│   ├── dashboard/
│   │   ├── TodayView.tsx         # Today's tasks + calendar + clock
│   │   ├── FocusMode.tsx         # Current task spotlight
│   │   └── SprintProgress.tsx    # Sprint completion overview
│   ├── kb/
│   │   ├── ArticleEditor.tsx     # KB article markdown editor
│   │   └── ArticleBrowser.tsx    # Category/tag browsing
│   └── shared/
│       ├── TagPicker.tsx         # Multi-select tag component
│       ├── MarkdownRenderer.tsx  # Render markdown content
│       ├── FileUploader.tsx      # Drag-and-drop file upload
│       ├── SearchBar.tsx         # Global search component
│       └── ActivityFeed.tsx      # Activity log timeline
├── lib/
│   ├── db.ts                     # SQLite connection singleton (better-sqlite3)
│   ├── schema.sql                # Database schema (copy from repo root)
│   ├── seed.ts                   # Run schema + seed data
│   ├── queries/                  # Organized query functions
│   │   ├── sprints.ts
│   │   ├── tasks.ts
│   │   ├── notes.ts
│   │   ├── kb.ts
│   │   ├── tags.ts
│   │   ├── time.ts
│   │   ├── inbox.ts
│   │   ├── templates.ts
│   │   ├── recurring.ts
│   │   └── activity.ts
│   └── utils.ts                  # Shared helpers (date formatting, slug generation)
├── mcp-server/                   # MCP server — separate package
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              # MCP server entry point (stdio transport)
│   │   ├── db.ts                 # SQLite connection (same DB file)
│   │   └── tools/                # One file per tool group
│   │       ├── sprint-tools.ts   # get_sprint_summary, create_sprint, close_sprint
│   │       ├── task-tools.ts     # add_task, update_task, get_today_tasks, move_task
│   │       ├── note-tools.ts     # create_note, search_notes, link_notes
│   │       ├── kb-tools.ts       # add_kb_article, search_kb, promote_note_to_kb
│   │       ├── time-tools.ts     # punch_in, punch_out, get_time_status, log_task_time
│   │       ├── inbox-tools.ts    # quick_capture, list_inbox, resolve_inbox_item
│   │       ├── plan-tools.ts     # get_today_plan, get_weekly_summary, get_standup
│   │       └── send-tools.ts     # send_to_task (Claude Code pushes data to a task)
│   └── dist/                     # Compiled output
├── data/
│   ├── planner.db                # SQLite database file (gitignored)
│   └── attachments/              # Uploaded files (gitignored)
├── schema.sql                    # Master schema file
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── .gitignore
├── claude_desktop_config.json    # MCP connection config example
└── README.md
```

---

## 4. Database schema

The full schema is in `schema.sql` at the project root. Here is a summary of all 15 tables and their relationships.

### Tables

#### Sprint & task layer

**`sprints`** — a time-boxed work cycle. Every task must belong to a sprint.
- Fields: `id`, `name`, `goals_summary`, `start_date`, `end_date`, `status` (planned|active|closed), timestamps
- Relationships: has many `tasks`, has many `sprint_goals`, has one `sprint_retros`

**`sprint_goals`** — discrete objectives within a sprint.
- Fields: `id`, `sprint_id` (FK → sprints), `title`, `progress_pct` (0-100)
- Relationship: belongs to `sprints`

**`sprint_retros`** — one retrospective per sprint, filled at close.
- Fields: `id`, `sprint_id` (FK → sprints, unique), `went_well`, `needs_improvement`, `action_items`
- Relationship: belongs to `sprints` (1:1)

**`tasks`** — the core work unit. Always belongs to a sprint.
- Fields: `id`, `sprint_id` (FK → sprints), `title`, `description_md`, `status` (todo|in_progress|review|done), `priority` (low|medium|high|urgent), `task_type` (general|development), `ticket_id`, `ticket_url`, `estimated_hours`, `actual_hours`, `due_date`, `sort_order`, `carried_from_task_id` (self-ref FK → tasks), `template_id` (FK → templates), timestamps
- Relationships: belongs to `sprints`, has many `notes`, has many `attachments`, has many `task_tags`, has many `time_logs`, can self-reference via `carried_from_task_id`

#### Notes & knowledge layer

**`notes`** — standalone or task-linked notes. Supports meeting notes, standups, and Claude Code output.
- Fields: `id`, `task_id` (FK → tasks, nullable), `title`, `content_md`, `note_type` (general|meeting|standup|retro), `attendees`, `source` (manual|claude_code|claude_desktop), timestamps
- Relationships: optionally belongs to `tasks`, has many `attachments`, has many `note_tags`, participates in `note_links`

**`note_links`** — connects notes to other notes (directed graph).
- Fields: `id`, `from_note_id` (FK → notes), `to_note_id` (FK → notes), `link_type` (reference|related|followup)
- Constraint: UNIQUE(from_note_id, to_note_id)

**`kb_articles`** — long-lived reference content, the personal wiki.
- Fields: `id`, `title`, `content_md`, `category`, `source_note_id` (FK → notes, nullable), timestamps
- Relationships: optionally traces back to a `notes` row, has many `attachments`, has many `kb_tags`

**`attachments`** — files attached to exactly one parent entity.
- Fields: `id`, `task_id` (FK, nullable), `note_id` (FK, nullable), `kb_article_id` (FK, nullable), `file_name`, `file_path`, `file_type`, `file_size_bytes`, `source` (upload|claude_code|clipboard)
- Constraint: CHECK ensures exactly one of task_id/note_id/kb_article_id is non-null

#### Organization layer

**`tags`** — universal tag definitions with colors.
- Fields: `id`, `name` (unique), `color` (hex)
- Seed data: Aimee (#3B82F6), Hemotag (#EF4444), Immigration (#F59E0B), Content (#8B5CF6), Research (#10B981)

**`task_tags`**, **`note_tags`**, **`kb_tags`** — join tables linking tags to tasks, notes, and KB articles.
- Composite primary keys: (entity_id, tag_id)

#### Time & activity layer

**`time_logs`** — punch in/out and per-task time tracking.
- Fields: `id`, `task_id` (FK, nullable), `log_type` (punch_in|punch_out|task_time), `start_time`, `end_time`, `duration_hours`, `notes`
- When task_id is null: general punch in/out. When set: time tracked against a specific task.

**`activity_log`** — append-only audit trail.
- Fields: `id`, `entity_type` (sprint|task|note|kb|time|inbox|attachment), `entity_id`, `action`, `detail_json`, `created_at`
- Every create/update/delete across the system writes a row here.

#### Support layer

**`templates`** — reusable structures for tasks, meeting notes, and sprints.
- Fields: `id`, `name`, `template_type` (task|meeting_note|sprint), `content_json`
- Seed data: "1:1 Meeting", "Team Standup", "Sprint Planning", "Sprint Retro", "New Aimee Agent"

**`recurring_tasks`** — auto-generated tasks on a schedule.
- Fields: `id`, `template_id` (FK, nullable), `title`, `description_md`, `frequency` (daily|weekly|monthly), `day_of_week`, `day_of_month`, `tag_names`, `active`, `last_created_at`

**`inbox_items`** — quick capture bucket.
- Fields: `id`, `content`, `resolved_to` (task|note|kb|dismissed), `resolved_id`, timestamps

#### Full-text search

**`notes_fts`** and **`kb_fts`** — FTS5 virtual tables indexing title and content_md. Kept in sync via AFTER INSERT/UPDATE/DELETE triggers on `notes` and `kb_articles`.

---

## 5. Feature specifications

### 5.1 Dashboard (home page — `/`)

The first screen the user sees. Answers: "What should I be doing right now?"

**Components:**
- **Today view**: shows all tasks from the active sprint that are due today or in progress, plus any time-blocked tasks from the calendar
- **Focus mode indicator**: highlights the single highest-priority in-progress task. One task, front and center, with a start/stop timer
- **Sprint progress bar**: completion percentage of the active sprint (done tasks / total tasks), with sprint name and days remaining
- **Quick capture inbox**: a persistent input bar at the top — type anything, hit enter, it lands in `inbox_items`. Sort it later
- **Punch clock widget**: shows current punch-in status. Big button to punch in/out. Shows today's total hours
- **Recent activity feed**: last 10 entries from `activity_log`, rendered as a timeline

**Behavior:**
- If no active sprint exists, prompt to create or activate one
- Quick capture works from any page (globally accessible via Cmd+K or a floating input)
- Punch clock persists across page navigations (rendered in the sidebar or header)

### 5.2 Sprint management (`/sprints`, `/sprints/[id]`)

**Sprint list page (`/sprints`):**
- Lists all sprints in reverse chronological order
- Shows status badge (planned/active/closed), date range, task count, completion percentage
- "Create Sprint" button opens a form: name, start date, end date, goals summary
- Only one sprint can be `active` at a time — activating a new one should prompt to close the current active sprint

**Sprint detail page (`/sprints/[id]`):**
- **Kanban board** with four columns: Todo → In Progress → Review → Done
- Drag-and-drop to move tasks between columns (updates task status)
- Each kanban card shows: title, priority badge, tag chips, ticket badge (if development), due date
- Clicking a card opens the task detail panel (slide-over or modal)
- **Sprint header**: sprint name, date range, goals, progress bar
- **Sprint goals section**: list of goals with editable progress percentages
- "Add Task" button at the top of the Todo column
- Filter/sort: by tag, by priority, by task type (general vs development)

**Sprint close flow:**
- Closing a sprint triggers a flow:
  1. Show all incomplete tasks (todo, in_progress, review)
  2. User selects which to carry forward vs drop
  3. Carried tasks are duplicated into the next sprint with `carried_from_task_id` set
  4. Prompt to fill the sprint retrospective
  5. Sprint status set to `closed`

**Sprint retrospective (`/sprints/[id]/retro`):**
- Three markdown editors: "What went well", "What needs improvement", "Action items"
- Auto-populated with stats: tasks completed, tasks carried, total hours logged, velocity vs previous sprint

### 5.3 Tasks (`/tasks/[id]`)

Tasks are accessed from the sprint kanban board. No standalone task list page — tasks always live within a sprint context.

**Task detail view:**
- **Header**: title (editable inline), status dropdown, priority dropdown, tag picker
- **Type toggle**: general vs development. When development is selected, show ticket_id and ticket_url fields
- **Description**: markdown editor for the task body
- **Time tracking section**: estimated hours input, actual hours display (summed from time_logs), start/stop timer button that creates time_log entries
- **Notes thread**: chronological list of all notes linked to this task. Each note shows its source badge (manual, claude_code, claude_desktop). "Add Note" button opens an inline markdown editor
- **Attachments section**: list of attached files with previews (images) or download links. Drag-and-drop upload zone
- **Carry-over history**: if this task was carried from a previous sprint, show the chain (linked via carried_from_task_id). Clickable to view the original task
- **Metadata footer**: created date, last updated, sprint name

**Task creation form:**
- Title (required)
- Description (markdown, optional)
- Priority: low / medium / high / urgent (default: medium)
- Task type: general / development (default: general)
- Ticket ID and URL (shown only when type = development)
- Tags: multi-select from existing tags
- Due date (optional)
- Estimated hours (optional)
- Template: optionally create from a task template

### 5.4 Notes engine (`/notes`, `/notes/[id]`)

**Notes list page (`/notes`):**
- All notes, newest first. Filterable by: note_type, source, tag, linked task
- Search bar using FTS5 — searches title and content
- Toggle between "all notes" and "standalone notes only" (task_id IS NULL)

**Note editor (`/notes/[id]`):**
- **Title** (editable)
- **Markdown editor** — full markdown support with live preview
- **Metadata bar**: note_type selector, source badge (read-only), attendees field (for meeting notes), tags
- **Template selector**: if note_type is "meeting", offer to apply a meeting note template (fills in section headers)
- **Task link**: optional link to a task. Dropdown to select from active sprint tasks
- **Note-to-note links section**: shows all linked notes (incoming and outgoing). Add link button with a note search/picker. Link type selector: reference / related / followup
- **Attachments**: upload and manage files attached to this note
- **Promote to KB button**: one-click creates a `kb_articles` row with the note's content copied in and `source_note_id` set. Opens the KB article editor for refinement

**Meeting note flow:**
1. Click "New Meeting Note"
2. Select template (1:1, standup, sprint planning, retro, or blank)
3. Template pre-fills section headers in the markdown body
4. Fill in attendees
5. Write notes under each section
6. Action items from the note can be converted to tasks (creates a task in the active sprint linked to this note)

### 5.5 Knowledge base (`/kb`, `/kb/[id]`)

**KB browser (`/kb`):**
- Grid or list view of all articles, grouped by category
- Search bar using FTS5
- Filter by tag, category
- "New Article" button

**KB article editor (`/kb/[id]`):**
- Title, markdown body, category selector (free text with autocomplete from existing categories), tags
- If promoted from a note: "Source note" link back to the original
- Cross-links: ability to reference other KB articles within the content (wiki-style links using `[[Article Title]]` syntax that resolve to links)
- Attachments section

### 5.6 Calendar (`/calendar`)

**Day view:**
- 24-hour timeline with tasks shown as time blocks
- Tasks are placed based on their scheduled time (if time-blocked) or shown in a "unscheduled" section
- Drag to reschedule a task's time block
- Punch in/out events shown as background shading
- Click empty time slot to create a new task or time block

**Week view:**
- 7-day grid overview showing task density per day
- Color-coded by tag/workstream
- Click any day to drill into day view

**Note:** This is a local calendar for your tasks only — it does not sync with Google Calendar. The MCP server can read Google Calendar separately if needed.

### 5.7 Time clock

**Punch in/out widget (always visible in sidebar):**
- Big toggle button: "Punch In" / "Punch Out"
- Shows current session duration as a live timer
- Shows today's total hours worked
- On punch out: optionally add a note about what you worked on

**Time breakdown view (accessible from dashboard or a `/time` page):**
- Daily/weekly/monthly toggle
- Pie chart showing hours by workstream tag
- Table of time log entries with task names
- Comparison: estimated vs actual hours per task for closed tasks

### 5.8 Templates & automation (`/templates`)

**Template management page:**
- List all templates grouped by type (task, meeting_note, sprint)
- Create / edit / delete templates
- Each template has a name and a `content_json` blob

**Task template `content_json` structure:**
```json
{
  "title_prefix": "Aimee: ",
  "default_priority": "high",
  "default_tags": ["Aimee"],
  "subtasks": [
    "Prompt engineering",
    "ElevenLabs agent config",
    "Knowledge base setup",
    "Twilio routing",
    "Testing & QA"
  ]
}
```
When creating a task from this template: creates the parent task + child tasks for each subtask (child tasks are regular tasks in the same sprint, with a naming convention like "Parent Title — Subtask Name").

**Meeting note template `content_json` structure:**
```json
{
  "sections": ["Updates", "Discussion Points", "Action Items", "Decisions Made"],
  "default_attendees": "Brent, Vishal"
}
```
When creating a note from this template: pre-fills the markdown body with `## Section Name` headers.

**Sprint template `content_json` structure:**
```json
{
  "default_duration_days": 14,
  "default_tasks": [
    { "title": "Sprint planning", "priority": "high", "task_type": "general" },
    { "title": "Sprint retro", "priority": "medium", "task_type": "general" }
  ]
}
```

**Recurring tasks:**
- Managed on the templates page in a separate section
- Each recurring task has: title, description, frequency (daily/weekly/monthly), optional template reference
- A background process (can be a cron job or checked on app startup) creates tasks in the active sprint when they're due
- "Last created" timestamp prevents duplicates

### 5.9 Inbox & quick capture (`/inbox`)

**Quick capture:**
- Available globally via a floating input or Cmd+K
- Type anything → hits `inbox_items` table
- No categorization at capture time — pure brain dump

**Inbox triage page (`/inbox`):**
- List of unresolved inbox items, oldest first
- Each item shows the raw text and timestamp
- Action buttons per item:
  - **→ Task**: opens task creation form pre-filled with the inbox text as the title
  - **→ Note**: creates a new standalone note with the inbox text as content
  - **→ KB**: creates a KB article draft with the inbox text
  - **Dismiss**: marks as dismissed
- Resolved items move to a "resolved" section (collapsed by default)

### 5.10 Activity log & standup generation

**Activity log:**
- Every mutation in the system writes to `activity_log`:
  - Task created, status changed, updated
  - Note created, updated, linked
  - KB article created, updated
  - Sprint created, activated, closed
  - Punch in/out
  - Attachment added
  - Inbox item resolved
- Format: `{ entity_type, entity_id, action, detail_json, created_at }`
- `detail_json` captures the change, e.g. `{"from": "todo", "to": "in_progress"}` for status changes, `{"field": "title", "old": "...", "new": "..."}` for updates

**Standup generation (via MCP):**
- Claude reads `activity_log` for yesterday and today
- Auto-generates: "Yesterday I completed X, Y. Today I'm working on A, B. Blocked on C."
- This is a read operation via the MCP server, not a UI page

**Weekly review (via MCP):**
- Claude reads the current sprint's tasks, time_logs, and activity_log for the past 7 days
- Generates: sprint progress, hours worked, tasks completed vs carried, top accomplishments

---

## 6. MCP server specification

### Connection

- Transport: **stdio** (Claude Desktop and Claude Code launch the server as a subprocess)
- The MCP server connects to the same SQLite database file as the web app
- Both can run simultaneously (SQLite WAL mode supports concurrent readers)

### Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "planner": {
      "command": "node",
      "args": ["/absolute/path/to/personal-planner/mcp-server/dist/index.js"],
      "env": {
        "DB_PATH": "/absolute/path/to/personal-planner/data/planner.db"
      }
    }
  }
}
```

### Tool definitions

Each tool should have a clear name, description, and JSON Schema for input parameters.

#### Planning tools

**`get_today_plan`**
- Input: none
- Returns: active sprint summary, today's tasks (due today or in_progress), current punch-in status, today's hours worked, inbox item count
- This is the main "plan my day" tool

**`get_sprint_summary`**
- Input: `{ sprint_id?: number }` (defaults to active sprint)
- Returns: sprint name, dates, goals + progress, task counts by status, total estimated vs actual hours, days remaining

**`get_standup`**
- Input: none
- Returns: yesterday's completed tasks and key activity, today's planned tasks, any tasks marked as blocked (high priority + no progress in 2+ days)

**`get_weekly_summary`**
- Input: `{ week_offset?: number }` (0 = this week, -1 = last week)
- Returns: tasks completed, hours logged, time breakdown by tag, sprint progress delta, carried tasks

#### Task tools

**`add_task`**
- Input: `{ title, description?, priority?, task_type?, ticket_id?, ticket_url?, tags?: string[], due_date?, estimated_hours?, sprint_id? }`
- Creates task in the specified sprint (defaults to active sprint)
- Returns: created task object

**`update_task`**
- Input: `{ task_id, status?, priority?, title?, description?, ticket_id?, ticket_url?, actual_hours?, due_date? }`
- Updates specified fields
- Returns: updated task object

**`get_task_details`**
- Input: `{ task_id }`
- Returns: full task with notes, attachments, tags, time logs, carry-over history

**`move_task`**
- Input: `{ task_id, status }`
- Shorthand for updating just the status
- Returns: updated task

#### Note tools

**`create_note`**
- Input: `{ title, content_md, task_id?, note_type?, attendees?, tags?: string[] }`
- Creates note, optionally linked to a task
- Source auto-set based on caller (claude_desktop or claude_code)
- Returns: created note object

**`search_notes`**
- Input: `{ query, limit?: number }`
- Uses FTS5 to search notes
- Returns: matching notes with snippets

**`link_notes`**
- Input: `{ from_note_id, to_note_id, link_type? }`
- Creates a note-to-note link
- Returns: link object

**`promote_note_to_kb`**
- Input: `{ note_id, category? }`
- Creates KB article from note content
- Returns: created KB article

#### KB tools

**`add_kb_article`**
- Input: `{ title, content_md, category?, tags?: string[] }`
- Returns: created article

**`search_kb`**
- Input: `{ query, limit?: number }`
- Uses FTS5 to search KB articles
- Returns: matching articles with snippets

#### Time tools

**`punch_in`**
- Input: `{ notes?: string }`
- Creates a punch_in time_log entry
- Returns: confirmation with start time

**`punch_out`**
- Input: `{ notes?: string }`
- Closes the current open punch_in entry, computes duration
- Returns: session duration

**`get_time_status`**
- Input: none
- Returns: whether currently punched in, current session duration, today's total hours

**`log_task_time`**
- Input: `{ task_id, duration_hours, notes?: string }`
- Creates a task_time entry
- Returns: confirmation

#### Inbox tools

**`quick_capture`**
- Input: `{ content }`
- Creates an inbox item
- Returns: confirmation

**`list_inbox`**
- Input: `{ include_resolved?: boolean }`
- Returns: inbox items

**`resolve_inbox_item`**
- Input: `{ inbox_id, resolve_to: 'task' | 'note' | 'kb' | 'dismissed', target_data?: object }`
- Resolves an inbox item — if task/note/kb, creates the entity from the content
- Returns: created entity or confirmation

#### Data pipeline tool (for Claude Code)

**`send_to_task`**
- Input: `{ task_id, content_md, title?, attachment_paths?: string[] }`
- Creates a note on the task with `source: 'claude_code'`
- Optionally copies files to attachments directory and creates attachment records
- Returns: created note + attachments
- This is the primary tool for Claude Code to push code analysis results, architecture reviews, bug investigations, etc. into the planner

---

## 7. UI design guidelines

### Layout
- **Sidebar navigation** (left, collapsible): Dashboard, Sprints, Notes, Knowledge Base, Calendar, Inbox, Templates
- **Punch clock widget**: always visible in the sidebar footer
- **Command bar**: Cmd+K opens a global search/action palette (quick capture, navigate, search notes/KB)
- **Content area**: main content with a clean, minimal design

### Design system
- **Colors**: use Tailwind's default palette. Primary accent: blue-600. Tags use their custom colors
- **Typography**: system font stack (`font-sans` in Tailwind). Monospace for code blocks in markdown
- **Cards**: rounded corners (rounded-lg), subtle border, hover shadow
- **Dark mode**: support via Tailwind's `dark:` variant. Respect `prefers-color-scheme`
- **Kanban cards**: compact, showing title + priority dot + tag chips + due date. No heavy borders
- **Status colors**: todo=gray, in_progress=blue, review=amber, done=green
- **Priority indicators**: low=gray dot, medium=blue dot, high=orange dot, urgent=red dot

### Interactions
- Drag-and-drop for kanban columns (use `@dnd-kit/core` or `react-beautiful-dnd`)
- Inline editing for task titles (click to edit)
- Slide-over panels for task detail (don't navigate away from the board)
- Toast notifications for actions (task created, note saved, etc.)
- Keyboard shortcuts: Cmd+K (command bar), Cmd+N (new task), Cmd+Shift+N (new note), Cmd+Enter (save)

---

## 8. Build order

Build in this sequence. Each phase should be fully functional before moving to the next.

### Phase 1: Foundation
1. Initialize Next.js project with TypeScript and Tailwind
2. Set up `better-sqlite3` connection in `lib/db.ts`
3. Create `schema.sql` and `lib/seed.ts` to initialize the database
4. Build the sidebar layout component with navigation
5. Add dark mode support

### Phase 2: Sprint & task core
1. API routes for sprints CRUD
2. API routes for tasks CRUD (within a sprint)
3. Sprint list page
4. Sprint detail page with kanban board (drag-and-drop)
5. Task detail slide-over panel
6. Task creation form with type toggle (general/development), ticket fields, tags
7. Sprint close flow (carry-over logic)

### Phase 3: Notes engine
1. API routes for notes CRUD + FTS5 search
2. API routes for note links
3. Notes list page with search
4. Note editor with markdown support
5. Task-note linking (view notes on task detail, create notes from task)
6. Note-to-note linking UI
7. Meeting note templates (apply template on creation)

### Phase 4: Knowledge base
1. API routes for KB CRUD + FTS5 search
2. KB browser page with category grouping
3. KB article editor
4. Promote note to KB flow
5. Tag management for KB articles

### Phase 5: Time clock & calendar
1. API routes for time logs + punch in/out
2. Punch clock widget in sidebar
3. Time breakdown view (pie chart by workstream)
4. Calendar day view with task time blocks
5. Calendar week view

### Phase 6: Dashboard
1. Today view component (assembles tasks, clock, progress)
2. Focus mode indicator
3. Sprint progress bar
4. Recent activity feed
5. Wire it all together as the home page

### Phase 7: Templates, automation & inbox
1. API routes for templates CRUD
2. API routes for recurring tasks
3. Template management page
4. Recurring task generation logic (check on app startup or via a scheduled job)
5. API routes for inbox
6. Quick capture input (global)
7. Inbox triage page
8. Command bar (Cmd+K)

### Phase 8: Activity log
1. Integrate activity_log writes into all existing API routes
2. Activity feed component
3. API route for filtered activity queries

### Phase 9: MCP server
1. Initialize MCP server package with `@modelcontextprotocol/sdk`
2. Set up stdio transport and SQLite connection
3. Implement planning tools: get_today_plan, get_sprint_summary, get_standup, get_weekly_summary
4. Implement task tools: add_task, update_task, get_task_details, move_task
5. Implement note tools: create_note, search_notes, link_notes, promote_note_to_kb
6. Implement KB tools: add_kb_article, search_kb
7. Implement time tools: punch_in, punch_out, get_time_status, log_task_time
8. Implement inbox tools: quick_capture, list_inbox, resolve_inbox_item
9. Implement send_to_task tool for Claude Code pipeline
10. Test with Claude Desktop

### Phase 10: Polish
1. Responsive design pass (works on laptop screens)
2. Keyboard shortcuts
3. Toast notifications
4. Error handling and empty states
5. README with setup instructions

---

## 9. Setup & run instructions (for README.md)

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/personal-planner.git
cd personal-planner

# Install dependencies
npm install

# Initialize the database
npm run seed

# Start the development server
npm run dev
# Open http://localhost:3000

# Build and start MCP server
cd mcp-server
npm install
npm run build

# Connect to Claude Desktop:
# Copy claude_desktop_config.json paths to:
# ~/Library/Application Support/Claude/claude_desktop_config.json
# Restart Claude Desktop
```

### npm scripts to set up

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "seed": "tsx lib/seed.ts",
    "mcp:build": "cd mcp-server && npm run build",
    "mcp:dev": "cd mcp-server && npm run dev"
  }
}
```

---

## 10. Key implementation notes

### Database connection (`lib/db.ts`)
```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'planner.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
```

### Activity log helper
Every API route that mutates data should call this:
```typescript
export function logActivity(
  entityType: string,
  entityId: number,
  action: string,
  detail?: Record<string, unknown>
) {
  const db = getDb();
  db.prepare(`
    INSERT INTO activity_log (entity_type, entity_id, action, detail_json)
    VALUES (?, ?, ?, ?)
  `).run(entityType, entityId, action, detail ? JSON.stringify(detail) : null);
}
```

### Sprint close logic
```typescript
export function closeSprint(sprintId: number, carryTaskIds: number[], nextSprintId: number) {
  const db = getDb();
  const transaction = db.transaction(() => {
    // 1. Duplicate carried tasks into next sprint
    for (const taskId of carryTaskIds) {
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      db.prepare(`
        INSERT INTO tasks (sprint_id, title, description_md, status, priority, task_type,
                          ticket_id, ticket_url, estimated_hours, due_date, carried_from_task_id)
        VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, ?, ?, ?)
      `).run(nextSprintId, task.title, task.description_md, task.priority, task.task_type,
             task.ticket_id, task.ticket_url, task.estimated_hours, task.due_date, taskId);
    }
    // 2. Close the sprint
    db.prepare("UPDATE sprints SET status = 'closed', updated_at = datetime('now') WHERE id = ?").run(sprintId);
  });
  transaction();
}
```

### MCP server entry point pattern
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'personal-planner',
  version: '1.0.0',
});

// Register tools
server.tool('get_today_plan', 'Get today\'s tasks, sprint status, and time clock', {}, async () => {
  // ... query DB and return structured data
});

server.tool('add_task', 'Add a task to a sprint', {
  title: { type: 'string', description: 'Task title' },
  // ... other params
}, async (params) => {
  // ... insert into DB and return
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 11. .gitignore

```
node_modules/
.next/
data/planner.db
data/attachments/
mcp-server/dist/
*.log
.env
.DS_Store
```

---

## 12. Non-goals (explicitly out of scope)

- Multi-user / team features — this is a single-person tool
- Cloud sync or backup — data lives locally only
- Mobile app — desktop/laptop browser only
- Google Calendar sync — the calendar is local task scheduling only
- Authentication — no login, no passwords
- Electron wrapper — runs as a web app in the browser, not a native app
- Real-time collaboration — single user, no websockets needed
