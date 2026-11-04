import os
import sys
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.db.session import get_db
from main import app


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a cleanly isolated AsyncSession using NullPool.
    Avoids event loop reuse conflicts with asyncpg.
    """
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        yield session
        await session.close()

    await test_engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    HTTP test client that overrides get_db dependency with test session.
    Guarantees that route queries run inside the test's event loop and transaction.
    """
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
