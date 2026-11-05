import uuid
import pytest
from httpx import AsyncClient, Response
from unittest.mock import patch, AsyncMock
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.agent_audit import WorkflowEvent
from app.services.webhook_dispatcher import WebhookDispatcher


def test_hmac_sha256_signature_generation():
    payload_bytes = b'{"event":"ticket.created","ticket_id":"123"}'
    secret = "test_secret_key"
    sig = WebhookDispatcher.compute_hmac_signature(payload_bytes, secret)
    assert sig.startswith("sha256=")
    assert len(sig) == 7 + 64


@pytest.mark.asyncio
async def test_webhook_dispatcher_success_flow(db_session: AsyncSession):
    org_id = uuid.uuid4()
    org = Organization(id=org_id, name=f"WF Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    test_payload = {"ticket_number": "TCK-100", "subject": "Return inquiry"}
    test_idemp = f"idemp_{uuid.uuid4().hex}"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(200, json={"status": "acknowledged"})

        event = await WebhookDispatcher.dispatch_event(
            session=db_session,
            organization_id=org_id,
            event_type="ticket.created",
            payload=test_payload,
            idempotency_key=test_idemp,
            target_url="http://mock-n8n:5678/webhook/test",
        )

        assert event.status == "success"
        assert event.retry_count == 0
        assert event.idempotency_key == test_idemp
        assert mock_post.called

        # Verify X-Hub-Signature-256 and custom headers sent
        call_kwargs = mock_post.call_args.kwargs
        headers = call_kwargs["headers"]
        assert "X-Hub-Signature-256" in headers
        assert headers["X-Event-Type"] == "ticket.created"
        assert headers["X-Idempotency-Key"] == test_idemp


@pytest.mark.asyncio
async def test_webhook_idempotency_deduplication(db_session: AsyncSession):
    org_id = uuid.uuid4()
    org = Organization(id=org_id, name=f"Idemp Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    idemp_key = f"idemp_repeat_{uuid.uuid4().hex}"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(200, json={"status": "ok"})

        evt1 = await WebhookDispatcher.dispatch_event(
            session=db_session,
            organization_id=org_id,
            event_type="ticket.created",
            payload={"count": 1},
            idempotency_key=idemp_key,
        )

        # Second call with SAME idempotency key must not dispatch again
        evt2 = await WebhookDispatcher.dispatch_event(
            session=db_session,
            organization_id=org_id,
            event_type="ticket.created",
            payload={"count": 2},
            idempotency_key=idemp_key,
        )

        assert evt1.id == evt2.id
        assert mock_post.call_count == 1


@pytest.mark.asyncio
async def test_webhook_failure_enters_dead_letter_queue(db_session: AsyncSession):
    org_id = uuid.uuid4()
    org = Organization(id=org_id, name=f"DLQ Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(503, text="Service Unavailable")

        event = await WebhookDispatcher.dispatch_event(
            session=db_session,
            organization_id=org_id,
            event_type="ticket.escalated",
            payload={"reason": "Urgent SLA breached"},
        )

        assert event.status in ("retrying", "failed")
        assert event.retry_count == 1
        assert "503" in (event.last_error or "")


@pytest.mark.asyncio
async def test_automations_api_endpoints(client: AsyncClient, db_session: AsyncSession):
    # 1. Test dispatch synthetic event endpoint
    res_dispatch = await client.post("/api/v1/automations/dispatch-test?event_type=ticket.created")
    assert res_dispatch.status_code == 200
    data_disp = res_dispatch.json()
    assert data_disp["event_type"] == "ticket.created"
    event_id = data_disp["id"]

    # 2. Test list events endpoint
    res_list = await client.get("/api/v1/automations/events")
    assert res_list.status_code == 200
    events = res_list.json()
    assert any(e["id"] == event_id for e in events)

    # 3. Test stats endpoint
    res_stats = await client.get("/api/v1/automations/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "total_executions" in stats
    assert "success_rate_percent" in stats
    assert stats["active_workflows"] == 4

    # 4. Test retry endpoint
    with patch.object(WebhookDispatcher, "_send_http", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, None)
        res_retry = await client.post(f"/api/v1/automations/events/{event_id}/retry")
        assert res_retry.status_code == 200
        retry_data = res_retry.json()
        assert retry_data["event_id"] == event_id
        assert retry_data["status"] == "success"
