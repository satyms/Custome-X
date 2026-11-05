import React, { useState } from 'react';
import { Toast } from '../components/ui/Toast';
import {
  Search,
  Upload,
  Layers,
  Sparkles,
  Sliders,
  Hash,
  X,
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
    embeddingModel: 'text-embedding-3-small (1536d)',
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
          section: 'Section 1: 30-Day Window',
          category: 'returns',
          policyVersion: 'v2.4',
          effectiveDate: '2026-01-01',
        },
        content: 'Customers may initiate returns within 30 calendar days from parcel delivery confirmation. Items must include original packaging and barcode tags intact.',
        embeddingSnippet: [0.0381, -0.0912, 0.1425, -0.0124, 0.0819],
      },
      {
        id: 'CHK-001-B',
        chunkIndex: 1,
        tokenCount: 512,
        similarityScore: 0.88,
        metadata: {
          section: 'Section 2: Return Shipping & Fees',
          category: 'returns',
          policyVersion: 'v2.4',
          effectiveDate: '2026-01-01',
        },
        content: 'Prepaid shipping labels are provided free for defective units, transit damage, or store fulfillment errors. A flat $5.99 fee is deducted for customer remorse returns.',
        embeddingSnippet: [0.0142, -0.0418, 0.0991, 0.0315, -0.0612],
      },
      {
        id: 'CHK-001-C',
        chunkIndex: 2,
        tokenCount: 428,
        similarityScore: 0.79,
        metadata: {
          section: 'Section 3: VIP Instant Exchange',
          category: 'returns',
          policyVersion: 'v2.4',
          effectiveDate: '2026-01-01',
        },
        content: 'VIP customer tier qualifies for instant replacement dispatch before courier pickup scan, guarded by maximum $500 escrow limit.',
        embeddingSnippet: [0.0521, 0.0118, -0.0341, 0.1192, 0.0421],
      },
    ],
  },
  {
    id: 'DOC-002',
    title: 'International Shipping & Customs Clearance Guidelines',
    category: 'shipping',
    format: 'pdf',
    tokenCount: 2890,
    chunkCount: 5,
    embeddingModel: 'text-embedding-3-small (1536d)',
    updatedAt: '2026-03-01',
    content: `# International Shipping Policy
Global delivery transit estimates: European Union (3-5 days), Asia-Pacific (5-7 days), Americas (2-4 days).
Customs duty and VAT are calculated at checkout with DDP (Delivered Duty Paid) terms.`,
    chunks: [
      {
        id: 'CHK-002-A',
        chunkIndex: 0,
        tokenCount: 512,
        similarityScore: 0.82,
        metadata: {
          section: 'Transit Estimates & Carriers',
          category: 'shipping',
          policyVersion: 'v3.1',
          effectiveDate: '2026-02-01',
        },
        content: 'Cross-border express consignments are routed via DHL Express and FedEx International Priority with real-time milestone scan webhooks.',
        embeddingSnippet: [-0.0128, 0.0841, 0.0519, -0.0914, 0.0318],
      },
      {
        id: 'CHK-002-B',
        chunkIndex: 1,
        tokenCount: 490,
        similarityScore: 0.76,
        metadata: {
          section: 'DDP Duty & Tax Settlement',
          category: 'shipping',
          policyVersion: 'v3.1',
          effectiveDate: '2026-02-01',
        },
        content: 'All orders qualify for Delivered Duty Paid settlement. Customers incur no supplemental carrier disbursements upon delivery.',
        embeddingSnippet: [0.0441, -0.0219, 0.0712, 0.0189, -0.0512],
      },
    ],
  },
  {
    id: 'DOC-003',
    title: 'Hardware Limited Warranty & Replacement Terms',
    category: 'warranty',
    format: 'markdown',
    tokenCount: 1950,
    chunkCount: 4,
    embeddingModel: 'text-embedding-3-small (1536d)',
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      setToast({ type: 'error', text: 'Document title and content are required.' });
      return;
    }

    const newDoc: KnowledgeDocument = {
      id: `DOC-00${docs.length + 1}`,
      title: newDocTitle,
      category: newDocCategory,
      format: 'markdown',
      tokenCount: Math.round(newDocContent.length / 4),
      chunkCount: 2,
      embeddingModel: 'text-embedding-3-small (1536d)',
      updatedAt: new Date().toISOString().split('T')[0],
      content: newDocContent,
      chunks: [
        {
          id: `CHK-${docs.length + 1}-A`,
          chunkIndex: 0,
          tokenCount: Math.round(newDocContent.length / 8),
          similarityScore: 0.92,
          metadata: {
            section: 'Introduction & Core Terms',
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
      text: `Document "${newDoc.title}" ingested & embedded with 2 vector chunks.`,
    });
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
              className="px-2 py-0.5 rounded-full border text-xs font-mono font-medium"
              style={{ background: 'var(--success-light)', color: 'var(--success)', borderColor: 'var(--border)' }}
            >
              pgvector 1536d
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Search ingested policy documents, inspect vector chunk tokens, and simulate similarity queries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5 text-slate-600" />
          <span>+ Upload Document</span>
        </button>
      </div>

      {/* RAG Search & Threshold Simulator Bar */}
      <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies or test RAG query (e.g., 'What is return window on open items?')..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border text-xs focus:outline-none"
              style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Threshold Slider */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
            <Sliders className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Similarity Cutoff:</span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{(similarityThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-24 accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Hybrid Mode Toggle */}
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
            <span>Hybrid Search (Dense + BM25)</span>
          </button>
        </div>
      </div>

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
                    isSelected
                      ? 'border-indigo-500 shadow-sm'
                      : 'hover:bg-slate-50'
                  }`}
                  style={{
                    background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent)' }}>{doc.id}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      {doc.format}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{doc.title}</h3>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1 font-mono">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{doc.chunkCount} Chunks</span>
                    </span>
                    <span>•</span>
                    <span className="capitalize">{doc.category}</span>
                    <span>•</span>
                    <span>Updated {doc.updatedAt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chunk Inspector & Embedding Visualizer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl border space-y-5 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {/* Active Document Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>{selectedDoc.id}</span>
                <h2 className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{selectedDoc.title}</h2>
                <div className="flex items-center gap-3 text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                  <span>Embedding: {selectedDoc.embeddingModel}</span>
                  <span>•</span>
                  <span>Tokens: ~{selectedDoc.tokenCount}</span>
                </div>
              </div>
            </div>

            {/* Chunks Navigation Bar */}
            <div className="space-y-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Vector Chunks in Document:
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedDoc.chunks.map((chunk) => {
                  const isChunkActive = selectedChunk?.id === chunk.id;
                  return (
                    <button
                      key={chunk.id}
                      type="button"
                      onClick={() => setSelectedChunk(chunk)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-2 border"
                      style={{
                        background: isChunkActive ? 'var(--accent)' : 'var(--bg-app)',
                        color: isChunkActive ? '#ffffff' : 'var(--text-secondary)',
                        borderColor: isChunkActive ? 'var(--accent)' : 'var(--border)',
                      }}
                    >
                      <Hash className="h-3 w-3" />
                      <span>Chunk {chunk.chunkIndex + 1}</span>
                      {chunk.similarityScore && (
                        <span
                          className="text-[10px] px-1 rounded font-bold"
                          style={{
                            background: isChunkActive ? 'rgba(255,255,255,0.2)' : 'var(--success-light)',
                            color: isChunkActive ? '#ffffff' : 'var(--success)',
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

            {/* Selected Chunk Content & Metadata */}
            {selectedChunk && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {selectedChunk.metadata.section}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {selectedChunk.tokenCount} Tokens
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                    {selectedChunk.content}
                  </p>
                </div>

                {/* Metadata & Vector Embedding Snippet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border space-y-1" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                    <span className="font-semibold block" style={{ color: 'var(--text-muted)' }}>Chunk Metadata</span>
                    <div className="space-y-0.5 font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      <div>Category: {selectedChunk.metadata.category}</div>
                      <div>Policy Version: {selectedChunk.metadata.policyVersion}</div>
                      <div>Effective: {selectedChunk.metadata.effectiveDate}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border space-y-1" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                    <span className="font-semibold block" style={{ color: 'var(--text-muted)' }}>
                      Vector Snippet (1536-dim)
                    </span>
                    <p className="font-mono text-[11px] break-all leading-tight" style={{ color: 'var(--accent)' }}>
                      [{selectedChunk.embeddingSnippet.join(', ')}, ...]
                    </p>
                  </div>
                </div>
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
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Upload className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                <span>Upload &amp; Embed Knowledge Doc</span>
              </h3>
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
                  className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-slate-50"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-sm cursor-pointer"
                  style={{ background: 'var(--accent)' }}
                >
                  Embed &amp; Ingest
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
