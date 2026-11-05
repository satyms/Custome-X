import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.commerce import Product, Order, OrderItem, Shipment, ShipmentEvent
from app.models.agent_audit import PendingAction, WorkflowEvent, AgentRun, ToolCall, AuditLog


@pytest.mark.asyncio
async def test_commerce_models_persistence_and_relationships(db_session: AsyncSession):
    """
    Verifies Layer 4 Commerce tables: products, orders, order_items, shipments, shipment_events.
    """
    org_id = uuid.uuid4()
    org = Organization(id=org_id, name=f"Commerce Test Org {uuid.uuid4().hex[:6]}")
    cust = Customer(
        id=uuid.uuid4(),
        organization_id=org_id,
        email=f"shopper_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Alice Shopper",
    )
    db_session.add_all([org, cust])
    await db_session.flush()

    # 1. Product
    prod = Product(
        organization_id=org.id,
        sku=f"SKU-{uuid.uuid4().hex[:6].upper()}",
        name="Noise-Canceling Wireless Headphones",
        description="Active noise canceling over-ear headphones",
        price_cents=19999,
    )
    db_session.add(prod)
    await db_session.flush()

    # 2. Order
    order = Order(
        organization_id=org.id,
        customer_id=cust.id,
        order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
        status="paid",
        total_amount_cents=19999,
        currency="USD",
    )
    db_session.add(order)
    await db_session.flush()

    # 3. Order Item
    item = OrderItem(
        order_id=order.id,
        product_id=prod.id,
        quantity=1,
        unit_price_cents=19999,
    )
    db_session.add(item)
    await db_session.flush()

    # 4. Shipment
    shipment = Shipment(
        organization_id=org.id,
        order_id=order.id,
        carrier="FedEx",
        tracking_number=f"FX-{uuid.uuid4().hex[:10].upper()}",
        status="in_transit",
    )
    db_session.add(shipment)
    await db_session.flush()

    # 5. Shipment Event
    scan = ShipmentEvent(
        shipment_id=shipment.id,
        event_type="departed_facility",
        description="Departed carrier sorting facility in Memphis, TN",
        location="Memphis, TN",
        event_time=datetime.now(timezone.utc),
    )
    db_session.add(scan)
    await db_session.commit()

    # Verify query and eager relationships
    stmt = select(Order).where(Order.id == order.id)
    res = (await db_session.execute(stmt)).scalar_one()
    assert res.order_number == order.order_number
    assert res.status == "paid"
    assert res.total_amount_cents == 19999


@pytest.mark.asyncio
async def test_agent_and_audit_models_persistence(db_session: AsyncSession):
    """
    Verifies Layer 4 Agent & HITL tables: pending_actions, workflow_events, agent_runs, tool_calls, audit_logs.
    """
    org_id = uuid.uuid4()
    org = Organization(id=org_id, name=f"Audit Test Org {uuid.uuid4().hex[:6]}")
    cust = Customer(
        id=uuid.uuid4(),
        organization_id=org_id,
        email=f"audit_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Bob Evaluator",
    )
    db_session.add_all([org, cust])
    await db_session.flush()

    ticket = Ticket(
        organization_id=org.id,
        customer_id=cust.id,
        ticket_number=f"TCK-{uuid.uuid4().hex[:6].upper()}",
        title="Refund request for damaged shipment",
        status="open",
        priority="high",
    )
    db_session.add(ticket)
    await db_session.flush()

    # 1. Pending Action (HITL)
    pending = PendingAction(
        organization_id=org.id,
        ticket_id=ticket.id,
        action_type="request_refund_approval",
        payload={"refund_amount_cents": 12500, "reason": "Damaged in transit"},
        status="pending",
        requested_by="ai_agent",
    )
    db_session.add(pending)

    # 2. Workflow Event (n8n queue / DLQ)
    wf_event = WorkflowEvent(
        organization_id=org.id,
        event_type="approval.requested",
        payload={"action_id": str(pending.id), "amount_cents": 12500},
        status="queued",
        idempotency_key=f"idemp_{uuid.uuid4().hex}",
    )
    db_session.add(wf_event)

    # 3. Agent Run
    agent_run = AgentRun(
        organization_id=org.id,
        ticket_id=ticket.id,
        model="gemini-3.5-flash-lite",
        status="completed",
        input_tokens=512,
        output_tokens=180,
        latency_ms=1240,
        confidence_score=0.96,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    db_session.add(agent_run)
    await db_session.flush()

    # 4. Tool Call
    tool_call = ToolCall(
        agent_run_id=agent_run.id,
        tool_name="get_shipment_status",
        input={"tracking_number": "FX-123456"},
        output={"status": "in_transit", "carrier": "FedEx"},
        status="success",
        duration_ms=180,
    )
    db_session.add(tool_call)

    # 5. Audit Log
    audit = AuditLog(
        organization_id=org.id,
        actor_id="system_agent",
        action="pending_action.created",
        entity_type="pending_actions",
        entity_id=str(pending.id),
        details={"action_type": "request_refund_approval", "amount_cents": 12500},
    )
    db_session.add(audit)
    await db_session.commit()

    # Assertions
    saved_wf = (await db_session.execute(select(WorkflowEvent).where(WorkflowEvent.id == wf_event.id))).scalar_one()
    assert saved_wf.status == "queued"
    assert saved_wf.event_type == "approval.requested"

    saved_run = (await db_session.execute(select(AgentRun).where(AgentRun.id == agent_run.id))).scalar_one()
    assert saved_run.model == "gemini-3.5-flash-lite"
    assert saved_run.confidence_score == 0.96
