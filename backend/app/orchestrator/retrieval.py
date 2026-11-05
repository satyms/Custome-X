from typing import List, Dict, Any, Optional
from app.orchestrator.schemas import SourceCitation, RAGRetrievalResult
from app.services import knowledge_service
from app.schemas.knowledge import KnowledgeSearchRequest


class KnowledgeRetriever:
    """
    RAG Hybrid Retrieval with strict version and status filtering (AI_security.md §4.3).
    """
    @staticmethod
    def retrieve(query: str, category: Optional[str] = None, top_k: int = 3) -> RAGRetrievalResult:
        search_req = KnowledgeSearchRequest(
            query=query,
            category=category,
            top_k=top_k,
            status_filter="active",  # Enforce active version only
        )

        search_resp = knowledge_service.search_knowledge(search_req)
        chunks = []
        citations: List[SourceCitation] = []

        for item in search_resp.results:
            chunk_dict = {
                "chunk_id": item.chunk_id,
                "doc_id": item.doc_id,
                "doc_title": item.doc_title,
                "section": item.section,
                "content": item.content,
                "score": item.hybrid_score,
            }
            chunks.append(chunk_dict)

            citations.append(
                SourceCitation(
                    source_type="knowledge_chunk",
                    document_id=item.doc_id,
                    title=item.doc_title,
                    chunk_id=item.chunk_id,
                    section=item.section,
                    snippet=item.content[:150] + "..." if len(item.content) > 150 else item.content,
                )
            )

        return RAGRetrievalResult(chunks=chunks, citations=citations)
