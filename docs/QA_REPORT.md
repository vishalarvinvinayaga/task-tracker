# QA & Security Report

**Date:** 2026-08-05
**Scope:** Full backend API, security posture, dependency supply chain, frontend build.
**Result:** 131/131 tests passing · 3 bugs found and fixed · 2 vulnerabilities found and fixed · 16 dependency CVEs cleared.

---

## 1. Test suite

131 tests, all passing, ~7s wall clock.

| Suite | Tests | Covers |
|---|---:|---|
| `test_harness.py` | 5 | Isolation guarantees — proves the suite cannot touch real data |
| `test_sprints.py` | 16 | CRUD, single-active-sprint invariant, goals, retros, close/carry-over |
| `test_tasks.py` | 17 | CRUD, filters, tag replacement semantics, carry chains, activity writes |
| `test_notes_kb.py` | 22 | Notes, note-links, full-text search, KB, promote-to-KB, cascade behaviour |
| `test_time_inbox.py` | 39 | Punch clock, task time, tag breakdown, inbox triage, templates, recurring, activity, stats, profile, tags |
| `test_security.py` | 32 | SQL injection, stored XSS, path traversal, upload hardening, input bounds |

### Isolation

Tests run against **`planner_test_db`**, a database created solely for the suite. `conftest.py`
carries a hard guard that aborts if the connection string doesn't contain `planner_test_db`, so
a misconfigured env var fails loudly instead of mutating real data. Every test starts from a
truncated, freshly-seeded schema.

```bash
cd backend && venv/bin/pytest
```

Verified after the run: the real `planner_db` was untouched (sprint count, tasks, and profile
all unchanged).

---

## 2. Bugs found and fixed

### 2.1 Stored XSS via search snippets — **HIGH**

**Found by:** `test_kb_search_snippet_does_not_emit_raw_html`

Search results are rendered in the UI with `dangerouslySetInnerHTML` in order to display the
`<b>` match highlights that Postgres `ts_headline` produces. But `ts_headline` returns the
**source text verbatim** — it escapes nothing. Any HTML stored in a note or KB article body
therefore reached the DOM as live markup.

Confirmed live: a note containing `<img src=x onerror=alert(document.domain)>` returned that
tag intact in the snippet, and it would have executed on the Notes page.

This matters more than it first appears because notes can be written by the **MCP server** —
i.e. text an LLM produced — not only by hand.

**Fix** (`backend/app/search.py`): escape `&`, `<`, `>` in SQL *before* the text reaches
`ts_headline`, so the only markup in the output is the highlight `ts_headline` adds itself.

```python
def _escape_html(column):
    escaped = func.replace(func.coalesce(column, ""), literal("&"), literal("&amp;"))
    escaped = func.replace(escaped, literal("<"), literal("&lt;"))
    return func.replace(escaped, literal(">"), literal("&gt;"))
```

**Verified:** payload now renders as inert visible text; `<b>` highlighting still works; no
console errors. Regression tests assert no tag other than `b`/`/b` can appear in a snippet.

### 2.2 Uploaded files executed in the app's origin — **MEDIUM**

Attachments were served by a bare `StaticFiles` mount. An uploaded `.html` or `.svg` would
render **inline, in the app's own origin**, giving it a scripting context against the app.

**Fix** (`backend/app/main.py`): replaced the mount with a guarded route that
- always sends `X-Content-Type-Options: nosniff`,
- serves `Content-Disposition: inline` only for a safelist of raster images (png/jpg/gif/webp) and forces `attachment` for everything else, including SVG,
- sends a restrictive `Content-Security-Policy`,
- re-checks path containment before reading from disk.

Image previews still work; HTML and SVG now download instead of executing.

### 2.3 Unhandled 500s on constraint and encoding violations — **MEDIUM**

Two classes of input crashed the request with an unhandled exception and stack trace:

- **NUL bytes** in any text field — Postgres `text` cannot store `0x00`, psycopg raised `DataError`.
- **CHECK constraint violations** — e.g. `progress_pct: 500` on a sprint goal raised `IntegrityError`.

