import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerBase(BaseModel):
    email: EmailStr = Field(..., description="Unique customer email address")
    full_name: str = Field(..., min_length=1, max_length=255, description="Customer's full name")
    phone: Optional[str] = Field(None, max_length=50, description="Contact phone number")


class CustomerCreate(CustomerBase):
    organization_id: Optional[uuid.UUID] = Field(None, description="Tenant organization ID (inferred from auth session)")


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)


class CustomerResponse(CustomerBase):
    id: uuid.UUID = Field(..., description="Customer unique UUID identifier")
    organization_id: uuid.UUID = Field(..., description="Tenant organization ID")
    created_at: datetime = Field(..., description="Creation timestamp (UTC)")

    model_config = ConfigDict(from_attributes=True)
