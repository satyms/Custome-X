"""fix_rls_infinite_recursion

Revision ID: 675875ef33d9
Revises: bad184373bcd
Create Date: 2026-11-05 00:36:52.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '675875ef33d9'
down_revision: Union[str, Sequence[str], None] = 'bad184373bcd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Break RLS infinite recursion on public.users via SECURITY DEFINER helper function."""
    # 1. Create SECURITY DEFINER function to bypass RLS during organization lookup
    op.execute("""
        CREATE OR REPLACE FUNCTION public.get_auth_organization_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public
        AS $$
          SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1;
        $$;
    """)

    # 2. Drop existing recursive policies
    op.execute('DROP POLICY IF EXISTS "users_tenant_isolation_policy" ON public.users;')
    op.execute('DROP POLICY IF EXISTS "organizations_tenant_isolation_policy" ON public.organizations;')
    op.execute('DROP POLICY IF EXISTS "customers_tenant_isolation_policy" ON public.customers;')
    op.execute('DROP POLICY IF EXISTS "tickets_tenant_isolation_policy" ON public.tickets;')
    op.execute('DROP POLICY IF EXISTS "messages_tenant_isolation_policy" ON public.messages;')
    op.execute('DROP POLICY IF EXISTS "ticket_events_tenant_isolation_policy" ON public.ticket_events;')

    # 3. Re-create non-recursive policies using the SECURITY DEFINER function
    op.execute("""
        CREATE POLICY "users_tenant_isolation_policy" ON public.users
        FOR ALL TO authenticated
        USING (id = auth.uid() OR organization_id = public.get_auth_organization_id())
        WITH CHECK (id = auth.uid() OR organization_id = public.get_auth_organization_id());
    """)

    op.execute("""
        CREATE POLICY "organizations_tenant_isolation_policy" ON public.organizations
        FOR SELECT TO authenticated
        USING (id = public.get_auth_organization_id());
    """)

    op.execute("""
        CREATE POLICY "customers_tenant_isolation_policy" ON public.customers
        FOR ALL TO authenticated
        USING (organization_id = public.get_auth_organization_id())
        WITH CHECK (organization_id = public.get_auth_organization_id());
    """)

    op.execute("""
        CREATE POLICY "tickets_tenant_isolation_policy" ON public.tickets
        FOR ALL TO authenticated
        USING (organization_id = public.get_auth_organization_id())
        WITH CHECK (organization_id = public.get_auth_organization_id());
    """)

    op.execute("""
        CREATE POLICY "messages_tenant_isolation_policy" ON public.messages
        FOR ALL TO authenticated
        USING (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = public.get_auth_organization_id()))
        WITH CHECK (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = public.get_auth_organization_id()));
    """)

    op.execute("""
        CREATE POLICY "ticket_events_tenant_isolation_policy" ON public.ticket_events
        FOR ALL TO authenticated
        USING (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = public.get_auth_organization_id()))
        WITH CHECK (ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = public.get_auth_organization_id()));
    """)


def downgrade() -> None:
    """Revert non-recursive policies and drop helper function."""
    op.execute('DROP POLICY IF EXISTS "ticket_events_tenant_isolation_policy" ON public.ticket_events;')
    op.execute('DROP POLICY IF EXISTS "messages_tenant_isolation_policy" ON public.messages;')
    op.execute('DROP POLICY IF EXISTS "tickets_tenant_isolation_policy" ON public.tickets;')
    op.execute('DROP POLICY IF EXISTS "customers_tenant_isolation_policy" ON public.customers;')
    op.execute('DROP POLICY IF EXISTS "organizations_tenant_isolation_policy" ON public.organizations;')
    op.execute('DROP POLICY IF EXISTS "users_tenant_isolation_policy" ON public.users;')
    op.execute('DROP FUNCTION IF EXISTS public.get_auth_organization_id();')
