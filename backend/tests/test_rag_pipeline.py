import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.schemas.knowledge import (
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    KnowledgeUploadRequest,
)
from app.services.knowledge_service import (
    chunk_document_content,
    generate_embedding,
    ingest_document,
    search_knowledge_hybrid,
    search_knowledge,
)
from app.orchestrator.retrieval import KnowledgeRetriever


# =============================================================================
# 1. Chunking & Embedding Unit Tests
# =============================================================================

def test_markdown_chunker_structure():
    sample_policy = """# Return Policy 2026
Customers can return any merchandise within 30 days of receipt.
Items must be in original condition with tags attached.

## Exceptions & Non-Returnable Goods
Intimate apparel, perishable goods, and custom personalized products cannot be returned.
Hazardous materials and gift cards are strictly final sale.

## Damaged or Defective Items
If your item arrives damaged, report it within 48 hours for immediate replacement.
Prepaid shipping labels are provided free of charge for defective items.
"""
    chunks = chunk_document_content(
        content=sample_policy,
        doc_title="Return Policy 2026",
        target_chunk_words=30,
        overlap_words=5,
    )
    assert len(chunks) >= 3
    # Check sections are captured
    sections = [c["section"] for c in chunks]
    assert any("Return Policy 2026" in s for s in sections)
    assert any("Exceptions" in s for s in sections)
    assert any("Damaged" in s for s in sections)
    # Check chunk index ordering
    for idx, c in enumerate(chunks):
        assert c["chunk_index"] == idx
        assert len(c["content"]) > 10
        assert c["token_count"] > 0


def test_embedding_generator_dimension_and_norm():
    text_sample = "Customer request for order cancellation and refund under 30-day warranty policy."
    emb = generate_embedding(text_sample)
    assert isinstance(emb, list)
    assert len(emb) == 768
    # All values should be floats
    assert all(isinstance(v, float) for v in emb)
    # Norm should be close to 1.0 (normalized vector)
    norm = sum(v * v for v in emb) ** 0.5
    assert 0.95 <= norm <= 1.05


def test_embedding_deterministic_similarity():
    # Similar sentences should have higher dot product than dissimilar ones
    emb_refund = generate_embedding("I want a refund for my damaged headphones.")
    emb_return = generate_embedding("How do I return a broken item for my money back?")
    emb_weather = generate_embedding("The sun is shining and the forecast says tomorrow will be sunny.")

    dot_sim = sum(a * b for a, b in zip(emb_refund, emb_return))
    dot_diff = sum(a * b for a, b in zip(emb_refund, emb_weather))

    assert dot_sim > dot_diff


# =============================================================================
# 2. Database Ingestion & Hybrid Search Integration Tests
# =============================================================================

