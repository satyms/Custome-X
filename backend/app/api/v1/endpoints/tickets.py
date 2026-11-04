import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse, TicketPriority, TicketStatus
from app.schemas.message import MessageCreate, MessageResponse
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
    description="Retrieve a paginated list of customer support tickets scoped to current user's organization.",
)
@router.get(
    "/",
    response_model=PaginatedResponse[TicketResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def list_tickets(
    response: Response,
    status: Optional[TicketStatus] = Query(None, description="Filter by ticket status"),
    priority: Optional[TicketPriority] = Query(None, description="Filter by urgency priority"),
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer ID"),
    assigned_to: Optional[uuid.UUID] = Query(None, description="Filter by assigned agent ID"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Records offset"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Enforce multi-tenant scoping: strictly bounded to current_user.organization_id
    items, total = await ticket_service.list_tickets(
        session=db,
        organization_id=current_user.organization_id,
        status=status.value if status else None,
        priority=priority.value if priority else None,
        customer_id=customer_id,
        assigned_to=assigned_to,
        limit=limit,
        offset=offset,
    )
    has_more = (offset + len(items)) < total

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
    description="Creates a support ticket automatically scoped to the authenticated user's organization.",
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
    current_user: User = Depends(get_current_user),
):
    # Strict tenant binding: always override payload organization_id with current_user's org
    payload.organization_id = current_user.organization_id
    return await ticket_service.create_ticket(session=db, payload=payload)


@router.get(
    "/{ticket_id}",
    response_model=TicketDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get ticket details",
    description="Retrieve a single support ticket by UUID strictly bounded to the user's organization.",
)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ticket_service.get_ticket_by_id(
        session=db,
        ticket_id=ticket_id,
        organization_id=current_user.organization_id,
    )


@router.patch(
    "/{ticket_id}",
    response_model=TicketResponse,
    status_code=status.HTTP_200_OK,
    summary="Update ticket status or assignment",
    description="Partially update ticket fields strictly within the caller's organization.",
)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ticket_service.update_ticket(
        session=db,
        ticket_id=ticket_id,
        payload=payload,
        actor_id=current_user.id,
        organization_id=current_user.organization_id,
    )


@router.delete(
    "/{ticket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a ticket",
    description="Permanently removes a ticket within the user's organization.",
)
async def delete_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ticket_service.delete_ticket(
        session=db,
        ticket_id=ticket_id,
        organization_id=current_user.organization_id,
    )
    return None


@router.post(
    "/{ticket_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add message to ticket",
    description="Appends a new message to the ticket conversation.",
)
async def add_message_to_ticket(
    ticket_id: uuid.UUID,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sender_type = payload.sender_type.value if hasattr(payload.sender_type, "value") else payload.sender_type
    return await ticket_service.add_message(
        session=db,
        ticket_id=ticket_id,
        content=payload.content,
        sender_type=sender_type,
        sender_id=payload.sender_id or current_user.id,
        organization_id=current_user.organization_id,
    )
