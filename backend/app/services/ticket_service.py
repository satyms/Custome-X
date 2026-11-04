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


async def generate_ticket_number(
    session: AsyncSession,
    organization_id: uuid.UUID,
) -> str:
    """
    Generates a deterministic sequential human-readable reference number
    scoped to the tenant organization (e.g. CX-1001, CX-1002).
    """
    count_stmt = select(func.count(Ticket.id)).where(Ticket.organization_id == organization_id)
    count = (await session.execute(count_stmt)).scalar() or 0
    return f"CX-{count + 1001}"


async def create_ticket_atomic(
    session: AsyncSession,
    organization_id: uuid.UUID,
    customer_id: Optional[uuid.UUID] = None,
    title: str = "",
    initial_message: str = "",
    customer_email: Optional[str] = None,
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
    priority: str = "normal",
    sender_type: str = "customer",
    sender_id: Optional[uuid.UUID] = None,
    assigned_to: Optional[uuid.UUID] = None,
    ticket_number: Optional[str] = None,
    simulate_failure_after_customer: bool = False,
    simulate_failure_after_ticket: bool = False,
) -> Tuple[Ticket, Message, TicketEvent]:
    """
    ACID Transaction Unit of Work:
    Atomically validates/provisions customer, generates human-readable ticket number,
    creates ticket, initial message, and audit event.
    Guarantees that either all entities persist, or all roll back cleanly.
    """
    trans_cm = session.begin_nested() if session.in_transaction() else session.begin()
    async with trans_cm:
        customer = None

        # 1. Resolve or create customer record
        if customer_id:
            cust_stmt = select(Customer).where(
                Customer.id == customer_id,
                Customer.organization_id == organization_id,
            )
            customer = (await session.execute(cust_stmt)).scalar_one_or_none()
            if not customer and not customer_email:
                raise CustomerNotFoundError(customer_id)

        if not customer and customer_email:
            # Check existing customer within tenant org by email
            email_stmt = select(Customer).where(
                Customer.email == customer_email,
                Customer.organization_id == organization_id,
            )
            customer = (await session.execute(email_stmt)).scalar_one_or_none()

            # Atomically insert new customer if not found
            if not customer:
                name_to_use = customer_name or customer_email.split("@")[0]
                customer = Customer(
                    organization_id=organization_id,
                    email=customer_email,
                    full_name=name_to_use,
                    phone=customer_phone,
                )
                session.add(customer)
                await session.flush()

        if not customer:
            raise ValueError("Either customer_id or customer_email must resolve to a valid customer.")

        if simulate_failure_after_customer:
            raise RuntimeError("ACID Rollback Trigger: Simulated failure after customer provisioning!")

        # 2. Generate sequential reference number
        if not ticket_number:
            ticket_number = await generate_ticket_number(session, organization_id)

        # 3. Create ticket entity
        ticket = Ticket(
            ticket_number=ticket_number,
            organization_id=organization_id,
            customer_id=customer.id,
            assigned_to=assigned_to,
            title=title,
            priority=priority,
            status="open",
        )
        session.add(ticket)
        # Flush to generate UUID primary key for child message and event references
        await session.flush()

        # Simulated failure point to verify ACID rollback
        if simulate_failure_after_ticket:
            raise RuntimeError("ACID Rollback Trigger: Simulated failure during atomic ticket creation!")

        # 4. Create initial inbound message
        message = Message(
            ticket_id=ticket.id,
            sender_type=sender_type,
            sender_id=sender_id or customer.id,
            content=initial_message,
        )
        session.add(message)

        # 5. Create immutable audit event
        event = TicketEvent(
            ticket_id=ticket.id,
            actor_id=sender_id or customer.id,
            event_type="ticket_created",
            event_metadata={
                "ticket_number": ticket_number,
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
    """Domain service to execute atomic customer intake and ticket creation."""
    priority_val = payload.priority.value if hasattr(payload.priority, "value") else str(payload.priority)

    ticket, _, _ = await create_ticket_atomic(
        session=session,
        organization_id=payload.organization_id,
        customer_id=payload.customer_id,
        customer_email=str(payload.customer_email) if payload.customer_email else None,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        title=payload.title,
        priority=priority_val,
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


async def add_message(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    content: str,
    sender_type: str = "agent",
    sender_id: Optional[uuid.UUID] = None,
    organization_id: Optional[uuid.UUID] = None,
) -> Message:
    """Adds a message to an existing ticket within the user's organization."""
    ticket = await get_ticket_by_id(session, ticket_id, organization_id=organization_id)
    message = Message(
        ticket_id=ticket.id,
        sender_type=sender_type,
        sender_id=sender_id,
        content=content,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return message
