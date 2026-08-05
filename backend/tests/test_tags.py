"""Tag lifecycle: create, rename, recolour, delete — and what happens to things using them."""


def test_list_includes_usage_counts(client, sprint, task, note):
    client.put(f"/api/tasks/{task['id']}", json={"tag_ids": [1]})
    client.put(f"/api/notes/{note['id']}", json={"tag_ids": [1]})

    aimee = next(t for t in client.get("/api/tags").json() if t["name"] == "Aimee")
    assert aimee["task_count"] == 1
    assert aimee["note_count"] == 1
    assert aimee["kb_count"] == 0


def test_create(client):
    resp = client.post("/api/tags", json={"name": "Personal", "color": "#FF00AA"})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Personal"
    assert resp.json()["color"] == "#FF00AA"


def test_create_trims_whitespace(client):
    assert client.post("/api/tags", json={"name": "  Spaced  "}).json()["name"] == "Spaced"


def test_create_rejects_blank_name(client):
    assert client.post("/api/tags", json={"name": "   "}).status_code == 422


def test_duplicate_name_rejected_case_insensitively(client):
    """'Aimee' and 'aimee' would be indistinguishable as chips."""
    assert client.post("/api/tags", json={"name": "aimee"}).status_code == 409
    assert client.post("/api/tags", json={"name": "AIMEE"}).status_code == 409


def test_invalid_colour_rejected(client):
    for bad in ["red", "#FFF", "#12345G", "rgb(1,2,3)"]:
        assert client.post("/api/tags", json={"name": f"t{bad}", "color": bad}).status_code == 422


def test_rename(client):
    updated = client.put("/api/tags/1", json={"name": "Aimee Platform"})
    assert updated.status_code == 200
    assert updated.json()["name"] == "Aimee Platform"
    assert updated.json()["color"] == "#3B82F6"  # untouched


def test_recolour(client):
    updated = client.put("/api/tags/1", json={"color": "#123456"}).json()
    assert updated["color"] == "#123456"
    assert updated["name"] == "Aimee"  # untouched


def test_rename_keeps_existing_associations(client, sprint, task):
    """Renaming is not re-tagging — everything using it follows along."""
    client.put(f"/api/tasks/{task['id']}", json={"tag_ids": [1]})
    client.put("/api/tags/1", json={"name": "Renamed"})

    tags = client.get(f"/api/tasks/{task['id']}").json()["tags"]
    assert len(tags) == 1
    assert tags[0]["name"] == "Renamed"


def test_rename_to_existing_name_rejected(client):
    assert client.put("/api/tags/1", json={"name": "Hemotag"}).status_code == 409


def test_rename_to_own_name_is_fine(client):
    """Re-saving without changing the name must not trip the duplicate check."""
    assert client.put("/api/tags/1", json={"name": "Aimee"}).status_code == 200


def test_rename_blank_rejected(client):
    assert client.put("/api/tags/1", json={"name": ""}).status_code == 422


def test_update_missing_tag_404(client):
    assert client.put("/api/tags/99999", json={"name": "ghost"}).status_code == 404


def test_delete_removes_associations_but_keeps_entities(client, sprint, task, note):
    client.put(f"/api/tasks/{task['id']}", json={"tag_ids": [1]})
    client.put(f"/api/notes/{note['id']}", json={"tag_ids": [1]})

    assert client.delete("/api/tags/1").status_code == 204

    # The tagged things survive; only the tag link is gone.
    assert client.get(f"/api/tasks/{task['id']}").json()["tags"] == []
    assert client.get(f"/api/notes/{note['id']}").json()["tags"] == []
    assert client.get(f"/api/tasks/{task['id']}").status_code == 200
    assert client.get(f"/api/notes/{note['id']}").status_code == 200


def test_delete_missing_tag_404(client):
    assert client.delete("/api/tags/99999").status_code == 404


def test_tag_changes_are_audited(client):
    created = client.post("/api/tags", json={"name": "Audited"}).json()
    client.put(f"/api/tags/{created['id']}", json={"name": "Audited v2"})
    client.delete(f"/api/tags/{created['id']}")

    actions = {a["action"] for a in client.get("/api/activity?entity_type=tag").json()}
    assert {"created", "updated", "deleted"} <= actions


def test_newly_created_tag_is_immediately_usable(client, sprint):
    tag = client.post("/api/tags", json={"name": "Fresh", "color": "#ABCDEF"}).json()
    t = client.post("/api/tasks", json={"title": "uses new tag", "tag_ids": [tag["id"]]}).json()
    assert [x["name"] for x in t["tags"]] == ["Fresh"]
