import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, ConfigDict


class WorkflowEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    event_type: str
    payload: Dict[str, Any]
    status: str
    retry_count: int
    max_retries: int
    last_error: Optional[str] = None
    idempotency_key: str
    created_at: datetime
    updated_at: datetime


class WorkflowStatsResponse(BaseModel):
    total_executions: int
    successful_executions: int
    failed_dlq_events: int
    queued_or_retrying: int
    success_rate_percent: float
    active_workflows: int = 4


class WorkflowRetryResponse(BaseModel):
    event_id: str
    status: str
    retry_count: int
    message: str
