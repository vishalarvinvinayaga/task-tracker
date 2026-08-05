# Architecture

Personal Command Center — a local-first, single-user productivity system. Everything runs on
one machine: no cloud services, no accounts, no network exposure beyond loopback.

---

## 1. System overview

Two independent front-ends read and write the **same** Postgres database. The web UI talks to
it over HTTP; Claude talks to it over stdio through an MCP server that imports the backend's
own SQLAlchemy models — so both paths share identical schema, constraints, and business rules.

```mermaid
graph TB
    subgraph human["You"]
        Browser["Browser<br/><i>localhost:5173</i>"]
        Claude["Claude Code / Desktop"]
    end

    subgraph machine["Your machine — loopback only"]
        subgraph web["Web stack"]
            Vite["Vite dev server<br/><i>:5173</i><br/>proxies /api + /attachments"]
            API["FastAPI<br/><i>127.0.0.1:8000</i><br/>14 routers · 67 operations"]
        end

        MCP["MCP server<br/><i>stdio transport</i><br/>22 tools"]

        subgraph data["Persistence"]
            PG[("PostgreSQL 14<br/><b>planner_db</b><br/>16 tables")]
            Files["data/attachments/<br/><i>UUID-named blobs</i>"]
        end
    end

    Browser -->|HTTP| Vite
    Vite -->|proxy| API
    Claude -->|"JSON-RPC over stdio"| MCP

    API -->|SQLAlchemy ORM| PG
    MCP -->|"same ORM models<br/>(imports backend.app)"| PG
    API --> Files

    style PG fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style API fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style MCP fill:#3f2d56,stroke:#a855f7,color:#fff
    style Files fill:#1e3a5f,stroke:#38bdf8,color:#fff
```

**Why the MCP server imports the backend rather than calling its HTTP API:** it removes a whole
class of drift. There is exactly one definition of what a task is, one set of CHECK constraints,
one activity-logging helper. The trade-off is that the MCP server needs the backend package on
its import path — handled by `mcp-server/app_instance.py`.

---

## 2. Request flow

The same write travels a different first mile depending on the entry point, but converges on
one ORM layer and one audit trail.

```mermaid
sequenceDiagram
    participant U as Browser
    participant V as Vite proxy
    participant R as FastAPI router
    participant S as Pydantic schema
    participant O as SQLAlchemy
    participant D as Postgres

    U->>V: POST /api/tasks
    V->>R: proxied
    R->>S: validate body
    Note over S: SanitizedModel strips NUL bytes<br/>Literal types reject bad enums
    S-->>R: typed model (or 422)
    R->>O: Task(...) + resolve_tags()
    R->>O: log_activity(...)
    O->>D: INSERT task, task_tags, activity_log
    Note over D: CHECK constraints are the last line<br/>violations → 400 via exception handler
    D-->>O: committed
    O-->>R: refreshed row
    R-->>U: 201 + TaskRead
```

---

## 3. Data model

16 tables. Sprints own tasks; notes and KB articles float free but can attach to tasks;
everything can be tagged; every mutation lands in `activity_log`.

### Task containers

The `sprints` table is really a *task container* with a type. Both flavours hold tasks
identically; they differ only in how much ceremony they carry.

| | `list` | `sprint` |
|---|---|---|
| Dates | none | required |
| Close & carry-over | never | yes |
| Retro, goals, velocity | hidden | yes |
| How many active | any number | exactly one |

One container is flagged `is_protected` — the **Backlog**. It cannot be deleted, and task
creation falls back to it whenever no sprint is running. That combination is what makes the
`tasks.sprint_id` FK safely `NOT NULL`: there are no orphan tasks and no null-handling spread
through queries, yet capturing a task never requires setting up a sprint first.

Kanban isn't a third mode — the board *is* kanban. Board-vs-checklist is a per-container
`default_view` preference, orthogonal to container type.

```mermaid
erDiagram
    sprints ||--o{ tasks : contains
    sprints ||--o{ sprint_goals : has
    sprints ||--o| sprint_retros : "closes with"
    tasks ||--o{ tasks : "carried_from"
    tasks ||--o{ notes : "annotated by"
    tasks ||--o{ time_logs : "tracked by"
    tasks }o--o{ tags : task_tags
    notes }o--o{ tags : note_tags
    notes ||--o{ note_links : "links to"
    notes ||--o| kb_articles : "promoted to"
    kb_articles }o--o{ tags : kb_tags
    tasks ||--o{ attachments : has
    notes ||--o{ attachments : has
    kb_articles ||--o{ attachments : has
    templates ||--o{ recurring_tasks : "generates from"
    templates ||--o{ tasks : "created from"

    sprints {
        int id PK
        text name
        text container_type "sprint|list"
        date start_date "null on lists"
        date end_date "null on lists"
        text status "planned|active|closed"
        text default_view "board|list"
        bool is_protected "the Backlog"
    }
    tasks {
        int id PK
        int sprint_id FK
        text title
        text status "todo|in_progress|review|done"
        text priority "low|medium|high|urgent"
        text task_type "general|development"
        int carried_from_task_id FK
        numeric estimated_hours
        numeric actual_hours
    }
    notes {
        int id PK
        int task_id FK "nullable"
        text title
        text content_md
        text note_type "general|meeting|standup|retro"
        text source "manual|claude_code|claude_desktop"
        tsvector search_vector "generated, GIN"
    }
    kb_articles {
        int id PK
        text title
        text content_md
        text category
        int source_note_id FK
        tsvector search_vector "generated, GIN"
    }
    time_logs {
        int id PK
        int task_id FK "null = punch clock"
        text log_type "punch_in|punch_out|task_time"
        timestamp start_time
        timestamp end_time
        numeric duration_hours
    }
    activity_log {
        int id PK
        text entity_type
        int entity_id
        text action
        jsonb detail_json
    }
    user_profile {
        int id PK
        text name
        text timezone
        text theme_preset
    }
```

