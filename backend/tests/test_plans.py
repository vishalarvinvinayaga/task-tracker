"""
Daily plans — commitment, day-close, and slip escalation.

A plan is intent for a specific day. The value only shows up over time, so
most of what matters here is what happens when a day *ends*.
"""
import datetime as dt

from app.models import DailyPlan, DailyPlanItem


def _make_past_plan(db, days_ago: int, task_ids: list[int], closed: bool = False) -> DailyPlan:
    """A plan dated in the past, optionally already resolved."""
    plan = DailyPlan(
        plan_date=dt.date.today() - dt.timedelta(days=days_ago),
        closed_at=dt.datetime.now() if closed else None,
    )
    db.add(plan)
    db.flush()
    for order, task_id in enumerate(task_ids):
        db.add(DailyPlanItem(plan_id=plan.id, task_id=task_id, sort_order=order))
    db.commit()
    return plan


# ---------- committing ----------

def test_today_starts_uncommitted(client, sprint, task):
    """A plan should be a decision, not something that appears on page load."""
    body = client.get("/api/plans/today").json()
    assert body["plan"] is None
    assert [s["task"]["id"] for s in body["suggestions"]] == []  # nothing due or in progress


def test_due_today_is_suggested(client, sprint):
    today = dt.date.today().isoformat()
    client.post("/api/tasks", json={"title": "due now", "due_date": today})

    suggestions = client.get("/api/plans/today").json()["suggestions"]
    assert [s["reason"] for s in suggestions] == ["due"]


def test_in_progress_is_suggested_without_a_due_date(client, sprint):
    client.post("/api/tasks", json={"title": "started", "status": "in_progress"})
    assert client.get("/api/plans/today").json()["suggestions"][0]["reason"] == "in_progress"


