import React, { useState } from 'react';
import { Toast } from '../components/ui/Toast';
import { knowledgeApi, type KnowledgeChunkResult } from '../api';
import {
  Search,
  Upload,
  Layers,
  Sparkles,
  Sliders,
  Hash,
  X,
  Database,
  Loader2,
} from 'lucide-react';

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: 'returns' | 'shipping' | 'warranty' | 'payments' | 'faq';
  format: 'markdown' | 'pdf' | 'html';
  tokenCount: number;
  chunkCount: number;
  embeddingModel: string;
  updatedAt: string;
  content: string;
  chunks: KnowledgeChunk[];
}

export interface KnowledgeChunk {
  id: string;
  chunkIndex: number;
  tokenCount: number;
  similarityScore?: number;
  metadata: {
    section: string;
    category: string;
    policyVersion: string;
    effectiveDate: string;
  };
  content: string;
  embeddingSnippet: number[];
}

const SAMPLE_DOCS: KnowledgeDocument[] = [
  {
    id: 'DOC-001',
    title: 'Customer Return & Refund Policy 2026',
    category: 'returns',
    format: 'markdown',
    tokenCount: 1420,
    chunkCount: 3,
    embeddingModel: 'text-embedding-004 (768d)',
    updatedAt: '2026-02-14',
    content: `# Return and Refund Policy
Section 1: 30-Day Window. Customers may return unused products within 30 days of confirmed delivery for a full refund back to original payment method.
Section 2: Return Shipping. Defective items or shipping errors qualify for prepaid return labels. Buyer remorse returns require a $5.99 return postage deduction.
Section 3: Instant Exchange. Agents may issue instant replacement units for high-value VIP accounts prior to warehouse receipt.`,
    chunks: [
      {
        id: 'CHK-001-A',
        chunkIndex: 0,
        tokenCount: 480,
        similarityScore: 0.94,
        metadata: {
          section: 'Standard 30-Day Return Window',
          category: 'returns',
          policyVersion: 'v2.4',
          effectiveDate: '2026-01-01',
        },
        content: 'Customers may return unopened or gently used merchandise within 30 calendar days of confirmed delivery for a 100% refund to original payment method.',
        embeddingSnippet: [0.0412, -0.0189, 0.0823, -0.0541, 0.0211],
      },
      {
        id: 'CHK-001-B',
        chunkIndex: 1,
        tokenCount: 510,
        similarityScore: 0.88,
        metadata: {
          section: 'Return Shipping Fees & Label Generation',
          category: 'returns',
          policyVersion: 'v2.4',
          effectiveDate: '2026-01-01',
        },
        content: 'Prepaid return shipping labels are complimentary for transit damage, defective units, or fulfillment errors. A flat $5.99 postage deduction applies to buyer remorse returns.',
        embeddingSnippet: [-0.0123, 0.0762, -0.0345, 0.0912, 0.0045],
      },
      {
        id: 'CHK-001-C',
        chunkIndex: 2,
        tokenCount: 430,
        similarityScore: 0.79,
        metadata: {
          section: 'Instant VIP Replacement Protocol',
          category: 'returns',
          policyVersion: 'v2.4',
          effectiveDate: '2026-01-01',
        },
        content: 'Supervisors may authorize an immediate advance replacement dispatch for Tier-1 VIP accounts without awaiting return consignment receipt at fulfillment center.',
        embeddingSnippet: [0.0331, -0.0418, 0.0621, -0.0098, 0.0514],
      },
    ],
  },
  {
    id: 'DOC-002',
    title: 'Express Shipping & Carrier Tracking Policy',
    category: 'shipping',
    format: 'markdown',
    tokenCount: 980,
    chunkCount: 2,
    embeddingModel: 'text-embedding-004 (768d)',
    updatedAt: '2026-02-01',
    content: `# Express Shipping SLAs
Orders placed before 2 PM EST ship the same business day via FedEx Ground or Priority Air.
Transit delay protocols: Inquiries on parcels idle for >7 days trigger carrier trace tickets automatically. Parcels idle for >14 days are classified lost-in-transit.`,
    chunks: [
      {
        id: 'CHK-002-A',
        chunkIndex: 0,
        tokenCount: 420,
        similarityScore: 0.89,
        metadata: {
          section: 'Fulfillment Cutoff & Carrier Selection',
          category: 'shipping',
          policyVersion: 'v3.1',
          effectiveDate: '2026-01-15',
        },
        content: 'Orders placed before 2:00 PM EST ship same business day via FedEx Ground. Priority Air cut-off is strictly 12:00 PM EST.',
        embeddingSnippet: [-0.0519, 0.0332, 0.0118, -0.0782, 0.0441],
      },
      {
        id: 'CHK-002-B',
        chunkIndex: 1,
        tokenCount: 560,
        similarityScore: 0.95,
        metadata: {
          section: 'Lost-in-Transit Thresholds & Claims',
          category: 'shipping',
          policyVersion: 'v3.1',
          effectiveDate: '2026-01-15',
        },
        content: 'Parcels without carrier scan events for more than 14 consecutive days are classified as lost-in-transit. In such cases, full refunds or expedited replacement dispatch are automatically authorized.',
        embeddingSnippet: [0.0612, -0.0245, 0.0991, 0.0123, -0.0381],
      },
    ],
  },
  {
    id: 'DOC-003',
    title: '2-Year Limited Hardware Warranty Terms',
    category: 'warranty',
    format: 'markdown',
    tokenCount: 1120,
    chunkCount: 1,
    embeddingModel: 'text-embedding-004 (768d)',
    updatedAt: '2026-01-20',
    content: `# Hardware Warranty
All devices carry a 2-year manufacturer warranty against hardware defects. Accidental liquid damage requires the Care+ supplemental plan.`,
    chunks: [
      {
        id: 'CHK-003-A',
        chunkIndex: 0,
        tokenCount: 460,
        similarityScore: 0.91,
        metadata: {
          section: 'Manufacturer Coverage Scope',
          category: 'warranty',
          policyVersion: 'v1.8',
          effectiveDate: '2025-11-15',
        },
        content: 'Covers internal power supplies, motherboard circuitry, and display panel defects for 24 months from activation date.',
        embeddingSnippet: [0.0812, 0.0214, -0.0619, 0.0418, 0.0911],
      },
    ],
  },
];

