import time
import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.schemas.knowledge import (
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    KnowledgeChunkResult,
    KnowledgeUploadRequest,
    KnowledgeDocResponse,
)

# Seed knowledge dataset
SAMPLE_CHUNKS: List[Dict[str, Any]] = [
    {
        "chunk_id": "chk_01",
        "doc_id": "doc_01",
        "doc_title": "30-Day Return & Refund Policy 2026",
        "category": "returns",
        "section": "Standard 30-Day Return Window",
        "content": "Customers may return unopened or gently used merchandise within 30 calendar days of confirmed delivery for a 100% refund to original payment method.",
        "keywords": ["return", "refund", "30-day", "window", "money-back", "delivery", "policy"],
    },
    {
        "chunk_id": "chk_02",
        "doc_id": "doc_01",
        "doc_title": "30-Day Return & Refund Policy 2026",
        "category": "returns",
        "section": "Return Shipping Fees & Label Generation",
        "content": "Prepaid return shipping labels are complimentary for transit damage, defective units, or fulfillment errors. A flat $5.99 postage deduction applies to buyer remorse returns.",
        "keywords": ["label", "shipping", "fee", "defective", "damaged", "postage", "5.99"],
    },
    {
        "chunk_id": "chk_03",
        "doc_id": "doc_02",
        "doc_title": "Express Shipping & Carrier Tracking Policy",
        "category": "shipping",
        "section": "Carrier Transit SLAs & Lost In Transit Protocols",
        "content": "Parcels without carrier scan events for more than 14 consecutive days are classified as lost-in-transit. In such cases, full refunds or expedited replacement dispatch are automatically authorized.",
        "keywords": ["shipping", "carrier", "transit", "lost", "fedex", "ups", "tracking", "scan", "14 days"],
    },
    {
        "chunk_id": "chk_04",
        "doc_id": "doc_03",
        "doc_title": "2-Year Hardware Limited Warranty",
        "category": "warranty",
        "section": "Component Coverage & Repair Options",
        "content": "Hardware components including logic boards, displays, and internal lithium power cells are covered against manufacturing defects for 24 months from customer activation.",
        "keywords": ["warranty", "repair", "hardware", "defect", "power", "screen", "board", "24 months"],
    },
]


def search_knowledge(req: KnowledgeSearchRequest) -> KnowledgeSearchResponse:
    start_time = time.time()
    query_tokens = [w.lower() for w in req.query.split()]
    scored_results: List[KnowledgeChunkResult] = []

    for item in SAMPLE_CHUNKS:
        if req.category and req.category.lower() != item["category"].lower():
            continue

        # 1. Keyword overlap score (BM25 surrogate)
        content_lower = item["content"].lower()
        title_lower = item["doc_title"].lower()
        keyword_hits = sum(1 for q in query_tokens if q in content_lower or q in title_lower or q in item["keywords"])
        bm25_score = min(1.0, keyword_hits / max(1, len(query_tokens)))

        # 2. Dense semantic similarity surrogate
        base_semantic = 0.65
        if keyword_hits > 0:
            base_semantic += 0.25 * (keyword_hits / len(query_tokens))
        semantic_score = min(0.98, base_semantic)

        # 3. Hybrid fusion score
        if req.hybrid:
            final_score = round(0.6 * semantic_score + 0.4 * bm25_score, 3)
        else:
            final_score = round(semantic_score, 3)

        if final_score >= req.similarity_threshold:
            scored_results.append(
                KnowledgeChunkResult(
                    chunk_id=item["chunk_id"],
                    doc_id=item["doc_id"],
                    doc_title=item["doc_title"],
                    category=item["category"],
                    section=item["section"],
                    content=item["content"],
                    similarity_score=final_score,
                    token_count=len(item["content"].split()),
                )
            )

    # Sort descending by similarity score
    scored_results.sort(key=lambda x: x.similarity_score, reverse=True)
    top_results = scored_results[: req.top_k]

    execution_time = round((time.time() - start_time) * 1000, 2)
    strategy = "Hybrid RRF (Dense Vector + BM25 Sparse)" if req.hybrid else "Dense Cosine Similarity Only"

    return KnowledgeSearchResponse(
        query=req.query,
        total_matches=len(scored_results),
        retrieval_strategy=strategy,
        execution_time_ms=execution_time,
        results=top_results,
    )


def upload_knowledge_doc(req: KnowledgeUploadRequest) -> KnowledgeDocResponse:
    now = datetime.now(timezone.utc)
    words = req.content.split()
    token_est = len(words)
    chunk_size = 80
    chunks_created = max(1, math.ceil(len(words) / chunk_size))

    doc_id = f"doc_{int(time.time())}"
    for i in range(chunks_created):
        chunk_words = words[i * chunk_size : (i + 1) * chunk_size]
        SAMPLE_CHUNKS.append({
            "chunk_id": f"{doc_id}_chk_{i+1}",
            "doc_id": doc_id,
            "doc_title": req.title,
            "category": req.category,
            "section": f"Section {i+1}",
            "content": " ".join(chunk_words),
            "keywords": [w.lower() for w in req.title.split()],
        })

    return KnowledgeDocResponse(
        doc_id=doc_id,
        title=req.title,
        category=req.category,
        token_count=token_est,
        chunks_created=chunks_created,
        created_at=now,
    )
