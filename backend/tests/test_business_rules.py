import uuid
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer
from app.models.user import User
from app.models.ticket import Ticket
from app.schemas.ticket import TicketUpdate
from app.schemas.common import TicketPriority
from app.services import ticket_service
from app.core.exceptions import ForbiddenError
from tests.test_auth_endpoints import create_token_for_user


@pytest.mark.asyncio
async def test_seven_day_auto_reopen_on_customer_reply(db_session: AsyncSession):
    """Verifies that a customer reply within 7 days of resolution transitions ticket to REOPENED."""
    org = Organization(name=f"Reopen Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"reopen_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Ben Horne",
    )
    db_session.add(customer)
    await db_session.commit()

    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="Delivery Issue",
        initial_message="Where is my delivery?",
    )

    # 1. Resolve ticket with resolved_at = 2 days ago
    ticket.status = "resolved"
    ticket.resolved_at = datetime.now(timezone.utc) - timedelta(days=2)
    await db_session.commit()

    # 2. Customer replies
    _, spawned = await ticket_service.add_message(
        session=db_session,
        ticket_id=ticket.id,
        content="Actually, the box was empty when I opened it!",
        sender_type="customer",
        sender_id=customer.id,
        organization_id=org.id,
    )

    assert spawned is None, "Should not spawn a follow-up ticket when within 7 days"

    # Ticket must now be REOPENED
    reloaded = await ticket_service.get_ticket_by_id(db_session, ticket.id, org.id)
    assert reloaded.status == "reopened"


@pytest.mark.asyncio
async def test_closed_ticket_customer_reply_spawns_followup(db_session: AsyncSession):
    """Verifies that a customer reply to a CLOSED ticket spawns a linked follow-up ticket."""
    org = Organization(name=f"Followup Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"followup_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Josie Packard",
    )
    db_session.add(customer)
    await db_session.commit()

    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="Original Defective Item",
        initial_message="Original problem statement",
    )

    # Close the ticket
    ticket.status = "closed"
    ticket.closed_at = datetime.now(timezone.utc)
    await db_session.commit()

    # Customer replies to closed ticket
    msg, follow_up = await ticket_service.add_message(
        session=db_session,
        ticket_id=ticket.id,
        content="I have a new question about the replacement warranty.",
        sender_type="customer",
        sender_id=customer.id,
        organization_id=org.id,
    )

    # 1. Original ticket remains CLOSED
    original_reloaded = await ticket_service.get_ticket_by_id(db_session, ticket.id, org.id)
    assert original_reloaded.status == "closed"

    # 2. New follow-up ticket was created
    assert follow_up is not None
    assert follow_up.title == "Follow-up: Original Defective Item"
    assert follow_up.status == "open"
    assert follow_up.customer_id == customer.id
    assert follow_up.ticket_number is not None


@pytest.mark.asyncio
async def test_priority_override_guard_on_unassigned_tickets(db_session: AsyncSession):
    """Verifies that non-managers cannot manually escalate unassigned tickets to URGENT."""
    org = Organization(name=f"Priority Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"cust_priority_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Leland Palmer",
    )
    db_session.add(customer)
    await db_session.commit()

    # Create unassigned ticket with NORMAL priority
    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="Routine Question",
        initial_message="Is this item available in blue?",
        priority="normal",
    )
    assert ticket.assigned_to is None

    # 1. Standard agent cannot escalate unassigned ticket to URGENT
    with pytest.raises(ForbiddenError, match="Non-managers cannot manually escalate priority to URGENT"):
        await ticket_service.update_ticket(
            session=db_session,
            ticket_id=ticket.id,
            payload=TicketUpdate(priority=TicketPriority.URGENT),
            actor_role="agent",
            organization_id=org.id,
        )

    # 2. Supervisor CAN escalate unassigned ticket to URGENT
    updated = await ticket_service.update_ticket(
        session=db_session,
        ticket_id=ticket.id,
        payload=TicketUpdate(priority=TicketPriority.URGENT),
        actor_role="supervisor",
        organization_id=org.id,
    )
    assert updated.priority == "urgent"
