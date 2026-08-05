import pytest


# ---------- notes ----------

def test_create_and_defaults(client):
    n = client.post("/api/notes", json={"title": "n1", "content_md": "body"}).json()
    assert n["note_type"] == "general"
    assert n["source"] == "manual"
    assert n["task_id"] is None


def test_filters(client, sprint, task):
    client.post("/api/notes", json={"title": "standalone", "content_md": "x"})
    client.post("/api/notes", json={"title": "on task", "content_md": "y", "task_id": task["id"]})
    client.post("/api/notes", json={"title": "meeting", "content_md": "z", "note_type": "meeting"})

    assert len(client.get("/api/notes").json()) == 3
    assert len(client.get(f"/api/notes?task_id={task['id']}").json()) == 1
    assert len(client.get("/api/notes?standalone_only=true").json()) == 2
    assert len(client.get("/api/notes?note_type=meeting").json()) == 1


def test_full_text_search(client):
    client.post("/api/notes", json={"title": "Postgres migration", "content_md": "We moved to FastAPI"})
    client.post("/api/notes", json={"title": "Unrelated", "content_md": "Nothing to see"})

    hits = client.get("/api/notes/search?q=fastapi").json()
    assert len(hits) == 1
    assert hits[0]["title"] == "Postgres migration"
    assert "<b>" in hits[0]["snippet"]


def test_search_matches_title_too(client):
    client.post("/api/notes", json={"title": "Kubernetes", "content_md": "unrelated body"})
    assert len(client.get("/api/notes/search?q=kubernetes").json()) == 1


def test_search_empty_query_rejected(client):
    assert client.get("/api/notes/search?q=").status_code == 422


def test_search_no_matches_returns_empty(client, note):
    assert client.get("/api/notes/search?q=zzzznomatch").json() == []


def test_search_index_updates_on_edit(client):
    n = client.post("/api/notes", json={"title": "t", "content_md": "originalword"}).json()
    assert len(client.get("/api/notes/search?q=originalword").json()) == 1

    client.put(f"/api/notes/{n['id']}", json={"content_md": "replacementword"})
    assert client.get("/api/notes/search?q=originalword").json() == []
    assert len(client.get("/api/notes/search?q=replacementword").json()) == 1


def test_note_links(client):
    a = client.post("/api/notes", json={"title": "a"}).json()
    b = client.post("/api/notes", json={"title": "b"}).json()

    link = client.post(f"/api/notes/{a['id']}/links", json={"to_note_id": b["id"], "link_type": "related"})
    assert link.status_code == 201

    # visible from both ends
    assert len(client.get(f"/api/notes/{a['id']}/links").json()) == 1
    assert len(client.get(f"/api/notes/{b['id']}/links").json()) == 1


def test_duplicate_link_rejected(client):
    a = client.post("/api/notes", json={"title": "a"}).json()
    b = client.post("/api/notes", json={"title": "b"}).json()
    client.post(f"/api/notes/{a['id']}/links", json={"to_note_id": b["id"]})

    assert client.post(f"/api/notes/{a['id']}/links", json={"to_note_id": b["id"]}).status_code == 409


def test_link_to_missing_note_404(client, note):
    assert client.post(f"/api/notes/{note['id']}/links", json={"to_note_id": 99999}).status_code == 404


def test_delete_link(client):
    a = client.post("/api/notes", json={"title": "a"}).json()
    b = client.post("/api/notes", json={"title": "b"}).json()
    link = client.post(f"/api/notes/{a['id']}/links", json={"to_note_id": b["id"]}).json()

    assert client.delete(f"/api/notes/{a['id']}/links/{link['id']}").status_code == 204
    assert client.get(f"/api/notes/{a['id']}/links").json() == []


def test_deleting_note_cascades_links(client):
    a = client.post("/api/notes", json={"title": "a"}).json()
    b = client.post("/api/notes", json={"title": "b"}).json()
    client.post(f"/api/notes/{a['id']}/links", json={"to_note_id": b["id"]})

    client.delete(f"/api/notes/{b['id']}")
    assert client.get(f"/api/notes/{a['id']}/links").json() == []


def test_promote_note_to_kb(client):
    n = client.post(
        "/api/notes", json={"title": "Runbook", "content_md": "steps here", "tag_ids": [1]}
    ).json()

    article = client.post(f"/api/notes/{n['id']}/promote", json={"category": "Ops"}).json()
    assert article["title"] == "Runbook"
    assert article["content_md"] == "steps here"
    assert article["category"] == "Ops"
    assert article["source_note_id"] == n["id"]
    assert len(article["tags"]) == 1


def test_promote_missing_note_404(client):
    assert client.post("/api/notes/99999/promote", json={}).status_code == 404


def test_deleting_source_note_keeps_article(client, note):
    article = client.post(f"/api/notes/{note['id']}/promote", json={}).json()
    client.delete(f"/api/notes/{note['id']}")

    survivor = client.get(f"/api/kb/{article['id']}").json()
    assert survivor["source_note_id"] is None


def test_note_task_link_survives_task_delete(client, task):
    n = client.post("/api/notes", json={"title": "attached", "task_id": task["id"]}).json()
    client.delete(f"/api/tasks/{task['id']}")

    # ON DELETE SET NULL — the note becomes standalone rather than disappearing
    assert client.get(f"/api/notes/{n['id']}").json()["task_id"] is None


# ---------- knowledge base ----------

def test_kb_crud(client):
    a = client.post("/api/kb", json={"title": "Article", "content_md": "text", "category": "Eng"}).json()
    assert client.get(f"/api/kb/{a['id']}").json()["title"] == "Article"

    client.put(f"/api/kb/{a['id']}", json={"title": "Renamed"})
    assert client.get(f"/api/kb/{a['id']}").json()["title"] == "Renamed"

    assert client.delete(f"/api/kb/{a['id']}").status_code == 204
    assert client.get(f"/api/kb/{a['id']}").status_code == 404


def test_kb_categories_deduplicated_and_sorted(client):
    client.post("/api/kb", json={"title": "1", "category": "Zeta"})
    client.post("/api/kb", json={"title": "2", "category": "Alpha"})
    client.post("/api/kb", json={"title": "3", "category": "Alpha"})
    client.post("/api/kb", json={"title": "4"})  # null category excluded

    assert client.get("/api/kb/categories").json() == ["Alpha", "Zeta"]


def test_kb_search(client):
    client.post("/api/kb", json={"title": "Twilio routing", "content_md": "how calls route"})
    client.post("/api/kb", json={"title": "Other", "content_md": "nothing"})

    hits = client.get("/api/kb/search?q=routing").json()
    assert len(hits) == 1
    assert hits[0]["title"] == "Twilio routing"


def test_kb_filter_by_category_and_tag(client):
    client.post("/api/kb", json={"title": "a", "category": "Eng", "tag_ids": [1]})
    client.post("/api/kb", json={"title": "b", "category": "Ops"})

    assert len(client.get("/api/kb?category=Eng").json()) == 1
    assert len(client.get("/api/kb?tag_id=1").json()) == 1


@pytest.mark.parametrize("route", ["/api/notes/99999", "/api/kb/99999"])
def test_missing_resources_404(client, route):
    assert client.get(route).status_code == 404
    assert client.put(route, json={"title": "x"}).status_code == 404
    assert client.delete(route).status_code == 404
