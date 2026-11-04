import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import PaginatedResponse, TicketPriority, TicketStatus
from app.schemas.ticket import (
    TicketCreate,
    TicketDetailResponse,
    TicketResponse,
    TicketUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[TicketResponse],
    status_code=status.HTTP_200_OK,
    summary="List all tickets",
    description="Retrieve a paginated list of customer support tickets with filters.",
)
@router.get(
    "/",
    response_model=PaginatedResponse[TicketResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def list_tickets(
    organization_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant organization"),
    status: Optional[TicketStatus] = Query(None, description="Filter by ticket status"),
    priority: Optional[TicketPriority] = Query(None, description="Filter by urgency priority"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Records offset"),
    db: AsyncSession = Depends(get_db),
):
    return PaginatedResponse(
        items=[],
        total=0,
        limit=limit,
        offset=offset,
        has_more=False,
    )


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ticket",
    description="Creates a support ticket along with its initial message and audit log.",
)
@router.post(
    "/",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_ticket(
    payload: TicketCreate,
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    # Stub response matching TicketResponse model; wired to DB service in Feature 3.5
    return TicketResponse(
        id=uuid.uuid4(),
        organization_id=payload.organization_id,
        customer_id=payload.customer_id,
        assigned_to=payload.assigned_to,
        title=payload.title,
        status=TicketStatus.OPEN,
        priority=payload.priority,
        created_at=now,
        updated_at=now,
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get ticket details",
    description="Retrieve a single support ticket by UUID including messages.",
)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    return TicketDetailResponse(
        id=ticket_id,
        organization_id=uuid.uuid4(),
        customer_id=uuid.uuid4(),
        assigned_to=None,
        title="Sample Ticket",
        status=TicketStatus.OPEN,
        priority=TicketPriority.NORMAL,
        created_at=now,
        updated_at=now,
        messages=[],
        customer=None,
    )


@router.patch(
    "/{ticket_id}",
    response_model=TicketResponse,
    status_code=status.HTTP_200_OK,
    summary="Update ticket status or assignment",
    description="Partially update ticket fields such as status, priority, or assigned agent.",
)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    return TicketResponse(
        id=ticket_id,
        organization_id=uuid.uuid4(),
        customer_id=uuid.uuid4(),
        assigned_to=payload.assigned_to,
        title=payload.title or "Updated Ticket",
        status=payload.status or TicketStatus.IN_PROGRESS,
        priority=payload.priority or TicketPriority.NORMAL,
        created_at=now,
        updated_at=now,
    )


@router.delete(
    "/{ticket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a ticket",
    description="Permanently removes a ticket and its cascaded conversation history.",
)
async def delete_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return None
