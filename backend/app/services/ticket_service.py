import uuid
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.message import Message
from app.models.ticket_event import TicketEvent
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.schemas.ticket_event import TimelineEntry, TicketTimelineResponse
from app.core.exceptions import (
    CustomerNotFoundError,
    TicketNotFoundError,
    UserNotFoundError,
    ForbiddenError,
    InvalidStatusTransitionError,
)
from app.services.state_machine import validate_transition, apply_lifecycle_timestamps
from app.services.business_rules import (
    is_eligible_for_auto_reopen,
    validate_priority_escalation,
)
from app.services import notification_service


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

    # Emit notification
    await notification_service.emit_ticket_created(
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        organization_id=ticket.organization_id,
        title=ticket.title,
        priority=ticket.priority,
    )

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
        .execution_options(populate_existing=True)
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


async def update_ticket_status(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    new_status: str,
    actor_id: Optional[uuid.UUID] = None,
    organization_id: Optional[uuid.UUID] = None,
) -> Ticket:
    """
    Task 6.2: Ticket Status Finite State Machine (FSM) Transition.
    Validates transition legality, sets lifecycle timestamps, records audit events.
    """
    ticket = await get_ticket_by_id(session, ticket_id, organization_id=organization_id)
    old_status = ticket.status

    # Validate transition against FSM matrix
    validate_transition(current_status=old_status, new_status=new_status)

    if old_status != new_status:
        apply_lifecycle_timestamps(ticket, new_status)
        ticket.status = new_status

        # Record audit event
        event = TicketEvent(
            ticket_id=ticket.id,
            actor_id=actor_id,
            event_type="status_changed",
            event_metadata={
                "old_status": old_status,
                "new_status": new_status,
            },
        )
        session.add(event)
        await session.commit()
        await session.refresh(ticket)

    return ticket


async def assign_ticket(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    assigned_to_user_id: Optional[uuid.UUID],
    actor_id: Optional[uuid.UUID] = None,
    organization_id: Optional[uuid.UUID] = None,
) -> Ticket:
    """
    Task 6.3: Agent Assignment & Queue Distribution.
    Validates agent belongs to same organization, auto-transitions OPEN to IN_PROGRESS,
    records audit events, and dispatches notifications.
    """
    ticket = await get_ticket_by_id(session, ticket_id, organization_id=organization_id)
    old_assigned_to = ticket.assigned_to

    if assigned_to_user_id is not None:
        # Validate agent exists within the same organization
        stmt = select(User).where(
            User.id == assigned_to_user_id,
            User.organization_id == ticket.organization_id,
        )
        agent = (await session.execute(stmt)).scalar_one_or_none()
        if not agent:
            raise UserNotFoundError(assigned_to_user_id)

        # Enforce agent/admin/supervisor role
        if agent.role not in ("agent", "supervisor", "admin"):
            raise ForbiddenError(f"User {assigned_to_user_id} does not possess support agent role.")

        ticket.assigned_to = assigned_to_user_id

        # Auto-transition OPEN ticket to IN_PROGRESS when claimed
        if ticket.status == "open":
            ticket.status = "in_progress"
            session.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    actor_id=actor_id,
                    event_type="status_changed",
                    event_metadata={"old_status": "open", "new_status": "in_progress", "reason": "auto_claim"},
                )
            )

        # Record assignment audit event
        session.add(
            TicketEvent(
                ticket_id=ticket.id,
                actor_id=actor_id,
                event_type="agent_assigned",
                event_metadata={
                    "old_assigned_to": str(old_assigned_to) if old_assigned_to else None,
                    "new_assigned_to": str(assigned_to_user_id),
                },
            )
        )
    else:
        # Unassign back to team pool
        ticket.assigned_to = None
        session.add(
            TicketEvent(
                ticket_id=ticket.id,
                actor_id=actor_id,
                event_type="agent_unassigned",
                event_metadata={
                    "old_assigned_to": str(old_assigned_to) if old_assigned_to else None,
                    "new_assigned_to": None,
                },
            )
        )

    await session.commit()
    await session.refresh(ticket)

    # Emit notification
    await notification_service.emit_ticket_assigned(
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        organization_id=ticket.organization_id,
        assigned_to=ticket.assigned_to,
        assigned_by=actor_id,
    )

    return ticket


