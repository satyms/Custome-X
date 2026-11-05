import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.exceptions import ForbiddenError, EntityNotFoundError
from app.models.organization import Organization
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.user import User
from app.models.agent_audit import PendingAction, AuditLog, WorkflowEvent
from app.services.approval_service import (
    classify_action_risk,
    create_pending_action_async,
    list_approvals_async,
    approve_action_async,
    reject_action_async,
)


def test_action_risk_classification():
    # 1. Low risk refund (< $50)
    risk, req = classify_action_risk("refund", {"amount_cents": 3500})
    assert risk == "low"
    assert req is False

    # 2. High risk refund (> $50, <= $200)
    risk, req = classify_action_risk("refund", {"amount_cents": 7500})
    assert risk == "high"
    assert req is True

    # 3. Critical risk refund (> $200)
    risk, req = classify_action_risk("refund", {"amount_cents": 25000})
    assert risk == "critical"
    assert req is True

    # 4. In-transit cancellation -> Critical
    risk, req = classify_action_risk("cancellation", {"order_status": "shipped"})
    assert risk == "critical"
    assert req is True

    # 5. Pending unfulfilled cancellation -> Low
    risk, req = classify_action_risk("cancellation", {"order_status": "pending"})
    assert risk == "low"
    assert req is False


@pytest.mark.asyncio
async def test_hitl_lifecycle_database_and_audit(db_session: AsyncSession):
    # Setup test org, customer, ticket, and users
    org = Organization(name=f"HITL Test Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"hitl_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Eleanor Vance",
    )
    db_session.add(customer)
    await db_session.flush()

    ticket = Ticket(
        organization_id=org.id,
        customer_id=customer.id,
        title="Delivery lost claim ORD-5510",
        ticket_number=f"CX-{uuid.uuid4().hex[:4].upper()}",
        status="open",
        priority="high",
    )
    db_session.add(ticket)

    supervisor = User(
        organization_id=org.id,
        email=f"sup_{uuid.uuid4().hex[:6]}@custome-x.internal",
        full_name="Chief Supervisor",
        role="supervisor",
    )
    agent = User(
        organization_id=org.id,
        email=f"ag_{uuid.uuid4().hex[:6]}@custome-x.internal",
        full_name="Junior Agent",
        role="agent",
    )
    db_session.add_all([supervisor, agent])
    await db_session.commit()

    # 1. Propose High-Risk Action
    action = await create_pending_action_async(
        session=db_session,
        organization_id=org.id,
        ticket_id=ticket.id,
        action_type="refund",
        payload={"action": "stripe_refund", "amount_cents": 12500, "reason": "lost_in_transit"},
        requested_by="ai_agent",
        ai_rationale="Carrier has had 0 scans for 15 days.",
        confidence_score=94,
    )
    assert action.id is not None
    assert action.status == "pending"

    # 2. List Approvals (Scoped)
    approvals = await list_approvals_async(
        session=db_session,
        organization_id=org.id,
        status_filter="pending",
    )
    assert len(approvals) >= 1
    found = next((a for a in approvals if a.id == str(action.id)), None)
    assert found is not None
    assert found.amount == 125.00
    assert found.risk_level == "high"

    # 3. Agent (non-supervisor) attempt to approve should raise ForbiddenError
    with pytest.raises(ForbiddenError):
        await approve_action_async(
            session=db_session,
            approval_id=str(action.id),
            reviewer_user=agent,
            note="Agent trying to authorize",
        )

    # 4. Supervisor approves action
    approved = await approve_action_async(
        session=db_session,
        approval_id=str(action.id),
        reviewer_user=supervisor,
        note="Carrier SLA verified breached. Full refund authorized.",
    )
    assert approved.status == "approved"
    assert approved.reviewed_by == supervisor.full_name

    # 5. Verify Audit Log entry exists
    audit_res = await db_session.execute(
        select(AuditLog).where(
            AuditLog.entity_id == str(action.id),
            AuditLog.action == "approval.approved",
        )
    )
    audit_entry = audit_res.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.actor_id == str(supervisor.id)
    assert "Full refund authorized" in str(audit_entry.details)

    # 6. Verify Webhook Event queued for outbound automation
    wf_res = await db_session.execute(
        select(WorkflowEvent).where(
            WorkflowEvent.organization_id == org.id,
            WorkflowEvent.event_type == "approval.approved",
        )
    )
    wf_event = wf_res.scalar_one_or_none()
    assert wf_event is not None
    assert wf_event.payload["approval_id"] == str(action.id)


@pytest.mark.asyncio
async def test_hitl_reject_action_with_rationale(db_session: AsyncSession):
    org = Organization(name=f"Reject Test Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"cust_rej_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Marcus Cole",
    )
    db_session.add(customer)
    await db_session.flush()

    ticket = Ticket(
        organization_id=org.id,
        customer_id=customer.id,
        title="Cancel shipment request",
        ticket_number=f"CX-{uuid.uuid4().hex[:4].upper()}",
        status="open",
        priority="urgent",
    )
    supervisor = User(
        organization_id=org.id,
        email=f"sup_rej_{uuid.uuid4().hex[:6]}@custome-x.internal",
        full_name="Audit Supervisor",
        role="supervisor",
    )
    db_session.add_all([ticket, supervisor])
    await db_session.commit()

    # Create pending action
    action = await create_pending_action_async(
        session=db_session,
        organization_id=org.id,
        ticket_id=ticket.id,
        action_type="cancellation",
        payload={"order_status": "shipped", "carrier": "FedEx"},
        requested_by="ai_agent",
        ai_rationale="Customer wants urgent delivery cancellation",
        confidence_score=85,
    )

    # Reject action with reason
    rejected = await reject_action_async(
        session=db_session,
        approval_id=str(action.id),
        reviewer_user=supervisor,
        reason="Package is already loaded onto the outbound linehaul trailer.",
    )
    assert rejected.status == "rejected"
    assert rejected.rejection_reason == "Package is already loaded onto the outbound linehaul trailer."

    # Verify Audit Log
    audit_res = await db_session.execute(
        select(AuditLog).where(
            AuditLog.entity_id == str(action.id),
            AuditLog.action == "approval.rejected",
        )
    )
    audit = audit_res.scalar_one_or_none()
    assert audit is not None
    assert "linehaul trailer" in str(audit.details)
