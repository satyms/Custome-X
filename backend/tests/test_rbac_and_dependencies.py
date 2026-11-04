import uuid
from datetime import datetime, timezone, timedelta
import jwt
import pytest
from fastapi import FastAPI, Depends, status
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_role
from app.core.error_handlers import register_exception_handlers
from app.core.middleware import RequestIdMiddleware
from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User

TEST_SECRET = "super-secret-key-that-is-at-least-32-bytes-long!"


# Helper to create test token
def create_test_jwt(user_id: uuid.UUID, email: str, expired: bool = False) -> str:
    now = datetime.now(timezone.utc)
    exp = now - timedelta(hours=1) if expired else now + timedelta(hours=1)
    payload = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


# Setup minimal test app with auth routes
@pytest.fixture
def auth_test_app(db_session: AsyncSession):
    app = FastAPI(title="Auth Dependency Test App")
    app.add_middleware(RequestIdMiddleware)
    register_exception_handlers(app)

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    @app.get("/test/protected")
    async def protected_route(current_user: User = Depends(get_current_user)):
        return {"message": f"Hello {current_user.full_name}", "role": current_user.role}

    @app.get("/test/supervisor-only")
    async def supervisor_route(current_user: User = Depends(require_role(["supervisor", "admin"]))):
        return {"authorized": True, "role": current_user.role}

    @app.get("/test/admin-only")
    async def admin_route(current_user: User = Depends(require_role(["admin"]))):
        return {"authorized": True, "admin": current_user.email}

    return app


@pytest.mark.asyncio
async def test_auth_missing_token_returns_401(auth_test_app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=auth_test_app), base_url="http://test") as client:
        response = await client.get("/test/protected")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "HTTP_401"
        assert "credentials were not provided" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_auth_expired_token_returns_401(auth_test_app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=auth_test_app), base_url="http://test") as client:
        expired_token = create_test_jwt(uuid.uuid4(), "test@cxpilot.io", expired=True)

        response = await client.get(
            "/test/protected",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "expired" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_auth_user_not_found_in_db_returns_401(auth_test_app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=auth_test_app), base_url="http://test") as client:
        random_user_id = uuid.uuid4()
        valid_token = create_test_jwt(random_user_id, "ghost@cxpilot.io", expired=False)

        response = await client.get(
            "/test/protected",
            headers={"Authorization": f"Bearer {valid_token}"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "not found" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_rbac_agent_blocked_from_admin_route_returns_403(
    auth_test_app: FastAPI,
    db_session: AsyncSession,
):
    async with AsyncClient(transport=ASGITransport(app=auth_test_app), base_url="http://test") as client:
        # 1. Create org and agent user
        org = Organization(name="RBAC Test Org")
        db_session.add(org)
        await db_session.commit()
        await db_session.refresh(org)

        agent_id = uuid.uuid4()
        agent_user = User(
            id=agent_id,
            organization_id=org.id,
            email=f"agent_{uuid.uuid4().hex[:6]}@cxpilot.io",
            full_name="Agent Smith",
            role="agent",
        )
        db_session.add(agent_user)
        await db_session.commit()

        agent_token = create_test_jwt(agent_id, agent_user.email, expired=False)
        auth_header = {"Authorization": f"Bearer {agent_token}"}

        # Agent CAN access protected route
        res_protected = await client.get("/test/protected", headers=auth_header)
        assert res_protected.status_code == status.HTTP_200_OK
        assert res_protected.json()["role"] == "agent"

        # Agent CANNOT access supervisor-only route (403 Forbidden)
        res_sup = await client.get("/test/supervisor-only", headers=auth_header)
        assert res_sup.status_code == status.HTTP_403_FORBIDDEN
        assert "lacks permission" in res_sup.json()["error"]["message"]

        # Agent CANNOT access admin-only route (403 Forbidden)
        res_admin = await client.get("/test/admin-only", headers=auth_header)
        assert res_admin.status_code == status.HTTP_403_FORBIDDEN
        assert "lacks permission" in res_admin.json()["error"]["message"]

        # Clean up
        await db_session.delete(agent_user)
        await db_session.delete(org)
        await db_session.commit()


@pytest.mark.asyncio
async def test_rbac_admin_allowed_on_admin_route(
    auth_test_app: FastAPI,
    db_session: AsyncSession,
):
    async with AsyncClient(transport=ASGITransport(app=auth_test_app), base_url="http://test") as client:
        org = Organization(name="Admin RBAC Org")
        db_session.add(org)
        await db_session.commit()
        await db_session.refresh(org)

        admin_id = uuid.uuid4()
        admin_user = User(
            id=admin_id,
            organization_id=org.id,
            email=f"admin_{uuid.uuid4().hex[:6]}@cxpilot.io",
            full_name="Super Admin",
            role="admin",
        )
        db_session.add(admin_user)
        await db_session.commit()

        admin_token = create_test_jwt(admin_id, admin_user.email, expired=False)
        auth_header = {"Authorization": f"Bearer {admin_token}"}

        # Admin CAN access supervisor route
        res_sup = await client.get("/test/supervisor-only", headers=auth_header)
        assert res_sup.status_code == status.HTTP_200_OK
        assert res_sup.json()["authorized"] is True

        # Admin CAN access admin route
        res_admin = await client.get("/test/admin-only", headers=auth_header)
        assert res_admin.status_code == status.HTTP_200_OK
        assert res_admin.json()["authorized"] is True

        # Clean up
        await db_session.delete(admin_user)
        await db_session.delete(org)
        await db_session.commit()
