import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.customer import Customer
from app.models.user import User
from app.core.auth import get_current_user
from main import app


@pytest.fixture(autouse=True)
def override_auth():
    dummy_user = User(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        email="err_agent@example.com",
        full_name="Error Test Agent",
        role="agent",
    )
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    yield dummy_user
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_uniform_error_envelope_and_request_id(client: AsyncClient):
    """
    Verifies Feature 3.8:
    - Uniform error envelope: {"error": {"code": str, "message": str, "request_id": str}}
    - X-Request-ID is propagated in headers and echoed in error payload.
    """
    custom_request_id = "test-corr-id-12345"
    ghost_ticket_id = uuid.uuid4()

    response = await client.get(
        f"/api/v1/tickets/{ghost_ticket_id}",
        headers={"X-Request-ID": custom_request_id},
    )

    assert response.status_code == 404
    assert response.headers.get("X-Request-ID") == custom_request_id

    data = response.json()
    assert "error" in data
    error = data["error"]
    assert error["code"] == "TICKET_NOT_FOUND"
    assert f"'{ghost_ticket_id}' was not found" in error["message"]
    assert error["request_id"] == custom_request_id


@pytest.mark.asyncio
async def test_validation_error_uniform_envelope(client: AsyncClient):
    """
    Verifies Feature 3.8:
    Pydantic 422 errors are intercepted and wrapped into the uniform error envelope.
    """
    response = await client.post(
        "/api/v1/tickets",
        json={"title": "No"},  # Too short and missing required fields
    )

    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    error = data["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert isinstance(error["details"], list)
    assert "request_id" in error


@pytest.mark.asyncio
async def test_invalid_status_transition_error(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Verifies Feature 3.8:
    Illegal state transition (closed -> in_progress) raises domain exception
    and returns HTTP 400 with INVALID_STATUS_TRANSITION code.
    """
    org = Organization(name=f"Transition Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    # Align current_user tenant with this test organization
    app.dependency_overrides[get_current_user] = lambda: User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email="trans_agent@example.com",
        full_name="Transition Agent",
        role="agent",
    )

    cust = Customer(
        organization_id=org.id,
        email=f"trans_cust_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Status Tester",
    )
    db_session.add(cust)
    await db_session.commit()

    # 1. Create open ticket
    create_res = await client.post(
        "/api/v1/tickets",
        json={
            "organization_id": str(org.id),
            "customer_id": str(cust.id),
            "title": "State Transition Test Ticket",
            "priority": "normal",
            "initial_message": "Testing states",
        },
    )
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    # 2. Close ticket legally (open -> closed)
    close_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        json={"status": "closed"},
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "closed"

    # 3. Illegal transition: attempt to move closed -> in_progress directly
    illegal_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        json={"status": "in_progress"},
    )
    assert illegal_res.status_code == 400
    error_data = illegal_res.json()["error"]
    assert error_data["code"] == "INVALID_STATUS_TRANSITION"
    assert "Cannot transition ticket from 'closed' to 'in_progress'" in error_data["message"]


@pytest.mark.asyncio
async def test_pagination_headers_metadata(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Verifies Feature 3.9:
    Pagination endpoints emit X-Total-Count, X-Limit, X-Offset, X-Has-More headers
    alongside the paginated response envelope.
    """
    org = Organization(name=f"Pagination Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email="pag_agent@example.com",
        full_name="Pagination Agent",
        role="agent",
    )

    response = await client.get(
        f"/api/v1/tickets?organization_id={org.id}&limit=5&offset=0"
    )
    assert response.status_code == 200

    # Assert response headers
    headers = response.headers
    assert "X-Total-Count" in headers
    assert headers["X-Limit"] == "5"
    assert headers["X-Offset"] == "0"
    assert headers["X-Has-More"] in ["true", "false"]

    # Assert body envelope
    body = response.json()
    assert body["limit"] == 5
    assert body["offset"] == 0
    assert isinstance(body["has_more"], bool)
