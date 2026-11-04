import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, EmailStr, model_validator
from app.schemas.common import TicketStatus, TicketPriority
from app.schemas.message import MessageResponse
from app.schemas.customer import CustomerResponse


class TicketBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Subject of support request")
    priority: TicketPriority = Field(default=TicketPriority.NORMAL, description="Ticket urgency priority")


class TicketCreate(TicketBase):
    organization_id: Optional[uuid.UUID] = Field(None, description="Tenant organization UUID (inferred from auth session)")
    customer_id: Optional[uuid.UUID] = Field(None, description="Existing customer UUID (optional if customer_email is provided)")
    customer_email: Optional[EmailStr] = Field(None, description="Customer email for auto-creation or lookup")
    customer_name: Optional[str] = Field(None, max_length=255, description="Customer name for auto-creation")
    customer_phone: Optional[str] = Field(None, max_length=50, description="Customer phone for auto-creation")
    assigned_to: Optional[uuid.UUID] = Field(None, description="Optional agent UUID to assign ticket to")
    initial_message: str = Field(..., min_length=1, max_length=10000, description="Customer initial problem statement")

    @model_validator(mode="after")
    def validate_customer_source(self) -> "TicketCreate":
        if not self.customer_id and not self.customer_email:
            raise ValueError("Either customer_id or customer_email must be provided for ticket intake.")
        return self


# Backward-compatible & spec-compliant alias
TicketCreateRequest = TicketCreate


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255, description="Updated ticket title")
    status: Optional[TicketStatus] = Field(None, description="Updated status")
    priority: Optional[TicketPriority] = Field(None, description="Updated priority")
    assigned_to: Optional[uuid.UUID] = Field(None, description="Reassigned agent UUID")


class TicketResponse(TicketBase):
    id: uuid.UUID = Field(..., description="Ticket unique UUID")
    ticket_number: Optional[str] = Field(None, description="Human-readable ticket sequence code (e.g. CX-1001)")
    organization_id: uuid.UUID = Field(..., description="Tenant organization ID")
    customer_id: uuid.UUID = Field(..., description="Customer ID")
    assigned_to: Optional[uuid.UUID] = Field(None, description="Assigned agent ID")
    status: TicketStatus = Field(..., description="Current ticket status")
    resolved_at: Optional[datetime] = Field(None, description="Timestamp when ticket was resolved")
    closed_at: Optional[datetime] = Field(None, description="Timestamp when ticket was closed")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")

    model_config = ConfigDict(from_attributes=True)


class TicketDetailResponse(TicketResponse):
    """Expanded ticket detail including messages and customer overview."""
    messages: List[MessageResponse] = Field(default_factory=list, description="Chronological message history")
    customer: Optional[CustomerResponse] = Field(None, description="Customer profile summary")
