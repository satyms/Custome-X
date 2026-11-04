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
async def test_conversation_sender_validation_and_ordering(db_session: AsyncSession):
    """Verifies message appending, sender role validation, and chronological ordering."""
    org = Organization(name=f"Convo Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"convo_agent_{uuid.uuid4().hex[:6]}@cxpilot.io",
        full_name="Agent Mulder",
        role="agent",
    )
    customer = Customer(
        organization_id=org.id,
        email=f"convo_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Dana Scully",
    )
    db_session.add_all([agent, customer])
    await db_session.commit()

    ticket, m1, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="Tracking inquiry",
        initial_message="Where is my shipment?",
    )

    # 1. Agent reply
    m2, _ = await ticket_service.add_message(
        session=db_session,
        ticket_id=ticket.id,
        content="I am looking into this with the courier.",
        sender_type="agent",
        sender_id=agent.id,
        organization_id=org.id,
    )

    # 2. System update
    m3, _ = await ticket_service.add_message(
        session=db_session,
        ticket_id=ticket.id,
        content="Automated scan: Package arrived at local distribution center.",
        sender_type="system",
        organization_id=org.id,
    )

    # Verify chronological order
    reloaded = await ticket_service.get_ticket_by_id(db_session, ticket.id, org.id)
    assert len(reloaded.messages) == 3
    assert reloaded.messages[0].content == "Where is my shipment?"
    assert reloaded.messages[1].content == "I am looking into this with the courier."
    assert reloaded.messages[2].content == "Automated scan: Package arrived at local distribution center."

    # 3. Invalid sender role rejected
    with pytest.raises(ValueError, match="Invalid sender_type"):
        await ticket_service.add_message(
            session=db_session,
            ticket_id=ticket.id,
            content="Unknown sender",
            sender_type="hacker",
            organization_id=org.id,
        )

    # 4. Empty message rejected
    with pytest.raises(ValueError, match="cannot be empty"):
        await ticket_service.add_message(
            session=db_session,
            ticket_id=ticket.id,
            content="   ",
            sender_type="agent",
            organization_id=org.id,
        )

    # 5. Over-limit message rejected (> 10,000 characters)
    with pytest.raises(ValueError, match="exceeds 10,000 character"):
        await ticket_service.add_message(
            session=db_session,
            ticket_id=ticket.id,
            content="x" * 10001,
            sender_type="agent",
            organization_id=org.id,
        )


@pytest.mark.asyncio
async def test_add_message_endpoint_http(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verifies POST /api/v1/tickets/{id}/messages endpoint."""
    org = Organization(name=f"Convo HTTP Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"convo_http_{uuid.uuid4().hex[:6]}@cxpilot.io",
        full_name="Agent Scully",
        role="agent",
    )
    customer = Customer(
        organization_id=org.id,
        email=f"cust_convo_http_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Walter Skinner",
    )
    db_session.add_all([agent, customer])
    await db_session.commit()

    token = create_token_for_user(agent.id, agent.email)
    headers = {"Authorization": f"Bearer {token}"}

    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="HTTP Convo Test",
        initial_message="Initial inquiry",
    )

    resp = await client.post(
        f"/api/v1/tickets/{ticket.id}/messages",
        json={"content": "Here is an official response from support.", "sender_type": "agent"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["content"] == "Here is an official response from support."
    assert data["sender_type"] == "agent"
    assert data["ticket_id"] == str(ticket.id)
