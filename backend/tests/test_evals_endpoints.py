import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models.organization import Organization
from app.models.user import User
from app.core.auth import get_current_user


@pytest.mark.asyncio
async def test_evals_scenarios_and_run(client: AsyncClient, db_session: AsyncSession):
    # Setup test user and org
    org = Organization(name=f"Eval Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.flush()

    test_user = User(
        organization_id=org.id,
        email=f"evaluator_{uuid.uuid4().hex[:6]}@custome-x.internal",
        full_name="Lead Evaluator",
        role="supervisor",
    )
    db_session.add(test_user)
    await db_session.commit()

    # Override get_current_user
    from main import app
    app.dependency_overrides[get_current_user] = lambda: test_user

    try:
        # 1. GET /api/v1/evals/scenarios
        res = await client.get("/api/v1/evals/scenarios?suite=all")
        assert res.status_code == 200
        scenarios = res.json()
        assert isinstance(scenarios, list)
        assert len(scenarios) >= 5
        assert scenarios[0]["id"] == "EVAL-01"
        assert "expected_tool_or_output" in scenarios[0]

        # 2. Filter by suite
        guardrail_res = await client.get("/api/v1/evals/scenarios?suite=guardrails")
        assert guardrail_res.status_code == 200
        guardrail_scenarios = guardrail_res.json()
        assert all(s["suite"] == "guardrails" for s in guardrail_scenarios)

        # 3. POST /api/v1/evals/run (Guardrails Suite)
        run_res = await client.post("/api/v1/evals/run", json={"suite": "guardrails"})
        assert run_res.status_code == 200
        run_data = run_res.json()
        assert run_data["suite"] == "guardrails"
        assert run_data["total_scenarios"] > 0
        assert run_data["accuracy_percent"] >= 80.0
        assert run_data["tool_validity_percent"] == 100.0
        assert run_data["hallucination_rate_percent"] == 0.0
        assert len(run_data["scenarios"]) == run_data["total_scenarios"]

    finally:
        app.dependency_overrides.pop(get_current_user, None)
