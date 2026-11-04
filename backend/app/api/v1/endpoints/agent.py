from fastapi import APIRouter, Depends, status
from app.schemas.agent import (
    AgentRunRequest,
    AgentRunResponse,
    ReplySuggestionRequest,
    ReplySuggestionResponse,
)
from app.services import agent_service
from app.core.rate_limiter import check_ai_rate_limit

router = APIRouter()


@router.post(
    "/run-agent",
    response_model=AgentRunResponse,
    dependencies=[Depends(check_ai_rate_limit)],
    status_code=status.HTTP_200_OK,
)
def run_agent(request: AgentRunRequest):
    """
    Executes autonomous agent reasoning loop.
    Enforces token-bucket rate limiting and guards high-risk actions with HITL gates.
    """
    return agent_service.run_agent_loop(request)


@router.post(
    "/reply-suggestion",
    response_model=ReplySuggestionResponse,
    dependencies=[Depends(check_ai_rate_limit)],
    status_code=status.HTTP_200_OK,
)
def get_reply_suggestion(request: ReplySuggestionRequest):
    """
    Generates suggested agent reply grounded in knowledge base and carrier context.
    """
    return agent_service.generate_reply_suggestion(request.ticket_id)