### Design decisions worth naming

| Decision | Rationale |
|---|---|
| `search_vector` as a **generated** column + GIN index | Search index can never drift from content — Postgres recomputes it on every write, no trigger to forget. |
| Attachments are **polymorphic with a CHECK** | Exactly one of `task_id`/`note_id`/`kb_article_id` must be set; the database enforces it rather than trusting callers. |
| `carried_from_task_id` self-reference | Sprint carry-over builds a chain you can walk back through generations, instead of mutating the original. |
| Container **type** rather than a global "planning mode" setting | People mix styles — real sprints for one workstream, a standing list for another. A per-container type lets both coexist; a global mode would force a choice and hide features you'd want. |
| Protected Backlog instead of a nullable `sprint_id` | Keeps the FK `NOT NULL` (no orphans, no null-handling everywhere) while still guaranteeing a task can always be captured. |
| Enums as `TEXT` + `CHECK`, not native enum types | Adding a value is a plain migration, not an `ALTER TYPE` dance. Mirrored in Pydantic `Literal`s so bad values fail at 422 before reaching the DB. |
| `activity_log` append-only, `detail_json` as JSONB | Uniform audit shape across every entity without a column per change type. |

---

## 4. Frontend structure

61 components. State is local-first with a light context layer — no Redux, no server-state
library, because the data volume is small and every page reloads cheaply from a loopback API.

```mermaid
graph LR
    Main["main.tsx"] --> TP["ToastProvider"]
    TP --> PP["ProfileProvider"]
    PP --> App["App.tsx"]

    App -->|"no profile"| Setup["SetupWizard<br/><i>first-run gate</i>"]
    App -->|"profile exists"| Shell

    subgraph Shell["App shell"]
        Grid["GridBackdrop"]
        Side["Sidebar<br/><i>command rail</i>"]
        Routes["React Router"]
        Cmd["CommandBar ⌘K"]
    end

    Routes --> Pages["13 pages"]
    Pages --> HUD["HUD primitives<br/><i>HudPanel · ArcRing<br/>CountUp · StatusRail</i>"]
    Pages --> Api["api/*.ts<br/><i>typed fetch clients</i>"]
    Api --> Lib["lib/api.ts<br/><i>ApiError, JSON handling</i>"]

    style Setup fill:#3f2d56,stroke:#a855f7,color:#fff
    style HUD fill:#1e3a5f,stroke:#38bdf8,color:#fff
```

`ProfileProvider` gates the entire app: with no profile row, the setup wizard is the only thing
that renders. The stored `theme_preset` is applied as CSS custom properties
(`--accent-from/via/to`) on `<html>`, so the whole HUD — panels, glows, charts, progress
arcs — recolours from one source without a re-render.

---

## 5. Runtime & operations

```mermaid
graph LR
    S["setup.sh<br/><i>one-time</i>"] --> B1["brew: python@3.12,<br/>node, postgresql@14"]
    S --> B2["backend/venv<br/>+ deps"]
    S --> B3["setup_db.sh<br/><i>role, db, migrations, seed</i>"]
    S --> B4["npm install"]
    S --> B5["mcp-server/venv"]
    S --> B6[".mcp.json<br/><i>rewritten to clone path</i>"]

    Start["start.sh"] --> P1["uvicorn → .run/backend.pid"]
    Start --> P2["vite → .run/frontend.pid"]
    Stop["stop.sh"] --> K["SIGTERM both, clean PIDs"]
    Reset["reset_data.sh"] --> T["TRUNCATE transactional tables<br/><i>keeps tags + templates</i>"]

    style S fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style Reset fill:#4a2318,stroke:#f87171,color:#fff
```

Postgres runs independently as a `brew services` daemon — the start/stop scripts deliberately
don't manage it, so the database outlives app restarts.

---

## 6. Trust boundaries

```mermaid
graph TB
    subgraph trusted["Trusted — same machine, same user"]
        UI["Web UI"]
        API2["FastAPI<br/><i>bound 127.0.0.1</i>"]
        DB2[("Postgres<br/><i>local socket</i>")]
    end

    subgraph semi["Semi-trusted content"]
        LLM["MCP tool payloads<br/><i>LLM-authored text</i>"]
        Up["Uploaded files"]
    end

    LLM -->|"stored, later rendered"| API2
    Up -->|"served from app origin"| API2
    UI --> API2
    API2 --> DB2

    style semi fill:#4a3318,stroke:#fbbf24,color:#fff
```

There is **no authentication** — that is a deliberate choice for a single-user tool bound to
loopback, and the security posture depends on it staying that way. The real threat model is
*content*, not network peers: text that arrives through the API (including LLM-generated text
via MCP) and files that get uploaded, both of which are later rendered in a browser. Both
paths are hardened — see [`docs/QA_REPORT.md`](QA_REPORT.md).

**If this were ever exposed beyond localhost**, it would need, at minimum: authentication,
per-user data scoping, CSRF protection on state-changing routes, and rate limiting. None of
that exists today.
