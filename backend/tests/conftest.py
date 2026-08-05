"""
Test harness.

Everything here runs against `planner_test_db` — a database entirely separate
from the app's `planner_db`, so running the suite can never touch real data.
Each test gets a fresh schema-truncated database, seeded with the reference
tags/templates the app ships with.
"""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://planner:planner_local_dev@127.0.0.1:5432/planner_test_db",
)
# Must be set before app modules import settings.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app import models  # noqa: E402,F401  (registers all tables on Base.metadata)
from app.main import app  # noqa: E402

engine = create_engine(TEST_DATABASE_URL, future=True)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

SEED_TAGS = [
    ("Aimee", "#3B82F6"),
    ("Hemotag", "#EF4444"),
    ("Immigration", "#F59E0B"),
    ("Content", "#8B5CF6"),
    ("Research", "#10B981"),
]

SEED_TEMPLATES = [
    ("1:1 Meeting", "meeting_note", {"sections": ["Updates", "Discussion Points", "Action Items"]}),
    ("Team Standup", "meeting_note", {"sections": ["Yesterday", "Today", "Blockers"]}),
    ("New Aimee Agent", "task", {"subtasks": ["Prompt engineering", "Testing & QA"]}),
]


def _guard_not_production() -> None:
    """Hard stop if anything ever points the suite at the real database."""
    if "planner_test_db" not in TEST_DATABASE_URL:
        raise RuntimeError(
            f"Refusing to run tests against non-test database: {TEST_DATABASE_URL}"
        )


@pytest.fixture(scope="session", autouse=True)
def _schema():
    _guard_not_production()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_db(_schema):
    """Truncate + reseed between tests so each one starts from a known state."""
    _guard_not_production()
    with engine.begin() as conn:
        tables = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        conn.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))

    db = TestingSessionLocal()
    try:
        for name, color in SEED_TAGS:
            db.add(models.Tag(name=name, color=color))
        for name, ttype, content in SEED_TEMPLATES:
            db.add(models.Template(name=name, template_type=ttype, content_json=content))
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------- convenience factories ----------

@pytest.fixture
def sprint(client):
    """An active sprint spanning today."""
    resp = client.post(
        "/api/sprints",
        json={
            "name": "Test Sprint",
            "start_date": "2026-01-01",
            "end_date": "2099-12-31",
            "status": "active",
            "goals_summary": "Ship it",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def task(client, sprint):
    resp = client.post(
        "/api/tasks",
        json={"title": "Test task", "sprint_id": sprint["id"], "priority": "high"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def note(client):
    resp = client.post("/api/notes", json={"title": "Test note", "content_md": "hello world"})
    assert resp.status_code == 201, resp.text
    return resp.json()
