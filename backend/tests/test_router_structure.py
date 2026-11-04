import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer


@pytest.mark.asyncio
async def test_router_structure_and_status_codes(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Verifies Feature 3.1 & 3.2:
    1. /api/v1/ prefix routing is mounted correctly.
    2. HTTP status codes conform to REST specifications (200, 201, 204).
    3. Both Tickets and Customers endpoints are accessible.
    """
    org = Organization(name=f"Router Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    cust = Customer(
        organization_id=org.id,
        email=f"router_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Router Tester",
    )
    db_session.add(cust)
    await db_session.commit()

    sample_org_id = str(org.id)
    sample_cust_id = str(cust.id)

    # --- Root Endpoint ---
    root_res = await client.get("/")
    assert root_res.status_code == 200
    root_data = root_res.json()
    assert root_data["v1_tickets"] == "/api/v1/tickets"
    assert root_data["v1_customers"] == "/api/v1/customers"

    # --- Customers Router (/api/v1/customers) ---
    list_cust_res = await client.get("/api/v1/customers")
    assert list_cust_res.status_code == 200

    create_cust_res = await client.post(
        "/api/v1/customers",
        json={
            "organization_id": sample_org_id,
            "email": f"cust2_{uuid.uuid4().hex[:6]}@example.com",
            "full_name": "Test User 2",
        },
    )
    assert create_cust_res.status_code == 201

    get_cust_res = await client.get(f"/api/v1/customers/{sample_cust_id}")
    assert get_cust_res.status_code == 200

    # --- Tickets Router (/api/v1/tickets) ---
    list_tickets_res = await client.get("/api/v1/tickets?limit=10&offset=0")
    assert list_tickets_res.status_code == 200

    create_ticket_res = await client.post(
        "/api/v1/tickets",
        json={
            "organization_id": sample_org_id,
            "customer_id": sample_cust_id,
            "title": "Test Ticket",
            "priority": "normal",
            "initial_message": "Initial test message",
        },
    )
    assert create_ticket_res.status_code == 201
    created_ticket_id = create_ticket_res.json()["id"]

    get_ticket_res = await client.get(f"/api/v1/tickets/{created_ticket_id}")
    assert get_ticket_res.status_code == 200
    assert get_ticket_res.json()["id"] == created_ticket_id

    patch_ticket_res = await client.patch(
        f"/api/v1/tickets/{created_ticket_id}", json={"status": "in_progress"}
    )
    assert patch_ticket_res.status_code == 200

    delete_ticket_res = await client.delete(f"/api/v1/tickets/{created_ticket_id}")
    assert delete_ticket_res.status_code == 204
    assert delete_ticket_res.content == b""


@pytest.mark.asyncio
async def test_openapi_schema_tags(client: AsyncClient):
    """
    Verifies that OpenAPI documentation contains the routes grouped with their tags.
    """
    openapi_res = await client.get("/openapi.json")
    assert openapi_res.status_code == 200
    schema = openapi_res.json()

    paths = schema["paths"]
    assert "/api/v1/tickets" in paths
    assert "/api/v1/tickets/{ticket_id}" in paths
    assert "/api/v1/customers" in paths
    assert "/api/v1/customers/{customer_id}" in paths

    # Verify tags
    assert "Tickets" in paths["/api/v1/tickets"]["get"]["tags"]
    assert "Customers" in paths["/api/v1/customers"]["get"]["tags"]
