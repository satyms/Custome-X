import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.common import SenderType


class MessageBase(BaseModel):
    sender_type: SenderType = Field(..., description="Entity originating the message")
    content: str = Field(..., min_length=1, max_length=10000, description="Message text content")


class MessageCreate(MessageBase):
    sender_id: Optional[uuid.UUID] = Field(None, description="UUID of sending customer or agent")


class MessageResponse(MessageBase):
    id: uuid.UUID = Field(..., description="Message UUID")
    ticket_id: uuid.UUID = Field(..., description="Associated ticket UUID")
    sender_id: Optional[uuid.UUID] = Field(None, description="UUID of sender")
    created_at: datetime = Field(..., description="Timestamp message was sent")

    model_config = ConfigDict(from_attributes=True)
