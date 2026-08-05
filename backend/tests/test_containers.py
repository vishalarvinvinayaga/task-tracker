"""
Task containers: sprints (time-boxed, with ceremony) and lists (plain buckets).

The property that matters most here is *never blocked* — it must always be
possible to capture a task without first setting up a sprint.
"""


# ---------- the never-blocked guarantee ----------

def test_backlog_is_created_on_demand(client):
    """A database with no containers still accepts a task."""
    assert client.get("/api/sprints").json() == []

    resp = client.post("/api/tasks", json={"title": "captured cold"})
    assert resp.status_code == 201

    containers = client.get("/api/sprints").json()
    assert len(containers) == 1
    assert containers[0]["name"] == "Backlog"


def test_active_sprint_wins_over_backlog(client, sprint):
    """Mid-cycle, an unqualified task belongs to the sprint you're running."""
    t = client.post("/api/tasks", json={"title": "sprint work"}).json()
    assert t["sprint_id"] == sprint["id"]


def test_falls_back_to_backlog_once_sprint_closes(client, sprint):
    client.put(f"/api/sprints/{sprint['id']}", json={"status": "closed"})

    t = client.post("/api/tasks", json={"title": "after the sprint"}).json()
    container = client.get(f"/api/sprints/{t['sprint_id']}").json()
    assert container["container_type"] == "list"


def test_backlog_cannot_be_deleted(client):
    client.post("/api/tasks", json={"title": "seed the backlog"})
    backlog = next(c for c in client.get("/api/sprints").json() if c["is_protected"])

    resp = client.delete(f"/api/sprints/{backlog['id']}")
    assert resp.status_code == 400
    assert "protected" in resp.json()["detail"].lower()
    assert client.get(f"/api/sprints/{backlog['id']}").status_code == 200


# ---------- creating lists ----------

def test_create_list_without_dates(client):
    resp = client.post("/api/sprints", json={"name": "Someday", "container_type": "list"})
    assert resp.status_code == 201

    body = resp.json()
    assert body["container_type"] == "list"
    assert body["start_date"] is None
    assert body["end_date"] is None
    assert body["status"] == "active"


def test_sprint_still_requires_dates(client):
    resp = client.post("/api/sprints", json={"name": "Undated", "container_type": "sprint"})
    assert resp.status_code == 422


def test_dates_on_a_list_are_discarded(client):
    body = client.post(
        "/api/sprints",
        json={"name": "Ideas", "container_type": "list", "start_date": "2026-01-01", "end_date": "2026-02-01"},
    ).json()
    assert body["start_date"] is None


def test_many_lists_can_coexist(client, sprint):
    """The one-active rule is a sprint constraint; lists run in parallel."""
    for name in ["Aimee", "Immigration", "Reading"]:
        assert client.post("/api/sprints", json={"name": name, "container_type": "list"}).status_code == 201

    lists = client.get("/api/sprints?container_type=list").json()
    assert len(lists) == 3
    assert all(c["status"] == "active" for c in lists)


def test_list_does_not_block_activating_a_sprint(client):
    """An active list must not trip the single-active-sprint check."""
    client.post("/api/sprints", json={"name": "Bucket", "container_type": "list"})

    resp = client.post(
        "/api/sprints",
        json={"name": "S1", "container_type": "sprint", "start_date": "2026-01-01",
              "end_date": "2026-01-14", "status": "active"},
    )
    assert resp.status_code == 201


def test_one_active_sprint_rule_still_holds(client, sprint):
    resp = client.post(
        "/api/sprints",
        json={"name": "S2", "container_type": "sprint", "start_date": "2026-02-01",
              "end_date": "2026-02-14", "status": "active"},
    )
    assert resp.status_code == 409


# ---------- ceremony is sprint-only ----------

def test_lists_cannot_be_closed(client):
    lst = client.post("/api/sprints", json={"name": "Bucket", "container_type": "list"}).json()
    nxt = client.post("/api/sprints", json={"name": "Other", "container_type": "list"}).json()

    resp = client.post(
        f"/api/sprints/{lst['id']}/close",
        json={"carry_task_ids": [], "next_sprint_id": nxt["id"]},
    )
    assert resp.status_code == 400
    assert "list, not a sprint" in resp.json()["detail"]


def test_lists_cannot_have_retros(client):
    lst = client.post("/api/sprints", json={"name": "Bucket", "container_type": "list"}).json()
    resp = client.put(f"/api/sprints/{lst['id']}/retro", json={"went_well": "n/a"})
    assert resp.status_code == 400


def test_list_status_cannot_be_changed(client):
    lst = client.post("/api/sprints", json={"name": "Bucket", "container_type": "list"}).json()
    updated = client.put(f"/api/sprints/{lst['id']}", json={"status": "closed"}).json()
    assert updated["status"] == "active"  # ignored, lists have no lifecycle


