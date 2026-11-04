"""add_rls_tenant_isolation_policies

Revision ID: bad184373bcd
Revises: 4045d08861b6
Create Date: 2026-11-04 19:35:05.743512

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bad184373bcd'
down_revision: Union[str, Sequence[str], None] = '4045d08861b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply Row Level Security (RLS) and Tenant Isolation Policies."""
    # 1. Enable RLS on all domain tables
    op.execute("ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;")

    # 2. Add RLS Policies for authenticated users
    # Users: Only view/edit members within own tenant organization
    op.execute("""
        CREATE POLICY "users_tenant_isolation_policy" ON public.users
        FOR ALL TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));
    """)

    # Organizations: Member can view own organization
    op.execute("""
        CREATE POLICY "organizations_tenant_isolation_policy" ON public.organizations
        FOR SELECT TO authenticated
        USING (id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));
    """)

    # Customers: Access customers belonging to same organization
    op.execute("""
        CREATE POLICY "customers_tenant_isolation_policy" ON public.customers
        FOR ALL TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));
    """)

    # Tickets: Full CRUD isolation by organization_id
    op.execute("""
        CREATE POLICY "tickets_tenant_isolation_policy" ON public.tickets
        FOR ALL TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));
    """)

    # Messages: Access thread messages strictly belonging to caller's tenant tickets
    op.execute("""
        CREATE POLICY "messages_tenant_isolation_policy" ON public.messages
        FOR ALL TO authenticated
        USING (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())))
        WITH CHECK (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())));
    """)

    # Ticket Events: Audit log inspection restricted to caller's tenant tickets
    op.execute("""
        CREATE POLICY "ticket_events_tenant_isolation_policy" ON public.ticket_events
        FOR ALL TO authenticated
        USING (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())))
        WITH CHECK (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())));
    """)


def downgrade() -> None:
    """Remove Row Level Security Policies."""
    op.execute('DROP POLICY IF EXISTS "ticket_events_tenant_isolation_policy" ON public.ticket_events;')
    op.execute('DROP POLICY IF EXISTS "messages_tenant_isolation_policy" ON public.messages;')
    op.execute('DROP POLICY IF EXISTS "tickets_tenant_isolation_policy" ON public.tickets;')
    op.execute('DROP POLICY IF EXISTS "customers_tenant_isolation_policy" ON public.customers;')
    op.execute('DROP POLICY IF EXISTS "organizations_tenant_isolation_policy" ON public.organizations;')
    op.execute('DROP POLICY IF EXISTS "users_tenant_isolation_policy" ON public.users;')
