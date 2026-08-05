"""Time clock, inbox triage, templates, recurring tasks, activity log, stats, profile."""


# ---------- punch clock ----------

def test_status_when_never_punched(client):
    body = client.get("/api/time/status").json()
    assert body["punched_in"] is False
    assert body["today_total_hours"] == 0


def test_punch_in_then_out(client):
    assert client.post("/api/time/punch/in", json={"notes": "start"}).status_code == 201
    assert client.get("/api/time/status").json()["punched_in"] is True

    out = client.post("/api/time/punch/out", json={"notes": "done"})
    assert out.status_code == 200
    assert out.json()["end_time"] is not None
    assert out.json()["duration_hours"] is not None
    assert client.get("/api/time/status").json()["punched_in"] is False


def test_double_punch_in_rejected(client):
    client.post("/api/time/punch/in", json={})
    assert client.post("/api/time/punch/in", json={}).status_code == 409


def test_punch_out_without_in_rejected(client):
    assert client.post("/api/time/punch/out", json={}).status_code == 400


def test_log_task_time_updates_actual_hours(client, task):
    resp = client.post("/api/time/task", json={"task_id": task["id"], "duration_hours": 2.5})
    assert resp.status_code == 201

    assert client.get(f"/api/tasks/{task['id']}").json()["actual_hours"] == 2.5


def test_task_time_accumulates(client, task):
    client.post("/api/time/task", json={"task_id": task["id"], "duration_hours": 1.0})
    client.post("/api/time/task", json={"task_id": task["id"], "duration_hours": 2.0})

    assert client.get(f"/api/tasks/{task['id']}").json()["actual_hours"] == 3.0


def test_log_time_on_missing_task_404(client):
    assert client.post("/api/time/task", json={"task_id": 99999, "duration_hours": 1}).status_code == 404


def test_breakdown_splits_across_tags(client, sprint):
    t = client.post("/api/tasks", json={"title": "tagged", "tag_ids": [1, 2]}).json()
    client.post("/api/time/task", json={"task_id": t["id"], "duration_hours": 2.0})

    rows = client.get("/api/time/breakdown?period=week").json()
    by_tag = {r["tag_name"]: r["hours"] for r in rows}
    # 2h split evenly across two tags
    assert by_tag["Aimee"] == 1.0
    assert by_tag["Hemotag"] == 1.0


def test_breakdown_untagged_bucket(client, sprint, task):
    client.post("/api/time/task", json={"task_id": task["id"], "duration_hours": 1.5})
    rows = client.get("/api/time/breakdown?period=week").json()
    assert any(r["tag_name"] == "Untagged" and r["hours"] == 1.5 for r in rows)


def test_time_log_listing_filters(client, task):
    client.post("/api/time/punch/in", json={})
    client.post("/api/time/task", json={"task_id": task["id"], "duration_hours": 1})

    assert len(client.get("/api/time").json()) == 2
    assert len(client.get("/api/time?log_type=task_time").json()) == 1
    assert len(client.get(f"/api/time?task_id={task['id']}").json()) == 1


# ---------- inbox ----------

def test_capture_and_list(client):
    item = client.post("/api/inbox", json={"content": "random thought"}).json()
    assert item["resolved_to"] is None
    assert len(client.get("/api/inbox").json()) == 1


def test_resolve_to_task(client, sprint):
    item = client.post("/api/inbox", json={"content": "build the thing"}).json()
    resp = client.post(f"/api/inbox/{item['id']}/resolve", json={"resolve_to": "task"})
    assert resp.status_code == 200

    body = resp.json()
    assert body["resolved_to"] == "task"
    assert body["resolved_id"] is not None
    created = client.get(f"/api/tasks/{body['resolved_id']}").json()
    assert created["title"] == "build the thing"


def test_resolve_to_note(client):
    item = client.post("/api/inbox", json={"content": "a thought worth keeping"}).json()
    body = client.post(f"/api/inbox/{item['id']}/resolve", json={"resolve_to": "note"}).json()
    assert client.get(f"/api/notes/{body['resolved_id']}").status_code == 200


def test_resolve_to_kb(client):
    item = client.post("/api/inbox", json={"content": "reference material"}).json()
    body = client.post(f"/api/inbox/{item['id']}/resolve", json={"resolve_to": "kb"}).json()
    assert client.get(f"/api/kb/{body['resolved_id']}").status_code == 200


def test_dismiss_creates_nothing(client):
    item = client.post("/api/inbox", json={"content": "never mind"}).json()
    body = client.post(f"/api/inbox/{item['id']}/resolve", json={"resolve_to": "dismissed"}).json()
    assert body["resolved_to"] == "dismissed"
    assert body["resolved_id"] is None
    assert client.get("/api/tasks").json() == []


def test_resolved_items_hidden_by_default(client):
    item = client.post("/api/inbox", json={"content": "x"}).json()
    client.post(f"/api/inbox/{item['id']}/resolve", json={"resolve_to": "dismissed"})

    assert client.get("/api/inbox").json() == []
    assert len(client.get("/api/inbox?include_resolved=true").json()) == 1


def test_invalid_resolve_target_rejected(client):
    item = client.post("/api/inbox", json={"content": "x"}).json()
    assert client.post(f"/api/inbox/{item['id']}/resolve", json={"resolve_to": "elsewhere"}).status_code == 422


def test_resolve_missing_item_404(client):
    assert client.post("/api/inbox/99999/resolve", json={"resolve_to": "dismissed"}).status_code == 404


# ---------- templates ----------