async def add_message(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    content: str,
    sender_type: str = "agent",
    sender_id: Optional[uuid.UUID] = None,
    organization_id: Optional[uuid.UUID] = None,
) -> Tuple[Message, Optional[Ticket]]:
    """
    Task 6.4 & 6.6: Conversation Management with Business Rules.
    - Validates sender roles and message size.
    - 7-day auto-reopen: customer reply to RESOLVED auto-reopens.
    - Closed follow-up generator: customer reply to CLOSED spawns follow-up ticket.
    Returns (Message, optional spawned Ticket).
    """
    if len(content.strip()) < 1:
        raise ValueError("Message content cannot be empty.")
    if len(content) > 10000:
        raise ValueError("Message content exceeds 10,000 character maximum.")

    valid_senders = ("customer", "agent", "system", "ai_assistant")
    if sender_type not in valid_senders:
        raise ValueError(f"Invalid sender_type '{sender_type}'. Must be one of {valid_senders}.")

    ticket = await get_ticket_by_id(session, ticket_id, organization_id=organization_id)
    spawned_followup_ticket: Optional[Ticket] = None

    # Apply Business Rules if message is inbound from customer
    if sender_type == "customer":
        if ticket.status == "resolved":
            if is_eligible_for_auto_reopen(ticket):
                # 7-Day Auto-Reopen Rule
                ticket.status = "reopened"
                apply_lifecycle_timestamps(ticket, "reopened")
                session.add(
                    TicketEvent(
                        ticket_id=ticket.id,
                        actor_id=sender_id,
                        event_type="ticket_reopened",
                        event_metadata={"reason": "customer_reply_within_7_days"},
                    )
                )
            else:
                # Outside 7 days: Spawn follow-up ticket
                spawned_followup_ticket, initial_msg, _ = await create_ticket_atomic(
                    session=session,
                    organization_id=ticket.organization_id,
                    customer_id=ticket.customer_id,
                    title=f"Follow-up: {ticket.title}",
                    initial_message=content,
                    priority=ticket.priority,
                    sender_type="customer",
                    sender_id=sender_id,
                )
                return initial_msg, spawned_followup_ticket

        elif ticket.status == "closed":
            # Closed Follow-Up Generator Rule
            spawned_followup_ticket, initial_msg, _ = await create_ticket_atomic(
                session=session,
                organization_id=ticket.organization_id,
                customer_id=ticket.customer_id,
                title=f"Follow-up: {ticket.title}",
                initial_message=content,
                priority=ticket.priority,
                sender_type="customer",
                sender_id=sender_id,
            )
            # Record linkage event
            session.add(
                TicketEvent(
                    ticket_id=ticket.id,
                    actor_id=sender_id,
                    event_type="follow_up_spawned",
                    event_metadata={
                        "follow_up_ticket_id": str(spawned_followup_ticket.id),
                        "follow_up_ticket_number": spawned_followup_ticket.ticket_number,
                    },
                )
            )
            await session.commit()
            return initial_msg, spawned_followup_ticket

    # Standard thread message creation
    message = Message(
        ticket_id=ticket.id,
        ticket=ticket,
        sender_type=sender_type,
        sender_id=sender_id,
        content=content,
    )
    session.add(message)
    ticket.updated_at = datetime.now(timezone.utc)

    await session.commit()
    await session.refresh(message)
    return message, None


async def get_ticket_timeline(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    organization_id: Optional[uuid.UUID] = None,
) -> TicketTimelineResponse:
    """
    Task 6.5: Ticket History & Timeline Event Sourcing.
    Unifies chronological conversation messages and system audit events into a single timeline.
    """
    ticket = await get_ticket_by_id(session, ticket_id, organization_id=organization_id)

    # 1. Fetch messages
    msg_stmt = (
        select(Message)
        .where(Message.ticket_id == ticket.id)
        .order_by(Message.created_at.asc())
    )
    messages = (await session.execute(msg_stmt)).scalars().all()

    # 2. Fetch events
    event_stmt = (
        select(TicketEvent)
        .where(TicketEvent.ticket_id == ticket.id)
        .order_by(TicketEvent.created_at.asc())
    )
    events = (await session.execute(event_stmt)).scalars().all()

    # 3. Combine into unified entries
    entries: List[TimelineEntry] = []
    for m in messages:
        entries.append(
            TimelineEntry(
                id=m.id,
                entry_type="message",
                created_at=m.created_at,
                actor_id=m.sender_id,
                sender_type=m.sender_type,
                content=m.content,
            )
        )
    for e in events:
        entries.append(
            TimelineEntry(
                id=e.id,
                entry_type="event",
                created_at=e.created_at,
                actor_id=e.actor_id,
                event_type=e.event_type,
                event_metadata=e.event_metadata,
            )
        )

    # Sort strictly by created_at ascending
    entries.sort(key=lambda item: item.created_at)

    return TicketTimelineResponse(
        ticket_id=ticket.id,
        total_entries=len(entries),
        timeline=entries,
    )


async def update_ticket(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    actor_id: Optional[uuid.UUID] = None,
    actor_role: str = "agent",
    organization_id: Optional[uuid.UUID] = None,
) -> Ticket:
    """Updates ticket fields with transition validation and priority escalation guards."""
    ticket = await get_ticket_by_id(session, ticket_id, organization_id=organization_id)
    update_data = payload.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"].value if hasattr(update_data["status"], "value") else str(update_data["status"])
        validate_transition(current_status=ticket.status, new_status=new_status)
        if new_status != ticket.status:
            apply_lifecycle_timestamps(ticket, new_status)
            status_event = TicketEvent(
                ticket_id=ticket.id,
                actor_id=actor_id,
                event_type="status_changed",
                event_metadata={"old_status": ticket.status, "new_status": new_status},
            )
            session.add(status_event)
            ticket.status = new_status

    if "assigned_to" in update_data:
        new_assignee = update_data["assigned_to"]
        if new_assignee != ticket.assigned_to:
            if new_assignee is not None:
                stmt = select(User).where(User.id == new_assignee, User.organization_id == ticket.organization_id)
                user = (await session.execute(stmt)).scalar_one_or_none()
                if not user:
                    raise UserNotFoundError(new_assignee)
            ticket.assigned_to = new_assignee

    if "priority" in update_data and update_data["priority"] is not None:
        new_priority = update_data["priority"].value if hasattr(update_data["priority"], "value") else str(update_data["priority"])
        # Priority Override Guard
        validate_priority_escalation(user_role=actor_role, ticket=ticket, new_priority=new_priority)
        ticket.priority = new_priority
        if new_priority.lower() == "urgent":
            await notification_service.emit_ticket_escalated(
                ticket_id=ticket.id,
                ticket_number=ticket.ticket_number,
                organization_id=ticket.organization_id,
                priority=ticket.priority,
            )

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
