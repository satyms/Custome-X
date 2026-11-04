import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.organization import Organization
from app.models.user import User
from app.core.auth import get_current_user
from app.core.rate_limiter import ai_rate_limiter
from main import app


@pytest.mark.asyncio
async def test_agent_endpoints(client: AsyncClient):
    """Verifies autonomous agent reasoning and reply suggestions."""
    ai_rate_limiter.reset()

    # 1. Order tracking intent (autonomous completion)
    res_track = await client.post(
        "/api/v1/agent/run-agent",
        json={"ticket_id": "t-101", "user_instruction": "Where is my parcel tracking?"},
    )
    assert res_track.status_code == 200
    data_track = res_track.json()
    assert data_track["status"] == "completed"
    assert data_track["requires_hitl"] is False
    assert "track_package" in data_track["tools_called"]

    # 2. Refund intent (triggers HITL pause > $50)
    res_refund = await client.post(
        "/api/v1/agent/run-agent",
        json={"ticket_id": "t-102", "user_instruction": "Refund my order of $120.00 right now"},
    )
    assert res_refund.status_code == 200
    data_refund = res_refund.json()
    assert data_refund["status"] == "paused_hitl"
    assert data_refund["requires_hitl"] is True
    assert "exceeds" in data_refund["hitl_reason"]

    # 3. Reply suggestion
    res_sugg = await client.post(
        "/api/v1/agent/reply-suggestion",
        json={"ticket_id": "t-101", "last_n_messages": 3},
    )
    assert res_sugg.status_code == 200
    data_sugg = res_sugg.json()
    assert data_sugg["confidence_score"] >= 0.90
    assert len(data_sugg["sources_cited"]) >= 1


@pytest.mark.asyncio
async def test_approvals_endpoints(client: AsyncClient, db_session: AsyncSession):
    """Verifies HITL approvals queue, supervisor authorization, and rejection."""
    # Setup test users: supervisor vs agent
    org = Organization(name=f"Approvals Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    supervisor = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"supervisor_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Chief Supervisor",
        role="supervisor",
    )
    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=f"agent_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Junior Agent",
        role="agent",
    )
    db_session.add_all([supervisor, agent])
    await db_session.commit()

    # 1. List pending approvals
    res_pending = await client.get("/api/v1/approvals/pending")
    assert res_pending.status_code == 200
    pending_list = res_pending.json()
    assert len(pending_list) >= 1
    target_id = pending_list[0]["id"]

    # 2. Agent lacks permission for high-risk approval -> 403 Forbidden
    app.dependency_overrides[get_current_user] = lambda: agent
    res_unauth = await client.post(f"/api/v1/approvals/{target_id}/approve", json={"note": "Looks fine"})
    assert res_unauth.status_code == 403

    # 3. Supervisor authorizes action -> 200 OK
    app.dependency_overrides[get_current_user] = lambda: supervisor
    res_auth = await client.post(f"/api/v1/approvals/{target_id}/approve", json={"note": "Approved per SLA"})
    assert res_auth.status_code == 200
    assert res_auth.json()["status"] == "approved"
    assert res_auth.json()["reviewed_by"] == supervisor.full_name

    # 4. Reject an action
    if len(pending_list) > 1:
        second_id = pending_list[1]["id"]
        res_reject = await client.post(
            f"/api/v1/approvals/{second_id}/reject",
            json={"rejection_reason": "Suspected dispute fraud"},
        )
        assert res_reject.status_code == 200
        assert res_reject.json()["status"] == "rejected"
        assert res_reject.json()["rejection_reason"] == "Suspected dispute fraud"

    app.dependency_overrides.clear()
