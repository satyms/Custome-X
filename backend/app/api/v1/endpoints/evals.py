from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.schemas.evals import (
    EvalScenarioItem,
    EvalBenchmarkResponse,
    EvalRunRequest,
    EvalSuite,
)
from app.services.evals_service import EvalsService
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/scenarios",
    response_model=List[EvalScenarioItem],
    status_code=status.HTTP_200_OK,
    summary="List evaluation scenarios and ground-truth specifications",
)
async def list_eval_scenarios(
    suite: Optional[EvalSuite] = Query("all", description="Filter scenarios by suite"),
    current_user: User = Depends(get_current_user),
) -> List[EvalScenarioItem]:
    """
    Returns the golden benchmark evaluation scenarios across RAG, tool calling,
    guardrails, and empathy de-escalation suites.
    """
    return EvalsService.get_all_scenarios(suite=suite)


@router.post(
    "/run",
    response_model=EvalBenchmarkResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute evaluation benchmark suite against agent pipeline",
)
async def run_eval_benchmark(
    payload: EvalRunRequest,
    current_user: User = Depends(get_current_user),
) -> EvalBenchmarkResponse:
    """
    Executes benchmark test suites against the 7-step AI agent pipeline and deterministic
    security guardrails, computing accuracy, tool validity, hallucination rate, and latency.
    """
    return await EvalsService.run_benchmark(suite=payload.suite)
