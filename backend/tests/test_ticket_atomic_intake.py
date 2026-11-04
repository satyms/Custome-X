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
from app.schemas.ticket import TicketCreate


@pytest.mark.asyncio
async def test_atomic_intake_with_existing_customer(db_session: AsyncSession):
    """Verifies atomic intake when customer_id is provided."""
    org = Organization(name=f"Intake Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"intake_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Samantha Ray",
        phone="+15550199",
    )
    db_session.add(customer)
    await db_session.commit()

    ticket, message, event = await create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="Cannot update shipping address",
        initial_message="I moved to a new apartment and need to update delivery address.",
        priority="normal",
    )

    assert ticket.id is not None
    assert ticket.ticket_number is not None
    assert ticket.ticket_number.startswith("CX-")
    assert ticket.status == "open"
    assert ticket.priority == "normal"
    assert ticket.customer_id == customer.id

    assert message.id is not None
    assert message.ticket_id == ticket.id
    assert message.sender_type == "customer"
    assert message.content == "I moved to a new apartment and need to update delivery address."

    assert event.id is not None
    assert event.ticket_id == ticket.id
    assert event.event_type == "ticket_created"
    assert event.event_metadata["ticket_number"] == ticket.ticket_number

    # Verify queryability in DB
    db_ticket = (await db_session.execute(select(Ticket).where(Ticket.id == ticket.id))).scalar_one()
    assert db_ticket.title == "Cannot update shipping address"


@pytest.mark.asyncio
async def test_atomic_intake_with_new_customer_auto_provisioning(db_session: AsyncSession):
    """Verifies atomic customer auto-creation when only customer_email and metadata are provided."""
    org = Organization(name=f"New Cust Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()

    cust_email = f"new_lead_{uuid.uuid4().hex[:6]}@shopflow.io"
    cust_name = "Marcus Vance"
    cust_phone = "+14155552671"

    ticket, message, event = await create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_email=cust_email,
        customer_name=cust_name,
        customer_phone=cust_phone,
        title="Damaged package delivered",
        initial_message="The box arrived crushed and the screen inside is broken.",
        priority="urgent",
    )

    # 1. Customer must have been created atomically
    cust_stmt = select(Customer).where(Customer.email == cust_email, Customer.organization_id == org.id)
    created_cust = (await db_session.execute(cust_stmt)).scalar_one()
    assert created_cust.full_name == cust_name
    assert created_cust.phone == cust_phone

    # 2. Ticket must be linked to the new customer
    assert ticket.customer_id == created_cust.id
    assert ticket.priority == "urgent"
    assert ticket.status == "open"
    assert ticket.ticket_number.startswith("CX-")

    # 3. Message and event must point to the new customer
    assert message.sender_id == created_cust.id
    assert event.actor_id == created_cust.id


@pytest.mark.asyncio
async def test_sequential_ticket_numbers_per_org(db_session: AsyncSession):
    """Verifies that sequential reference numbers increment deterministically within an organization."""
    org = Organization(name=f"Seq Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()

    cust_email = f"seq_cust_{uuid.uuid4().hex[:6]}@shopflow.io"

    t1, _, _ = await create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_email=cust_email,
        title="Inquiry 1",
        initial_message="First inquiry message",
    )

    t2, _, _ = await create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_email=cust_email,
        title="Inquiry 2",
        initial_message="Second inquiry message",
    )

    # Parse numeric sequence from CX-<sequence>
    seq1 = int(t1.ticket_number.replace("CX-", ""))
    seq2 = int(t2.ticket_number.replace("CX-", ""))

    assert seq2 == seq1 + 1, f"Expected sequential numbers but got {t1.ticket_number} and {t2.ticket_number}"


@pytest.mark.asyncio
async def test_atomic_rollback_on_failure(db_session: AsyncSession):
    """Verifies ACID rollback: when simulated failure triggers, no ticket, message, or event is persisted."""
    org = Organization(name=f"Rollback Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()

    test_title = f"Rollback Title {uuid.uuid4().hex[:8]}"

    with pytest.raises(RuntimeError, match="Simulated failure during atomic ticket creation"):
        await create_ticket_atomic(
            session=db_session,
            organization_id=org.id,
            customer_email=f"fail_{uuid.uuid4().hex[:6]}@example.com",
            title=test_title,
            initial_message="This should never persist",
            simulate_failure_after_ticket=True,
        )

    # Verify no ticket with test_title exists in DB
    check_stmt = select(Ticket).where(Ticket.title == test_title)
    res = (await db_session.execute(check_stmt)).scalar_one_or_none()
    assert res is None, "Ticket persisted despite rollback trigger!"


def test_ticket_create_schema_validation():
    """Verifies TicketCreate schema rejects requests without customer_id or customer_email."""
    # Valid with customer_id
    t1 = TicketCreate(
        customer_id=uuid.uuid4(),
        title="Valid Ticket",
        initial_message="Valid problem statement",
    )
    assert t1.title == "Valid Ticket"

    # Valid with customer_email
    t2 = TicketCreate(
        customer_email="customer@example.com",
        customer_name="John Doe",
        title="Valid Ticket with email",
        initial_message="Valid problem statement",
    )
    assert t2.customer_email == "customer@example.com"

    # Invalid without either
    with pytest.raises(ValueError, match="Either customer_id or customer_email must be provided"):
        TicketCreate(
            title="Invalid Ticket",
            initial_message="Missing customer identity",
        )
