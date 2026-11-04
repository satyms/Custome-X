"""add_ticket_lifecycle_columns

Revision ID: d01d6d6747dc
Revises: 675875ef33d9
Create Date: 2026-11-05 01:26:40.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd01d6d6747dc'
down_revision: Union[str, Sequence[str], None] = '675875ef33d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add ticket_number, resolved_at, closed_at columns and indexes."""
    op.add_column('tickets', sa.Column('ticket_number', sa.String(length=50), nullable=True))
    op.add_column('tickets', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tickets', sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True))

    op.create_index('idx_tickets_ticket_number', 'tickets', ['organization_id', 'ticket_number'], unique=False)


def downgrade() -> None:
    """Remove ticket lifecycle columns."""
    op.drop_index('idx_tickets_ticket_number', table_name='tickets')
    op.drop_column('tickets', 'closed_at')
    op.drop_column('tickets', 'resolved_at')
    op.drop_column('tickets', 'ticket_number')