**Fixes:**
- `SanitizedModel` base class in `schemas.py` strips NUL bytes from every incoming string across all 49 schemas.
- `Field(ge=0, le=100)` bounds on goal progress so it fails at 422 validation, before the DB.
- Global `IntegrityError` / `DataError` exception handlers return **400** with a clean message and log the detail server-side, instead of leaking a 500.

---

## 3. Verified-secure findings

These were tested and found **already correct** — recorded so they don't get re-litigated.

| Area | Result |
|---|---|
| **SQL injection** — text fields, search queries, filter params | Inert. SQLAlchemy parameterises everything; `plainto_tsquery` is bound, not interpolated. 8 payload variants tested. |
| **Path traversal on upload** | Contained. Stored filenames are `uuid4().hex + sanitised extension` — the client's filename never reaches the filesystem. 4 traversal patterns tested. |
| **Path traversal on retrieval** | Refused. Containment check via `Path.is_relative_to`. |
| **Attachment ownership** | Enforced by DB CHECK — exactly one parent; zero or two both rejected at 400. |
| **Unicode / emoji / very long input** | Round-trips correctly; 20k-character titles accepted. |
| **Cascade integrity** | Deleting a sprint removes its tasks; deleting a note nulls the KB back-reference rather than orphaning; deleting a tag cleanly removes associations. |

---

## 4. Dependency supply chain

### Python — 16 CVEs found, all cleared

`pip-audit` reported vulnerabilities in three packages, two of them directly in the request path:

| Package | Was | Now | Note |
|---|---|---|---|
| `starlette` | 0.41.3 | **1.4.1** | 9 advisories — ASGI foundation, highest exposure |
| `python-multipart` | 0.0.20 | **0.0.32** | 6 advisories — parses every file upload |
| `python-dotenv` | 1.0.1 | **1.2.2** | 1 advisory |
| `fastapi` | 0.115.6 | **0.141.1** | upgraded to pull compatible starlette |

Post-upgrade: **`No known vulnerabilities found`**, and all 131 tests still pass.

### JavaScript — 1 advisory, assessed as not applicable

`npm audit` reports a **high** advisory against `react-router` (GHSA-qwww-vcr4-c8h2): *"RSC Mode
CSRF Bypass Allows Action Execution Before 400 Response"*.

**Not applicable here.** This is a client-side SPA built with Vite. It uses no React Server
Components, no server actions, and no React Router server runtime — the vulnerable code path
does not exist in this build. The only available "fix" is a downgrade to 7.11.0, which carries
its own larger set of advisories.

**Accepted risk**, to be revisited when a patched 7.18.x+ ships.

---

## 5. Build & runtime verification

| Check | Result |
|---|---|
| Backend test suite | 131 passed |
| `pip-audit` | clean |
| Frontend typecheck (`tsc --noEmit`) | clean |
| Frontend production build (`tsc -b && vite build`) | **1 error found and fixed**, now clean |
| Live API smoke test | health, sprints, profile, OpenAPI all 200 |
| Live UI smoke test | renders, no console errors |
| Drag-and-drop | verified end-to-end; status change persisted to DB |

The production build surfaced a type error (`string | null` vs `string | undefined` in
`NoteEditor`) that `tsc --noEmit` did **not** catch, because `tsc -b` applies the stricter
project-reference configuration. Worth remembering: `npm run build` is the real gate, not the
standalone typecheck.

### Known non-blocking issue

The production bundle is **1.97 MB** (622 KB gzipped), over Vite's 500 KB warning threshold —
driven mainly by the markdown editor and charting library. Irrelevant over loopback, where it
loads instantly; would need code-splitting before any real deployment.

---

## 6. Recommendations

Not done, in rough priority order:

1. **Frontend tests.** There are none. The UI has only been verified manually and via browser automation. Vitest + Testing Library would cover the drag reducer, carry-over modal, and search rendering.
2. **Code-split the bundle** if this ever leaves localhost.
3. **Migrate `@app.on_event("startup")`** to the lifespan API — deprecated in current FastAPI.
4. **`get_weekly_summary`'s velocity delta** is still unimplemented (field exists, always null).
5. **Revisit the react-router advisory** when a patched release lands.

If the app is ever exposed beyond loopback, the entire security model changes and needs
authentication, per-user scoping, CSRF protection, and rate limiting — see
[`docs/ARCHITECTURE.md`](ARCHITECTURE.md) §6.
