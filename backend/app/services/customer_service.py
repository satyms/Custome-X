import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.organization import Organization
from app.schemas.customer import CustomerCreate, CustomerUpdate


async def create_customer(
    session: AsyncSession,
    payload: CustomerCreate,
) -> Customer:
    """Creates and persists a new customer under an organization."""
    # Verify organization exists
    org_stmt = select(Organization.id).where(Organization.id == payload.organization_id)
    org_exists = (await session.execute(org_stmt)).scalar_one_or_none()
    if not org_exists:
        raise ValueError(f"Organization with id {payload.organization_id} does not exist.")

    customer = Customer(
        organization_id=payload.organization_id,
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
    )
    session.add(customer)
    await session.commit()
    await session.refresh(customer)
    return customer


async def get_customer_by_id(
    session: AsyncSession,
    customer_id: uuid.UUID,
) -> Optional[Customer]:
    """Fetches a single customer by UUID."""
    stmt = select(Customer).where(Customer.id == customer_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


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

    # Fetch total count matching filters
    total_count = (await session.execute(count_query)).scalar_one()

    # Fetch paginated items ordered by created_at DESC
    query = query.order_by(Customer.created_at.desc()).limit(limit).offset(offset)
    items = (await session.execute(query)).scalars().all()

    return list(items), total_count


async def update_customer(
    session: AsyncSession,
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
) -> Optional[Customer]:
    """Updates customer profile fields."""
    customer = await get_customer_by_id(session, customer_id)
    if not customer:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    await session.commit()
    await session.refresh(customer)
    return customer
