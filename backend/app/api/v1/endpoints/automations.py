import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.agent_audit import WorkflowEvent
from app.schemas.automations import (
    WorkflowEventResponse,
    WorkflowStatsResponse,
    WorkflowRetryResponse,
)
from app.services.webhook_dispatcher import WebhookDispatcher

router = APIRouter()


@router.get("/events", response_model=List[WorkflowEventResponse])
async def list_workflow_events(
    status_filter: Optional[str] = Query(None, alias="status"),
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    List historical and active workflow events (including DLQ failed events).
    """
    stmt = select(WorkflowEvent)
    if status_filter:
        stmt = stmt.where(WorkflowEvent.status == status_filter)
    if event_type:
        stmt = stmt.where(WorkflowEvent.event_type == event_type)
    stmt = stmt.order_by(desc(WorkflowEvent.created_at)).limit(limit).offset(offset)

    rows = (await db.execute(stmt)).scalars().all()
    return [
        WorkflowEventResponse(
            id=str(r.id),
            organization_id=str(r.organization_id),
            event_type=r.event_type,
            payload=r.payload,
            status=r.status,
            retry_count=r.retry_count,
            max_retries=r.max_retries,
            last_error=r.last_error,
            idempotency_key=r.idempotency_key,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.get("/stats", response_model=WorkflowStatsResponse)
async def get_workflow_stats(db: AsyncSession = Depends(get_db)):
    """
    Get aggregated KPIs across all automation workflows and DLQ health.
    """
    stats = await WebhookDispatcher.get_stats(session=db)
    return WorkflowStatsResponse(**stats)


@router.post("/events/{event_id}/retry", response_model=WorkflowRetryResponse)
async def retry_workflow_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Manually retries delivery of a failed or dead-letter queue event.
    """
    try:
        updated_event = await WebhookDispatcher.retry_event(session=db, event_id=event_id)
        return WorkflowRetryResponse(
            event_id=str(updated_event.id),
            status=updated_event.status,
            retry_count=updated_event.retry_count,
            message="Event retry initiated successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/dispatch-test", response_model=WorkflowEventResponse)
async def dispatch_test_event(
    event_type: str = Query("ticket.created"),
    db: AsyncSession = Depends(get_db),
):
    """
    Emits a synthetic test webhook event for n8n pipeline testing and verification.
    """
    default_org_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    sample_payload = {
        "event": event_type,
        "ticket_id": str(uuid.uuid4()),
        "ticket_number": f"TCK-{uuid.uuid4().hex[:6].upper()}",
        "subject": "Customer shipment delay inquiry",
        "priority": "urgent",
        "customer_email": "demo.customer@example.com",
    }
    event = await WebhookDispatcher.dispatch_event(
        session=db,
        organization_id=default_org_id,
        event_type=event_type,
        payload=sample_payload,
    )
    return WorkflowEventResponse(
        id=str(event.id),
        organization_id=str(event.organization_id),
        event_type=event.event_type,
        payload=event.payload,
        status=event.status,
        retry_count=event.retry_count,
        max_retries=event.max_retries,
        last_error=event.last_error,
        idempotency_key=event.idempotency_key,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )
