def test_create_and_list(client):
    resp = client.post(
        "/api/sprints",
        json={"name": "Sprint 1", "start_date": "2026-01-01", "end_date": "2026-01-14"},
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "planned"

    listing = client.get("/api/sprints").json()
    assert len(listing) == 1
    assert listing[0]["task_count"] == 0
    assert listing[0]["done_count"] == 0


def test_only_one_active_sprint_allowed(client, sprint):
    resp = client.post(
        "/api/sprints",
        json={"name": "Second", "start_date": "2026-02-01", "end_date": "2026-02-14", "status": "active"},
    )
    assert resp.status_code == 409
    assert "already active" in resp.json()["detail"]


def test_cannot_activate_second_sprint_via_update(client, sprint):
    planned = client.post(
        "/api/sprints",
        json={"name": "Planned", "start_date": "2026-03-01", "end_date": "2026-03-14"},
    ).json()

    resp = client.put(f"/api/sprints/{planned['id']}", json={"status": "active"})
    assert resp.status_code == 409


def test_activating_after_closing_current_works(client, sprint):
    planned = client.post(
        "/api/sprints",
        json={"name": "Planned", "start_date": "2026-03-01", "end_date": "2026-03-14"},
    ).json()

    client.put(f"/api/sprints/{sprint['id']}", json={"status": "closed"})
    resp = client.put(f"/api/sprints/{planned['id']}", json={"status": "active"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


def test_stats_reflect_task_completion(client, sprint):
    for status in ["todo", "done", "done"]:
        client.post("/api/tasks", json={"title": f"t-{status}", "sprint_id": sprint["id"], "status": status})

    data = client.get(f"/api/sprints/{sprint['id']}").json()
    assert data["task_count"] == 3
    assert data["done_count"] == 2


def test_get_missing_sprint_404(client):
    assert client.get("/api/sprints/99999").status_code == 404


def test_invalid_status_rejected(client):
    resp = client.post(
        "/api/sprints",
        json={"name": "Bad", "start_date": "2026-01-01", "end_date": "2026-01-14", "status": "bogus"},
    )
    assert resp.status_code == 422


def test_delete_cascades_to_tasks(client, sprint, task):
    assert client.delete(f"/api/sprints/{sprint['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").status_code == 404


# ---------- goals ----------

def test_goal_crud(client, sprint):
    goal = client.post(f"/api/sprints/{sprint['id']}/goals", json={"title": "Ship feature"}).json()
    assert goal["progress_pct"] == 0

    updated = client.put(f"/api/sprints/{sprint['id']}/goals/{goal['id']}", json={"progress_pct": 60}).json()
    assert updated["progress_pct"] == 60

    assert client.delete(f"/api/sprints/{sprint['id']}/goals/{goal['id']}").status_code == 204
    assert client.get(f"/api/sprints/{sprint['id']}/goals").json() == []


def test_goal_progress_bounds_enforced(client, sprint):
    resp = client.post(f"/api/sprints/{sprint['id']}/goals", json={"title": "x", "progress_pct": 150})
    # DB CHECK constraint rejects out-of-range values
    assert resp.status_code >= 400


def test_goal_on_missing_sprint_404(client):
    assert client.post("/api/sprints/99999/goals", json={"title": "x"}).status_code == 404


# ---------- retro ----------

def test_retro_upsert_is_idempotent(client, sprint):
    assert client.get(f"/api/sprints/{sprint['id']}/retro").json() is None

    first = client.put(f"/api/sprints/{sprint['id']}/retro", json={"went_well": "a"}).json()
    second = client.put(f"/api/sprints/{sprint['id']}/retro", json={"went_well": "b"}).json()

    assert first["id"] == second["id"]
    assert second["went_well"] == "b"


# ---------- close / carry-over ----------

def test_close_carries_selected_tasks(client, sprint):
    keep = client.post("/api/tasks", json={"title": "carry me", "sprint_id": sprint["id"]}).json()
    client.post("/api/tasks", json={"title": "drop me", "sprint_id": sprint["id"]}).json()
    nxt = client.post(
        "/api/sprints",
        json={"name": "Next", "start_date": "2026-02-01", "end_date": "2026-02-14"},
    ).json()

    resp = client.post(
        f"/api/sprints/{sprint['id']}/close",
        json={"carry_task_ids": [keep["id"]], "next_sprint_id": nxt["id"]},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "closed"

    carried = client.get(f"/api/tasks?sprint_id={nxt['id']}").json()
    assert len(carried) == 1
    assert carried[0]["title"] == "carry me"
    assert carried[0]["carried_from_task_id"] == keep["id"]
    assert carried[0]["status"] == "todo"


def test_close_preserves_tags_on_carried_task(client, sprint):
    t = client.post(
        "/api/tasks", json={"title": "tagged", "sprint_id": sprint["id"], "tag_ids": [1, 2]}
    ).json()
    nxt = client.post(
        "/api/sprints", json={"name": "Next", "start_date": "2026-02-01", "end_date": "2026-02-14"}
    ).json()

    client.post(
        f"/api/sprints/{sprint['id']}/close",
        json={"carry_task_ids": [t["id"]], "next_sprint_id": nxt["id"]},
    )
    carried = client.get(f"/api/tasks?sprint_id={nxt['id']}").json()[0]
    assert len(carried["tags"]) == 2


def test_close_ignores_tasks_from_other_sprints(client, sprint):
    other = client.post(
        "/api/sprints", json={"name": "Other", "start_date": "2026-04-01", "end_date": "2026-04-14"}
    ).json()
    foreign = client.post("/api/tasks", json={"title": "foreign", "sprint_id": other["id"]}).json()
    nxt = client.post(
        "/api/sprints", json={"name": "Next", "start_date": "2026-02-01", "end_date": "2026-02-14"}
    ).json()

    client.post(
        f"/api/sprints/{sprint['id']}/close",
        json={"carry_task_ids": [foreign["id"]], "next_sprint_id": nxt["id"]},
    )
    assert client.get(f"/api/tasks?sprint_id={nxt['id']}").json() == []


def test_close_with_missing_target_sprint_404(client, sprint):
    resp = client.post(
        f"/api/sprints/{sprint['id']}/close", json={"carry_task_ids": [], "next_sprint_id": 99999}
    )
    assert resp.status_code == 404
