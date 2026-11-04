import uuid
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.models.message import Message
from app.models.ticket_event import TicketEvent


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
    async with session.begin():
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

    # Session committed cleanly
    return ticket, message, event
