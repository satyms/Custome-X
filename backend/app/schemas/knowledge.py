from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    category: Optional[str] = None
    similarity_threshold: float = Field(0.70, ge=0.0, le=1.0)
    top_k: int = Field(5, ge=1, le=20)
    hybrid: bool = True


class KnowledgeChunkResult(BaseModel):
    chunk_id: str
    doc_id: str
    doc_title: str
    category: str
    section: str
    content: str
    similarity_score: float
    token_count: int


class KnowledgeSearchResponse(BaseModel):
    query: str
    total_matches: int
    retrieval_strategy: str
    execution_time_ms: float
    results: List[KnowledgeChunkResult] = []


class KnowledgeUploadRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    category: str = Field("general", description="returns, shipping, warranty, payments, faq")
    content: str = Field(..., min_length=10, max_length=100000)
    metadata: Dict[str, Any] = {}


class KnowledgeDocResponse(BaseModel):
    doc_id: str
    title: str
    category: str
    token_count: int
    chunks_created: int
    created_at: datetime
