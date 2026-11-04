import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_database_row_level_security_policies_exist(db_session: AsyncSession):
    """
    Verifies Feature 4.7 (Database Security & RLS):
    Confirms that PostgreSQL tables enforce Row-Level Security policies for tenant isolation.
    """
    query = text("""
        SELECT tablename, policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'public'
    """)
    result = await db_session.execute(query)
    policies = {row[0]: row[1] for row in result.fetchall()}

    expected_tables = ["organizations", "users", "customers", "tickets", "messages", "ticket_events"]
    for tbl in expected_tables:
        assert tbl in policies, f"Table '{tbl}' is missing an active RLS policy in PostgreSQL."
        assert "tenant_isolation_policy" in policies[tbl]
