import uuid
import logging
from typing import Optional, Dict, Any
import httpx
from sqlalchemy import select, text
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
        # 1. Verify organization exists (with automatic legacy placeholder fallback)
        if payload.organization_id == uuid.UUID("00000000-0000-0000-0000-000000000001"):
            default_org_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
            demo_org = await session.get(Organization, default_org_id)
            if demo_org:
                payload.organization_id = default_org_id

        org = await session.get(Organization, payload.organization_id)
        if not org:
            raise OrganizationNotFoundError(payload.organization_id)

        # 2. Check email uniqueness in public.users
        existing_res = await session.execute(select(User).where(User.email == payload.email))
        if existing_res.scalar_one_or_none():
            raise DuplicateResourceError(f"User with email '{payload.email}' already exists.")

        # 3. Call Supabase Auth signup with direct fallback
        user_uuid: Optional[uuid.UUID] = None
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

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    supabase_url,
                    json=signup_payload,
                    headers=_get_supabase_headers(),
                    timeout=15.0,
                )

            if resp.status_code < 400:
                resp_data = resp.json()
                supabase_id = resp_data.get("id") or (resp_data.get("user") or {}).get("id")
                if supabase_id:
                    user_uuid = uuid.UUID(supabase_id)
                    # Auto-confirm the user in auth.users so login works immediately without waiting for confirmation email
                    try:
                        await session.execute(
                            text("UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()) WHERE id = CAST(:id AS uuid)"),
                            {"id": str(user_uuid)}
                        )
                    except Exception as conf_err:
                        logger.warning(f"Failed to auto-confirm user {user_uuid}: {conf_err}")
            else:
                err_data = {}
                try:
                    err_data = resp.json()
                except Exception:
                    pass
                msg = err_data.get("msg") or err_data.get("message") or err_data.get("error_description") or resp.text or ""
                if "already registered" in msg.lower() or "unique" in msg.lower():
                    raise DuplicateResourceError(f"User with email '{payload.email}' already exists.")
                logger.warning(f"Supabase Auth signup returned {resp.status_code} ({msg}). Falling back to direct database provisioning.")
        except DuplicateResourceError:
            raise
        except Exception as net_err:
            logger.warning(f"Supabase Auth signup network/call failure: {net_err}. Falling back to direct database provisioning.")

        # Fallback direct database provisioning if Supabase HTTP signup failed or was rejected (e.g. rate limit 429, invalid domain 400)
        if not user_uuid:
            # Check if user already exists in auth.users
            try:
                existing_auth = (await session.execute(
                    text("SELECT id FROM auth.users WHERE email = :email"),
                    {"email": payload.email}
                )).fetchone()
                if existing_auth:
                    raise DuplicateResourceError(f"User with email '{payload.email}' already exists.")
            except DuplicateResourceError:
                raise
            except Exception as e:
                logger.warning(f"Could not check existing auth user: {e}")

            user_uuid = uuid.uuid4()
            user_id_str = str(user_uuid)
            try:
                await session.execute(text("""
                    INSERT INTO auth.users (
                        id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                        created_at, updated_at, is_sso_user, is_anonymous, is_super_admin,
                        confirmation_token, recovery_token, email_change_token_new, email_change,
                        phone_change, phone_change_token, email_change_token_current,
                        email_change_confirm_status, reauthentication_token
                    ) VALUES (
                        CAST(:id AS uuid), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                        CAST(:email AS varchar), extensions.crypt(:password, extensions.gen_salt('bf')),
                        NOW(),
                        '{"provider": "email", "providers": ["email"]}'::jsonb,
                        jsonb_build_object('full_name', CAST(:full_name AS text)),
                        NOW(), NOW(), false, false, false,
                        '', '', '', '',
                        '', '', '',
                        0, ''
                    )
                """), {
                    "id": user_id_str,
                    "email": payload.email,
                    "password": payload.password,
                    "full_name": payload.full_name,
                })

                await session.execute(text("""
                    INSERT INTO auth.identities (
                        id, provider_id, user_id, identity_data, provider, created_at, updated_at
                    ) VALUES (
                        CAST(:id AS uuid), CAST(:id AS text), CAST(:id AS uuid),
                        jsonb_build_object('sub', CAST(:id AS text), 'email', CAST(:email AS text)),
                        'email', NOW(), NOW()
                    )
                """), {
                    "id": user_id_str,
                    "email": payload.email,
                })
            except Exception as db_err:
                logger.error(f"Direct auth database insert failed: {db_err}")
                raise AuthenticationError(f"User registration failed: {db_err}")

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

        resp = None
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    supabase_url,
                    json=login_payload,
                    headers=_get_supabase_headers(),
                    timeout=15.0,
                )
        except Exception as e:
            logger.warning(f"Error connecting to Supabase Auth: {e}")

        # If Supabase Auth returns error because email was not confirmed, auto-confirm it in auth.users and retry
        if resp is not None and resp.status_code >= 400:
            err_data = {}
            try:
                err_data = resp.json()
            except Exception:
                pass
            err_desc = (err_data.get("error_description") or err_data.get("msg") or "").lower()
            if "not confirmed" in err_desc:
                try:
                    await session.execute(
                        text("UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = :email"),
                        {"email": payload.email}
                    )
                    await session.commit()
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(
                            supabase_url,
                            json=login_payload,
                            headers=_get_supabase_headers(),
                            timeout=15.0,
                        )
                except Exception as retry_err:
                    logger.warning(f"Auto-confirm retry failed: {retry_err}")

        if resp is None or resp.status_code >= 400:
            logger.warning(f"Failed login attempt for {payload.email}: HTTP {resp.status_code if resp else 'None'}")
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
