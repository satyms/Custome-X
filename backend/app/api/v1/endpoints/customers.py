import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.customer import CustomerCreate, CustomerResponse

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[CustomerResponse],
    status_code=status.HTTP_200_OK,
    summary="List all customers",
    description="Retrieve a paginated list of customers for an organization.",
)
@router.get(
    "/",
    response_model=PaginatedResponse[CustomerResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def list_customers(
    organization_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant organization"),
    email: Optional[str] = Query(None, description="Filter by customer email"),
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
    now = datetime.now(timezone.utc)
    return CustomerResponse(
        id=uuid.uuid4(),
        organization_id=payload.organization_id,
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        created_at=now,
    )


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
    now = datetime.now(timezone.utc)
    return CustomerResponse(
        id=customer_id,
        organization_id=uuid.uuid4(),
        email="customer@example.com",
        full_name="John Doe",
        phone=None,
        created_at=now,
    )
