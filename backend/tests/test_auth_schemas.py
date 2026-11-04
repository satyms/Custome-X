import uuid
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    RefreshTokenRequest,
)


def test_user_register_request_valid():
    org_id = uuid.uuid4()
    req = UserRegisterRequest(
        email="support@cxpilot.io",
        password="SecurePassword123!",
        full_name="Alice Support",
        role="agent",
        organization_id=org_id,
    )
    assert req.email == "support@cxpilot.io"
    assert req.full_name == "Alice Support"
    assert req.role == "agent"
    assert req.organization_id == org_id


def test_user_register_request_invalid_password_too_short():
    with pytest.raises(ValidationError) as exc_info:
        UserRegisterRequest(
            email="support@cxpilot.io",
            password="short",
            full_name="Alice Support",
            role="agent",
            organization_id=uuid.uuid4(),
        )
    assert "at least 8 characters" in str(exc_info.value).lower()


def test_user_register_request_invalid_role():
    with pytest.raises(ValidationError) as exc_info:
        UserRegisterRequest(
            email="support@cxpilot.io",
            password="SecurePassword123!",
            full_name="Alice Support",
            role="super_hacker",
            organization_id=uuid.uuid4(),
        )
    assert "role" in str(exc_info.value).lower()


def test_user_login_request_validation():
    req = UserLoginRequest(
        email="user@example.com",
        password="MySecretPassword123",
    )
    assert req.email == "user@example.com"
    assert req.password == "MySecretPassword123"

    with pytest.raises(ValidationError):
        UserLoginRequest(email="not-an-email", password="123")


def test_token_response_serialization():
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    user_resp = UserResponse(
        id=user_id,
        email="agent@cxpilot.io",
        full_name="Agent Smith",
        role="agent",
        organization_id=org_id,
        created_at=now,
    )

    token_resp = TokenResponse(
        access_token="eyJhbGciOi...",
        refresh_token="ref_12345",
        token_type="bearer",
        expires_in=3600,
        user=user_resp,
    )

    data = token_resp.model_dump()
    assert data["token_type"] == "bearer"
    assert data["access_token"] == "eyJhbGciOi..."
    assert data["user"]["role"] == "agent"
    assert data["user"]["id"] == user_id
