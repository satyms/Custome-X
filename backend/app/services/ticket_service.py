import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.message import Message
from app.models.ticket_event import TicketEvent
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.core.exceptions import (
    CustomerNotFoundError,
    TicketNotFoundError,
    InvalidStatusTransitionError,
)


async def create_ticket_atomic(
    session: AsyncSession,
    organization_id: uuid.UUID,
    customer_id: uuid.UUID,
    title: str,
    initial_message: str,
    priority: str = "normal",
    sender_type: str = "customer",
    sender_id: Optional[uuid.UUID] = None,
    assigned_to: Optional[uuid.UUID] = None,
    simulate_failure_after_ticket: bool = False,
) -> Tuple[Ticket, Message, TicketEvent]:
    """
    ACID Transaction Unit of Work:
    Atomically creates a ticket, its initial message, and audit log event.
    Guarantees that either all 3 entities persist, or all 3 roll back cleanly.
    """
    trans_cm = session.begin_nested() if session.in_transaction() else session.begin()
    async with trans_cm:
        # 1. Create ticket entity
        ticket = Ticket(
            organization_id=organization_id,
            customer_id=customer_id,
            assigned_to=assigned_to,
            title=title,
            priority=priority,
            status="open",
        )
        session.add(ticket)
        # Flush to execute INSERT and generate UUID primary key for child foreign keys
        await session.flush()

        # Simulated failure point to demonstrate ACID rollback
        if simulate_failure_after_ticket:
            raise RuntimeError("ACID Rollback Trigger: Simulated failure during atomic ticket creation!")

        # 2. Create initial thread message
        message = Message(
            ticket_id=ticket.id,
            sender_type=sender_type,
            sender_id=sender_id or customer_id,
            content=initial_message,
        )
        session.add(message)

        # 3. Create immutable audit event
        event = TicketEvent(
            ticket_id=ticket.id,
            actor_id=sender_id or customer_id,
            event_type="ticket_created",
            event_metadata={
                "initial_priority": priority,
                "initial_status": "open",
                "channel": "customer_support",
            },
        )
        session.add(event)

    if session.in_transaction():
        await session.commit()

    return ticket, message, event


async def create_ticket(
    session: AsyncSession,
    payload: TicketCreate,
) -> Ticket:
    """Domain service to validate relationships and execute atomic ticket creation."""
    # Verify customer exists
    cust_stmt = select(Customer).where(
        Customer.id == payload.customer_id,
        Customer.organization_id == payload.organization_id,
    )
    customer = (await session.execute(cust_stmt)).scalar_one_or_none()
    if not customer:
        raise CustomerNotFoundError(payload.customer_id)

    ticket, _, _ = await create_ticket_atomic(
        session=session,
        organization_id=payload.organization_id,
        customer_id=payload.customer_id,
        title=payload.title,
        priority=payload.priority.value,
        initial_message=payload.initial_message,
        assigned_to=payload.assigned_to,
    )
    return ticket


async def get_ticket_by_id(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    organization_id: Optional[uuid.UUID] = None,
) -> Ticket:
    """Retrieves full ticket context including chronological messages and customer."""
    stmt = (
        select(Ticket)
        .options(
            selectinload(Ticket.messages),
            selectinload(Ticket.customer),
        )
        .where(Ticket.id == ticket_id)
    )
    if organization_id:
        stmt = stmt.where(Ticket.organization_id == organization_id)

    result = await session.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise TicketNotFoundError(ticket_id)
    return ticket


async def list_tickets(
    session: AsyncSession,
    organization_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    customer_id: Optional[uuid.UUID] = None,
    assigned_to: Optional[uuid.UUID] = None,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[Ticket], int]:
    """Retrieves paginated tickets matching optional filter criteria."""
    query = select(Ticket)
    count_query = select(func.count(Ticket.id))

    if organization_id:
        query = query.where(Ticket.organization_id == organization_id)
        count_query = count_query.where(Ticket.organization_id == organization_id)

    if status:
        query = query.where(Ticket.status == status)
        count_query = count_query.where(Ticket.status == status)

    if priority:
        query = query.where(Ticket.priority == priority)
        count_query = count_query.where(Ticket.priority == priority)

    if customer_id:
        query = query.where(Ticket.customer_id == customer_id)
        count_query = count_query.where(Ticket.customer_id == customer_id)

    if assigned_to:
        query = query.where(Ticket.assigned_to == assigned_to)
        count_query = count_query.where(Ticket.assigned_to == assigned_to)

    total_count = (await session.execute(count_query)).scalar_one()

    query = query.order_by(Ticket.created_at.desc()).limit(limit).offset(offset)
    items = (await session.execute(query)).scalars().all()

    return list(items), total_count


async def update_ticket(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    actor_id: Optional[uuid.UUID] = None,
    organization_id: Optional[uuid.UUID] = None,
) -> Ticket:
    """Updates ticket fields with transition validation and audit logging."""
    ticket = await get_ticket_by_id(session, ticket_id, organization_id=organization_id)

    update_data = payload.model_dump(exclude_unset=True)

    # Validate state transition rules
    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"].value if hasattr(update_data["status"], "value") else update_data["status"]
        
        # Rule: A closed ticket cannot transition directly to in_progress or escalated (must be reopened to 'open' first)
        if ticket.status == "closed" and new_status in ["in_progress", "escalated"]:
            raise InvalidStatusTransitionError(current_status=ticket.status, attempted_status=new_status)

        if new_status != ticket.status:
            status_event = TicketEvent(
                ticket_id=ticket.id,
                actor_id=actor_id,
                event_type="status_changed",
                event_metadata={
                    "old_status": ticket.status,
                    "new_status": new_status,
                },
            )
            session.add(status_event)
            ticket.status = new_status

    # Track assignment event if changed
    if "assigned_to" in update_data:
        new_assignee = update_data["assigned_to"]
        if new_assignee != ticket.assigned_to:
            assign_event = TicketEvent(
                ticket_id=ticket.id,
                actor_id=actor_id,
                event_type="assigned",
                event_metadata={
                    "old_assigned_to": str(ticket.assigned_to) if ticket.assigned_to else None,
                    "new_assigned_to": str(new_assignee) if new_assignee else None,
                },
            )
            session.add(assign_event)
            ticket.assigned_to = new_assignee

    if "priority" in update_data and update_data["priority"] is not None:
        ticket.priority = update_data["priority"].value if hasattr(update_data["priority"], "value") else update_data["priority"]

    if "title" in update_data and update_data["title"] is not None:
        ticket.title = update_data["title"]

    await session.commit()
    await session.refresh(ticket)
    return ticket


async def delete_ticket(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    organization_id: Optional[uuid.UUID] = None,
) -> None:
    """Deletes a ticket or raises TicketNotFoundError."""
    ticket = await get_ticket_by_id(session, ticket_id, organization_id=organization_id)
    await session.delete(ticket)
    await session.commit()
