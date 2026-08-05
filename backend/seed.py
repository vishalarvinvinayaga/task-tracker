from app.database import SessionLocal
from app.models import Tag, Template

# Generic starting points for a fresh install — rename, recolour or delete any
# of them from Settings → Tags once you know your own workstreams.
TAGS = [
    ("Work", "#3B82F6"),
    ("Personal", "#10B981"),
    ("Urgent", "#EF4444"),
    ("Admin", "#F59E0B"),
    ("Research", "#8B5CF6"),
]

TEMPLATES = [
    ("1:1 Meeting", "meeting_note", {"sections": ["Updates", "Discussion Points", "Action Items", "Decisions Made"]}),
    ("Team Standup", "meeting_note", {"sections": ["Yesterday", "Today", "Blockers"]}),
    ("Sprint Planning", "meeting_note", {"sections": ["Sprint Goal", "Task Breakdown", "Capacity Check", "Risks"]}),
    ("Sprint Retro", "meeting_note", {"sections": ["What Went Well", "What Needs Improvement", "Action Items"]}),
    (
        "New Feature",
        "task",
        {"subtasks": ["Design", "Implementation", "Tests", "Documentation", "Review & QA"]},
    ),
]


def seed() -> None:
    db = SessionLocal()
    try:
        for name, color in TAGS:
            if not db.query(Tag).filter_by(name=name).first():
                db.add(Tag(name=name, color=color))

        for name, template_type, content in TEMPLATES:
            if not db.query(Template).filter_by(name=name).first():
                db.add(Template(name=name, template_type=template_type, content_json=content))

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
