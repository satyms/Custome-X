import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models.organization import Organization
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.core.auth import get_current_user
from app.models.user import User


@pytest.mark.asyncio
async def test_analytics_overview_and_volume(client: AsyncClient, db_session: AsyncSession):
    # 1. Setup organization and demo tickets
    org = Organization(name=f"Analytics Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    customer = Customer(
        organization_id=org.id,
        email=f"ana_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Analytics Customer",
    )
    db_session.add(customer)
    await db_session.flush()

    # Create open, in_progress, and resolved tickets
    t1 = Ticket(organization_id=org.id, customer_id=customer.id, title="Open t1", status="open", priority="normal")
    t2 = Ticket(organization_id=org.id, customer_id=customer.id, title="Resolved t2", status="resolved", priority="low")
    t3 = Ticket(organization_id=org.id, customer_id=customer.id, title="Escalated t3", status="escalated", priority="urgent")
    db_session.add_all([t1, t2, t3])

    test_user = User(
        organization_id=org.id,
        email=f"analyst_{uuid.uuid4().hex[:6]}@custome-x.internal",
        full_name="Lead Analyst",
        role="supervisor",
    )
    db_session.add(test_user)
    await db_session.commit()

    # Override get_current_user dependency
    from main import app
    app.dependency_overrides[get_current_user] = lambda: test_user

    try:
        # GET /api/v1/analytics/overview
        res = await client.get("/api/v1/analytics/overview?time_range=7d")
        assert res.status_code == 200
        data = res.json()
        assert "deflection_rate" in data
        assert "mttr_minutes" in data
        assert "first_response_seconds" in data
        assert "csat_score" in data
        assert "ticket_volume" in data
        assert len(data["ticket_volume"]) > 0
        assert "category_distribution" in data
        assert len(data["category_distribution"]) > 0

        # GET /api/v1/analytics/volume
        vol_res = await client.get("/api/v1/analytics/volume?time_range=30d")
        assert vol_res.status_code == 200
        vol_data = vol_res.json()
        assert isinstance(vol_data, list)
        assert len(vol_data) >= 1
        assert "day" in vol_data[0]
        assert "inbound" in vol_data[0]
    finally:
        app.dependency_overrides.pop(get_current_user, None)
