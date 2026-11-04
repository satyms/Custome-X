import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.message import Message
from app.models.ticket_event import TicketEvent
from app.services.ticket_service import create_ticket_atomic


@pytest.mark.asyncio
async def test_acid_atomic_commit(db_session: AsyncSession):
    # Setup test parent org & customer
    org = Organization(name=f"ACID Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()
    org_id = org.id

    customer = Customer(
        organization_id=org_id,
        email=f"acid_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Alice ACID",
    )
    db_session.add(customer)
    await db_session.commit()
    customer_id = customer.id

    # Execute atomic unit of work
    ticket, message, event = await create_ticket_atomic(
        session=db_session,
        organization_id=org_id,
        customer_id=customer_id,
        title="Payment Failed on Checkout",
        initial_message="My credit card was charged twice.",
        priority="urgent",
    )

    ticket_id = ticket.id
    message_id = message.id
    event_id = event.id

    # Verify all 3 entities are committed and queryable
    t_row = (await db_session.execute(select(Ticket).where(Ticket.id == ticket_id))).scalar_one()
    m_row = (await db_session.execute(select(Message).where(Message.id == message_id))).scalar_one()
    e_row = (await db_session.execute(select(TicketEvent).where(TicketEvent.id == event_id))).scalar_one()

    assert t_row.priority == "urgent"
    assert m_row.content == "My credit card was charged twice."
    assert e_row.event_type == "ticket_created"
    assert e_row.event_metadata["initial_priority"] == "urgent"

    # Clean up
    org_to_delete = (await db_session.execute(select(Organization).where(Organization.id == org_id))).scalar_one()
    await db_session.delete(org_to_delete)
    await db_session.commit()


@pytest.mark.asyncio
async def test_acid_atomic_rollback_on_failure(db_session: AsyncSession):
    """
    Verifies that when a failure occurs midway through a transaction,
    the ticket created in step 1 is rolled back completely.
    NO orphan ticket is left behind in the database!
    """
    org = Organization(name=f"Rollback Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()
    org_id = org.id

    customer = Customer(
        organization_id=org_id,
        email=f"rollback_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Bob Rollback",
    )
    db_session.add(customer)
    await db_session.commit()
    customer_id = customer.id

    ticket_title = f"Orphan Test Ticket {uuid.uuid4().hex[:6]}"

    # Execute atomic service with simulated failure
    with pytest.raises(RuntimeError, match="ACID Rollback Trigger"):
        await create_ticket_atomic(
            session=db_session,
            organization_id=org_id,
            customer_id=customer_id,
            title=ticket_title,
            initial_message="This message should never persist",
            priority="high",
            simulate_failure_after_ticket=True,
        )

    # CRITICAL ACID ASSERTION:
    # Ensure NO orphan ticket with this title exists in the database
    orphan_check = (
        await db_session.execute(
            select(Ticket).where(
                Ticket.organization_id == org_id,
                Ticket.title == ticket_title,
            )
        )
    ).first()

    assert orphan_check is None, "ACID Failure: Orphan ticket was persisted despite transaction failure!"

    # Clean up
    org_to_delete = (await db_session.execute(select(Organization).where(Organization.id == org_id))).scalar_one()
    await db_session.delete(org_to_delete)
    await db_session.commit()
