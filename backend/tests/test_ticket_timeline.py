import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer
from app.models.user import User
from app.services import ticket_service
from tests.test_auth_endpoints import create_token_for_user


@pytest.mark.asyncio
async def test_unified_ticket_timeline(db_session: AsyncSession):
    """Verifies that ticket timeline combines messages and audit events chronologically."""
    org = Organization(name=f"Timeline Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"timeline_agent_{uuid.uuid4().hex[:6]}@cxpilot.io",
        full_name="Agent Cooper",
        role="agent",
    )
    customer = Customer(
        organization_id=org.id,
        email=f"timeline_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Audrey Horne",
    )
    db_session.add_all([agent, customer])
    await db_session.commit()

    # 1. Create ticket (adds 1 message and 1 creation event)
    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="Timeline Event Test",
        initial_message="First customer query",
    )

    # 2. Assign agent (adds assignment event and auto-claim status event)
    await ticket_service.assign_ticket(
        session=db_session,
        ticket_id=ticket.id,
        assigned_to_user_id=agent.id,
        actor_id=agent.id,
        organization_id=org.id,
    )

    # 3. Agent reply (adds 1 message)
    await ticket_service.add_message(
        session=db_session,
        ticket_id=ticket.id,
        content="I have reviewed your inquiry.",
        sender_type="agent",
        sender_id=agent.id,
        organization_id=org.id,
    )

    # 4. Status change to RESOLVED (adds 1 status_changed event)
    await ticket_service.update_ticket_status(
        session=db_session,
        ticket_id=ticket.id,
        new_status="resolved",
        actor_id=agent.id,
        organization_id=org.id,
    )

    # Fetch unified timeline
    timeline_resp = await ticket_service.get_ticket_timeline(
        session=db_session,
        ticket_id=ticket.id,
        organization_id=org.id,
    )

    assert timeline_resp.total_entries >= 4
    entries = timeline_resp.timeline

    # Verify chronological order
    for idx in range(len(entries) - 1):
        assert entries[idx].created_at <= entries[idx + 1].created_at

    # Verify entry types present
    entry_types = [e.entry_type for e in entries]
    assert "message" in entry_types
    assert "event" in entry_types


@pytest.mark.asyncio
async def test_timeline_endpoint_http(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verifies GET /api/v1/tickets/{id}/timeline endpoint."""
    org = Organization(name=f"Timeline HTTP Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"timeline_http_{uuid.uuid4().hex[:6]}@cxpilot.io",
        full_name="Agent Dale",
        role="agent",
    )
    customer = Customer(
        organization_id=org.id,
        email=f"cust_timeline_http_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Donna Hayward",
    )
    db_session.add_all([agent, customer])
    await db_session.commit()

    token = create_token_for_user(agent.id, agent.email)
    headers = {"Authorization": f"Bearer {token}"}

    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="HTTP Timeline Test",
        initial_message="Initial inquiry for timeline API",
    )

    resp = await client.get(f"/api/v1/tickets/{ticket.id}/timeline", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["ticket_id"] == str(ticket.id)
    assert data["total_entries"] >= 2
    assert isinstance(data["timeline"], list)
