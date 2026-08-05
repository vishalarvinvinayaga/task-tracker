"""containers: sprint or list, protected backlog

Generalises the `sprints` table into a typed task container. Existing rows
become `container_type='sprint'` so nothing about current behaviour changes,
and a protected "Backlog" list is created so a task can always be captured
without any sprint ceremony.

Revision ID: d034c3863837
Revises: 7ffccb08c3f4
Create Date: 2026-08-05 12:19:36.261029

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd034c3863837'
down_revision: Union[str, None] = '7ffccb08c3f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sprints", sa.Column("container_type", sa.Text(), server_default="sprint", nullable=False))
    op.add_column("sprints", sa.Column("default_view", sa.Text(), server_default="board", nullable=False))
    op.add_column("sprints", sa.Column("is_protected", sa.Boolean(), server_default="false", nullable=False))

    # Lists carry no dates, so these can no longer be NOT NULL.
    op.alter_column("sprints", "start_date", existing_type=sa.Date(), nullable=True)
    op.alter_column("sprints", "end_date", existing_type=sa.Date(), nullable=True)

    op.create_check_constraint("ck_sprints_container_type", "sprints", "container_type IN ('sprint', 'list')")
    op.create_check_constraint("ck_sprints_default_view", "sprints", "default_view IN ('board', 'list')")
    op.create_check_constraint(
        "ck_sprints_dates_required_for_sprints",
        "sprints",
        "(container_type = 'sprint' AND start_date IS NOT NULL AND end_date IS NOT NULL)"
        " OR container_type = 'list'",
    )

    # Guarantee an always-available home for tasks. Idempotent, so it is safe
    # on a database that already has a protected container.
    op.execute(
        """
        INSERT INTO sprints (name, container_type, status, default_view, is_protected)
        SELECT 'Backlog', 'list', 'active', 'list', true
        WHERE NOT EXISTS (SELECT 1 FROM sprints WHERE is_protected = true)
        """
    )


def downgrade() -> None:
    # Tasks living on list-type containers have nowhere to go once lists are
    # removed, so drop them alongside — the NOT NULL date columns cannot be
    # restored while dateless containers exist.
    op.execute("DELETE FROM tasks WHERE sprint_id IN (SELECT id FROM sprints WHERE container_type = 'list')")
    op.execute("DELETE FROM sprints WHERE container_type = 'list'")

    op.drop_constraint("ck_sprints_dates_required_for_sprints", "sprints", type_="check")
    op.drop_constraint("ck_sprints_default_view", "sprints", type_="check")
    op.drop_constraint("ck_sprints_container_type", "sprints", type_="check")
    op.alter_column("sprints", "end_date", existing_type=sa.Date(), nullable=False)
    op.alter_column("sprints", "start_date", existing_type=sa.Date(), nullable=False)
    op.drop_column("sprints", "is_protected")
    op.drop_column("sprints", "default_view")
    op.drop_column("sprints", "container_type")
