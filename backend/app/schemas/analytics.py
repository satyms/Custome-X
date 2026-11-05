from typing import List, Optional
from pydantic import BaseModel, Field


class TicketVolumePoint(BaseModel):
    day: str
    inbound: int
    autonomous: int
    escalated: int


class CategoryDistributionPoint(BaseModel):
    name: str
    value: int
    color: str


class HourlyLatencyPoint(BaseModel):
    hour: str
    frt_sec: float
    mttr_min: float


class AnalyticsOverviewResponse(BaseModel):
    time_range: str
    deflection_rate: float = Field(..., description="Percentage of inquiries resolved autonomously")
    mttr_minutes: float = Field(..., description="Mean time to resolution in minutes")
    first_response_seconds: float = Field(..., description="Average first response time in seconds")
    csat_score: float = Field(..., description="Customer satisfaction score out of 5.0")
    total_inbound: int
    autonomous_resolved: int
    human_escalated: int
    active_staff_count: int
    ticket_volume: List[TicketVolumePoint]
    category_distribution: List[CategoryDistributionPoint]
    hourly_latency: List[HourlyLatencyPoint]
