import uuid
import pytest
from httpx import AsyncClient
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer
from app.models.user import User
from app.models.ticket import Ticket
from app.services import ticket_service
from app.services.state_machine import can_transition, validate_transition
from app.core.exceptions import InvalidStatusTransitionError
from tests.test_auth_endpoints import create_token_for_user


def test_fsm_matrix_rules():
    """Unit tests for the FSM transition validation matrix."""
    # Valid transitions
    assert can_transition("open", "in_progress") is True
    assert can_transition("open", "resolved") is True
    assert can_transition("open", "closed") is True
    assert can_transition("open", "escalated") is True

    assert can_transition("in_progress", "resolved") is True
    assert can_transition("in_progress", "closed") is True
    assert can_transition("in_progress", "open") is True
    assert can_transition("in_progress", "escalated") is True

    assert can_transition("resolved", "reopened") is True
    assert can_transition("resolved", "closed") is True

    assert can_transition("reopened", "in_progress") is True
    assert can_transition("reopened", "resolved") is True
    assert can_transition("reopened", "closed") is True

    assert can_transition("escalated", "in_progress") is True
    assert can_transition("escalated", "resolved") is True

    # Idempotent
    assert can_transition("open", "open") is True
    assert can_transition("closed", "closed") is True

    # Illegal transitions
    assert can_transition("closed", "open") is False
    assert can_transition("closed", "in_progress") is False
    assert can_transition("closed", "escalated") is False
    assert can_transition("closed", "resolved") is False
    assert can_transition("open", "reopened") is False
    assert can_transition("resolved", "in_progress") is False

    with pytest.raises(InvalidStatusTransitionError) as exc_info:
        validate_transition("closed", "in_progress")
    assert exc_info.value.code == "INVALID_STATUS_TRANSITION"


@pytest.mark.asyncio
async def test_ticket_status_lifecycle_and_timestamps(db_session: AsyncSession):
    """Verifies full lifecycle transitions and timestamp recording in DB."""
    org = Organization(name=f"FSM Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"fsm_{uuid.uuid4().hex[:6]}@example.com",
        full_name="FSM Customer",
    )
    db_session.add(customer)
    await db_session.commit()

    # 1. Create ticket in OPEN state
    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="FSM Lifecycle Test",
        initial_message="Initial inquiry",
    )
    assert ticket.status == "open"
    assert ticket.resolved_at is None
    assert ticket.closed_at is None

    # 2. OPEN -> IN_PROGRESS
    t_in_prog = await ticket_service.update_ticket_status(
        session=db_session,
        ticket_id=ticket.id,
        new_status="in_progress",
        organization_id=org.id,
    )
    assert t_in_prog.status == "in_progress"

    # 3. IN_PROGRESS -> RESOLVED (sets resolved_at)
    t_resolved = await ticket_service.update_ticket_status(
        session=db_session,
        ticket_id=ticket.id,
        new_status="resolved",
        organization_id=org.id,
    )
    assert t_resolved.status == "resolved"
    assert t_resolved.resolved_at is not None

    # 4. RESOLVED -> REOPENED (clears closed_at)
    t_reopened = await ticket_service.update_ticket_status(
        session=db_session,
        ticket_id=ticket.id,
        new_status="reopened",
        organization_id=org.id,
    )
    assert t_reopened.status == "reopened"
    assert t_reopened.closed_at is None

    # 5. REOPENED -> CLOSED (sets closed_at)
    t_closed = await ticket_service.update_ticket_status(
        session=db_session,
        ticket_id=ticket.id,
        new_status="closed",
        organization_id=org.id,
    )
    assert t_closed.status == "closed"
    assert t_closed.closed_at is not None

    # 6. CLOSED -> IN_PROGRESS must fail with InvalidStatusTransitionError
    with pytest.raises(InvalidStatusTransitionError):
        await ticket_service.update_ticket_status(
            session=db_session,
            ticket_id=ticket.id,
            new_status="in_progress",
            organization_id=org.id,
        )


@pytest.mark.asyncio
async def test_status_update_endpoint_http(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verifies PATCH /api/v1/tickets/{id}/status endpoint behavior."""
    org = Organization(name=f"FSM API Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    user = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"fsm_agent_{uuid.uuid4().hex[:6]}@cxpilot.io",
        full_name="Agent FSM",
        role="agent",
    )
    customer = Customer(
        organization_id=org.id,
        email=f"cust_fsm_api_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Alice API",
    )
    db_session.add_all([user, customer])
    await db_session.commit()

    token = create_token_for_user(user.id, user.email)
    headers = {"Authorization": f"Bearer {token}"}

    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="API Status FSM",
        initial_message="Inquiry for API status",
    )

    # Valid transition OPEN -> IN_PROGRESS
    resp = await client.patch(
        f"/api/v1/tickets/{ticket.id}/status",
        json={"status": "in_progress"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"

    # Transition to CLOSED
    resp_close = await client.patch(
        f"/api/v1/tickets/{ticket.id}/status",
        json={"status": "closed"},
        headers=headers,
    )
    assert resp_close.status_code == 200
    assert resp_close.json()["status"] == "closed"

    # Illegal transition CLOSED -> IN_PROGRESS returns HTTP 400
    resp_illegal = await client.patch(
        f"/api/v1/tickets/{ticket.id}/status",
        json={"status": "in_progress"},
        headers=headers,
    )
    assert resp_illegal.status_code == 400
    err_body = resp_illegal.json()
    assert err_body["error"]["code"] == "INVALID_STATUS_TRANSITION"
