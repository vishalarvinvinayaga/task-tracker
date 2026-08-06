"""allow plan entity in activity log

Revision ID: a3e9514332a8
Revises: 95200a1815fb
Create Date: 2026-08-06 12:51:18.900831

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3e9514332a8'
down_revision: Union[str, None] = '95200a1815fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ALLOWED = "'sprint', 'task', 'note', 'kb', 'time', 'inbox', 'attachment', 'tag'"


def upgrade() -> None:
    op.drop_constraint("ck_activity_entity_type", "activity_log", type_="check")
    op.create_check_constraint(
        "ck_activity_entity_type", "activity_log", f"entity_type IN ({ALLOWED}, 'plan')"
    )


def downgrade() -> None:
    # Plan entries would violate the narrower constraint, so clear them first.
    op.execute("DELETE FROM activity_log WHERE entity_type = 'plan'")
    op.drop_constraint("ck_activity_entity_type", "activity_log", type_="check")
    op.create_check_constraint("ck_activity_entity_type", "activity_log", f"entity_type IN ({ALLOWED})")
