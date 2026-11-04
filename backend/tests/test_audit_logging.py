import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer
from app.services import ticket_service
from app.services import audit_service


@pytest.mark.asyncio
async def test_immutable_audit_logging(db_session: AsyncSession):
    """Verifies append-only audit trail logging and retrieval."""
    org = Organization(name=f"Audit Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"audit_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Harry S. Truman",
    )
    db_session.add(customer)
    await db_session.commit()

    ticket, _, creation_event = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="Audit Test Ticket",
        initial_message="Initial inquiry",
    )

    # 1. Append custom audit event
    actor_uuid = uuid.uuid4()
    audit_evt_1 = await audit_service.record_audit_event(
        session=db_session,
        ticket_id=ticket.id,
        event_type="pii_access_logged",
        actor_id=actor_uuid,
        metadata={"accessed_fields": ["phone", "email"], "ip_address": "192.168.1.10"},
    )
    await db_session.commit()

    # 2. Append another audit event
    audit_evt_2 = await audit_service.record_audit_event(
        session=db_session,
        ticket_id=ticket.id,
        event_type="supervisor_override_applied",
        actor_id=actor_uuid,
        metadata={"override_reason": "Executive VIP escalation"},
    )
    await db_session.commit()

    # 3. Retrieve audit trail
    trail = await audit_service.get_audit_trail(session=db_session, ticket_id=ticket.id)
    assert len(trail) >= 3  # creation + 2 audit events

    event_types = [e.event_type for e in trail]
    assert "ticket_created" in event_types
    assert "pii_access_logged" in event_types
    assert "supervisor_override_applied" in event_types

    # Ensure chronological order
    for idx in range(len(trail) - 1):
        assert trail[idx].created_at <= trail[idx + 1].created_at