@pytest.mark.asyncio
async def test_database_document_ingestion(db_session: AsyncSession):
    org = Organization(name=f"RAG Ingest Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()

    policy_text = """# Electronics Warranty Policy
All smart devices and audio equipment include a 24-month limited manufacturer warranty.
Coverage extends to battery capacity drop under 80%, driver defects, and Bluetooth radio failures.

## Water Damage Disclaimer
Liquid submersion or chemical exposure voids the manufacturer warranty immediately.
Accidental damage requires supplemental device protection coverage.
"""
    doc, chunks = await ingest_document(
        session=db_session,
        organization_id=org.id,
        title="Electronics Warranty Policy 2026",
        raw_content=policy_text,
        document_type="policy",
        category="warranty",
        version="2.0",
        status="active",
    )

    assert doc.id is not None
    assert doc.title == "Electronics Warranty Policy 2026"
    assert doc.status == "active"
    assert len(chunks) >= 2

    # Query DB directly to verify persistence and tsvector generation
    db_chunks = (await db_session.execute(
        select(KnowledgeChunk).where(KnowledgeChunk.document_id == doc.id)
    )).scalars().all()
    assert len(db_chunks) == len(chunks)

    # Check generated tsvector column via raw SQL
    tsv_res = (await db_session.execute(
        text("SELECT tsv_content IS NOT NULL FROM public.knowledge_chunks WHERE document_id = :doc_id"),
        {"doc_id": str(doc.id)}
    )).fetchall()
    assert all(row[0] is True for row in tsv_res)


@pytest.mark.asyncio
async def test_database_hybrid_search_rrf(db_session: AsyncSession):
    org = Organization(name=f"RAG Search Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()

    # Ingest two distinct documents
    await ingest_document(
        session=db_session,
        organization_id=org.id,
        title="Standard 30-Day Return Policy",
        raw_content="""# Standard 30-Day Return Policy
Customers may return items within 30 days of delivery for a full refund.
Prepaid return shipping labels are complimentary for transit damage or defective merchandise.
A flat $5.99 postage deduction applies to customer remorse returns.""",
        document_type="policy",
        category="returns",
        status="active",
    )

    await ingest_document(
        session=db_session,
        organization_id=org.id,
        title="Freight and Logistics SLA",
        raw_content="""# Logistics and Transit SLAs
Parcels without carrier tracking scans for more than 14 consecutive days are deemed lost in transit.
In such events, automatic replacement dispatch is authorized immediately.""",
        document_type="policy",
        category="shipping",
        status="active",
    )

    # Query 1: Returns search
    search_req = KnowledgeSearchRequest(
        query="damaged defective return shipping fee",
        category="returns",
        top_k=3,
        hybrid=True,
    )
    res = await search_knowledge_hybrid(session=db_session, req=search_req, organization_id=org.id)

    assert res.total_matches >= 1
    assert any("Return" in r.doc_title for r in res.results)
    top_hit = res.results[0]
    assert top_hit.similarity_score > 0
    assert "damaged" in top_hit.content.lower() or "defective" in top_hit.content.lower()


@pytest.mark.asyncio
async def test_rag_tenant_isolation(db_session: AsyncSession):
    org_a = Organization(name=f"Tenant A {uuid.uuid4().hex[:6]}")
    org_b = Organization(name=f"Tenant B {uuid.uuid4().hex[:6]}")
    db_session.add_all([org_a, org_b])
    await db_session.commit()

    # Ingest confidential policy only in Tenant A
    await ingest_document(
        session=db_session,
        organization_id=org_a.id,
        title="Tenant A Proprietary VIP Retention Policy",
        raw_content="Exclusive 50% discount credit authorized for Tier 1 VIP customers under code VIP50.",
        category="vip",
        status="active",
    )

    # Tenant B searches for Tenant A's policy
    search_req = KnowledgeSearchRequest(
        query="VIP50 discount credit Tier 1",
        top_k=5,
        hybrid=True,
    )
    res_b = await search_knowledge_hybrid(session=db_session, req=search_req, organization_id=org_b.id)

    # Must return 0 matches for Tenant B!
    assert res_b.total_matches == 0
    assert len(res_b.results) == 0

    # Tenant A searching should find it
    res_a = await search_knowledge_hybrid(session=db_session, req=search_req, organization_id=org_a.id)
    assert res_a.total_matches >= 1
    assert "VIP50" in res_a.results[0].content


@pytest.mark.asyncio
async def test_rag_status_filter_active_only(db_session: AsyncSession):
    org = Organization(name=f"Status Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()

    # Ingest archived policy (e.g. old 60-day policy from 2023)
    await ingest_document(
        session=db_session,
        organization_id=org.id,
        title="Deprecated 2023 60-Day Return Policy",
        raw_content="All purchases made in 2023 qualify for 60-day return privileges.",
        category="returns",
        status="archived",
    )

    # Ingest current active policy (30-day policy)
    await ingest_document(
        session=db_session,
        organization_id=org.id,
        title="Active 2026 30-Day Return Policy",
        raw_content="All standard merchandise has a strict 30-day return window from delivery date.",
        category="returns",
        status="active",
    )

    # Search with status_filter = active
    search_req = KnowledgeSearchRequest(
        query="return privileges window",
        top_k=5,
        hybrid=True,
    )
    res = await search_knowledge_hybrid(session=db_session, req=search_req, organization_id=org.id)

    assert res.total_matches >= 1
    # Archived 60-day policy must NOT be returned
    assert all("60-day" not in r.content.lower() for r in res.results)
    assert any("30-day" in r.content.lower() for r in res.results)


# =============================================================================
# 3. Layer 3 Orchestrator Integration Tests
# =============================================================================

@pytest.mark.asyncio
async def test_orchestrator_retriever_hybrid_integration(db_session: AsyncSession):
    org = Organization(name=f"Orch RAG Org {uuid.uuid4().hex[:6]}")
    db_session.add(org)
    await db_session.commit()

    await ingest_document(
        session=db_session,
        organization_id=org.id,
        title="Official Earphone Replacement Policy",
        raw_content="For model HDPH-NC-BLK, complimentary replacement drivers are dispatched within 2 business days.",
        category="returns",
        status="active",
    )

    # Call KnowledgeRetriever.retrieve_async with session
    rag_result = await KnowledgeRetriever.retrieve_async(
        query="HDPH-NC-BLK replacement drivers",
        session=db_session,
        organization_id=org.id,
        category="returns",
        top_k=2,
    )

    assert len(rag_result.chunks) >= 1
    assert len(rag_result.citations) >= 1
    assert "HDPH-NC-BLK" in rag_result.chunks[0]["content"]
    assert rag_result.citations[0].title == "Official Earphone Replacement Policy"


# =============================================================================
# 4. HTTP API Endpoint Tests (/api/v1/knowledge)
# =============================================================================

@pytest.mark.asyncio
async def test_api_knowledge_upload_and_search(client: AsyncClient):
    upload_res = await client.post(
        "/api/v1/knowledge/upload",
        json={
            "title": "API Test Shipping SLA",
            "category": "shipping",
            "content": "All orders placed before 2 PM EST ship the same business day via FedEx Ground.",
        },
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["title"] == "API Test Shipping SLA"
    assert upload_data["chunks_created"] >= 1

    search_res = await client.post(
        "/api/v1/knowledge/search",
        json={
            "query": "orders before 2 PM FedEx Ground",
            "category": "shipping",
            "top_k": 3,
        },
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total_matches"] >= 1
    assert "FedEx" in search_data["results"][0]["content"] or "shipping" in search_data["results"][0]["content"]
