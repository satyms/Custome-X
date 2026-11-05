from typing import List, Literal, Optional
from pydantic import BaseModel, Field


EvalSuite = Literal["all", "rag", "tool_calling", "guardrails", "empathy"]
EvalStatus = Literal["passed", "failed", "flagged"]


class EvalScenarioItem(BaseModel):
    id: str = Field(..., description="Scenario identifier (e.g. EVAL-01)")
    suite: Literal["rag", "tool_calling", "guardrails", "empathy"] = Field(..., description="Evaluation category")
    name: str = Field(..., description="Short descriptive title of scenario")
    user_prompt: str = Field(..., description="Simulated user input message")
    expected_tool_or_output: str = Field(..., description="Target golden baseline tool call or policy answer")
    actual_output: str = Field(..., description="Agent inferred output or executed action")
    judge_score: int = Field(..., ge=0, le=100, description="Evaluator judge score out of 100")
    status: EvalStatus = Field(..., description="Scenario execution status")
    latency_ms: int = Field(..., ge=0, description="Inference latency in milliseconds")
    judge_rationale: str = Field(..., description="Detailed explanation of evaluation score")


class EvalBenchmarkResponse(BaseModel):
    suite: str = Field(..., description="Evaluated test suite")
    total_scenarios: int
    passed_scenarios: int
    accuracy_percent: float
    tool_validity_percent: float
    hallucination_rate_percent: float
    avg_latency_ms: int
    scenarios: List[EvalScenarioItem]


class EvalRunRequest(BaseModel):
    suite: Optional[EvalSuite] = Field(default="all", description="Target suite to evaluate")
