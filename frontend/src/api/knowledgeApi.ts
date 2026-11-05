import apiClient from './client';

export interface KnowledgeSearchPayload {
  query: string;
  category?: string;
  top_k?: number;
  threshold?: number;
  organization_id?: string;
}

export interface KnowledgeChunkResult {
  chunk_id: string;
  doc_id: string;
  doc_title: string;
  category: string;
  section: string;
  content: string;
  similarity_score: number;
  hybrid_score: number;
  dense_score: number;
  sparse_score: number;
  token_count: number;
}

export interface KnowledgeSearchResponse {
  query: string;
  total_matches: number;
  results: KnowledgeChunkResult[];
  latency_ms: number;
}

export interface KnowledgeUploadPayload {
  title: string;
  content: string;
  document_type?: string;
  category: string;
  version?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeDocResponse {
  doc_id: string;
  title: string;
  category: string;
  token_count: number;
  chunks_created: number;
  created_at: string;
  document_type: string;
  version: string;
  status: string;
}

export const knowledgeApi = {
  async search(payload: KnowledgeSearchPayload): Promise<KnowledgeSearchResponse> {
    const res = await apiClient.post<KnowledgeSearchResponse>('/knowledge/search', payload);
    return res.data;
  },

  async upload(payload: KnowledgeUploadPayload): Promise<KnowledgeDocResponse> {
    const res = await apiClient.post<KnowledgeDocResponse>('/knowledge/upload', payload);
    return res.data;
  },

  async getCategories(): Promise<string[]> {
    const res = await apiClient.get<string[]>('/knowledge/categories');
    return res.data;
  },
};

export default knowledgeApi;
