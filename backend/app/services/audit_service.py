"""
Immutable Audit Logging Service.

Provides an append-only audit trail for compliance, forensic tracing, and security operations.
Audit records cannot be mutated or deleted via API.
"""

import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket_event import TicketEvent


async def record_audit_event(
    session: AsyncSession,
    ticket_id: uuid.UUID,
    event_type: str,
    actor_id: Optional[uuid.UUID] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> TicketEvent:
    """
    Appends an immutable audit event to the ticket_events ledger.
    """
    event = TicketEvent(
        ticket_id=ticket_id,
        actor_id=actor_id,
        event_type=event_type,
        event_metadata=metadata or {},
    )
    session.add(event)
    await session.flush()
    return event


async def get_audit_trail(
    session: AsyncSession,
    ticket_id: uuid.UUID,
) -> List[TicketEvent]:
    """
    Retrieves the chronological audit trail for a ticket.
    """
    stmt = (
        select(TicketEvent)
        .where(TicketEvent.ticket_id == ticket_id)
        .order_by(TicketEvent.created_at.asc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())
