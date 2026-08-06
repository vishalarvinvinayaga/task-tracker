"""
MCP planning tools.

These share the backend's ORM models, so they're exercised against the same
isolated test database as the API tests. The regression they guard: planning
used to search only the active sprint, so anyone working from plain lists got
an empty plan back.
"""
import datetime as dt
import sys
from pathlib import Path

import pytest

MCP_DIR = Path(__file__).resolve().parent.parent.parent / "mcp-server"
if str(MCP_DIR) not in sys.path:
    sys.path.insert(0, str(MCP_DIR))

planning = pytest.importorskip("tools.planning_tools", reason="mcp-server package not on path")


@pytest.fixture
def today() -> str:
    return dt.date.today().isoformat()


def test_today_plan_finds_tasks_in_a_list_with_no_sprint(client, today):
    """The core regression: no sprint anywhere, task lives in a list."""
    lst = client.post("/api/sprints", json={"name": "Reading", "container_type": "list"}).json()
    client.post("/api/tasks", json={"title": "Read the paper", "sprint_id": lst["id"], "due_date": today})

    plan = planning.get_today_plan()

    assert plan["active_sprint"] is None
    titles = [t["title"] for t in plan["today_tasks"]]
    assert "Read the paper" in titles


def test_today_plan_labels_which_container_each_task_came_from(client, today):
    lst = client.post("/api/sprints", json={"name": "Errands", "container_type": "list"}).json()
    client.post("/api/tasks", json={"title": "Post the forms", "sprint_id": lst["id"], "due_date": today})

    task = planning.get_today_plan()["today_tasks"][0]
    assert task["container"] == "Errands"


def test_today_plan_spans_sprints_and_lists_together(client, sprint, today):
    """A user running a sprint *and* keeping side lists sees both."""
    lst = client.post("/api/sprints", json={"name": "Side", "container_type": "list"}).json()
    client.post("/api/tasks", json={"title": "sprint work", "sprint_id": sprint["id"], "due_date": today})
    client.post("/api/tasks", json={"title": "side work", "sprint_id": lst["id"], "due_date": today})

    containers = {t["container"] for t in planning.get_today_plan()["today_tasks"]}
    assert containers == {sprint["name"], "Side"}


def test_today_plan_includes_in_progress_without_a_due_date(client):
    lst = client.post("/api/sprints", json={"name": "WIP", "container_type": "list"}).json()
    client.post("/api/tasks", json={"title": "already started", "sprint_id": lst["id"], "status": "in_progress"})

    assert [t["title"] for t in planning.get_today_plan()["today_tasks"]] == ["already started"]


def test_today_plan_excludes_done_and_future_work(client, today):
    lst = client.post("/api/sprints", json={"name": "Mixed", "container_type": "list"}).json()
    future = (dt.date.today() + dt.timedelta(days=30)).isoformat()
    client.post("/api/tasks", json={"title": "finished", "sprint_id": lst["id"], "status": "done", "due_date": today})
    client.post("/api/tasks", json={"title": "much later", "sprint_id": lst["id"], "due_date": future})
    client.post("/api/tasks", json={"title": "due today", "sprint_id": lst["id"], "due_date": today})

    assert [t["title"] for t in planning.get_today_plan()["today_tasks"]] == ["due today"]


def test_overdue_work_still_surfaces(client):
    """Something due last week hasn't stopped being today's problem."""
    lst = client.post("/api/sprints", json={"name": "Overdue", "container_type": "list"}).json()
    past = (dt.date.today() - dt.timedelta(days=7)).isoformat()
    client.post("/api/tasks", json={"title": "overdue thing", "sprint_id": lst["id"], "due_date": past})

    assert [t["title"] for t in planning.get_today_plan()["today_tasks"]] == ["overdue thing"]


def test_standup_covers_lists_too(client, today):
    lst = client.post("/api/sprints", json={"name": "Standup list", "container_type": "list"}).json()
    client.post("/api/tasks", json={"title": "todays item", "sprint_id": lst["id"], "due_date": today})

    planned = [t["title"] for t in planning.get_standup()["today_planned"]]
    assert "todays item" in planned


def test_sprint_summary_without_a_sprint_points_at_the_right_tool(client):
    result = planning.get_sprint_summary()
    assert "error" in result
    assert "get_today_plan" in result["hint"]


def test_sprint_summary_on_a_list_does_not_crash_on_missing_dates(client):
    """Lists have no end_date — the days-remaining maths must not explode."""
    lst = client.post("/api/sprints", json={"name": "Dateless", "container_type": "list"}).json()

    summary = planning.get_sprint_summary(sprint_id=lst["id"])

    assert summary["days_remaining"] is None
    assert summary["name"] == "Dateless"


def test_empty_database_returns_an_empty_plan_not_an_error(client):
    plan = planning.get_today_plan()
    assert plan["today_tasks"] == []
    assert plan["active_sprint"] is None
