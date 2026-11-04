import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from main import app


@pytest.mark.asyncio
async def test_router_structure_and_status_codes():
    """
    Verifies Feature 3.1 & 3.2:
    1. /api/v1/ prefix routing is mounted correctly.
    2. HTTP status codes conform to REST specifications (200, 201, 204).
    3. Both Tickets and Customers endpoints are accessible.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # --- Root Endpoint ---
        root_res = await client.get("/")
        assert root_res.status_code == 200
        root_data = root_res.json()
        assert root_data["v1_tickets"] == "/api/v1/tickets"
        assert root_data["v1_customers"] == "/api/v1/customers"

        # --- Tickets Router (/api/v1/tickets) ---
        # 1. GET /api/v1/tickets (200 OK)
        list_tickets_res = await client.get("/api/v1/tickets?limit=10&offset=0")
        assert list_tickets_res.status_code == 200
        data = list_tickets_res.json()
        assert data["limit"] == 10
        assert data["offset"] == 0

        # 2. POST /api/v1/tickets (201 Created)
        sample_org_id = str(uuid.uuid4())
        sample_cust_id = str(uuid.uuid4())
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
        assert create_ticket_res.json()["title"] == "Test Ticket"


        # 3. GET /api/v1/tickets/{id} (200 OK)
        sample_id = uuid.uuid4()
        get_ticket_res = await client.get(f"/api/v1/tickets/{sample_id}")
        assert get_ticket_res.status_code == 200
        assert get_ticket_res.json()["id"] == str(sample_id)

        # 4. PATCH /api/v1/tickets/{id} (200 OK)
        patch_ticket_res = await client.patch(
            f"/api/v1/tickets/{sample_id}", json={"status": "in_progress"}
        )
        assert patch_ticket_res.status_code == 200

        # 5. DELETE /api/v1/tickets/{id} (204 No Content)
        delete_ticket_res = await client.delete(f"/api/v1/tickets/{sample_id}")
        assert delete_ticket_res.status_code == 204
        assert delete_ticket_res.content == b""

        # --- Customers Router (/api/v1/customers) ---
        # 1. GET /api/v1/customers (200 OK)
        list_cust_res = await client.get("/api/v1/customers")
        assert list_cust_res.status_code == 200

        # 2. POST /api/v1/customers (201 Created)
        create_cust_res = await client.post(
            "/api/v1/customers",
            json={
                "organization_id": sample_org_id,
                "email": "test@example.com",
                "full_name": "Test User",
            },
        )
        assert create_cust_res.status_code == 201
        assert create_cust_res.json()["email"] == "test@example.com"


        # 3. GET /api/v1/customers/{id} (200 OK)
        get_cust_res = await client.get(f"/api/v1/customers/{sample_id}")
        assert get_cust_res.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema_tags():
    """
    Verifies that OpenAPI documentation contains the routes grouped with their tags.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
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

