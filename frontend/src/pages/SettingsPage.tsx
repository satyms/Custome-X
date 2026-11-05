import React, { useState } from 'react';
import {
  Shield,
  Database,
  Save,
  Key,
  CheckCircle2,
} from 'lucide-react';
import { Toast } from '../components/ui/Toast';

export const SettingsPage: React.FC = () => {
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [refundThreshold, setRefundThreshold] = useState(50);
  const [autoEscalateUrgent, setAutoEscalateUrgent] = useState(true);
  const [hybridSearchAlpha, setHybridSearchAlpha] = useState(0.7);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToast({
      type: 'success',
      text: 'Tenant parameters and agent guardrail settings successfully saved.',
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
              System &amp; Tenant Settings
            </h1>
            <span
              className="px-2 py-0.5 rounded-full border text-xs font-mono font-medium"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
            >
              Multi-Tenant Scope
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Configure LLM inference model, human-in-the-loop thresholds, and PostgreSQL RLS security policies.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
        >
          <Save className="h-4 w-4" />
          <span>Save Changes</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Agent Safety & HITL Guardrails */}
        <div className="p-5 rounded-xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <Shield className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Human-in-the-Loop Safety Guardrails
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                Max Autonomous Refund Threshold ($USD)
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={refundThreshold}
                onChange={(e) => setRefundThreshold(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <p style={{ color: 'var(--text-muted)' }}>
                Actions requesting refunds over this amount require supervisor approval in the HITL queue.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                Primary LLM Inference Model
              </label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-low latency)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep reasoning &amp; complex disputes)</option>
                <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Hybrid agentic)</option>
              </select>
              <p style={{ color: 'var(--text-muted)' }}>
                Selects the neural generation backend powering autonomous customer support routing.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
            <div>
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Auto-escalate Urgent Tickets</span>
              <p style={{ color: 'var(--text-muted)' }}>Automatically assign critical tickets to human supervisor queue upon sentiment breach.</p>
            </div>
            <input
              type="checkbox"
              checked={autoEscalateUrgent}
              onChange={(e) => setAutoEscalateUrgent(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Database & Vector Search Parameters */}
        <div className="p-5 rounded-xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <Database className="h-4 w-4" style={{ color: 'var(--success)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Database &amp; RAG Vector Search
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Hybrid Search Alpha (Dense Vector vs. BM25 Sparse Keyword)
                </label>
                <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{hybridSearchAlpha}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={hybridSearchAlpha}
                onChange={(e) => setHybridSearchAlpha(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span>0.0 (Pure BM25 Keyword)</span>
                <span>0.5 (Balanced)</span>
                <span>1.0 (Pure Dense Vector)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                Row-Level Security Enforcement
              </label>
              <div className="p-3 rounded-lg border flex items-center justify-between" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>PostgreSQL tenant_id RLS check</span>
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Enforced
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }}>
                All database queries strictly filter by current authenticated user's organization scope.
              </p>
            </div>
          </div>
        </div>

        {/* Integration Credentials */}
        <div className="p-5 rounded-xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <Key className="h-4 w-4" style={{ color: 'var(--warning)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              API Webhook Secret
            </h2>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              HMAC Signature Secret Key
            </label>
            <input
              type="password"
              value="whsec_custome_x_live_hmac_secret_key_8841920"
              readOnly
              className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
              style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            />
            <p style={{ color: 'var(--text-muted)' }}>
              Used to verify incoming Shopify and WooCommerce webhook signatures via SHA256 HMAC.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
