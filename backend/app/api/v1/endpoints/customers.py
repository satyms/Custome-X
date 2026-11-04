import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.services import customer_service

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[CustomerResponse],
    status_code=status.HTTP_200_OK,
    summary="List all customers",
    description="Retrieve a paginated list of customers for an organization with metadata headers.",
)
@router.get(
    "/",
    response_model=PaginatedResponse[CustomerResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def list_customers(
    response: Response,
    organization_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant organization"),
    email: Optional[str] = Query(None, description="Filter by customer email"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Records offset"),
    db: AsyncSession = Depends(get_db),
):
    items, total = await customer_service.list_customers(
        session=db,
        organization_id=organization_id,
        email=email,
        limit=limit,
        offset=offset,
    )
    has_more = (offset + len(items)) < total

    # Feature 3.9: Standard Pagination Metadata Headers
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
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer",
    description="Registers a new customer profile under an organization.",
)
@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    # Domain exceptions (OrganizationNotFoundError, DuplicateResourceError) handled globally
    return await customer_service.create_customer(session=db, payload=payload)


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK,
    summary="Get customer details",
    description="Retrieve customer profile information by UUID.",
)
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    # CustomerNotFoundError handled globally -> HTTP 404
    return await customer_service.get_customer_by_id(session=db, customer_id=customer_id)