def test_list_dates_cannot_be_set_after_creation(client):
    lst = client.post("/api/sprints", json={"name": "Bucket", "container_type": "list"}).json()
    updated = client.put(f"/api/sprints/{lst['id']}", json={"start_date": "2026-05-01"}).json()
    assert updated["start_date"] is None


# ---------- lists behave as task containers ----------

def test_tasks_work_normally_inside_a_list(client):
    lst = client.post("/api/sprints", json={"name": "Chores", "container_type": "list"}).json()

    t = client.post("/api/tasks", json={"title": "wash car", "sprint_id": lst["id"], "tag_ids": [1]}).json()
    assert t["sprint_id"] == lst["id"]

    client.post(f"/api/tasks/{t['id']}/move", json={"status": "done"})
    stats = client.get(f"/api/sprints/{lst['id']}").json()
    assert stats["task_count"] == 1
    assert stats["done_count"] == 1


def test_deleting_a_list_removes_its_tasks(client):
    lst = client.post("/api/sprints", json={"name": "Temp", "container_type": "list"}).json()
    t = client.post("/api/tasks", json={"title": "doomed", "sprint_id": lst["id"]}).json()

    assert client.delete(f"/api/sprints/{lst['id']}").status_code == 204
    assert client.get(f"/api/tasks/{t['id']}").status_code == 404


def test_tasks_can_move_between_containers(client, sprint, task):
    """Pulling something off the backlog into a sprint is a plain update."""
    lst = client.post("/api/sprints", json={"name": "Someday", "container_type": "list"}).json()

    moved = client.put(f"/api/tasks/{task['id']}", json={"sprint_id": lst["id"]})
    assert moved.status_code == 200
    assert moved.json()["sprint_id"] == lst["id"]


# ---------- view preference ----------

def test_default_view_round_trips(client):
    lst = client.post(
        "/api/sprints", json={"name": "Flat", "container_type": "list", "default_view": "list"}
    ).json()
    assert lst["default_view"] == "list"

    updated = client.put(f"/api/sprints/{lst['id']}", json={"default_view": "board"}).json()
    assert updated["default_view"] == "board"


def test_invalid_view_rejected(client):
    resp = client.post(
        "/api/sprints", json={"name": "x", "container_type": "list", "default_view": "calendar"}
    )
    assert resp.status_code == 422


def test_invalid_container_type_rejected(client):
    assert client.post("/api/sprints", json={"name": "x", "container_type": "epic"}).status_code == 422


# ---------- filtering ----------

def test_container_type_filter(client, sprint):
    client.post("/api/sprints", json={"name": "L1", "container_type": "list"})

    assert len(client.get("/api/sprints?container_type=sprint").json()) == 1
    assert len(client.get("/api/sprints?container_type=list").json()) == 1
    assert len(client.get("/api/sprints").json()) == 2


# ---------- regression: Backlog must not be mistaken for an active sprint ----------
#
# The Backlog is a list with status='active', so any query that looks for "the
# active sprint" without filtering on container_type matches two rows and blows
# up on scalar_one_or_none(). This crashed the app at startup once; these tests
# pin every code path that asks the question.

def _with_sprint_and_backlog(client):
    """Both an active sprint and the Backlog present — the ambiguous state."""
    # Capture first, with no sprint around, so the Backlog gets created; adding
    # the sprint afterwards leaves two rows with status='active'.
    client.post("/api/tasks", json={"title": "forces backlog creation"})
    client.post(
        "/api/sprints",
        json={"name": "Live sprint", "container_type": "sprint", "start_date": "2026-01-01",
              "end_date": "2099-12-31", "status": "active"},
    )
    containers = client.get("/api/sprints").json()
    assert sum(c["status"] == "active" for c in containers) == 2, "test setup should be ambiguous"
    return containers


def test_recurring_generation_survives_backlog(client):
    _with_sprint_and_backlog(client)
    client.post("/api/recurring", json={"title": "Daily check", "frequency": "daily"})

    resp = client.post("/api/recurring/run")
    assert resp.status_code == 200
    assert "Daily check" in [t["title"] for t in client.get("/api/tasks").json()]


def test_inbox_resolve_survives_backlog(client):
    _with_sprint_and_backlog(client)
    item = client.post("/api/inbox", json={"content": "triage me"}).json()

    resp = client.post(f"/api/inbox/{item['id']}/resolve", json={"resolve_to": "task"})
    assert resp.status_code == 200


def test_task_creation_survives_backlog(client):
    _with_sprint_and_backlog(client)
    resp = client.post("/api/tasks", json={"title": "another one"})
    assert resp.status_code == 201


def test_dashboard_endpoints_survive_backlog(client):
    _with_sprint_and_backlog(client)
    for route in ["/api/sprints", "/api/tasks", "/api/activity", "/api/stats/trends?days=7", "/api/time/status"]:
        assert client.get(route).status_code == 200, route
