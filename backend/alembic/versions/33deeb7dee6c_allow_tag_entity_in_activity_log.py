"""allow tag entity in activity log

Revision ID: 33deeb7dee6c
Revises: d034c3863837
Create Date: 2026-08-05 13:21:03.364961

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '33deeb7dee6c'
down_revision: Union[str, None] = 'd034c3863837'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ENTITIES_WITH_TAG = "'sprint', 'task', 'note', 'kb', 'time', 'inbox', 'attachment', 'tag'"
ENTITIES_WITHOUT_TAG = "'sprint', 'task', 'note', 'kb', 'time', 'inbox', 'attachment'"


def upgrade() -> None:
    """Tag create/rename/delete are now audited, so 'tag' must be a valid entity."""
    op.drop_constraint("ck_activity_entity_type", "activity_log", type_="check")
    op.create_check_constraint(
        "ck_activity_entity_type", "activity_log", f"entity_type IN ({ENTITIES_WITH_TAG})"
    )


def downgrade() -> None:
    # Drop the rows the narrower constraint would reject.
    op.execute("DELETE FROM activity_log WHERE entity_type = 'tag'")
    op.drop_constraint("ck_activity_entity_type", "activity_log", type_="check")
    op.create_check_constraint(
        "ck_activity_entity_type", "activity_log", f"entity_type IN ({ENTITIES_WITHOUT_TAG})"
    )
