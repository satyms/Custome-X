import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.knowledge import (
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    KnowledgeUploadRequest,
    KnowledgeDocResponse,
)
from app.services import knowledge_service
from app.core.rate_limiter import check_ai_rate_limit

router = APIRouter()


@router.post(
    "/search",
    response_model=KnowledgeSearchResponse,
    dependencies=[Depends(check_ai_rate_limit)],
    status_code=status.HTTP_200_OK,
)
async def search_knowledge_base(
    request: KnowledgeSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    RAG Hybrid Search endpoint with token-bucket rate limiting.
    Combines dense semantic vector scoring (pgvector 768d) with sparse PostgreSQL full-text search (tsvector).
    """
    if request.organization_id is not None:
        return await knowledge_service.search_knowledge_hybrid(session=db, req=request)
    return knowledge_service.search_knowledge(request)


@router.post(
    "/upload",
    response_model=KnowledgeDocResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_knowledge_document(
    request: KnowledgeUploadRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Document Ingestion & Chunking endpoint.
    Performs deterministic chunking and indexes metadata for vector retrieval.
    """
    default_org_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    try:
        doc, chunks = await knowledge_service.ingest_document(
            session=db,
            organization_id=default_org_id,
            title=request.title,
            raw_content=request.content,
            document_type=request.document_type,
            category=request.category,
            version=request.version,
            status=request.status,
            metadata=request.metadata,
        )
        return KnowledgeDocResponse(
            doc_id=str(doc.id),
            title=doc.title,
            category=doc.category,
            token_count=sum(c.token_count for c in chunks),
            chunks_created=len(chunks),
            created_at=doc.created_at,
            document_type=doc.document_type,
            version=doc.version,
            status=doc.status,
        )
    except Exception:
        return knowledge_service.upload_knowledge_doc(request)


@router.get("/categories", response_model=List[str])
def get_knowledge_categories():
    return ["returns", "shipping", "warranty", "payments", "faq", "general"]
