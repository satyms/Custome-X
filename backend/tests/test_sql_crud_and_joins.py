import uuid
import pytest
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.message import Message


@pytest.mark.asyncio
async def test_crud_and_joins(db_session: AsyncSession):
    # 1. Create Organization
    org = Organization(name=f"E-Shop {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    # 2. Create User (Agent)
    agent = User(
        organization_id=org.id,
        email=f"agent_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Sarah Agent",
        role="agent",
    )
    db_session.add(agent)

    # 3. Create Customer
    customer = Customer(
        organization_id=org.id,
        email=f"customer_{uuid.uuid4().hex[:6]}@example.com",
        full_name="John Doe",
    )
    db_session.add(customer)
    await db_session.flush()

    # 4. Create Tickets (1 with message, 1 without message)
    ticket_with_msg = Ticket(
        organization_id=org.id,
        customer_id=customer.id,
        assigned_to=agent.id,
        title="Late Delivery",
        status="open",
        priority="high",
    )
    ticket_without_msg = Ticket(
        organization_id=org.id,
        customer_id=customer.id,
        assigned_to=agent.id,
        title="Empty Inbound Ticket",
        status="open",
        priority="low",
    )
    db_session.add_all([ticket_with_msg, ticket_without_msg])
    await db_session.flush()

    # 5. Insert Message for ticket_with_msg
    msg = Message(
        ticket_id=ticket_with_msg.id,
        sender_type="customer",
        sender_id=customer.id,
        content="Where is my package?",
    )
    db_session.add(msg)
    await db_session.commit()

    # --- VERIFY CRUD: READ ---
    stmt = select(Ticket).where(Ticket.id == ticket_with_msg.id)
    result = await db_session.execute(stmt)
    fetched_ticket = result.scalar_one()
    assert fetched_ticket.title == "Late Delivery"
    assert fetched_ticket.status == "open"

    # --- VERIFY CRUD: UPDATE ---
    await db_session.execute(
        update(Ticket)
        .where(Ticket.id == ticket_with_msg.id)
        .values(status="in_progress")
    )
    await db_session.commit()

    updated_result = await db_session.execute(
        select(Ticket.status).where(Ticket.id == ticket_with_msg.id)
    )
    assert updated_result.scalar_one() == "in_progress"

    # --- VERIFY JOIN: INNER JOIN ---
    # Only tickets that have messages
    inner_join_stmt = (
        select(Ticket.id, Message.content)
        .join(Message, Ticket.id == Message.ticket_id)
        .where(Ticket.organization_id == org.id)
    )
    inner_rows = (await db_session.execute(inner_join_stmt)).all()
    assert len(inner_rows) == 1
    assert inner_rows[0][0] == ticket_with_msg.id
    assert inner_rows[0][1] == "Where is my package?"

    # --- VERIFY JOIN: LEFT JOIN ---
    # All tickets for this org, regardless of messages
    left_join_stmt = (
        select(Ticket.id, Message.content)
        .outerjoin(Message, Ticket.id == Message.ticket_id)
        .where(Ticket.organization_id == org.id)
    )
    left_rows = (await db_session.execute(left_join_stmt)).all()
    assert len(left_rows) == 2
    ticket_ids_in_left = [r[0] for r in left_rows]
    assert ticket_with_msg.id in ticket_ids_in_left
    assert ticket_without_msg.id in ticket_ids_in_left

    # --- VERIFY AGGREGATION & GROUP BY ---
    agg_stmt = (
        select(Ticket.status, func.count(Ticket.id))
        .where(Ticket.organization_id == org.id)
        .group_by(Ticket.status)
    )
    agg_results = dict((await db_session.execute(agg_stmt)).all())
    assert agg_results.get("in_progress") == 1
    assert agg_results.get("open") == 1

    # Cleanup org (cascades down)
    await db_session.delete(org)
    await db_session.commit()
