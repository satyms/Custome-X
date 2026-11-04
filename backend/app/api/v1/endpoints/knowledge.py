from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
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
def search_knowledge_base(request: KnowledgeSearchRequest):
    """
    RAG Hybrid Search endpoint with token-bucket rate limiting.
    Combines dense semantic vector scoring with sparse BM25 keyword matching.
    """
    return knowledge_service.search_knowledge(request)


@router.post(
    "/upload",
    response_model=KnowledgeDocResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_knowledge_document(request: KnowledgeUploadRequest):
    """
    Document Ingestion & Chunking endpoint.
    Performs deterministic chunking and indexes metadata for vector retrieval.
    """
    return knowledge_service.upload_knowledge_doc(request)


@router.get("/categories", response_model=List[str])
def get_knowledge_categories():
    return ["returns", "shipping", "warranty", "payments", "faq", "general"]
