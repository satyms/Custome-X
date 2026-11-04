import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer
from app.models.user import User
from app.services import ticket_service
from app.core.exceptions import UserNotFoundError, ForbiddenError
from tests.test_auth_endpoints import create_token_for_user


@pytest.mark.asyncio
async def test_ticket_assignment_within_org_and_auto_transition(db_session: AsyncSession):
    """Verifies assigning an OPEN ticket claims it, auto-transitions to IN_PROGRESS, and logs audit event."""
    org = Organization(name=f"Assign Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"agent_assign_{uuid.uuid4().hex[:6]}@cxpilot.io",
        full_name="Agent Cooper",
        role="agent",
    )
    customer = Customer(
        organization_id=org.id,
        email=f"cust_assign_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Laura Palmer",
    )
    db_session.add_all([agent, customer])
    await db_session.commit()

    # 1. Create OPEN unassigned ticket
    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="Unassigned Inquiry",
        initial_message="Needs claiming",
    )
    assert ticket.status == "open"
    assert ticket.assigned_to is None

    # 2. Claim ticket
    assigned_ticket = await ticket_service.assign_ticket(
        session=db_session,
        ticket_id=ticket.id,
        assigned_to_user_id=agent.id,
        actor_id=agent.id,
        organization_id=org.id,
    )

    assert assigned_ticket.assigned_to == agent.id
    assert assigned_ticket.status == "in_progress"  # Auto-transitioned from open

    # 3. Unassign back to team pool
    unassigned_ticket = await ticket_service.assign_ticket(
        session=db_session,
        ticket_id=ticket.id,
        assigned_to_user_id=None,
        actor_id=agent.id,
        organization_id=org.id,
    )
    assert unassigned_ticket.assigned_to is None


@pytest.mark.asyncio
async def test_ticket_cross_tenant_assignment_blocked(db_session: AsyncSession):
    """Verifies that assigning an agent from Organization B to a ticket in Organization A is rejected."""
    org_a = Organization(name=f"Org A {uuid.uuid4().hex[:6]}")
    org_b = Organization(name=f"Org B {uuid.uuid4().hex[:6]}")
    db_session.add_all([org_a, org_b])
    await db_session.flush()

    agent_b = User(
        id=uuid.uuid4(),
        organization_id=org_b.id,
        email=f"agent_b_{uuid.uuid4().hex[:6]}@orgb.io",
        full_name="Agent B",
        role="agent",
    )
    customer_a = Customer(
        organization_id=org_a.id,
        email=f"cust_a_{uuid.uuid4().hex[:6]}@orga.io",
        full_name="Customer A",
    )
    db_session.add_all([agent_b, customer_a])
    await db_session.commit()

    ticket_a, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org_a.id,
        customer_id=customer_a.id,
        title="Org A Ticket",
        initial_message="Org A inquiry",
    )

    # Attempting to assign agent_b to ticket_a must fail with UserNotFoundError (not found within Org A)
    with pytest.raises(UserNotFoundError):
        await ticket_service.assign_ticket(
            session=db_session,
            ticket_id=ticket_a.id,
            assigned_to_user_id=agent_b.id,
            organization_id=org_a.id,
        )


@pytest.mark.asyncio
async def test_assign_endpoint_http(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """Verifies PATCH /api/v1/tickets/{id}/assign endpoint."""
    org = Organization(name=f"Assign HTTP Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    caller = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"caller_{uuid.uuid4().hex[:6]}@cxpilot.io",
        full_name="Supervisor Jane",
        role="supervisor",
    )
    target_agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"target_{uuid.uuid4().hex[:6]}@cxpilot.io",
        full_name="Agent Bob",
        role="agent",
    )
    customer = Customer(
        organization_id=org.id,
        email=f"cust_http_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Client Clara",
    )
    db_session.add_all([caller, target_agent, customer])
    await db_session.commit()

    token = create_token_for_user(caller.id, caller.email)
    headers = {"Authorization": f"Bearer {token}"}

    ticket, _, _ = await ticket_service.create_ticket_atomic(
        session=db_session,
        organization_id=org.id,
        customer_id=customer.id,
        title="HTTP Assign Test",
        initial_message="Assign me via API",
    )

    # 1. Assign to target_agent
    resp = await client.patch(
        f"/api/v1/tickets/{ticket.id}/assign",
        json={"assigned_to": str(target_agent.id)},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["assigned_to"] == str(target_agent.id)
    assert data["status"] == "in_progress"

    # 2. Unassign back to pool
    resp_unassign = await client.patch(
        f"/api/v1/tickets/{ticket.id}/assign",
        json={"assigned_to": None},
        headers=headers,
    )
    assert resp_unassign.status_code == 200
    assert resp_unassign.json()["assigned_to"] is None
