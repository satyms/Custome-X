"""
Decoupled Notification Dispatcher.

In-process event bus implementing publisher-subscriber patterns.
Decouples ticket state mutations from notification channels (in-app badges, email, Slack, n8n webhooks).
"""

import asyncio
import inspect
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List
import uuid


class NotificationDispatcher:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Dict[str, Any]], Any]]] = {}

    def subscribe(self, event_name: str, handler: Callable[[Dict[str, Any]], Any]) -> None:
        """Registers a listener for a specific event topic."""
        if event_name not in self._subscribers:
            self._subscribers[event_name] = []
        if handler not in self._subscribers[event_name]:
            self._subscribers[event_name].append(handler)

    def unsubscribe(self, event_name: str, handler: Callable[[Dict[str, Any]], Any]) -> None:
        """Removes a listener from an event topic."""
        if event_name in self._subscribers and handler in self._subscribers[event_name]:
            self._subscribers[event_name].remove(handler)

    async def dispatch(self, event_name: str, payload: Dict[str, Any]) -> None:
        """Publishes an event to all registered listeners asynchronously."""
        handlers = self._subscribers.get(event_name, [])
        envelope = {
            "event_id": str(uuid.uuid4()),
            "event_name": event_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }

        for handler in handlers:
            try:
                if inspect.iscoroutinefunction(handler):
                    await handler(envelope)
                else:
                    handler(envelope)
            except Exception as e:
                # Log error without failing main transaction
                print(f"[NotificationDispatcher] Error dispatching to handler {handler}: {e}")


# Global singleton dispatcher instance
notification_bus = NotificationDispatcher()


async def emit_ticket_created(
    ticket_id: uuid.UUID,
    ticket_number: str,
    organization_id: uuid.UUID,
    title: str,
    priority: str,
) -> None:
    """Dispatches a ticket.created notification event."""
    await notification_bus.dispatch(
        "ticket.created",
        {
            "ticket_id": str(ticket_id),
            "ticket_number": ticket_number,
            "organization_id": str(organization_id),
            "title": title,
            "priority": priority,
        },
    )


async def emit_ticket_assigned(
    ticket_id: uuid.UUID,
    ticket_number: str,
    organization_id: uuid.UUID,
    assigned_to: Optional[uuid.UUID],
    assigned_by: Optional[uuid.UUID],
) -> None:
    """Dispatches a ticket.assigned notification event."""
    await notification_bus.dispatch(
        "ticket.assigned",
        {
            "ticket_id": str(ticket_id),
            "ticket_number": ticket_number,
            "organization_id": str(organization_id),
            "assigned_to": str(assigned_to) if assigned_to else None,
            "assigned_by": str(assigned_by) if assigned_by else None,
        },
    )


async def emit_ticket_escalated(
    ticket_id: uuid.UUID,
    ticket_number: str,
    organization_id: uuid.UUID,
    priority: str,
    reason: Optional[str] = None,
) -> None:
    """Dispatches a ticket.escalated notification event."""
    await notification_bus.dispatch(
        "ticket.escalated",
        {
            "ticket_id": str(ticket_id),
            "ticket_number": ticket_number,
            "organization_id": str(organization_id),
            "priority": priority,
            "reason": reason,
        },
    )
