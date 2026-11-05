from fastapi import APIRouter, Depends, status
from app.schemas.agent import (
    AgentRunRequest,
    AgentRunResponse,
    ReplySuggestionRequest,
    ReplySuggestionResponse,
)
from app.orchestrator.schemas import (
    OrchestrationInput,
    OrchestrationResponse,
)
from app.services import agent_service
from app.core.rate_limiter import check_ai_rate_limit

router = APIRouter()


@router.post(
    "/orchestrate",
    response_model=OrchestrationResponse,
    dependencies=[Depends(check_ai_rate_limit)],
    status_code=status.HTTP_200_OK,
    summary="Execute Layer 3 7-Step Deterministic AI Orchestration Engine",
)
async def orchestrate_pipeline(request: OrchestrationInput):
    """
    Executes the 7-step deterministic AI orchestration pipeline:
    1. Input sanitization & ownership check
    2. Intent classification & entity extraction
    3. RAG hybrid retrieval via pgvector + FTS
    4. Business data needs planning
    5. Typed server-side tool execution
    6. Business rule validation (return windows, refund thresholds)
    7. Structured JSON action proposal output
    """
    return await agent_service.orchestrate_ticket(request)


@router.post(
    "/run-agent",
    response_model=AgentRunResponse,
    dependencies=[Depends(check_ai_rate_limit)],
    status_code=status.HTTP_200_OK,
)
async def run_agent(request: AgentRunRequest):
    """
    Executes autonomous agent reasoning loop.
    Enforces token-bucket rate limiting and guards high-risk actions with HITL gates.
    """
    return await agent_service.run_agent_loop(request)


@router.post(
    "/reply-suggestion",
    response_model=ReplySuggestionResponse,
    dependencies=[Depends(check_ai_rate_limit)],
    status_code=status.HTTP_200_OK,
)
async def get_reply_suggestion(request: ReplySuggestionRequest):
    """
    Generates suggested agent reply grounded in knowledge base and carrier context.
    """
    return await agent_service.generate_reply_suggestion(request.ticket_id)
