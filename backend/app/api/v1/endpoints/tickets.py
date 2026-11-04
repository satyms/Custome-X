import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import PaginatedResponse, TicketPriority, TicketStatus
from app.schemas.ticket import (
    TicketCreate,
    TicketDetailResponse,
    TicketResponse,
    TicketUpdate,
)
from app.services import ticket_service

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[TicketResponse],
    status_code=status.HTTP_200_OK,
    summary="List all tickets",
    description="Retrieve a paginated list of customer support tickets with filters and pagination headers.",
)
@router.get(
    "/",
    response_model=PaginatedResponse[TicketResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def list_tickets(
    response: Response,
    organization_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant organization"),
    status: Optional[TicketStatus] = Query(None, description="Filter by ticket status"),
    priority: Optional[TicketPriority] = Query(None, description="Filter by urgency priority"),
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer ID"),
    assigned_to: Optional[uuid.UUID] = Query(None, description="Filter by assigned agent ID"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Records offset"),
    db: AsyncSession = Depends(get_db),
):
    items, total = await ticket_service.list_tickets(
        session=db,
        organization_id=organization_id,
        status=status.value if status else None,
        priority=priority.value if priority else None,
        customer_id=customer_id,
        assigned_to=assigned_to,
        limit=limit,
        offset=offset,
    )
    has_more = (offset + len(items)) < total

    # Feature 3.9: Pagination Metadata Headers
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)
    response.headers["X-Has-More"] = str(has_more).lower()

    return PaginatedResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        has_more=has_more,
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
    # CustomerNotFoundError handled globally -> HTTP 404
    return await ticket_service.create_ticket(session=db, payload=payload)


@router.get(
    "/{ticket_id}",
    response_model=TicketDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get ticket details",
    description="Retrieve a single support ticket by UUID including messages and history.",
)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    # TicketNotFoundError handled globally -> HTTP 404
    return await ticket_service.get_ticket_by_id(session=db, ticket_id=ticket_id)


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
    # TicketNotFoundError -> 404, InvalidStatusTransitionError -> 400
    return await ticket_service.update_ticket(session=db, ticket_id=ticket_id, payload=payload)


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
    await ticket_service.delete_ticket(session=db, ticket_id=ticket_id)
    return None
