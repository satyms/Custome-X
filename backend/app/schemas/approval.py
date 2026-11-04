from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ApprovalActionResponse(BaseModel):
    id: str
    type: str = Field(..., description="refund, cancellation, address_change, goodwill_credit")
    title: str
    ticket_id: str
    ticket_number: str
    customer_name: str
    customer_email: str
    amount: Optional[float] = None
    order_id: Optional[str] = None
    risk_level: str = Field("high", description="critical, high, medium")
    confidence_score: int
    ai_rationale: str
    proposed_payload: Dict[str, Any] = {}
    status: str = Field("pending", description="pending, approved, rejected")
    requested_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None


class ApprovalDecisionRequest(BaseModel):
    note: Optional[str] = None
    rejection_reason: Optional[str] = None
