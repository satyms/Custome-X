import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.message import Message


@pytest.mark.asyncio
async def test_check_constraints_and_uniqueness(db_session: AsyncSession):
    org = Organization(name=f"Constraint Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()
    org_id = org.id

    # 1. Verify invalid user role violates CHECK constraint
    # Using a nested transaction (savepoint) so failure rolls back cleanly to savepoint
    with pytest.raises(IntegrityError):
        async with db_session.begin_nested():
            invalid_user = User(
                organization_id=org_id,
                email=f"bad_role_{uuid.uuid4().hex[:6]}@example.com",
                full_name="Bad Role",
                role="super_boss",  # Not in ('agent', 'supervisor', 'admin')
            )
            db_session.add(invalid_user)
            await db_session.flush()

    # 2. Verify duplicate user email violates UNIQUE constraint
    shared_email = f"shared_{uuid.uuid4().hex[:6]}@example.com"
    u1 = User(organization_id=org_id, email=shared_email, full_name="User 1", role="agent")
    db_session.add(u1)
    await db_session.flush()

    with pytest.raises(IntegrityError):
        async with db_session.begin_nested():
            u2 = User(organization_id=org_id, email=shared_email, full_name="User 2", role="agent")
            db_session.add(u2)
            await db_session.flush()

    # Clean up org
    org_to_delete = (await db_session.execute(select(Organization).where(Organization.id == org_id))).scalar_one()
    await db_session.delete(org_to_delete)
    await db_session.commit()


@pytest.mark.asyncio
async def test_referential_actions(db_session: AsyncSession):
    """
    Verifies ON DELETE RESTRICT, ON DELETE SET NULL, and ON DELETE CASCADE.
    """
    org = Organization(name=f"Referential Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()
    org_id = org.id

    agent = User(
        organization_id=org_id,
        email=f"agent_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Assigned Agent",
        role="agent",
    )
    customer = Customer(
        organization_id=org_id,
        email=f"cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Active Customer",
    )
    db_session.add_all([agent, customer])
    await db_session.flush()
    agent_id = agent.id
    customer_id = customer.id

    ticket = Ticket(
        organization_id=org_id,
        customer_id=customer_id,
        assigned_to=agent_id,
        title="Order Issue",
        status="open",
        priority="normal",
    )
    db_session.add(ticket)
    await db_session.flush()
    ticket_id = ticket.id

    message = Message(
        ticket_id=ticket_id,
        sender_type="customer",
        sender_id=customer_id,
        content="Hello, my order is missing.",
    )
    db_session.add(message)
    await db_session.commit()
    message_id = message.id

    # --- 1. VERIFY ON DELETE RESTRICT (Customer deletion must fail because tickets exist) ---
    with pytest.raises(IntegrityError):
        async with db_session.begin_nested():
            customer_to_delete = (
                await db_session.execute(select(Customer).where(Customer.id == customer_id))
            ).scalar_one()
            await db_session.delete(customer_to_delete)
            await db_session.flush()

    # --- 2. VERIFY ON DELETE SET NULL (Deleting agent sets ticket.assigned_to to NULL) ---
    agent_to_delete = (
        await db_session.execute(select(User).where(User.id == agent_id))
    ).scalar_one()
    await db_session.delete(agent_to_delete)
    await db_session.commit()

    # Re-fetch ticket to verify assigned_to was set to NULL by PostgreSQL
    refetched_ticket = (
        await db_session.execute(select(Ticket).where(Ticket.id == ticket_id))
    ).scalar_one()
    assert refetched_ticket.assigned_to is None

    # --- 3. VERIFY ON DELETE CASCADE (Deleting ticket cascades to messages) ---
    await db_session.delete(refetched_ticket)
    await db_session.commit()

    # Message must no longer exist
    msg_check = (
        await db_session.execute(select(Message).where(Message.id == message_id))
    ).first()
    assert msg_check is None

    # Clean up org
    org_to_delete = (await db_session.execute(select(Organization).where(Organization.id == org_id))).scalar_one()
    await db_session.delete(org_to_delete)
    await db_session.commit()
