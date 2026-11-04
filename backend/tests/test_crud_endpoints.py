import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User
from app.core.auth import get_current_user
from main import app


@pytest.mark.asyncio
async def test_end_to_end_customer_and_ticket_crud(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    End-to-End integration test verifying Features 3.5 & 3.6:
    - Service Layer orchestration
    - Full CRUD lifecycle via HTTP endpoints with PostgreSQL persistence
    - 404 handling on missing resources
    - Relationship expansion (ticket messages)
    """
    # 1. Setup tenant organization and agent user directly in DB
    org = Organization(name=f"E2E Store {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    org_id = str(org.id)

    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"e2e_agent_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Eleanor Agent",
        role="agent",
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    app.dependency_overrides[get_current_user] = lambda: agent

    # --- 2. CREATE CUSTOMER (POST /api/v1/customers) ---
    cust_payload = {
        "organization_id": org_id,
        "email": f"buyer_{uuid.uuid4().hex[:6]}@example.com",
        "full_name": "Eleanor Vance",
        "phone": "+1-555-8900",
    }
    create_cust_res = await client.post("/api/v1/customers", json=cust_payload)
    assert create_cust_res.status_code == 201
    customer_data = create_cust_res.json()
    cust_id = customer_data["id"]
    assert customer_data["full_name"] == "Eleanor Vance"

    # --- 3. GET CUSTOMER (GET /api/v1/customers/{id}) ---
    get_cust_res = await client.get(f"/api/v1/customers/{cust_id}")
    assert get_cust_res.status_code == 200
    assert get_cust_res.json()["email"] == cust_payload["email"]

    # --- 4. CREATE TICKET (POST /api/v1/tickets) ---
    ticket_payload = {
        "organization_id": org_id,
        "customer_id": cust_id,
        "title": "Wrong size shirt delivered",
        "priority": "high",
        "initial_message": "I ordered Large but received Small. Please exchange.",
    }
    create_ticket_res = await client.post("/api/v1/tickets", json=ticket_payload)
    assert create_ticket_res.status_code == 201
    ticket_data = create_ticket_res.json()
    ticket_id = ticket_data["id"]
    assert ticket_data["status"] == "open"
    assert ticket_data["priority"] == "high"

    # --- 5. GET TICKET WITH MESSAGES (GET /api/v1/tickets/{id}) ---
    get_ticket_res = await client.get(f"/api/v1/tickets/{ticket_id}")
    assert get_ticket_res.status_code == 200
    detail_data = get_ticket_res.json()
    assert detail_data["id"] == ticket_id
    # Verify initial message was atomically created and loaded
    assert len(detail_data["messages"]) == 1
    assert detail_data["messages"][0]["content"] == "I ordered Large but received Small. Please exchange."
    assert detail_data["messages"][0]["sender_type"] == "customer"

    # --- 6. UPDATE TICKET STATUS (PATCH /api/v1/tickets/{id}) ---
    patch_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        json={"status": "in_progress", "priority": "urgent"},
    )
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    assert patched_data["status"] == "in_progress"
    assert patched_data["priority"] == "urgent"

    # --- 7. FILTER TICKETS (GET /api/v1/tickets?status=in_progress) ---
    filter_res = await client.get(
        f"/api/v1/tickets?organization_id={org_id}&status=in_progress"
    )
    assert filter_res.status_code == 200
    list_data = filter_res.json()
    assert list_data["total"] >= 1
    assert any(t["id"] == ticket_id for t in list_data["items"])

    # --- 8. DELETE TICKET (DELETE /api/v1/tickets/{id}) ---
    del_res = await client.delete(f"/api/v1/tickets/{ticket_id}")
    assert del_res.status_code == 204

    # --- 9. VERIFY 404 ON DELETED TICKET ---
    get_deleted_res = await client.get(f"/api/v1/tickets/{ticket_id}")
    assert get_deleted_res.status_code == 404

    # --- 10. VERIFY 404 ON NON-EXISTENT CUSTOMER ---
    ghost_res = await client.get(f"/api/v1/customers/{uuid.uuid4()}")
    assert ghost_res.status_code == 404

    # Clean up DB
    app.dependency_overrides.pop(get_current_user, None)
    await db_session.delete(agent)
    await db_session.delete(org)
    await db_session.commit()
