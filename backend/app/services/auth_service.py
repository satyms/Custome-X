import uuid
import logging
from typing import Optional, Dict, Any
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    OrganizationNotFoundError,
    DuplicateResourceError,
    InvalidCredentialsError,
    UserNotFoundError,
    AuthenticationError,
)
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
)

logger = logging.getLogger("customex.auth")


def _get_supabase_headers(bearer_token: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"
    return headers


class AuthService:
    @staticmethod
    async def register_user(session: AsyncSession, payload: UserRegisterRequest) -> User:
        """
        Registers an internal support user (agent, supervisor, admin) with Supabase Auth
        and creates their corresponding profile record in public.users bound to an organization.
        """
        # 1. Verify organization exists
        org = await session.get(Organization, payload.organization_id)
        if not org:
            raise OrganizationNotFoundError(payload.organization_id)

        # 2. Check email uniqueness in public.users
        existing_res = await session.execute(select(User).where(User.email == payload.email))
        if existing_res.scalar_one_or_none():
            raise DuplicateResourceError(f"User with email '{payload.email}' already exists.")

        # 3. Call Supabase Auth signup
        supabase_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/signup"
        signup_payload = {
            "email": payload.email,
            "password": payload.password,
            "data": {
                "full_name": payload.full_name,
                "role": payload.role,
                "organization_id": str(payload.organization_id),
            },
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                supabase_url,
                json=signup_payload,
                headers=_get_supabase_headers(),
                timeout=15.0,
            )

        if resp.status_code >= 400:
            try:
                err_data = resp.json()
                msg = err_data.get("msg") or err_data.get("message") or err_data.get("error_description") or "Signup failed"
            except Exception:
                msg = resp.text or "Signup failed"

            if "already registered" in msg.lower() or "unique" in msg.lower():
                raise DuplicateResourceError(f"User with email '{payload.email}' already exists.")
            raise AuthenticationError(f"Supabase Auth signup failed: {msg}")

        resp_data = resp.json()
        supabase_id = resp_data.get("id") or (resp_data.get("user") or {}).get("id")
        if not supabase_id:
            raise AuthenticationError("Could not retrieve user ID from Supabase Auth response.")

        user_uuid = uuid.UUID(supabase_id)

        # 4. Save profile to public.users
        user = User(
            id=user_uuid,
            organization_id=payload.organization_id,
            email=payload.email,
            full_name=payload.full_name,
            role=payload.role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        logger.info(f"Registered user {user.id} ({user.email}) in org {user.organization_id}")
        return user

    @staticmethod
    async def login_user(session: AsyncSession, payload: UserLoginRequest) -> TokenResponse:
        """
        Authenticates user with Supabase Auth via password grant and returns signed JWT tokens
        with user profile information.
        """
        supabase_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
        login_payload = {
            "email": payload.email,
            "password": payload.password,
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                supabase_url,
                json=login_payload,
                headers=_get_supabase_headers(),
                timeout=15.0,
            )

        if resp.status_code >= 400:
            logger.warning(f"Failed login attempt for {payload.email}: HTTP {resp.status_code}")
            raise InvalidCredentialsError("Invalid email or password.")

        data = resp.json()
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 3600)
        user_info = data.get("user") or {}
        user_id_str = user_info.get("id")

        if not access_token:
            raise AuthenticationError("Supabase Auth did not return an access token.")

        # Query public.users
        user = None
        if user_id_str:
            user = await session.get(User, uuid.UUID(user_id_str))

        if not user:
            res = await session.execute(select(User).where(User.email == payload.email))
            user = res.scalar_one_or_none()

        if not user:
            raise UserNotFoundError(uuid.UUID(user_id_str) if user_id_str else uuid.uuid4())

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def refresh_user_token(session: AsyncSession, refresh_token: str) -> TokenResponse:
        """
        Refreshes an expired or expiring access token using Supabase refresh token.
        """
        supabase_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=refresh_token"
        refresh_payload = {"refresh_token": refresh_token}

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                supabase_url,
                json=refresh_payload,
                headers=_get_supabase_headers(),
                timeout=15.0,
            )

        if resp.status_code >= 400:
            raise AuthenticationError("Invalid or expired refresh token.")

        data = resp.json()
        access_token = data.get("access_token")
        new_refresh_token = data.get("refresh_token")
        expires_in = data.get("expires_in", 3600)
        user_info = data.get("user") or {}
        user_id_str = user_info.get("id")

        user = None
        if user_id_str:
            user = await session.get(User, uuid.UUID(user_id_str))

        if not user:
            raise UserNotFoundError(uuid.UUID(user_id_str) if user_id_str else uuid.uuid4())

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        return await session.get(User, user_id)
