"""
Test Tenant Isolation: Tenant A tries to read Tenant B's tickets and gets nothing.
Verifies application-level tenant isolation enforced via organization_id filtering:
1. Tenant A listing tickets receives 0 tickets belonging to Tenant B.
2. Tenant A fetching Tenant B's specific ticket ID receives 404 Not Found (gets nothing).
"""
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.services import ticket_service
from app.core.exceptions import TicketNotFoundError
from main import app

TEST_JWT_SECRET = "super-secret-key-that-is-at-least-32-bytes-long!"


def make_token(user_id: uuid.UUID, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.mark.asyncio
async def test_tenant_a_tries_to_read_tenant_b_tickets_and_gets_nothing(db_session: AsyncSession):
    """
    Direct verification of tenant isolation:
    Tenant A attempts to read Tenant B's tickets and receives nothing (0 items on list, 404 on direct fetch).
    """
    # 1. Setup two distinct tenants: Organization A and Organization B
    org_a = Organization(name=f"Tenant Alpha {uuid.uuid4().hex[:6]}")
    org_b = Organization(name=f"Tenant Beta {uuid.uuid4().hex[:6]}")
    db_session.add_all([org_a, org_b])
    await db_session.commit()
    await db_session.refresh(org_a)
    await db_session.refresh(org_b)

    # 2. Setup users for each tenant
    user_a = User(
        id=uuid.uuid4(),
        organization_id=org_a.id,
        email=f"agent_a_{uuid.uuid4().hex[:6]}@tenant-a.com",
        full_name="Agent Alpha",
        role="agent",
    )
    user_b = User(
        id=uuid.uuid4(),
        organization_id=org_b.id,
        email=f"agent_b_{uuid.uuid4().hex[:6]}@tenant-b.com",
        full_name="Agent Beta",
        role="agent",
    )
    db_session.add_all([user_a, user_b])

    # 3. Setup customer and tickets for Tenant B
    customer_b = Customer(
        organization_id=org_b.id,
        email=f"cust_b_{uuid.uuid4().hex[:6]}@client.com",
        full_name="Customer of Tenant B",
    )
    db_session.add(customer_b)
    await db_session.commit()
    await db_session.refresh(customer_b)

    ticket_b = Ticket(
        organization_id=org_b.id,
        customer_id=customer_b.id,
        title="Confidential Ticket of Tenant B",
        status="open",
        priority="urgent",
    )
    db_session.add(ticket_b)
    await db_session.commit()
    await db_session.refresh(ticket_b)

    # =========================================================================
    # Part 1: Service-Level Isolation Check
    # =========================================================================
    # Tenant A service query for tickets strictly using org_a.id
    items_for_a, count_for_a = await ticket_service.list_tickets(
        session=db_session,
        organization_id=org_a.id,
    )
    # Tenant A must receive 0 tickets from Tenant B
    tenant_b_ticket_ids_seen_by_a = [t.id for t in items_for_a if t.organization_id == org_b.id]
    assert len(tenant_b_ticket_ids_seen_by_a) == 0

    # Tenant A directly querying Tenant B's ticket ID raises TicketNotFoundError
    with pytest.raises(TicketNotFoundError):
        await ticket_service.get_ticket_by_id(
            session=db_session,
            ticket_id=ticket_b.id,
            organization_id=org_a.id,
        )

    # =========================================================================
    # Part 2: API HTTP Endpoint Isolation Check
    # =========================================================================
    token_a = make_token(user_a.id, user_a.email)
    header_a = {"Authorization": f"Bearer {token_a}"}

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # A) Tenant A calls GET /api/v1/tickets -> must get 0 items belonging to Tenant B
        res_list = await client.get("/api/v1/tickets", headers=header_a)
        assert res_list.status_code == 200
        data = res_list.json()
        item_ids = [item["id"] for item in data["items"]]
        assert str(ticket_b.id) not in item_ids

        # B) Tenant A attempts to fetch Tenant B's ticket directly: GET /api/v1/tickets/{ticket_b.id}
        # Must return 404 Not Found (gets nothing; existence is hidden)
        res_direct = await client.get(f"/api/v1/tickets/{ticket_b.id}", headers=header_a)
        assert res_direct.status_code == 404
        assert res_direct.json()["error"]["code"] == "TICKET_NOT_FOUND"

    app.dependency_overrides.clear()

    # Clean up DB
    await db_session.delete(ticket_b)
    await db_session.delete(customer_b)
    await db_session.delete(user_a)
    await db_session.delete(user_b)
    await db_session.delete(org_a)
    await db_session.delete(org_b)
    await db_session.commit()
