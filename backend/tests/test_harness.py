"""Sanity checks on the harness itself — the safety net for every other test."""
from app.config import settings


def test_suite_points_at_test_database():
    """If this ever fails, stop: the suite would be mutating real data."""
    assert "planner_test_db" in settings.database_url
    assert "planner_db" not in settings.database_url.replace("planner_test_db", "")


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_seed_data_present(client):
    tags = client.get("/api/tags").json()
    assert len(tags) == 5
    assert {t["name"] for t in tags} >= {"Aimee", "Hemotag"}

    templates = client.get("/api/templates").json()
    assert len(templates) == 3


def test_db_is_isolated_between_tests(client):
    """Data created here must not leak into other tests."""
    client.post("/api/notes", json={"title": "leak check", "content_md": "x"})
    assert len(client.get("/api/notes").json()) == 1


def test_db_really_was_reset(client):
    assert client.get("/api/notes").json() == []
