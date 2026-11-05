import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field


class OrchestrationInput(BaseModel):
    ticket_id: str
    customer_id: str
    customer_email: Optional[str] = None
    message: str = Field(..., max_length=4000)
    order_id: Optional[str] = None
    channel: str = Field("web_chat", description="web_chat, email, sms, api")
    session_history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
    organization_id: Optional[str] = None


class ExtractedEntities(BaseModel):
    order_id: Optional[str] = None
    sku: Optional[str] = None
    tracking_number: Optional[str] = None
    reason: Optional[str] = None
    amount_cents: Optional[int] = None
    category: Optional[str] = None
    extra: Dict[str, Any] = Field(default_factory=dict)


class SourceCitation(BaseModel):
    source_type: str = Field("knowledge_chunk", description="knowledge_chunk, database_record, carrier_scan")
    document_id: Optional[str] = None
    title: Optional[str] = None
    chunk_id: Optional[str] = None
    section: Optional[str] = None
    table: Optional[str] = None
    record_id: Optional[str] = None
    snippet: Optional[str] = None


class ProposedActionPayload(BaseModel):
    order_id: Optional[str] = None
    refund_amount_cents: Optional[int] = None
    reason: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    sku: Optional[str] = None
    note: Optional[str] = None
    extra: Dict[str, Any] = Field(default_factory=dict)


class ProposedAction(BaseModel):
    action_type: str = Field(
        ...,
        description="request_refund_approval, issue_return_label, cancel_order_request, escalate_to_human, send_information_reply",
    )
    payload: ProposedActionPayload = Field(default_factory=ProposedActionPayload)
    idempotency_key: Optional[str] = None


class StepTrace(BaseModel):
    step_number: int
    step_name: str
    status: str = "success"  # success, warning, filtered, blocked
    summary: str
    duration_ms: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ToolExecutionTrace(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    success: bool
    output_summary: str
    duration_ms: float


class OrchestrationResponse(BaseModel):
    """
    Immutable 7-step Structured Output Contract matching ARCHITECTURE.md §3.3
    """
    intent: str
    entities: ExtractedEntities
    answer: str
    sources: List[SourceCitation] = Field(default_factory=list)
    proposed_action: Optional[ProposedAction] = None
    needs_human: bool = False
    confidence_score: float = Field(0.95, ge=0.0, le=1.0)
    reason: Optional[str] = None
    tools_called: List[str] = Field(default_factory=list)
    execution_traces: List[StepTrace] = Field(default_factory=list)
    total_execution_time_ms: float = 0.0


class SanitizationResult(BaseModel):
    cleaned_text: str
    fenced_prompt: str
    is_blocked: bool = False
    block_reason: Optional[str] = None
    pii_masked: bool = False
    injection_detected: bool = False
    masked_text_for_logs: str


class ClassifiedIntentResult(BaseModel):
    intent: str
    confidence: float
    entities: ExtractedEntities


class RAGRetrievalResult(BaseModel):
    chunks: List[Dict[str, Any]]
    citations: List[SourceCitation]


class ToolPlanResult(BaseModel):
    planned_tools: List[str]
    rationale: str


class BusinessRuleValidationResult(BaseModel):
    is_valid: bool
    requires_hitl: bool
    hitl_reason: Optional[str] = None
    rule_violations: List[str] = Field(default_factory=list)
    allowed_action_type: Optional[str] = None
    confidence_penalty: float = 0.0
