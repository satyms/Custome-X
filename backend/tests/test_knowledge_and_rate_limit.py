import pytest
from httpx import AsyncClient
from app.core.rate_limiter import ai_rate_limiter


@pytest.mark.asyncio
async def test_knowledge_search_and_upload(client: AsyncClient):
    """Verifies RAG hybrid search scoring and document ingestion."""
    ai_rate_limiter.reset()

    # 1. Search knowledge base with hybrid search
    res = await client.post(
        "/api/v1/knowledge/search",
        json={"query": "return policy for defective items", "similarity_threshold": 0.6, "hybrid": True},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_matches"] >= 1
    assert any("Return" in r["doc_title"] for r in data["results"])

    # 2. Ingest / Upload new document
    upload_res = await client.post(
        "/api/v1/knowledge/upload",
        json={
            "title": "Extended Holiday Guarantee",
            "category": "returns",
            "content": "All purchases made between November 1 and December 31 receive an extended 60-day return window.",
        },
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["chunks_created"] >= 1


@pytest.mark.asyncio
async def test_token_bucket_rate_limiter(client: AsyncClient):
    """Verifies that exceeding the token-bucket burst limit triggers HTTP 429."""
    ai_rate_limiter.reset()
    headers = {"X-Organization-Id": "test_tenant_rate_limit"}

    # Consume all 10 tokens in burst
    for _ in range(10):
        res = await client.post(
            "/api/v1/knowledge/search",
            json={"query": "warranty inquiry", "similarity_threshold": 0.5},
            headers=headers,
        )
        assert res.status_code == 200

    # 11th request immediately should exceed token bucket capacity
    res_exceeded = await client.post(
        "/api/v1/knowledge/search",
        json={"query": "warranty inquiry", "similarity_threshold": 0.5},
        headers=headers,
    )
    assert res_exceeded.status_code == 429
    err_body = res_exceeded.json()
    assert err_body["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "Retry-After" in res_exceeded.headers

    # Reset limiter after test
    ai_rate_limiter.reset()
