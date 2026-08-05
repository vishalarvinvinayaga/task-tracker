"""
Adversarial tests: injection, traversal, and data-integrity boundaries.

The app is single-user and binds to loopback with no auth by design, so the
threat model here is malformed/hostile *content* rather than a hostile network
peer — content that arrives via the API (including from the MCP server, which
relays text produced by an LLM) and later gets rendered in the browser.
"""
import io
import re

import pytest


def _tags_in(html: str) -> list[str]:
    """Tag names present in a snippet — anything beyond b//b means unescaped markup."""
    return [t.lower() for t in re.findall(r"<\s*(/?\w+)", html)]


# ---------- SQL injection ----------

@pytest.mark.parametrize(
    "payload",
    [
        "'; DROP TABLE tasks; --",
        "' OR '1'='1",
        "1; DELETE FROM notes WHERE 1=1; --",
        "\\'; TRUNCATE sprints; --",
    ],
)
def test_sql_injection_in_text_fields_is_inert(client, sprint, payload):
    """Payloads must round-trip as literal text, never execute."""
    t = client.post("/api/tasks", json={"title": payload}).json()
    assert t["title"] == payload

    # tables still intact
    assert client.get("/api/tasks").json()
    assert client.get("/api/sprints").json()


@pytest.mark.parametrize("payload", ["'; DROP TABLE notes; --", "x' OR 1=1 --", "%' UNION SELECT"])
def test_sql_injection_in_search_is_inert(client, note, payload):
    """Search feeds user input to plainto_tsquery — must be parameterised."""
    resp = client.get("/api/notes/search", params={"q": payload})
    assert resp.status_code == 200
    assert client.get("/api/notes").json()  # note survived


def test_injection_in_filter_params(client, sprint):
    resp = client.get("/api/tasks", params={"status": "todo'; DROP TABLE tasks; --"})
    assert resp.status_code == 200
    assert resp.json() == []
    assert client.get("/api/sprints").json()


# ---------- stored XSS via search snippets ----------

def test_search_snippet_does_not_emit_raw_html(client):
    """
    The UI renders snippets with dangerouslySetInnerHTML to show <b> match
    highlights, so anything else HTML-ish in the snippet is a stored-XSS vector.
    """
    client.post(
        "/api/notes",
        json={
            "title": "Payload note",
            "content_md": "<script>alert('xss')</script> dangerous content here",
        },
    )
    snippet = client.get("/api/notes/search?q=dangerous").json()[0]["snippet"]

    assert "<script>" not in snippet.lower()
    assert "&lt;script&gt;" in snippet.lower()
    # only the highlight markup ts_headline itself adds may remain
    assert set(_tags_in(snippet)) <= {"b", "/b"}


def test_kb_search_snippet_does_not_emit_raw_html(client):
    client.post(
        "/api/kb",
        json={"title": "Payload", "content_md": "<img src=x onerror=alert(1)> exploitable text"},
    )
    snippet = client.get("/api/kb/search?q=exploitable").json()[0]["snippet"]

    assert "<img" not in snippet.lower()
    assert "&lt;img" in snippet.lower()
    assert set(_tags_in(snippet)) <= {"b", "/b"}


def test_search_snippet_still_highlights(client):
    """Escaping must not break the legitimate <b> highlight markers."""
    client.post("/api/notes", json={"title": "clean", "content_md": "a distinctive keyword here"})
    snippet = client.get("/api/notes/search?q=distinctive").json()[0]["snippet"]
    assert "<b>" in snippet


# ---------- path traversal on uploads ----------

@pytest.mark.parametrize(
    "filename",
    [
        "../../../../etc/passwd",
        "..\\..\\windows\\system32\\config\\sam",
        "/etc/shadow",
        "....//....//etc/hosts",
    ],
)
def test_upload_filename_traversal_is_contained(client, task, filename, tmp_path):
    """A hostile filename must not let a write escape the attachments directory."""
    from app.config import settings

    resp = client.post(
        "/api/attachments",
        files={"file": (filename, io.BytesIO(b"payload"), "text/plain")},
        data={"task_id": str(task["id"])},
    )
    assert resp.status_code in (201, 400)

    if resp.status_code == 201:
        stored = (settings.attachments_path / resp.json()["file_path"]).resolve()
        assert stored.is_relative_to(settings.attachments_path.resolve()), (
            f"upload escaped the attachments dir: {stored}"
        )


def test_upload_rejects_empty_filename(client, task):
    resp = client.post(
        "/api/attachments",
        files={"file": ("", io.BytesIO(b"x"), "text/plain")},
        data={"task_id": str(task["id"])},
    )
    assert resp.status_code >= 400


# ---------- attachment ownership integrity ----------

def test_attachment_requires_exactly_one_parent(client, task, note):
    both = client.post(
        "/api/attachments",
        files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")},
        data={"task_id": str(task["id"]), "note_id": str(note["id"])},
    )
    assert both.status_code == 400

    neither = client.post(
        "/api/attachments",
        files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")},
        data={},
    )
    assert neither.status_code == 400


