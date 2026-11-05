from fastapi import APIRouter
from app.api.v1.endpoints import (
    tickets,
    customers,
    auth,
    commerce,
    agent,
    knowledge,
    approvals,
    webhooks,
    automations,
    analytics,
    evals,
)

api_router = APIRouter(prefix="/api/v1")

# Mount sub-routers with explicit prefixes and OpenAPI tags
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(commerce.router, prefix="", tags=["Commerce"])
api_router.include_router(agent.router, prefix="/agent", tags=["Agent"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge Base"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Human Approvals"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
api_router.include_router(automations.router, prefix="/automations", tags=["Automations & DLQ"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(evals.router, prefix="/evals", tags=["Evaluations & Benchmarks"])
