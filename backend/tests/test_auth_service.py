import uuid
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    OrganizationNotFoundError,
    DuplicateResourceError,
    InvalidCredentialsError,
    UserNotFoundError,
    AuthenticationError,
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, RefreshTokenRequest
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_register_user_org_not_found(db_session: AsyncSession):
    non_existent_org_id = uuid.uuid4()
    payload = UserRegisterRequest(
        email="test_org_not_found@example.com",
        password="ValidPassword123!",
        full_name="Test User",
        role="agent",
        organization_id=non_existent_org_id,
    )

    with pytest.raises(OrganizationNotFoundError):
        await AuthService.register_user(db_session, payload)


@pytest.mark.asyncio
async def test_register_user_success(db_session: AsyncSession):
    # 1. Create org
    org = Organization(name="Auth Test Org")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    fake_supabase_id = str(uuid.uuid4())
    payload = UserRegisterRequest(
        email=f"alice_{uuid.uuid4().hex[:6]}@cxpilot.io",
        password="ValidPassword123!",
        full_name="Alice Smith",
        role="agent",
        organization_id=org.id,
    )

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": fake_supabase_id,
        "email": payload.email,
        "aud": "authenticated",
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        user = await AuthService.register_user(db_session, payload)

        assert user.id == uuid.UUID(fake_supabase_id)
        assert user.email == payload.email
        assert user.full_name == "Alice Smith"
        assert user.role == "agent"
        assert user.organization_id == org.id

        # Clean up
        await db_session.delete(user)
        await db_session.delete(org)
        await db_session.commit()


@pytest.mark.asyncio
async def test_register_user_duplicate_email(db_session: AsyncSession):
    org = Organization(name="Dup Test Org")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    existing_email = f"dup_{uuid.uuid4().hex[:6]}@cxpilot.io"
    user = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=existing_email,
        full_name="Existing User",
        role="agent",
    )
    db_session.add(user)
    await db_session.commit()

    payload = UserRegisterRequest(
        email=existing_email,
        password="ValidPassword123!",
        full_name="Another User",
        role="agent",
        organization_id=org.id,
    )

    with pytest.raises(DuplicateResourceError):
        await AuthService.register_user(db_session, payload)

    # Clean up
    await db_session.delete(user)
    await db_session.delete(org)
    await db_session.commit()


@pytest.mark.asyncio
async def test_login_user_success(db_session: AsyncSession):
    org = Organization(name="Login Test Org")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    user_id = uuid.uuid4()
    email = f"login_{uuid.uuid4().hex[:6]}@cxpilot.io"
    user = User(
        id=user_id,
        organization_id=org.id,
        email=email,
        full_name="Bob Jones",
        role="supervisor",
    )
    db_session.add(user)
    await db_session.commit()

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "access_token": "mock.jwt.token",
        "refresh_token": "mock.refresh.token",
        "expires_in": 3600,
        "token_type": "bearer",
        "user": {"id": str(user_id), "email": email},
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        payload = UserLoginRequest(email=email, password="MyPassword123!")
        token_resp = await AuthService.login_user(db_session, payload)

        assert token_resp.access_token == "mock.jwt.token"
        assert token_resp.refresh_token == "mock.refresh.token"
        assert token_resp.user.role == "supervisor"
        assert token_resp.user.email == email

    # Clean up
    await db_session.delete(user)
    await db_session.delete(org)
    await db_session.commit()


@pytest.mark.asyncio
async def test_login_user_invalid_credentials(db_session: AsyncSession):
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 400
    mock_resp.json.return_value = {"error_description": "Invalid login credentials"}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        payload = UserLoginRequest(email="nonexistent@example.com", password="WrongPassword!")
        with pytest.raises(InvalidCredentialsError):
            await AuthService.login_user(db_session, payload)