def test_attachment_upload_and_delete(client, task):
    resp = client.post(
        "/api/attachments",
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
        data={"task_id": str(task["id"])},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["file_size_bytes"] == 5
    assert body["task_id"] == task["id"]

    assert len(client.get(f"/api/attachments?task_id={task['id']}").json()) == 1
    assert client.delete(f"/api/attachments/{body['id']}").status_code == 204


# ---------- input bounds ----------

def test_very_long_title_is_handled(client, sprint):
    long_title = "A" * 20_000
    resp = client.post("/api/tasks", json={"title": long_title})
    assert resp.status_code == 201
    assert len(resp.json()["title"]) == 20_000


def test_unicode_and_emoji_round_trip(client, sprint):
    title = "日本語 🚀 café ñ"
    t = client.post("/api/tasks", json={"title": title}).json()
    assert client.get(f"/api/tasks/{t['id']}").json()["title"] == title


def test_null_byte_in_text_rejected_or_stripped(client, sprint):
    """Postgres text columns cannot store NUL — must not 500."""
    resp = client.post("/api/tasks", json={"title": "before\x00after"})
    assert resp.status_code in (201, 400, 422), f"unexpected {resp.status_code}: {resp.text}"


def test_negative_duration_hours(client, task):
    resp = client.post("/api/time/task", json={"task_id": task["id"], "duration_hours": -5})
    # Either rejected, or recorded as-is — but must never 500
    assert resp.status_code < 500


def test_huge_trend_window_does_not_error(client):
    resp = client.get("/api/stats/trends?days=3650")
    assert resp.status_code == 200
    assert len(resp.json()) == 3650


def test_end_date_before_start_date(client):
    resp = client.post(
        "/api/sprints", json={"name": "Backwards", "start_date": "2026-12-31", "end_date": "2026-01-01"}
    )
    assert resp.status_code < 500


# ---------- attachment serving hardening ----------

def test_uploaded_html_is_not_served_inline(client, task):
    """An uploaded .html must download, never render in the app's origin."""
    resp = client.post(
        "/api/attachments",
        files={"file": ("evil.html", io.BytesIO(b"<script>alert(1)</script>"), "text/html")},
        data={"task_id": str(task["id"])},
    )
    assert resp.status_code == 201
    stored = resp.json()["file_path"]

    served = client.get(f"/attachments/{stored}")
    assert served.status_code == 200
    assert served.headers["content-disposition"].startswith("attachment")
    assert served.headers["x-content-type-options"] == "nosniff"
    assert "text/html" not in served.headers["content-type"]


def test_uploaded_svg_is_not_served_inline(client, task):
    """SVG can carry script, so it must not render inline either."""
    resp = client.post(
        "/api/attachments",
        files={"file": ("x.svg", io.BytesIO(b"<svg onload=alert(1)></svg>"), "image/svg+xml")},
        data={"task_id": str(task["id"])},
    ).json()

    served = client.get(f"/attachments/{resp['file_path']}")
    assert served.headers["content-disposition"].startswith("attachment")


def test_real_image_still_renders_inline(client, task):
    """The safelist must keep image previews working."""
    png = bytes.fromhex("89504e470d0a1a0a")  # PNG magic bytes
    resp = client.post(
        "/api/attachments",
        files={"file": ("photo.png", io.BytesIO(png), "image/png")},
        data={"task_id": str(task["id"])},
    ).json()

    served = client.get(f"/attachments/{resp['file_path']}")
    assert served.headers["content-disposition"].startswith("inline")
    assert served.headers["content-type"].startswith("image/png")


def test_stored_filename_is_not_attacker_controlled(client, task):
    """Original name is kept for display, but never used as the path on disk."""
    resp = client.post(
        "/api/attachments",
        files={"file": ("../../etc/passwd", io.BytesIO(b"x"), "text/plain")},
        data={"task_id": str(task["id"])},
    ).json()

    assert "/" not in resp["file_path"]
    assert ".." not in resp["file_path"]


def test_serving_traversal_path_is_refused(client):
    for probe in ["../../../etc/passwd", "..%2f..%2fetc%2fpasswd"]:
        assert client.get(f"/attachments/{probe}").status_code in (400, 404)


def test_oversized_upload_rejected(client, task):
    from app.routers.attachments import MAX_UPLOAD_BYTES

    oversized = b"\x00" * (MAX_UPLOAD_BYTES + 1)
    resp = client.post(
        "/api/attachments",
        files={"file": ("big.bin", io.BytesIO(oversized), "application/octet-stream")},
        data={"task_id": str(task["id"])},
    )
    assert resp.status_code == 413


# ---------- constraint violations surface as 4xx, not 5xx ----------

def test_constraint_violation_returns_400_not_500(client, sprint):
    resp = client.post(f"/api/sprints/{sprint['id']}/goals", json={"title": "x", "progress_pct": 500})
    assert resp.status_code == 422  # caught by schema bounds before reaching the DB


def test_nul_byte_is_stripped_not_fatal(client, sprint):
    resp = client.post("/api/tasks", json={"title": "before\x00after"})
    assert resp.status_code == 201
    assert resp.json()["title"] == "beforeafter"
