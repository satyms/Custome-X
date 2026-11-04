import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta
import jwt
import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User


def create_token_for_user(user_id: uuid.UUID, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(payload, "super-secret-key-that-is-at-least-32-bytes-long!", algorithm="HS256")


@pytest.mark.asyncio
async def test_auth_register_login_and_me_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
):
    # 1. Setup organization
    org = Organization(name=f"Endpoint Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    fake_supabase_id = str(uuid.uuid4())
    user_email = f"endpoint_{uuid.uuid4().hex[:6]}@cxpilot.io"

    # --- 1. REGISTER (POST /api/v1/auth/register) ---
    mock_signup_resp = MagicMock(spec=httpx.Response)
    mock_signup_resp.status_code = 200
    mock_signup_resp.json.return_value = {
        "id": fake_supabase_id,
        "email": user_email,
        "aud": "authenticated",
    }

    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_signup_resp

    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = mock_client_instance

        register_payload = {
            "email": user_email,
            "password": "SecurePassword123!",
            "full_name": "Endpoint Tester",
            "role": "agent",
            "organization_id": str(org.id),
        }

        reg_res = await client.post("/api/v1/auth/register", json=register_payload)
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert reg_data["email"] == user_email
        assert reg_data["full_name"] == "Endpoint Tester"
        assert reg_data["role"] == "agent"
        assert reg_data["id"] == fake_supabase_id

    # --- 2. LOGIN (POST /api/v1/auth/login) ---
    mock_login_resp = MagicMock(spec=httpx.Response)
    mock_login_resp.status_code = 200
    mock_login_resp.json.return_value = {
        "access_token": "valid.mock.token",
        "refresh_token": "refresh.mock.token",
        "expires_in": 3600,
        "token_type": "bearer",
        "user": {"id": fake_supabase_id, "email": user_email},
    }

    mock_login_client = AsyncMock()
    mock_login_client.post.return_value = mock_login_resp

    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = mock_login_client

        login_payload = {
            "email": user_email,
            "password": "SecurePassword123!",
        }

        login_res = await client.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert login_data["access_token"] == "valid.mock.token"
        assert login_data["refresh_token"] == "refresh.mock.token"
        assert login_data["user"]["email"] == user_email

    # --- 3. LOGIN WITH INVALID PASSWORD (401 INVALID_CREDENTIALS) ---
    mock_fail_resp = MagicMock(spec=httpx.Response)
    mock_fail_resp.status_code = 400
    mock_fail_resp.json.return_value = {"error_description": "Invalid login credentials"}

    mock_fail_client = AsyncMock()
    mock_fail_client.post.return_value = mock_fail_resp

    with patch("app.services.auth_service.httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = mock_fail_client

        bad_login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": user_email, "password": "WrongPassword!"},
        )
        assert bad_login_res.status_code == 401
        assert bad_login_res.json()["error"]["code"] == "INVALID_CREDENTIALS"

    # --- 4. GET /api/v1/auth/me WITH BEARER TOKEN ---
    auth_jwt = create_token_for_user(uuid.UUID(fake_supabase_id), user_email)
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {auth_jwt}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["id"] == fake_supabase_id
    assert me_data["email"] == user_email
    assert me_data["role"] == "agent"

    # --- 5. GET /api/v1/auth/me WITHOUT TOKEN (401) ---
    no_auth_res = await client.get("/api/v1/auth/me")
    assert no_auth_res.status_code == 401
    assert "credentials were not provided" in no_auth_res.json()["error"]["message"].lower()

    # --- Clean up DB ---
    user_in_db = await db_session.get(User, uuid.UUID(fake_supabase_id))
    if user_in_db:
        await db_session.delete(user_in_db)
    await db_session.delete(org)
    await db_session.commit()
