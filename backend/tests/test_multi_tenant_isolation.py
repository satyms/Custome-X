import uuid
from datetime import datetime, timezone, timedelta
import jwt
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.middleware import RequestIdMiddleware
from app.core.error_handlers import register_exception_handlers
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket
from main import app


TEST_SECRET = "super-secret-key-that-is-at-least-32-bytes-long!"


def make_auth_token(user_id: uuid.UUID, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


@pytest.mark.asyncio
async def test_multi_tenant_strict_isolation(db_session: AsyncSession):
    """
    Verifies Feature 4.6 (Organization Isolation):
    - Strict multi-tenant boundaries between Org A and Org B.
    - Tenant A user cannot read, update, or delete Tenant B tickets.
    - Tenant A user querying tickets/customers only receives Tenant A records.
    - Cross-tenant customer references in ticket creation are blocked with 404.
    """
    # 1. Provision Organization A and User A
    org_a = Organization(name=f"Tenant A {uuid.uuid4().hex[:6]}")
    db_session.add(org_a)
    await db_session.commit()
    await db_session.refresh(org_a)

    user_a_id = uuid.uuid4()
    user_a = User(
        id=user_a_id,
        organization_id=org_a.id,
        email=f"user_a_{uuid.uuid4().hex[:6]}@tenant-a.com",
        full_name="Agent A",
        role="agent",
    )
    db_session.add(user_a)

    # 2. Provision Organization B and User B
    org_b = Organization(name=f"Tenant B {uuid.uuid4().hex[:6]}")
    db_session.add(org_b)
    await db_session.commit()
    await db_session.refresh(org_b)

    user_b_id = uuid.uuid4()
    user_b = User(
        id=user_b_id,
        organization_id=org_b.id,
        email=f"user_b_{uuid.uuid4().hex[:6]}@tenant-b.com",
        full_name="Agent B",
        role="agent",
    )
    db_session.add(user_b)

    # 3. Provision Customer A and Customer B
    customer_a = Customer(
        organization_id=org_a.id,
        email=f"cust_a_{uuid.uuid4().hex[:6]}@buyer.com",
        full_name="Customer Alpha",
    )
    customer_b = Customer(
        organization_id=org_b.id,
        email=f"cust_b_{uuid.uuid4().hex[:6]}@buyer.com",
        full_name="Customer Beta",
    )
    db_session.add_all([customer_a, customer_b])
    await db_session.commit()
    await db_session.refresh(customer_a)
    await db_session.refresh(customer_b)

    # 4. Provision Ticket A (in Org A) and Ticket B (in Org B)
    ticket_a = Ticket(
        organization_id=org_a.id,
        customer_id=customer_a.id,
        title="Ticket belonging to Tenant A",
        status="open",
        priority="high",
    )
    ticket_b = Ticket(
        organization_id=org_b.id,
        customer_id=customer_b.id,
        title="Ticket belonging to Tenant B",
        status="open",
        priority="low",
    )
    db_session.add_all([ticket_a, ticket_b])
    await db_session.commit()
    await db_session.refresh(ticket_a)
    await db_session.refresh(ticket_b)

    token_a = make_auth_token(user_a.id, user_a.email)
    token_b = make_auth_token(user_b.id, user_b.email)
    header_a = {"Authorization": f"Bearer {token_a}"}
    header_b = {"Authorization": f"Bearer {token_b}"}

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # --- TEST 1: User A can read Ticket A ---
        res_a_reads_a = await ac.get(f"/api/v1/tickets/{ticket_a.id}", headers=header_a)
        assert res_a_reads_a.status_code == 200
        assert res_a_reads_a.json()["id"] == str(ticket_a.id)

        # --- TEST 2: User B CANNOT read Ticket A (404 Not Found) ---
        res_b_reads_a = await ac.get(f"/api/v1/tickets/{ticket_a.id}", headers=header_b)
        assert res_b_reads_a.status_code == 404
        assert res_b_reads_a.json()["error"]["code"] == "TICKET_NOT_FOUND"

        # --- TEST 3: User B CANNOT update Ticket A (404 Not Found) ---
        res_b_updates_a = await ac.patch(
            f"/api/v1/tickets/{ticket_a.id}",
            json={"status": "in_progress"},
            headers=header_b,
        )
        assert res_b_updates_a.status_code == 404

        # --- TEST 4: User B CANNOT delete Ticket A (404 Not Found) ---
        res_b_deletes_a = await ac.delete(f"/api/v1/tickets/{ticket_a.id}", headers=header_b)
        assert res_b_deletes_a.status_code == 404

        # --- TEST 5: Ticket List Isolation: User B only sees Ticket B ---
        res_b_list = await ac.get("/api/v1/tickets", headers=header_b)
        assert res_b_list.status_code == 200
        b_items = res_b_list.json()["items"]
        b_ids = [item["id"] for item in b_items]
        assert str(ticket_b.id) in b_ids
        assert str(ticket_a.id) not in b_ids  # Tenant A ticket NEVER leaked

        # --- TEST 6: Customer Isolation: User A cannot read Customer B ---
        res_a_reads_cust_b = await ac.get(f"/api/v1/customers/{customer_b.id}", headers=header_a)
        assert res_a_reads_cust_b.status_code == 404
        assert res_a_reads_cust_b.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"

        # --- TEST 7: Cross-tenant creation blocked: User A cannot create ticket for Customer B ---
        res_cross_create = await ac.post(
            "/api/v1/tickets",
            json={
                "customer_id": str(customer_b.id),
                "title": "Cross tenant injection attempt",
                "initial_message": "Should fail",
                "priority": "normal",
            },
            headers=header_a,
        )
        assert res_cross_create.status_code == 404  # Customer not found in Org A

    app.dependency_overrides.clear()

    # Clean up DB
    await db_session.delete(ticket_a)
    await db_session.delete(ticket_b)
    await db_session.delete(customer_a)
    await db_session.delete(customer_b)
    await db_session.delete(user_a)
    await db_session.delete(user_b)
    await db_session.delete(org_a)
    await db_session.delete(org_b)
    await db_session.commit()
