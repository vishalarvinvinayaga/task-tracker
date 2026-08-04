from app.database import SessionLocal
from app.models import Tag, Template

TAGS = [
    ("Aimee", "#3B82F6"),
    ("Hemotag", "#EF4444"),
    ("Immigration", "#F59E0B"),
    ("Content", "#8B5CF6"),
    ("Research", "#10B981"),
]

TEMPLATES = [
    ("1:1 Meeting", "meeting_note", {"sections": ["Updates", "Discussion Points", "Action Items", "Decisions Made"]}),
    ("Team Standup", "meeting_note", {"sections": ["Yesterday", "Today", "Blockers"]}),
    ("Sprint Planning", "meeting_note", {"sections": ["Sprint Goal", "Task Breakdown", "Capacity Check", "Risks"]}),
    ("Sprint Retro", "meeting_note", {"sections": ["What Went Well", "What Needs Improvement", "Action Items"]}),
    (
        "New Aimee Agent",
        "task",
        {"subtasks": ["Prompt engineering", "ElevenLabs agent config", "Knowledge base setup", "Twilio routing", "Testing & QA"]},
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
