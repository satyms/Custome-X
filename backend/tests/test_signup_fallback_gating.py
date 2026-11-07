"""
Tests that the direct-database fallback and .internal domain bypass for signup/login
are strictly gated by ENVIRONMENT=development.
In non-development environments (e.g. production), fallback is disabled and raises AuthenticationError.
"""
import uuid
import pytest
from unittest.mock import patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, InvalidCredentialsError
from app.models.organization import Organization
from app.schemas.auth import UserRegisterRequest, UserLoginRequest
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_signup_fallback_blocked_in_production(db_session: AsyncSession):
    """
    Verifies that when ENVIRONMENT != 'development':
    1. .internal domain does NOT bypass Supabase.
    2. Direct database provisioning fallback is disabled and raises AuthenticationError.
    """
    org = Organization(name=f"Prod Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    req = UserRegisterRequest(
        email=f"user_{uuid.uuid4().hex[:6]}@bypass.internal",
        password="TestPassword123!",
        full_name="Prod Tester",
        role="agent",
        organization_id=org.id,
    )

    with patch.object(settings, "ENVIRONMENT", "production"):
        # In production, direct database fallback is blocked if Supabase fails/unreachable
        with pytest.raises(AuthenticationError) as exc_info:
            await AuthService.register_user(session=db_session, payload=req)
        assert "disabled outside development environment" in str(exc_info.value) or "Supabase" in str(exc_info.value)

    await db_session.delete(org)
    await db_session.commit()


@pytest.mark.asyncio
async def test_login_fallback_blocked_in_production(db_session: AsyncSession):
    """
    Verifies that in production, direct database authentication fallback is disabled
    when Supabase Auth rejected/failed.
    """
    login_req = UserLoginRequest(
        email="unknown_user@bypass.internal",
        password="TestPassword123!",
    )

    with patch.object(settings, "ENVIRONMENT", "production"):
        with pytest.raises(InvalidCredentialsError):
            await AuthService.login_user(session=db_session, payload=login_req)


@pytest.mark.asyncio
async def test_signup_fallback_allowed_in_development(db_session: AsyncSession):
    """
    Verifies that in development, .internal domain bypasses Supabase HTTP calls
    and provisions user via direct database fallback.
    """
    org = Organization(name=f"Dev Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)

    email = f"dev_user_{uuid.uuid4().hex[:6]}@test.internal"
    req = UserRegisterRequest(
        email=email,
        password="TestPassword123!",
        full_name="Dev Tester",
        role="agent",
        organization_id=org.id,
    )

    with patch.object(settings, "ENVIRONMENT", "development"):
        resp = await AuthService.register_user(session=db_session, payload=req)
        assert resp.email == email
        assert resp.organization_id == org.id

    # Clean up
    await db_session.delete(org)
    await db_session.commit()