def test_commit_creates_the_plan(client, sprint, task):
    resp = client.post("/api/plans/today", json={"task_ids": [task["id"]], "focus": "ship it"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["focus"] == "ship it"
    assert [i["task_id"] for i in body["items"]] == [task["id"]]
    assert body["items"][0]["outcome"] == "planned"


def test_committing_twice_is_rejected(client, sprint, task):
    client.post("/api/plans/today", json={"task_ids": [task["id"]]})
    assert client.post("/api/plans/today", json={"task_ids": []}).status_code == 409


def test_committed_tasks_drop_out_of_suggestions(client, sprint):
    today = dt.date.today().isoformat()
    t = client.post("/api/tasks", json={"title": "due now", "due_date": today}).json()
    client.post("/api/plans/today", json={"task_ids": [t["id"]]})

    assert client.get("/api/plans/today").json()["suggestions"] == []


def test_unknown_task_ids_are_ignored(client, sprint, task):
    body = client.post("/api/plans/today", json={"task_ids": [task["id"], 99999]}).json()
    assert len(body["items"]) == 1


def test_same_task_cannot_be_added_twice(client, sprint, task):
    plan = client.post("/api/plans/today", json={"task_ids": [task["id"]]}).json()
    body = client.post(f"/api/plans/{plan['id']}/items", json={"task_id": task["id"]}).json()
    assert len(body["items"]) == 1


# ---------- day close ----------

def test_past_plan_closes_on_access(client, db, sprint, task):
    _make_past_plan(db, days_ago=1, task_ids=[task["id"]])

    client.get("/api/plans/today")  # any plan endpoint triggers the sweep

    history = client.get("/api/plans").json()
    assert history[0]["closed_at"] is not None


def test_unfinished_work_is_marked_slipped(client, db, sprint, task):
    _make_past_plan(db, days_ago=1, task_ids=[task["id"]])
    client.get("/api/plans/today")

    item = client.get("/api/plans").json()[0]["items"][0]
    assert item["outcome"] == "slipped"


def test_finished_work_is_marked_done(client, db, sprint, task):
    client.post(f"/api/tasks/{task['id']}/move", json={"status": "done"})
    _make_past_plan(db, days_ago=1, task_ids=[task["id"]])
    client.get("/api/plans/today")

    assert client.get("/api/plans").json()[0]["items"][0]["outcome"] == "done"


def test_closing_is_idempotent(client, db, sprint, task):
    _make_past_plan(db, days_ago=1, task_ids=[task["id"]])
    client.get("/api/plans/today")
    first = client.get("/api/plans").json()[0]["closed_at"]
    client.get("/api/plans/today")
    assert client.get("/api/plans").json()[0]["closed_at"] == first


def test_today_is_not_closed_prematurely(client, sprint, task):
    client.post("/api/plans/today", json={"task_ids": [task["id"]]})
    client.get("/api/plans/today")
    assert client.get("/api/plans/today").json()["plan"]["closed_at"] is None


def test_several_missed_days_all_close_at_once(client, db, sprint, task):
    """Coming back after a week away shouldn't leave stale open plans."""
    for days in (5, 4, 3):
        _make_past_plan(db, days_ago=days, task_ids=[task["id"]])

    client.get("/api/plans/today")
    assert all(p["closed_at"] for p in client.get("/api/plans").json())


def test_closed_plans_are_read_only(client, db, sprint, task):
    plan = _make_past_plan(db, days_ago=1, task_ids=[task["id"]])
    client.get("/api/plans/today")

    assert client.post(f"/api/plans/{plan.id}/items", json={"task_id": task["id"]}).status_code == 400
    item_id = client.get(f"/api/plans/{plan.id}").json()["items"][0]["id"]
    assert client.delete(f"/api/plans/{plan.id}/items/{item_id}").status_code == 400


# ---------- slip counting ----------

def test_slip_count_accumulates_across_days(client, db, sprint, task):
    for days in (3, 2, 1):
        _make_past_plan(db, days_ago=days, task_ids=[task["id"]])
    client.get("/api/plans/today")

    suggestion = next(
        s for s in client.get("/api/plans/today").json()["suggestions"] if s["task"]["id"] == task["id"]
    )
    assert suggestion["slip_count"] == 3
    assert suggestion["reason"] == "slipped"


def test_slipped_work_sorts_above_merely_due(client, db, sprint):
    today = dt.date.today().isoformat()
    fresh = client.post("/api/tasks", json={"title": "just due", "due_date": today}).json()
    repeat = client.post("/api/tasks", json={"title": "keeps slipping"}).json()
    for days in (2, 1):
        _make_past_plan(db, days_ago=days, task_ids=[repeat["id"]])

    client.get("/api/plans/today")
    suggestions = client.get("/api/plans/today").json()["suggestions"]
    assert suggestions[0]["task"]["id"] == repeat["id"]
    assert suggestions[-1]["task"]["id"] == fresh["id"]


def test_completing_a_task_stops_it_slipping_further(client, db, sprint, task):
    _make_past_plan(db, days_ago=2, task_ids=[task["id"]])
    client.get("/api/plans/today")
    client.post(f"/api/tasks/{task['id']}/move", json={"status": "done"})

    _make_past_plan(db, days_ago=1, task_ids=[task["id"]])
    client.get("/api/plans/today")

    outcomes = [i["outcome"] for p in client.get("/api/plans").json() for i in p["items"]]
    assert outcomes.count("slipped") == 1
    assert outcomes.count("done") == 1


# ---------- pinning ----------

def test_items_can_be_pinned_and_unpinned(client, sprint, task):
    plan = client.post("/api/plans/today", json={"task_ids": [task["id"]]}).json()
    item = plan["items"][0]
    assert item["pinned"] is True  # committing by hand is a deliberate choice

    body = client.patch(f"/api/plans/{plan['id']}/items/{item['id']}", json={"pinned": False}).json()
    assert body["items"][0]["pinned"] is False


def test_items_can_be_removed(client, sprint, task):
    plan = client.post("/api/plans/today", json={"task_ids": [task["id"]]}).json()
    body = client.delete(f"/api/plans/{plan['id']}/items/{plan['items'][0]['id']}").json()
    assert body["items"] == []


def test_focus_can_be_edited(client, sprint, task):
    plan = client.post("/api/plans/today", json={"task_ids": [task["id"]]}).json()
    assert client.put(f"/api/plans/{plan['id']}", json={"focus": "new focus"}).json()["focus"] == "new focus"


def test_missing_plan_404s(client):
    assert client.get("/api/plans/99999").status_code == 404
    assert client.post("/api/plans/99999/items", json={"task_id": 1}).status_code == 404


def test_duplicate_ids_in_one_commit_are_collapsed(client, sprint, task):
    """(plan_id, task_id) is UNIQUE — a repeated id must not 500."""
    resp = client.post("/api/plans/today", json={"task_ids": [task["id"], task["id"]]})
    assert resp.status_code == 201
    assert len(resp.json()["items"]) == 1
