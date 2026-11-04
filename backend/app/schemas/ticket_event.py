import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.message import MessageResponse


class TicketEventResponse(BaseModel):
    id: uuid.UUID = Field(..., description="Unique event identifier")
    ticket_id: uuid.UUID = Field(..., description="Associated ticket UUID")
    actor_id: Optional[uuid.UUID] = Field(None, description="Actor UUID who triggered the event")
    event_type: str = Field(..., description="Type of event (status_changed, assigned, ticket_created, etc.)")
    event_metadata: Dict[str, Any] = Field(default_factory=dict, description="Event payload context")
    created_at: datetime = Field(..., description="Event timestamp")

    model_config = ConfigDict(from_attributes=True)


class TimelineEntry(BaseModel):
    id: uuid.UUID = Field(..., description="Unique entry ID (message or event)")
    entry_type: Literal["message", "event"] = Field(..., description="Discriminator for timeline item")
    created_at: datetime = Field(..., description="Timestamp of occurrence")
    actor_id: Optional[uuid.UUID] = Field(None, description="Actor UUID if available")
    sender_type: Optional[str] = Field(None, description="Sender role if entry is a message")
    content: Optional[str] = Field(None, description="Message text content")
    event_type: Optional[str] = Field(None, description="Event name if entry is an audit event")
    event_metadata: Optional[Dict[str, Any]] = Field(None, description="Event contextual metadata")


class TicketTimelineResponse(BaseModel):
    ticket_id: uuid.UUID = Field(..., description="Ticket UUID")
    total_entries: int = Field(..., description="Total combined count of messages and events")
    timeline: List[TimelineEntry] = Field(default_factory=list, description="Chronological timeline of messages and events")
