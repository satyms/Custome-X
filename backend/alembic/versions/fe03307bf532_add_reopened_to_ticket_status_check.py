"""add_reopened_to_ticket_status_check

Revision ID: fe03307bf532
Revises: d01d6d6747dc
Create Date: 2026-11-05 01:38:22.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe03307bf532'
down_revision: Union[str, Sequence[str], None] = 'd01d6d6747dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update check_valid_ticket_status constraint to include 'reopened'."""
    op.execute("ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS check_valid_ticket_status;")
    op.execute("""
        ALTER TABLE public.tickets
        ADD CONSTRAINT check_valid_ticket_status
        CHECK (status IN ('open', 'in_progress', 'escalated', 'resolved', 'closed', 'reopened'));
    """)


def downgrade() -> None:
    """Revert check_valid_ticket_status constraint."""
    op.execute("ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS check_valid_ticket_status;")
    op.execute("""
        ALTER TABLE public.tickets
        ADD CONSTRAINT check_valid_ticket_status
        CHECK (status IN ('open', 'in_progress', 'escalated', 'resolved', 'closed'));
    """)
