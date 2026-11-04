import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.common import TicketStatus, TicketPriority
from app.schemas.message import MessageResponse
from app.schemas.customer import CustomerResponse


class TicketBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Subject of support request")
    priority: TicketPriority = Field(default=TicketPriority.NORMAL, description="Ticket urgency priority")


class TicketCreate(TicketBase):
    organization_id: uuid.UUID = Field(..., description="Tenant organization UUID")
    customer_id: uuid.UUID = Field(..., description="Customer UUID creating ticket")
    assigned_to: Optional[uuid.UUID] = Field(None, description="Optional agent UUID to assign ticket to")
    initial_message: str = Field(..., min_length=1, max_length=10000, description="Customer initial problem statement")


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255, description="Updated ticket title")
    status: Optional[TicketStatus] = Field(None, description="Updated status")
    priority: Optional[TicketPriority] = Field(None, description="Updated priority")
    assigned_to: Optional[uuid.UUID] = Field(None, description="Reassigned agent UUID")


class TicketResponse(TicketBase):
    id: uuid.UUID = Field(..., description="Ticket unique UUID")
    organization_id: uuid.UUID = Field(..., description="Tenant organization ID")
    customer_id: uuid.UUID = Field(..., description="Customer ID")
    assigned_to: Optional[uuid.UUID] = Field(None, description="Assigned agent ID")
    status: TicketStatus = Field(..., description="Current ticket status")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")

    model_config = ConfigDict(from_attributes=True)


class TicketDetailResponse(TicketResponse):
    """Expanded ticket detail including messages and customer overview."""
    messages: List[MessageResponse] = Field(default_factory=list, description="Chronological message history")
    customer: Optional[CustomerResponse] = Field(None, description="Customer profile summary")
