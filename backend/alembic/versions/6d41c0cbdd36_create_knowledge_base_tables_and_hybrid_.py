"""create_knowledge_base_tables_and_hybrid_search

Revision ID: 6d41c0cbdd36
Revises: fe03307bf532
Create Date: 2026-11-05 19:07:42.536019

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d41c0cbdd36'
down_revision: Union[str, Sequence[str], None] = 'fe03307bf532'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure pgvector extension is available
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Create knowledge_documents table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.knowledge_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            document_type VARCHAR(100) NOT NULL DEFAULT 'policy',
            category VARCHAR(100) NOT NULL DEFAULT 'general',
            version VARCHAR(50) NOT NULL DEFAULT '1.0',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            raw_content TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT check_valid_knowledge_doc_status CHECK (status IN ('active', 'archived', 'draft'))
        );
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_kdocs_org_status ON public.knowledge_documents(organization_id, status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_kdocs_org_category ON public.knowledge_documents(organization_id, category);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_kdocs_org_id ON public.knowledge_documents(organization_id);")

    # 3. Create knowledge_chunks table with vector(768) and tsvector generated column
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
            organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL DEFAULT 0,
            section VARCHAR(255) NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            token_count INTEGER NOT NULL DEFAULT 0,
            embedding vector(768),
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            tsv_content tsvector GENERATED ALWAYS AS (
                to_tsvector('english', coalesce(section, '') || ' ' || coalesce(content, ''))
            ) STORED,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_kchunks_doc_idx ON public.knowledge_chunks(document_id, chunk_index);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_kchunks_org_id ON public.knowledge_chunks(organization_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_hnsw ON public.knowledge_chunks USING hnsw (embedding vector_cosine_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_kchunks_tsv_gin ON public.knowledge_chunks USING gin (tsv_content);")

    # 4. Enable Row Level Security (RLS)
    op.execute("ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;")

    op.execute("""
        CREATE POLICY "knowledge_documents_tenant_isolation_policy" ON public.knowledge_documents
        FOR ALL TO authenticated
        USING (organization_id = (SELECT public.get_auth_organization_id()))
        WITH CHECK (organization_id = (SELECT public.get_auth_organization_id()));
    """)

    op.execute("""
        CREATE POLICY "knowledge_chunks_tenant_isolation_policy" ON public.knowledge_chunks
        FOR ALL TO authenticated
        USING (organization_id = (SELECT public.get_auth_organization_id()))
        WITH CHECK (organization_id = (SELECT public.get_auth_organization_id()));
    """)

    # 5. Hybrid Search Stored Procedure using Reciprocal Rank Fusion (RRF)
    op.execute("""
        CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
            query_embedding vector(768) DEFAULT NULL,
            query_text text DEFAULT NULL,
            match_count int DEFAULT 5,
            filter_org_id uuid DEFAULT NULL,
            filter_category text DEFAULT NULL,
            filter_status text DEFAULT 'active',
            rrf_k int DEFAULT 60
        )
        RETURNS TABLE (
            chunk_id uuid,
            document_id uuid,
            organization_id uuid,
            chunk_index int,
            section text,
            content text,
            token_count int,
            category text,
            doc_title text,
            doc_version text,
            doc_status text,
            similarity_score double precision,
            dense_score double precision,
            sparse_score double precision
        )
        LANGUAGE plpgsql
        STABLE
        AS $$
        BEGIN
            RETURN QUERY
            WITH doc_filtered AS (
                SELECT 
                    d.id as doc_id,
                    d.title as doc_title,
                    d.category as doc_category,
                    d.version as doc_version,
                    d.status as doc_status
                FROM public.knowledge_documents d
                WHERE (filter_org_id IS NULL OR d.organization_id = filter_org_id)
                  AND (filter_status IS NULL OR d.status = filter_status)
                  AND (filter_category IS NULL OR d.category = filter_category)
            ),
            dense_candidates AS (
                SELECT 
                    c.id,
                    ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding ASC) as dense_rank,
                    (1.0 - (c.embedding <=> query_embedding)) as raw_dense_score
                FROM public.knowledge_chunks c
                JOIN doc_filtered d ON c.document_id = d.doc_id
                WHERE query_embedding IS NOT NULL
                  AND c.embedding IS NOT NULL
                  AND (filter_org_id IS NULL OR c.organization_id = filter_org_id)
                ORDER BY c.embedding <=> query_embedding ASC
                LIMIT LEAST(match_count * 4, 100)
            ),
            sparse_candidates AS (
                SELECT 
                    c.id,
                    ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.tsv_content, plainto_tsquery('english', query_text)) DESC) as sparse_rank,
                    ts_rank_cd(c.tsv_content, plainto_tsquery('english', query_text)) as raw_sparse_score
                FROM public.knowledge_chunks c
                JOIN doc_filtered d ON c.document_id = d.doc_id
                WHERE query_text IS NOT NULL 
                  AND query_text <> ''
                  AND c.tsv_content @@ plainto_tsquery('english', query_text)
                  AND (filter_org_id IS NULL OR c.organization_id = filter_org_id)
                ORDER BY ts_rank_cd(c.tsv_content, plainto_tsquery('english', query_text)) DESC
                LIMIT LEAST(match_count * 4, 100)
            ),
            combined AS (
                SELECT 
                    COALESCE(d.id, s.id) as chunk_id,
                    COALESCE(d.raw_dense_score, 0.0)::double precision as d_score,
                    COALESCE(s.raw_sparse_score, 0.0)::double precision as s_score,
                    (
                        COALESCE(1.0 / (rrf_k + d.dense_rank), 0.0) +
                        COALESCE(1.0 / (rrf_k + s.sparse_rank), 0.0)
                    )::double precision as rrf_score
                FROM dense_candidates d
                FULL OUTER JOIN sparse_candidates s ON d.id = s.id
            )
            SELECT 
                c.id as chunk_id,
                c.document_id,
                c.organization_id,
                c.chunk_index,
                c.section::text,
                c.content::text,
                c.token_count,
                d.doc_category::text as category,
                d.doc_title::text as doc_title,
                d.doc_version::text as doc_version,
                d.doc_status::text as doc_status,
                comb.rrf_score as similarity_score,
                comb.d_score as dense_score,
                comb.s_score as sparse_score
            FROM combined comb
            JOIN public.knowledge_chunks c ON comb.chunk_id = c.id
            JOIN doc_filtered d ON c.document_id = d.doc_id
            ORDER BY comb.rrf_score DESC
            LIMIT match_count;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS public.match_knowledge_chunks;")
    op.execute('DROP POLICY IF EXISTS "knowledge_chunks_tenant_isolation_policy" ON public.knowledge_chunks;')
    op.execute('DROP POLICY IF EXISTS "knowledge_documents_tenant_isolation_policy" ON public.knowledge_documents;')
    op.execute("DROP TABLE IF EXISTS public.knowledge_chunks CASCADE;")
    op.execute("DROP TABLE IF EXISTS public.knowledge_documents CASCADE;")
