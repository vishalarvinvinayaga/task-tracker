# Personal Command Center

A local-first personal productivity system with sprint tracking, notes, a knowledge base,
time tracking, a calendar, an inbox, templates, and a conversational interface via MCP.
Built for a single user. Runs entirely on your laptop — no cloud, no accounts.

Two ways to interact with the same data:

1. **Web UI** — React app at `localhost:5173` for the sprint board, calendar, notes, KB, and dashboard.
2. **Claude Desktop / Claude Code** — connected via an MCP server, so you can talk to your planner
   conversationally ("plan my day", "add a task to the Aimee sprint", "summarize this week").

## Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy 2.0, Alembic |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Database | PostgreSQL 14 (local, via Homebrew) |
| MCP server | Python, official `mcp` SDK, stdio transport |
| Search | Postgres full-text search (`tsvector` + GIN indexes) |

## First-time setup

macOS only. From the project root, after cloning:

```bash
./setup.sh
```

This checks/installs Homebrew, Python 3.12, Node 18+, and Postgres 14 (via Homebrew — skips
anything already present), then sets up the backend venv, the database (role, migrations,
seed data), the frontend's `node_modules`, the MCP server venv, and rewrites `.mcp.json` to
this machine's actual clone path. Safe to re-run any time — every step skips if already done.

Homebrew itself is the one exception: if it's missing, the script prints the official install
command and stops, rather than running an unattended system-level installer for you.

<details>
<summary>Prerequisites setup.sh installs for you</summary>

- macOS with [Homebrew](https://brew.sh)
- Python 3.12 — the system Python (3.9 on most Macs) is too old
- Node.js 18+ and npm
- PostgreSQL 14

</details>

<details>
<summary>Doing it by hand instead</summary>

```bash
./scripts/setup_db.sh     # Postgres role/db, migrations, seed data
cd frontend && npm install
cd mcp-server && python3.12 -m venv venv && venv/bin/pip install -r requirements.txt
```

`scripts/setup_db.sh` alone: starts Postgres via Homebrew if it isn't running, creates a
dedicated `planner` role and `planner_db` database (safe to re-run), copies
`backend/.env.example` to `backend/.env` if missing, runs Alembic migrations, and seeds
reference data (5 workstream tags, 5 templates).

</details>

## Running day-to-day

```bash
./scripts/start.sh   # starts backend + frontend in the background
./scripts/stop.sh    # stops them
```

Postgres is left running as its own background service (`brew services start postgresql@14`
once) — the start/stop scripts only manage the API server and the web dev server. Logs land
in `.run/backend.log` and `.run/frontend.log`; PID files in `.run/` track the processes so
`start.sh` won't double-launch if servers are already up.

Open http://localhost:5173. The Vite dev server proxies `/api` and `/attachments`
requests to the backend, so no extra CORS setup is needed in development.

Prefer running them manually in foreground terminals instead? That still works:

```bash
# Terminal 1 — backend (http://127.0.0.1:8000)
cd backend && venv/bin/uvicorn app.main:app --reload

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

## Resetting your data

Once you start using the app for real, wipe the demo/test data with:

```bash
./scripts/reset_data.sh
```

This deletes all sprints, tasks, notes, KB articles, time logs, inbox items, and attachment
files — it keeps the 5 seed tags and 5 seed templates. It asks for confirmation before
running since it's destructive and not reversible.

FastAPI's interactive API docs are available at http://127.0.0.1:8000/docs.

## Connecting the MCP server to Claude Code / Claude Desktop

The MCP server is a separate Python process that shares the same Postgres database and
SQLAlchemy models as the backend (it imports directly from `backend/app`). Its virtual
environment is already set up at `mcp-server/venv` (recreate with `python3.12 -m venv venv &&
venv/bin/pip install -r requirements.txt` if needed).

**Using Claude Code (this project, conversationally):** a project-scoped `.mcp.json` is
already checked in at the repo root, registering the server. The first time you open a
Claude Code session in this project, you'll be prompted to trust/approve it — accept, and
its 21 tools become available in the conversation.

**Using the standalone Claude Desktop app instead:** copy
`docs/claude_desktop_config.example.json` into
`~/Library/Application Support/Claude/claude_desktop_config.json` (merge it in if that file
already has other `mcpServers` entries — don't overwrite), replacing
`/absolute/path/to/task-planner-tracker` with this repo's actual absolute path, then restart
Claude Desktop.

The MCP server reads `backend/.env` for its database connection, so it always talks to the
same data as the web app — no separate configuration needed. It exposes 21 tools covering
planning (`get_today_plan`, `get_standup`, `get_weekly_summary`, `get_sprint_summary`),
tasks, notes, KB articles, time tracking, inbox capture/triage, and `send_to_task` (the
primary way for Claude Code to push analysis output into a task as a note).

To verify the MCP server works standalone without a live Claude Desktop session, run its
tool functions directly:

```bash
cd mcp-server
venv/bin/python -c "
import server
from tools.planning_tools import get_today_plan
print(get_today_plan())
"
```

## Project layout

```
task-planner-tracker/
├── backend/            FastAPI app, SQLAlchemy models, Alembic migrations
├── frontend/           React + Vite + TypeScript SPA
├── mcp-server/          Python MCP server (imports backend/app directly)
├── data/attachments/    Uploaded files (gitignored)
├── docs/                 Claude Desktop config template
├── scripts/setup_db.sh   One-time Postgres + migrations + seed setup
└── cluade-plan/          Original planning notes and schema reference
```

## Notes

- No authentication — this is a single-user, local-only tool by design.
- The backend binds to `127.0.0.1` only, not `0.0.0.0`.
- Postgres search uses `plainto_tsquery`/`ts_rank`/`ts_headline` against generated
  `tsvector` columns on `notes` and `kb_articles`.
- To point at a different Postgres instance, edit `DATABASE_URL` in `backend/.env`.
