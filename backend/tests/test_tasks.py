def test_create_defaults_to_active_sprint(client, sprint):
    resp = client.post("/api/tasks", json={"title": "no sprint given"})
    assert resp.status_code == 201
    assert resp.json()["sprint_id"] == sprint["id"]


def test_create_without_active_sprint_is_rejected(client):
    resp = client.post("/api/tasks", json={"title": "orphan"})
    assert resp.status_code == 400
    assert "No active sprint" in resp.json()["detail"]


def test_defaults(client, sprint):
    t = client.post("/api/tasks", json={"title": "defaults"}).json()
    assert t["status"] == "todo"
    assert t["priority"] == "medium"
    assert t["task_type"] == "general"
    assert t["sort_order"] == 0


def test_invalid_enum_rejected(client, sprint):
    assert client.post("/api/tasks", json={"title": "x", "status": "nope"}).status_code == 422
    assert client.post("/api/tasks", json={"title": "x", "priority": "critical"}).status_code == 422


def test_update_fields(client, task):
    resp = client.put(
        f"/api/tasks/{task['id']}",
        json={"title": "renamed", "priority": "urgent", "estimated_hours": 3.5},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "renamed"
    assert body["priority"] == "urgent"
    assert body["estimated_hours"] == 3.5


def test_partial_update_leaves_other_fields(client, task):
    client.put(f"/api/tasks/{task['id']}", json={"status": "review"})
    body = client.get(f"/api/tasks/{task['id']}").json()
    assert body["status"] == "review"
    assert body["title"] == "Test task"
    assert body["priority"] == "high"


def test_move_changes_status_and_order(client, task):
    resp = client.post(f"/api/tasks/{task['id']}/move", json={"status": "done", "sort_order": 4})
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"
    assert resp.json()["sort_order"] == 4


def test_tags_replaced_wholesale_on_update(client, task):
    client.put(f"/api/tasks/{task['id']}", json={"tag_ids": [1, 2]})
    assert len(client.get(f"/api/tasks/{task['id']}").json()["tags"]) == 2

    client.put(f"/api/tasks/{task['id']}", json={"tag_ids": [3]})
    tags = client.get(f"/api/tasks/{task['id']}").json()["tags"]
    assert len(tags) == 1
    assert tags[0]["id"] == 3


def test_tag_ids_omitted_preserves_tags(client, task):
    client.put(f"/api/tasks/{task['id']}", json={"tag_ids": [1]})
    client.put(f"/api/tasks/{task['id']}", json={"title": "still tagged"})
    assert len(client.get(f"/api/tasks/{task['id']}").json()["tags"]) == 1


def test_nonexistent_tag_ids_silently_ignored(client, task):
    resp = client.put(f"/api/tasks/{task['id']}", json={"tag_ids": [1, 99999]})
    assert resp.status_code == 200
    assert len(resp.json()["tags"]) == 1


def test_filters(client, sprint):
    client.post("/api/tasks", json={"title": "a", "status": "todo", "priority": "low", "tag_ids": [1]})
    client.post("/api/tasks", json={"title": "b", "status": "done", "priority": "urgent"})
    client.post("/api/tasks", json={"title": "c", "task_type": "development"})

    assert len(client.get("/api/tasks?status=todo").json()) == 2  # 'a' and 'c'
    assert len(client.get("/api/tasks?status=done").json()) == 1
    assert len(client.get("/api/tasks?priority=urgent").json()) == 1
    assert len(client.get("/api/tasks?task_type=development").json()) == 1
    assert len(client.get("/api/tasks?tag_id=1").json()) == 1
    assert len(client.get(f"/api/tasks?sprint_id={sprint['id']}").json()) == 3


def test_detail_includes_sprint_name(client, task, sprint):
    body = client.get(f"/api/tasks/{task['id']}").json()
    assert body["sprint_name"] == sprint["name"]
    assert body["carry_chain"] == []


def test_carry_chain_is_walked(client, sprint):
    original = client.post("/api/tasks", json={"title": "gen-1", "sprint_id": sprint["id"]}).json()
    nxt = client.post(
        "/api/sprints", json={"name": "S2", "start_date": "2026-02-01", "end_date": "2026-02-14"}
    ).json()
    client.post(
        f"/api/sprints/{sprint['id']}/close",
        json={"carry_task_ids": [original["id"]], "next_sprint_id": nxt["id"]},
    )
    carried = client.get(f"/api/tasks?sprint_id={nxt['id']}").json()[0]

    chain = client.get(f"/api/tasks/{carried['id']}").json()["carry_chain"]
    assert len(chain) == 1
    assert chain[0]["title"] == "gen-1"


def test_delete(client, task):
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").status_code == 404


def test_missing_task_404s(client):
    assert client.get("/api/tasks/99999").status_code == 404
    assert client.put("/api/tasks/99999", json={"title": "x"}).status_code == 404
    assert client.delete("/api/tasks/99999").status_code == 404
    assert client.post("/api/tasks/99999/move", json={"status": "done"}).status_code == 404


def test_status_change_writes_activity(client, task):
    client.post(f"/api/tasks/{task['id']}/move", json={"status": "in_progress"})
    activity = client.get("/api/activity").json()
    changes = [a for a in activity if a["action"] == "status_changed"]
    assert changes
    assert changes[0]["detail_json"] == {"from": "todo", "to": "in_progress"}


def test_move_to_same_status_logs_nothing_new(client, task):
    before = len(client.get("/api/activity").json())
    client.post(f"/api/tasks/{task['id']}/move", json={"status": "todo"})
    after = len(client.get("/api/activity").json())
    assert after == before