def test_template_crud(client):
    t = client.post(
        "/api/templates",
        json={"name": "Custom", "template_type": "task", "content_json": {"subtasks": ["a", "b"]}},
    ).json()
    assert t["content_json"]["subtasks"] == ["a", "b"]

    client.put(f"/api/templates/{t['id']}", json={"name": "Renamed"})
    assert client.get(f"/api/templates/{t['id']}").json()["name"] == "Renamed"

    assert client.delete(f"/api/templates/{t['id']}").status_code == 204


def test_template_type_filter(client):
    assert len(client.get("/api/templates?template_type=meeting_note").json()) == 2
    assert len(client.get("/api/templates?template_type=task").json()) == 1


def test_invalid_template_type_rejected(client):
    resp = client.post("/api/templates", json={"name": "x", "template_type": "bogus", "content_json": {}})
    assert resp.status_code == 422


# ---------- recurring ----------

def test_recurring_crud(client):
    r = client.post(
        "/api/recurring",
        json={"title": "Daily standup", "frequency": "daily", "tag_names": "Aimee"},
    ).json()
    assert r["active"] is True

    client.put(f"/api/recurring/{r['id']}", json={"active": False})
    assert client.get("/api/recurring").json()[0]["active"] is False

    assert client.delete(f"/api/recurring/{r['id']}").status_code == 204


def test_recurring_generation_creates_task(client, sprint):
    client.post("/api/recurring", json={"title": "Generated task", "frequency": "daily"})
    resp = client.post("/api/recurring/run")
    assert resp.status_code == 200

    titles = [t["title"] for t in client.get("/api/tasks").json()]
    assert "Generated task" in titles


def test_recurring_generation_is_idempotent_same_day(client, sprint):
    client.post("/api/recurring", json={"title": "Once per day", "frequency": "daily"})
    client.post("/api/recurring/run")
    client.post("/api/recurring/run")

    matches = [t for t in client.get("/api/tasks").json() if t["title"] == "Once per day"]
    assert len(matches) == 1


def test_paused_recurring_is_skipped(client, sprint):
    r = client.post("/api/recurring", json={"title": "Paused", "frequency": "daily"}).json()
    client.put(f"/api/recurring/{r['id']}", json={"active": False})
    client.post("/api/recurring/run")

    assert client.get("/api/tasks").json() == []


def test_invalid_frequency_rejected(client):
    assert client.post("/api/recurring", json={"title": "x", "frequency": "hourly"}).status_code == 422


# ---------- activity ----------

def test_activity_records_creates(client, sprint, task):
    activity = client.get("/api/activity").json()
    kinds = {(a["entity_type"], a["action"]) for a in activity}
    assert ("sprint", "created") in kinds
    assert ("task", "created") in kinds


def test_activity_filters(client, sprint, task):
    assert len(client.get("/api/activity?entity_type=task").json()) >= 1
    assert client.get("/api/activity?entity_type=kb").json() == []


def test_activity_newest_first(client, sprint):
    client.post("/api/tasks", json={"title": "first"})
    client.post("/api/tasks", json={"title": "second"})
    activity = client.get("/api/activity").json()
    assert activity[0]["id"] > activity[-1]["id"]


def test_activity_limit_respected(client, sprint):
    for i in range(6):
        client.post("/api/tasks", json={"title": f"t{i}"})
    assert len(client.get("/api/activity?limit=3").json()) == 3


# ---------- stats ----------

def test_trends_shape(client):
    rows = client.get("/api/stats/trends?days=7").json()
    assert len(rows) == 7
    assert set(rows[0]) == {"date", "tasks_completed", "hours_logged"}
    assert rows[0]["date"] < rows[-1]["date"]


def test_trends_counts_completed_task(client, sprint):
    t = client.post("/api/tasks", json={"title": "finish me"}).json()
    client.post(f"/api/tasks/{t['id']}/move", json={"status": "done"})

    rows = client.get("/api/stats/trends?days=3").json()
    assert sum(r["tasks_completed"] for r in rows) == 1


def test_trends_counts_hours(client, sprint, task):
    client.post("/api/time/task", json={"task_id": task["id"], "duration_hours": 2.0})
    rows = client.get("/api/stats/trends?days=3").json()
    assert sum(r["hours_logged"] for r in rows) == 2.0


# ---------- profile ----------

def test_profile_absent_initially(client):
    assert client.get("/api/profile").json() is None


def test_profile_create_and_update(client):
    created = client.post(
        "/api/profile", json={"name": "Tester", "timezone": "Asia/Kolkata", "theme_preset": "cyan"}
    )
    assert created.status_code == 201

    assert client.post("/api/profile", json={"name": "Dupe"}).status_code == 409

    updated = client.put("/api/profile", json={"theme_preset": "amber"}).json()
    assert updated["theme_preset"] == "amber"
    assert updated["name"] == "Tester"  # untouched


def test_profile_update_before_create_404(client):
    assert client.put("/api/profile", json={"name": "x"}).status_code == 404


def test_invalid_theme_preset_rejected(client):
    assert client.post("/api/profile", json={"name": "x", "theme_preset": "chartreuse"}).status_code == 422


# ---------- tags ----------

def test_tag_create_and_duplicate(client):
    assert client.post("/api/tags", json={"name": "NewTag", "color": "#123456"}).status_code == 201
    assert client.post("/api/tags", json={"name": "NewTag"}).status_code == 409


def test_tag_delete_removes_association(client, task):
    new_tag = client.post("/api/tags", json={"name": "Temp"}).json()
    client.put(f"/api/tasks/{task['id']}", json={"tag_ids": [new_tag["id"]]})
    assert len(client.get(f"/api/tasks/{task['id']}").json()["tags"]) == 1

    client.delete(f"/api/tags/{new_tag['id']}")
    assert client.get(f"/api/tasks/{task['id']}").json()["tags"] == []
