import hmac
import hashlib
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import httpx
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.agent_audit import WorkflowEvent

logger = logging.getLogger("customex.webhook_dispatcher")


class WebhookDispatcher:
    """
    Automated Webhook Dispatcher for Layer 5 (n8n Workflows).
    Computes HMAC SHA-256 signatures, manages delivery retries,
    and logs every attempt to the workflow_events table (Dead-Letter Queue).
    """

    @classmethod
    def compute_hmac_signature(cls, payload_bytes: bytes, secret: str) -> str:
        """Computes RFC 2104 compliant HMAC-SHA256 signature."""
        sig = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        return f"sha256={sig}"

    @classmethod
    async def dispatch_event(
        cls,
        session: AsyncSession,
        organization_id: uuid.UUID,
        event_type: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        target_url: Optional[str] = None,
    ) -> WorkflowEvent:
        """
        Dispatches an event to the configured n8n webhook URL.
        Logs to workflow_events and tracks DLQ status on delivery failure.
        """
        if not idempotency_key:
            idempotency_key = f"evt_{event_type}_{uuid.uuid4().hex}"

        # 1. Check for existing idempotency key to prevent duplicated delivery
        existing_stmt = select(WorkflowEvent).where(WorkflowEvent.idempotency_key == idempotency_key)
        existing = (await session.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            logger.info(f"Idempotent webhook skipped for key {idempotency_key}")
            return existing

        # 2. Persist event initially as queued
        event = WorkflowEvent(
            organization_id=organization_id,
            event_type=event_type,
            payload=payload,
            status="queued",
            retry_count=0,
            max_retries=settings.MAX_WEBHOOK_RETRIES,
            idempotency_key=idempotency_key,
        )
        session.add(event)
        await session.flush()

        # 3. Attempt delivery
        url = target_url or settings.WEBHOOK_OUTBOUND_URL
        success, error_msg = await cls._send_http(event_type=event_type, payload=payload, idempotency_key=idempotency_key, url=url)

        if success:
            event.status = "success"
            event.last_error = None
        else:
            event.retry_count += 1
            event.status = "retrying" if event.retry_count < event.max_retries else "failed"
            event.last_error = error_msg

        event.updated_at = datetime.now(timezone.utc)
        await session.commit()
        return event

    @classmethod
    async def retry_event(
        cls,
        session: AsyncSession,
        event_id: uuid.UUID,
        target_url: Optional[str] = None,
    ) -> WorkflowEvent:
        """
        Manually or periodically retries delivery of a failed / DLQ event.
        """
        stmt = select(WorkflowEvent).where(WorkflowEvent.id == event_id)
        event = (await session.execute(stmt)).scalar_one_or_none()
        if not event:
            raise ValueError(f"Workflow event {event_id} not found")

        url = target_url or settings.WEBHOOK_OUTBOUND_URL
        success, error_msg = await cls._send_http(
            event_type=event.event_type,
            payload=event.payload,
            idempotency_key=event.idempotency_key,
            url=url,
        )

        event.retry_count += 1
        if success:
            event.status = "success"
            event.last_error = None
        else:
            event.status = "failed"
            event.last_error = error_msg

        event.updated_at = datetime.now(timezone.utc)
        await session.commit()
        return event

    @classmethod
    async def _send_http(
        cls,
        event_type: str,
        payload: Dict[str, Any],
        idempotency_key: str,
        url: Optional[str],
    ) -> Tuple[bool, Optional[str]]:
        if not url:
            return False, "No webhook destination URL configured"

        payload_bytes = json.dumps(payload, default=str).encode("utf-8")
        signature = cls.compute_hmac_signature(payload_bytes, settings.WEBHOOK_HMAC_SECRET)

        headers = {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
            "X-Event-Type": event_type,
            "X-Idempotency-Key": idempotency_key,
            "User-Agent": "Custome-X-Webhook-Engine/1.0",
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, content=payload_bytes, headers=headers)
                if 200 <= resp.status_code < 300:
                    return True, None
                return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            logger.warning(f"Webhook dispatch failed to {url}: {e}")
            return False, str(e)

    @classmethod
    async def get_stats(
        cls,
        session: AsyncSession,
        organization_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """Calculates operational KPIs for the Automations console."""
        base_query = select(WorkflowEvent.status, func.count(WorkflowEvent.id))
        if organization_id:
            base_query = base_query.where(WorkflowEvent.organization_id == organization_id)
        base_query = base_query.group_by(WorkflowEvent.status)

        rows = (await session.execute(base_query)).all()
        status_counts = {status: count for status, count in rows}

        total = sum(status_counts.values())
        success = status_counts.get("success", 0)
        failed = status_counts.get("failed", 0)
        queued = status_counts.get("queued", 0)
        retrying = status_counts.get("retrying", 0)

        success_rate = round((success / total * 100), 1) if total > 0 else 100.0

        return {
            "total_executions": total,
            "successful_executions": success,
            "failed_dlq_events": failed,
            "queued_or_retrying": queued + retrying,
            "success_rate_percent": success_rate,
            "active_workflows": 4,  # WF1, WF2, WF3, WF4
        }
