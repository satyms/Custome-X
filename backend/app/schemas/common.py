from enum import Enum
from typing import Generic, List, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class TicketPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class UserRole(str, Enum):
    AGENT = "agent"
    SUPERVISOR = "supervisor"
    ADMIN = "admin"


class SenderType(str, Enum):
    CUSTOMER = "customer"
    AGENT = "agent"
    SYSTEM = "system"
    AI_ASSISTANT = "ai_assistant"


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard pagination envelope for list endpoints."""
    items: List[T] = Field(..., description="Array of retrieved items")
    total: int = Field(..., ge=0, description="Total count matching filter criteria")
    limit: int = Field(..., gt=0, description="Max items requested")
    offset: int = Field(..., ge=0, description="Offset index")
    has_more: bool = Field(..., description="True if subsequent pages exist")
