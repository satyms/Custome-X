from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    TicketVolumePoint,
    CategoryDistributionPoint,
    HourlyLatencyPoint,
)
from app.services.analytics_service import AnalyticsService
from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User

router = APIRouter()


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve high-level support operational KPI overview",
)
async def get_analytics_overview(
    time_range: str = Query("7d", pattern="^(7d|30d|90d)$", description="Filter window: 7d, 30d, 90d"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsOverviewResponse:
    """
    Returns aggregated KPIs (deflection rate, MTTR, FRT, CSAT) and timeline data points
    scoped to the current authenticated tenant.
    """
    return await AnalyticsService.get_overview(
        session=db,
        organization_id=current_user.organization_id,
        time_range=time_range,
    )


@router.get(
    "/volume",
    response_model=List[TicketVolumePoint],
    status_code=status.HTTP_200_OK,
    summary="Retrieve ticket intake and resolution volume timeline",
)
async def get_ticket_volume(
    time_range: str = Query("7d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[TicketVolumePoint]:
    """
    Returns timeline data points for inbound vs autonomous vs human-escalated ticket volumes.
    """
    return await AnalyticsService.get_volume(
        session=db,
        organization_id=current_user.organization_id,
        time_range=time_range,
    )
