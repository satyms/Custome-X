"""
Deterministic Business Rules Engine for Customer Support Workflows.

Encapsulates operational business constraints:
1. 7-Day Auto-Reopen: Customer message on RESOLVED ticket within 7 days auto-reopens the ticket.
2. Closed Follow-Up Generator: Customer message on CLOSED ticket spawns a linked follow-up ticket.
3. Priority Override Guard: Non-managers cannot manually escalate priority to URGENT on unassigned tickets.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.models.message import Message
from app.models.ticket_event import TicketEvent
from app.core.exceptions import ForbiddenError


REOPEN_WINDOW_DAYS = 7


def is_eligible_for_auto_reopen(ticket: Ticket) -> bool:
    """Checks whether a resolved ticket is within the 7-day auto-reopen window."""
    if ticket.status != "resolved":
        return False

    baseline_time = ticket.resolved_at or ticket.updated_at
    if not baseline_time:
        return True

    now = datetime.now(timezone.utc)
    if baseline_time.tzinfo is None:
        baseline_time = baseline_time.replace(tzinfo=timezone.utc)

    return (now - baseline_time) <= timedelta(days=REOPEN_WINDOW_DAYS)


def validate_priority_escalation(
    user_role: str,
    ticket: Ticket,
    new_priority: str,
) -> None:
    """
    Guards priority escalation:
    Non-managers/non-admins cannot escalate priority to URGENT on unassigned tickets.
    """
    if new_priority.lower() == "urgent" and ticket.assigned_to is None:
        if user_role not in ("supervisor", "admin"):
            raise ForbiddenError(
                "Non-managers cannot manually escalate priority to URGENT on unassigned tickets."
            )
