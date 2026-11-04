"""
Ticket Status Finite State Machine (FSM).

Defines permitted state transitions and enforces deterministic lifecycle rules:
- OPEN        -> IN_PROGRESS, RESOLVED, CLOSED, ESCALATED
- IN_PROGRESS -> RESOLVED, CLOSED, OPEN, ESCALATED
- ESCALATED   -> IN_PROGRESS, RESOLVED, CLOSED
- RESOLVED    -> REOPENED, CLOSED
- REOPENED    -> IN_PROGRESS, RESOLVED, CLOSED, ESCALATED
- CLOSED      -> Terminal State (no direct transitions allowed; follow-up ticket required)
"""

from datetime import datetime, timezone
from typing import Dict, Set
from app.core.exceptions import InvalidStatusTransitionError


VALID_TRANSITIONS: Dict[str, Set[str]] = {
    "open": {"in_progress", "resolved", "closed", "escalated"},
    "in_progress": {"resolved", "closed", "open", "escalated"},
    "escalated": {"in_progress", "resolved", "closed"},
    "resolved": {"reopened", "closed"},
    "reopened": {"in_progress", "resolved", "closed", "escalated"},
    "closed": set(),  # Terminal state
}


def can_transition(current_status: str, new_status: str) -> bool:
    """Checks whether transitioning from current_status to new_status is permitted."""
    c_status = current_status.lower()
    n_status = new_status.lower()

    # Idempotent no-op transition is allowed
    if c_status == n_status:
        return True

    allowed = VALID_TRANSITIONS.get(c_status, set())
    return n_status in allowed


def validate_transition(current_status: str, new_status: str) -> None:
    """Validates the state transition and raises InvalidStatusTransitionError if illegal."""
    c_status = current_status.lower()
    n_status = new_status.lower()

    if not can_transition(c_status, n_status):
        raise InvalidStatusTransitionError(current_status=c_status, attempted_status=n_status)


def apply_lifecycle_timestamps(ticket, new_status: str) -> None:
    """Sets or clears resolved_at and closed_at timestamps based on the target status."""
    n_status = new_status.lower()
    now = datetime.now(timezone.utc)

    if n_status == "resolved":
        ticket.resolved_at = now
    elif n_status == "closed":
        ticket.closed_at = now
    elif n_status in ("open", "in_progress", "reopened", "escalated"):
        ticket.closed_at = None
