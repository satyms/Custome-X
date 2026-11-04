from fastapi import APIRouter
from app.api.v1.endpoints import tickets, customers

api_router = APIRouter(prefix="/api/v1")

# Mount sub-routers with explicit prefixes and OpenAPI tags
api_router.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
