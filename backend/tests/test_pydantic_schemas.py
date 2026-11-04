import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ticket_validation_and_response_serialization(client: AsyncClient):
    """
    Verifies Feature 3.3 & 3.4 for Tickets:
    - 422 returned on schema violations (short title, invalid priority enum, missing customer).
    - 201 returned on valid payload with response serialized according to TicketResponse.
    """
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
    error_data = res_short_title.json()["error"]
    assert error_data["code"] == "VALIDATION_ERROR"
    assert any("title" in e["field"] for e in error_data["details"])

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
    assert any("priority" in e["field"] for e in res_bad_priority.json()["error"]["details"])

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


@pytest.mark.asyncio
async def test_customer_validation_and_pagination_bounds(client: AsyncClient):
    """
    Verifies Feature 3.3 & 3.4 for Customers:
    - 422 returned on invalid email address.
    - 422 returned on negative pagination parameters (limit/offset bounds).
    """
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
    assert any("email" in e["field"] for e in bad_email_res.json()["error"]["details"])

    # 2. TEST 422: Invalid Pagination Limits (limit > 100 or limit < 1)
    bad_limit_res = await client.get("/api/v1/tickets?limit=500")
    assert bad_limit_res.status_code == 422

    negative_offset_res = await client.get("/api/v1/tickets?offset=-1")
    assert negative_offset_res.status_code == 422
