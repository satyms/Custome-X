import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter()


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="List all customers",
    description="Retrieve a paginated list of customers for an organization.",
)
@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def list_customers(

    organization_id: Optional[uuid.UUID] = None,
    email: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Placeholder endpoint establishing HTTP GET contract for customers."""
    return {
        "items": [],
        "total": 0,
        "limit": limit,
        "offset": offset,
        "filters": {
            "organization_id": str(organization_id) if organization_id else None,
            "email": email,
        },
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer",
    description="Registers a new customer profile under an organization.",
)
@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_customer(

    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Placeholder endpoint establishing HTTP POST (HTTP 201 Created) contract."""
    return {
        "status": "customer_created_stub",
        "received_payload": payload,
    }


@router.get(
    "/{customer_id}",
    status_code=status.HTTP_200_OK,
    summary="Get customer details",
    description="Retrieve customer profile information by UUID.",
)
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Placeholder endpoint establishing HTTP GET /{id} contract."""
    return {
        "id": str(customer_id),
        "status": "stub",
    }