export const KnowledgePage: React.FC = () => {
  const [docs, setDocs] = useState<KnowledgeDocument[]>(SAMPLE_DOCS);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument>(SAMPLE_DOCS[0]);
  const [selectedChunk, setSelectedChunk] = useState<KnowledgeChunk | null>(SAMPLE_DOCS[0].chunks[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.75);
  const [hybridSearch, setHybridSearch] = useState<boolean>(true);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocCategory, setNewDocCategory] = useState<'returns' | 'shipping' | 'warranty' | 'payments' | 'faq'>('returns');
  const [newDocContent, setNewDocContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [liveSearchResults, setLiveSearchResults] = useState<KnowledgeChunkResult[] | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setLiveSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await knowledgeApi.search({
        query: searchQuery,
        threshold: similarityThreshold,
        top_k: 4,
        organization_id: '11111111-1111-1111-1111-111111111111',
      });
      setLiveSearchResults(res.results);
      setToast({
        type: 'success',
        text: `RAG search completed: found ${res.total_matches} matching chunk(s) in ${res.latency_ms}ms`,
      });
    } catch (err) {
      console.warn('RAG search error:', err);
      setToast({
        type: 'error',
        text: 'Live hybrid search failed. Showing local matches.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      setToast({ type: 'error', text: 'Document title and content are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await knowledgeApi.upload({
        title: newDocTitle,
        content: newDocContent,
        category: newDocCategory,
        document_type: 'policy',
        version: 'v1.0',
        status: 'active',
      });

      const newDoc: KnowledgeDocument = {
        id: res.doc_id || `DOC-00${docs.length + 1}`,
        title: res.title || newDocTitle,
        category: newDocCategory,
        format: 'markdown',
        tokenCount: res.token_count || Math.round(newDocContent.length / 4),
        chunkCount: res.chunks_created || 2,
        embeddingModel: 'text-embedding-004 (768d)',
        updatedAt: new Date().toISOString().split('T')[0],
        content: newDocContent,
        chunks: [
          {
            id: `CHK-${docs.length + 1}-A`,
            chunkIndex: 0,
            tokenCount: Math.round(newDocContent.length / 8),
            similarityScore: 0.92,
            metadata: {
              section: newDocTitle,
              category: newDocCategory,
              policyVersion: 'v1.0',
              effectiveDate: new Date().toISOString().split('T')[0],
            },
            content: newDocContent.slice(0, 300),
            embeddingSnippet: [0.0219, -0.0614, 0.1182, 0.0415, -0.0219],
          },
        ],
      };

      setDocs((prev) => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
      setSelectedChunk(newDoc.chunks[0]);
      setUploadModalOpen(false);
      setNewDocTitle('');
      setNewDocContent('');
      setToast({
        type: 'success',
        text: `Document "${newDoc.title}" successfully ingested and embedded into pgvector (${res.chunks_created} chunks).`,
      });
    } catch (err) {
      console.warn('Backend ingestion error:', err);
      setToast({
        type: 'error',
        text: 'Document ingestion failed. Please verify database connectivity.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.text} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Knowledge Base &amp; RAG Inspector
            </h1>
            <span
              className="px-2 py-0.5 rounded-full border text-xs font-mono font-medium flex items-center gap-1.5"
              style={{ background: 'var(--success-light)', color: 'var(--success)', borderColor: 'var(--border)' }}
            >
              <Database className="h-3 w-3" />
              pgvector (768d) + FTS
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Search ingested policy documents, inspect Reciprocal Rank Fusion scores, and embed new knowledge.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
        >
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* RAG Search & Threshold Simulator Bar */}
      <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies or test RAG query (e.g., 'What is return window on open items?')..."
              className="w-full pl-10 pr-10 py-2 rounded-lg border text-xs focus:outline-none"
              style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setLiveSearchResults(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-75 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            style={{ background: 'var(--accent)' }}
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>Test RAG Query</span>
          </button>

          {/* Threshold Slider */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
            <Sliders className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Cutoff:</span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{(similarityThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-20 accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Hybrid Mode Badge */}
          <button
            type="button"
            onClick={() => setHybridSearch(!hybridSearch)}
            className="px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-2"
            style={{
              background: hybridSearch ? 'var(--accent-light)' : 'transparent',
              color: hybridSearch ? 'var(--accent)' : 'var(--text-muted)',
              borderColor: 'var(--border)',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Hybrid (Dense + BM25)</span>
          </button>
        </form>
      </div>

      {/* Live RAG Search Results Drawer (if active) */}
      {liveSearchResults && (
        <div
          className="p-5 rounded-xl border space-y-3"
          style={{ background: 'var(--accent-light)', borderColor: 'var(--accent)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--accent)', fontFamily: "'Space Grotesk', sans-serif" }}>
                Live PostgreSQL Hybrid Search Matches ({liveSearchResults.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setLiveSearchResults(null)}
              className="text-xs hover:opacity-75 flex items-center gap-1 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="h-3.5 w-3.5" />
              <span>Dismiss</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveSearchResults.map((chunk, idx) => (
              <div
                key={chunk.chunk_id || idx}
                className="p-3.5 rounded-xl border space-y-2 text-xs shadow-sm"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{chunk.doc_title || 'Document Chunk'}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      RRF: {chunk.hybrid_score.toFixed(4)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                      Dense: {chunk.dense_score.toFixed(3)}
                    </span>
                  </div>
                </div>
                <p className="leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{chunk.content}</p>
                <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <span>{chunk.section || chunk.category}</span>
                  <span>{chunk.token_count} tokens</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Split: Document Library & Chunk Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Documents List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs px-1" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Ingested Policy Documents</span>
            <span>{filteredDocs.length} Total</span>
          </div>

          <div className="space-y-2.5">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDoc.id === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedDoc(doc);
                    setSelectedChunk(doc.chunks[0] || null);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected ? 'shadow-sm' : 'hover:bg-slate-50'
                  }`}
                  style={{
                    background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>{doc.id}</span>
                    <span
                      className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-medium"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      {doc.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold mb-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{doc.title}</h3>

                  <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="h-3 w-3" />
                        {doc.chunkCount} chunks
                      </span>
                      <span className="font-mono">{doc.tokenCount} tokens</span>
                    </div>
                    <span>{doc.updatedAt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chunk Inspector & Embedding Vector Inspector */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl border space-y-5 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {/* Active Document Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>{selectedDoc.id}</span>
                <h2 className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selectedDoc.title}
                </h2>
                <div className="flex items-center gap-3 text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                  <span>Embedding: {selectedDoc.embeddingModel}</span>
                  <span>•</span>
                  <span>Tokens: ~{selectedDoc.tokenCount}</span>
                </div>
              </div>
              <span
                className="px-2.5 py-1 rounded-lg border text-xs font-mono"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
              >
                {selectedDoc.embeddingModel}
              </span>
            </div>

            {/* Chunk Selector Pills */}
            <div className="space-y-2">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Layers className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                <span>Vector Chunks ({selectedDoc.chunks.length})</span>
              </span>

              <div className="flex flex-wrap gap-2">
                {selectedDoc.chunks.map((chunk, idx) => {
                  const isSelected = selectedChunk?.id === chunk.id;
                  return (
                    <button
                      key={chunk.id}
                      type="button"
                      onClick={() => setSelectedChunk(chunk)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-2 border"
                      style={{
                        background: isSelected ? 'var(--accent)' : 'var(--bg-app)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                      }}
                    >
                      <span>Chunk {idx + 1}</span>
                      {chunk.similarityScore && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--success-light)',
                            color: isSelected ? '#ffffff' : 'var(--success)',
                          }}
                        >
                          {(chunk.similarityScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Chunk Content & Vector Snippet */}
            {selectedChunk ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-xs border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedChunk.metadata.section}</span>
                    <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{selectedChunk.tokenCount} tokens</span>
                  </div>
                  <p className="text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>{selectedChunk.content}</p>
                </div>

                {/* Metadata Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] block uppercase" style={{ color: 'var(--text-muted)' }}>Policy Version</span>
                    <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedChunk.metadata.policyVersion}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] block uppercase" style={{ color: 'var(--text-muted)' }}>Effective Date</span>
                    <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedChunk.metadata.effectiveDate}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] block uppercase" style={{ color: 'var(--text-muted)' }}>Category</span>
                    <span className="font-mono font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{selectedChunk.metadata.category}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] block uppercase" style={{ color: 'var(--text-muted)' }}>Index Status</span>
                    <span className="font-mono font-semibold" style={{ color: 'var(--success)' }}>Passes Filter</span>
                  </div>
                </div>

                {/* Vector Embedding Inspect Box */}
                <div className="p-3 rounded-xl border font-mono text-[11px] space-y-1.5" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                    <span>Dense Vector Embedding Preview (768d unit vector)</span>
                    <span className="font-bold" style={{ color: 'var(--accent)' }}>Cosine Similarity Active</span>
                  </div>
                  <div className="break-all p-2 rounded border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    [{selectedChunk.embeddingSnippet.join(', ')}, ...]
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Select a chunk from above to inspect text tokens and vector embeddings.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Ingest Knowledge Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="hover:opacity-75 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Document Title</label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Holiday Season Extended Return Window"
                  className="w-full border rounded-lg px-3.5 py-2 text-xs focus:outline-none"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Category</label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value as any)}
                  className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="returns">Returns &amp; Refunds</option>
                  <option value="shipping">Shipping &amp; Delivery</option>
                  <option value="warranty">Warranty &amp; Service</option>
                  <option value="payments">Payments &amp; Fraud</option>
                  <option value="faq">Store FAQs</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Document Content (Markdown)</label>
                <textarea
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  rows={6}
                  placeholder="Paste policy terms or markdown documentation..."
                  className="w-full border rounded-lg p-3 text-xs focus:outline-none resize-none font-mono"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  style={{ background: 'var(--accent)' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Embedding...</span>
                    </>
                  ) : (
                    <span>Embed &amp; Ingest</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgePage;
