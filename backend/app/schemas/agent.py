from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AgentRunRequest(BaseModel):
    ticket_id: str
    user_instruction: Optional[str] = None
    context_override: Optional[Dict[str, Any]] = None


class AgentRunResponse(BaseModel):
    ticket_id: str
    status: str = Field("completed", description="completed, paused_hitl, error")
    intent: str
    tools_called: List[str] = []
    proposed_reply: str
    requires_hitl: bool = False
    hitl_reason: Optional[str] = None
    execution_time_ms: float


class ReplySuggestionRequest(BaseModel):
    ticket_id: str
    last_n_messages: int = Field(5, ge=1, le=20)


class ReplySuggestionResponse(BaseModel):
    ticket_id: str
    suggestion: str
    confidence_score: float = Field(0.95, ge=0.0, le=1.0)
    sources_cited: List[str] = []
    action_recommended: Optional[str] = None
