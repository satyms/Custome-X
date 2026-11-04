import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from main import app


@pytest.mark.asyncio
async def test_ticket_validation_and_response_serialization():
    """
    Verifies Feature 3.3 & 3.4 for Tickets:
    - 422 returned on schema violations (short title, invalid priority enum, missing customer).
    - 201 returned on valid payload with response serialized according to TicketResponse.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        org_id = str(uuid.uuid4())
        cust_id = str(uuid.uuid4())

        # 1. TEST 422: Title too short (<3 chars)
        res_short_title = await client.post(
            "/api/v1/tickets",
            json={
                "organization_id": org_id,
                "customer_id": cust_id,
                "title": "Hi",  # min_length is 3
                "priority": "normal",
                "initial_message": "Need help with return",
            },
        )
        assert res_short_title.status_code == 422
        errors = res_short_title.json()["detail"]
        assert any(e["loc"] == ["body", "title"] for e in errors)

        # 2. TEST 422: Invalid Priority Enum
        res_bad_priority = await client.post(
            "/api/v1/tickets",
            json={
                "organization_id": org_id,
                "customer_id": cust_id,
                "title": "Valid Ticket Title",
                "priority": "super_crazy_urgent",  # Invalid enum value
                "initial_message": "Need help",
            },
        )
        assert res_bad_priority.status_code == 422
        assert any(e["loc"] == ["body", "priority"] for e in res_bad_priority.json()["detail"])

        # 3. TEST 422: Missing required initial_message
        res_missing_msg = await client.post(
            "/api/v1/tickets",
            json={
                "organization_id": org_id,
                "customer_id": cust_id,
                "title": "Valid Ticket Title",
                "priority": "high",
            },
        )
        assert res_missing_msg.status_code == 422

        # 4. TEST 201: Valid Payload with Response Serialization
        valid_res = await client.post(
            "/api/v1/tickets",
            json={
                "organization_id": org_id,
                "customer_id": cust_id,
                "title": "Broken screen on arrival",
                "priority": "high",
                "initial_message": "The item was cracked when I opened the box.",
            },
        )
        assert valid_res.status_code == 201
        data = valid_res.json()
        assert data["title"] == "Broken screen on arrival"
        assert data["priority"] == "high"
        assert data["status"] == "open"
        assert "id" in data
        assert "created_at" in data


@pytest.mark.asyncio
async def test_customer_validation_and_pagination_bounds():
    """
    Verifies Feature 3.3 & 3.4 for Customers:
    - 422 returned on invalid email address.
    - 422 returned on negative pagination parameters (limit/offset bounds).
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        org_id = str(uuid.uuid4())

        # 1. TEST 422: Malformed Email Address
        bad_email_res = await client.post(
            "/api/v1/customers",
            json={
                "organization_id": org_id,
                "email": "not-an-email-address",
                "full_name": "Test Customer",
            },
        )
        assert bad_email_res.status_code == 422
        assert any(e["loc"] == ["body", "email"] for e in bad_email_res.json()["detail"])

        # 2. TEST 201: Valid Customer Creation
        valid_email_res = await client.post(
            "/api/v1/customers",
            json={
                "organization_id": org_id,
                "email": "valid.customer@example.com",
                "full_name": "Alice Cooper",
                "phone": "+1-555-0199",
            },
        )
        assert valid_email_res.status_code == 201
        cust_data = valid_email_res.json()
        assert cust_data["email"] == "valid.customer@example.com"
        assert cust_data["full_name"] == "Alice Cooper"

        # 3. TEST 422: Invalid Pagination Limits (limit > 100 or limit < 1)
        bad_limit_res = await client.get("/api/v1/tickets?limit=500")
        assert bad_limit_res.status_code == 422

        negative_offset_res = await client.get("/api/v1/tickets?offset=-1")
        assert negative_offset_res.status_code == 422
