"""create_commerce_and_agent_audit_tables

Revision ID: a892f3b14cd5
Revises: 6d41c0cbdd36
Create Date: 2026-11-05 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a892f3b14cd5'
down_revision: Union[str, Sequence[str], None] = '6d41c0cbdd36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. products table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            sku VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price_cents INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_products_org_sku UNIQUE (organization_id, sku)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_products_org_sku ON public.products(organization_id, sku);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_products_org_name ON public.products(organization_id, name);")

    # 2. orders table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
            order_number VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            total_amount_cents INTEGER NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'USD',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT check_valid_order_status CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
            CONSTRAINT uq_orders_org_number UNIQUE (organization_id, order_number)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_orders_org_status ON public.orders(organization_id, status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);")

    # 3. order_items table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.order_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price_cents INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);")

    # 4. shipments table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.shipments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
            carrier VARCHAR(50) NOT NULL,
            tracking_number VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'label_created',
            estimated_delivery TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT check_valid_shipment_status CHECK (status IN ('label_created', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned'))
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_shipments_org_id ON public.shipments(organization_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.shipments(tracking_number);")

    # 5. shipment_events table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.shipment_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
            event_type VARCHAR(100) NOT NULL,
            description VARCHAR(255) NOT NULL,
            location VARCHAR(255),
            event_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON public.shipment_events(shipment_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_shipment_events_time ON public.shipment_events(event_time);")

    # 6. pending_actions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.pending_actions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
            action_type VARCHAR(100) NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            requested_by VARCHAR(100) NOT NULL DEFAULT 'ai_agent',
            reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
            reviewer_notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT check_valid_pending_action_status CHECK (status IN ('pending', 'approved', 'rejected'))
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_pending_actions_org_status ON public.pending_actions(organization_id, status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pending_actions_ticket_id ON public.pending_actions(ticket_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pending_actions_created_at ON public.pending_actions(created_at);")

    # 7. workflow_events table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.workflow_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            event_type VARCHAR(100) NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(50) NOT NULL DEFAULT 'queued',
            retry_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 3,
            last_error TEXT,
            idempotency_key VARCHAR(128) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT check_valid_workflow_event_status CHECK (status IN ('queued', 'success', 'failed', 'retrying'))
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_wf_events_org_status ON public.workflow_events(organization_id, status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_wf_events_type ON public.workflow_events(event_type);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_wf_events_created_at ON public.workflow_events(created_at);")

    # 8. agent_runs table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.agent_runs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
            model VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'running',
            input_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens INTEGER NOT NULL DEFAULT 0,
            latency_ms INTEGER NOT NULL DEFAULT 0,
            confidence_score DOUBLE PRECISION,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMPTZ,
            CONSTRAINT check_valid_agent_run_status CHECK (status IN ('running', 'completed', 'failed', 'paused_hitl'))
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_agent_runs_org_id ON public.agent_runs(organization_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agent_runs_ticket_id ON public.agent_runs(ticket_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON public.agent_runs(started_at);")

    # 9. tool_calls table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.tool_calls (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
            tool_name VARCHAR(100) NOT NULL,
            input JSONB NOT NULL DEFAULT '{}'::jsonb,
            output JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(50) NOT NULL DEFAULT 'success',
            duration_ms INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_tool_calls_agent_run_id ON public.tool_calls(agent_run_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_name ON public.tool_calls(tool_name);")

    # 10. audit_logs table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            actor_id VARCHAR(100),
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(100) NOT NULL,
            entity_id VARCHAR(100),
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(organization_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);")

    # Enable RLS on all 10 tables
    tables = [
        "products", "orders", "order_items", "shipments", "shipment_events",
        "pending_actions", "workflow_events", "agent_runs", "tool_calls", "audit_logs"
    ]
    for tbl in tables:
        op.execute(f"ALTER TABLE public.{tbl} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = '{tbl}' AND policyname = '{tbl}_tenant_isolation_policy'
                ) THEN
                    CREATE POLICY {tbl}_tenant_isolation_policy ON public.{tbl}
                        FOR ALL
                        USING (true)
                        WITH CHECK (true);
                END IF;
            END $$;
        """)


def downgrade() -> None:
    tables = [
        "audit_logs", "tool_calls", "agent_runs", "workflow_events", "pending_actions",
        "shipment_events", "shipments", "order_items", "orders", "products"
    ]
    for tbl in tables:
        op.execute(f"DROP TABLE IF EXISTS public.{tbl} CASCADE;")
