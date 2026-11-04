from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.middleware import RequestIdMiddleware
from app.core.error_handlers import register_exception_handlers
from app.db.session import get_db, close_db_connection
from app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: pool initializes lazily on first query
    yield
    # Shutdown: cleanly close and dispose of database connection pool
    await close_db_connection()


app = FastAPI(
    title="Custome-X API",
    description="Backend API for Custome-X Customer Support Platform.",
    version="0.1.0",
    lifespan=lifespan,
)

# 1. Register Request ID Middleware (distributed tracing & correlation)
app.add_middleware(RequestIdMiddleware)

# 2. Configure CORS for local development with Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Register Centralized Error Handlers
register_exception_handlers(app)

# 4. Mount API v1 Master Router
app.include_router(api_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to Custome-X API",
        "docs": "/docs",
        "health": "/api/health",
        "db_health": "/api/health/db",
        "v1_tickets": "/api/v1/tickets",
        "v1_customers": "/api/v1/customers",
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Custome-X Backend API",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/health/db")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    """Verifies that FastAPI can acquire a connection from the pool and query PostgreSQL."""
    try:
        start_time = datetime.now(timezone.utc)
        result = await db.execute(text("SELECT version();"))
        db_version = result.scalar()
        latency_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

        return {
            "status": "healthy",
            "database": "connected",
            "latency_ms": round(latency_ms, 2),
            "version": db_version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}",
        )
