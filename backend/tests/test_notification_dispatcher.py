import uuid
import pytest
from app.services.notification_service import (
    NotificationDispatcher,
    emit_ticket_created,
    emit_ticket_assigned,
    emit_ticket_escalated,
    notification_bus,
)


@pytest.mark.asyncio
async def test_notification_dispatcher_pub_sub():
    """Verifies that events are dispatched to subscribed handlers and removed upon unsubscribe."""
    dispatcher = NotificationDispatcher()
    received_events = []

    async def async_handler(envelope):
        received_events.append(envelope)

    # 1. Subscribe
    dispatcher.subscribe("test.topic", async_handler)

    # 2. Dispatch event
    payload = {"message": "Hello Subscriber", "score": 98}
    await dispatcher.dispatch("test.topic", payload)

    assert len(received_events) == 1
    envelope = received_events[0]
    assert envelope["event_name"] == "test.topic"
    assert envelope["data"]["message"] == "Hello Subscriber"
    assert "event_id" in envelope
    assert "timestamp" in envelope

    # 3. Unsubscribe
    dispatcher.unsubscribe("test.topic", async_handler)
    await dispatcher.dispatch("test.topic", {"message": "Ignored"})
    assert len(received_events) == 1  # No additional events received


@pytest.mark.asyncio
async def test_notification_bus_ticket_events():
    """Verifies ticket lifecycle dispatch helpers on global notification_bus."""
    dispatched_created = []
    dispatched_assigned = []
    dispatched_escalated = []

    async def on_created(env):
        dispatched_created.append(env["data"])

    async def on_assigned(env):
        dispatched_assigned.append(env["data"])

    async def on_escalated(env):
        dispatched_escalated.append(env["data"])

    notification_bus.subscribe("ticket.created", on_created)
    notification_bus.subscribe("ticket.assigned", on_assigned)
    notification_bus.subscribe("ticket.escalated", on_escalated)

    t_id = uuid.uuid4()
    org_id = uuid.uuid4()
    agent_id = uuid.uuid4()

    # Emit ticket created
    await emit_ticket_created(
        ticket_id=t_id,
        ticket_number="CX-1042",
        organization_id=org_id,
        title="Payment Dispute",
        priority="high",
    )
    assert len(dispatched_created) >= 1
    assert dispatched_created[-1]["ticket_number"] == "CX-1042"

    # Emit ticket assigned
    await emit_ticket_assigned(
        ticket_id=t_id,
        ticket_number="CX-1042",
        organization_id=org_id,
        assigned_to=agent_id,
        assigned_by=None,
    )
    assert len(dispatched_assigned) >= 1
    assert dispatched_assigned[-1]["assigned_to"] == str(agent_id)

    # Emit ticket escalated
    await emit_ticket_escalated(
        ticket_id=t_id,
        ticket_number="CX-1042",
        organization_id=org_id,
        priority="urgent",
        reason="SLA threshold breach",
    )
    assert len(dispatched_escalated) >= 1
    assert dispatched_escalated[-1]["priority"] == "urgent"

    # Cleanup subscribers
    notification_bus.unsubscribe("ticket.created", on_created)
    notification_bus.unsubscribe("ticket.assigned", on_assigned)
    notification_bus.unsubscribe("ticket.escalated", on_escalated)
