import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.organization import Organization
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.core.exceptions import (
    CustomerNotFoundError,
    OrganizationNotFoundError,
    DuplicateResourceError,
)


async def create_customer(
    session: AsyncSession,
    payload: CustomerCreate,
) -> Customer:
    """Creates and persists a new customer under an organization."""
    # Verify organization exists
    org_stmt = select(Organization.id).where(Organization.id == payload.organization_id)
    org_exists = (await session.execute(org_stmt)).scalar_one_or_none()
    if not org_exists:
        raise OrganizationNotFoundError(payload.organization_id)

    customer = Customer(
        organization_id=payload.organization_id,
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
    )
    session.add(customer)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise DuplicateResourceError(f"Customer with email '{payload.email}' already exists in this organization.")

    await session.refresh(customer)
    return customer


async def get_customer_by_id(
    session: AsyncSession,
    customer_id: uuid.UUID,
) -> Customer:
    """Fetches a single customer by UUID or raises CustomerNotFoundError."""
    stmt = select(Customer).where(Customer.id == customer_id)
    result = await session.execute(stmt)
    customer = result.scalar_one_or_none()
    if not customer:
        raise CustomerNotFoundError(customer_id)
    return customer


async def list_customers(
    session: AsyncSession,
    organization_id: Optional[uuid.UUID] = None,
    email: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[Customer], int]:
    """Retrieves paginated customers matching optional filters and returns (items, total_count)."""
    query = select(Customer)
    count_query = select(func.count(Customer.id))

    if organization_id:
        query = query.where(Customer.organization_id == organization_id)
        count_query = count_query.where(Customer.organization_id == organization_id)

    if email:
        query = query.where(Customer.email.ilike(f"%{email}%"))
        count_query = count_query.where(Customer.email.ilike(f"%{email}%"))

    total_count = (await session.execute(count_query)).scalar_one()

    query = query.order_by(Customer.created_at.desc()).limit(limit).offset(offset)
    items = (await session.execute(query)).scalars().all()

    return list(items), total_count


async def update_customer(
    session: AsyncSession,
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
) -> Customer:
    """Updates customer profile fields."""
    customer = await get_customer_by_id(session, customer_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    await session.commit()
    await session.refresh(customer)
    return customer
