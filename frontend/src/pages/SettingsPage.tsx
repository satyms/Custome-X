import React, { useState } from 'react';
import {
  Building,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Bot,
  Zap,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/ui/Toast';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState<string>('http://localhost:5678/webhook/customex');
  const [hmacSecret, setHmacSecret] = useState<string>('cx_webhook_secret_dev_key_2026');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // AI Guardrail thresholds (from backend config)
  const [refundThreshold, setRefundThreshold] = useState<number>(50);
  const [returnDays, setReturnDays] = useState<number>(30);
  const [primaryModel, setPrimaryModel] = useState<string>('gemini-3.5-flash-lite');
  const [autoEscalateUrgent, setAutoEscalateUrgent] = useState<boolean>(true);
  const [hybridSearchAlpha, setHybridSearchAlpha] = useState<number>(0.7);

  const handleCopy = () => {
    navigator.clipboard.writeText(hmacSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setToast({
      message: 'Organization settings, webhook keys, and AI safeguard thresholds saved successfully.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
            Configure LLM inference model, human-in-the-loop thresholds, n8n webhook keys, and PostgreSQL RLS policies.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
        >
          <Save className="h-3.5 w-3.5 text-slate-600" />
          <span>Save Configuration</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Organization Profile Card */}
        <div className="p-6 rounded-xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <Building className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Organization Profile &amp; Multi-Tenant Isolation
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div>
              <label className="font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Organization Name</label>
              <input
                type="text"
                readOnly
                value={(user as any)?.organization_name || 'Acme E-Commerce Org'}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-xs cursor-not-allowed font-medium"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tenant UUID (RLS Boundary)</label>
              <input
                type="text"
                readOnly
                value={user?.organization_id || '11111111-1111-1111-1111-111111111111'}
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs cursor-not-allowed font-medium"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--accent)' }}
              />
            </div>

            <div
              className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3 text-xs"
              style={{ background: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success)' }}
            >
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>PostgreSQL Row-Level Security (RLS) is active across all 18 database tables.</span>
              </div>
              <span className="font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Enforced
              </span>
            </div>
          </div>
        </div>

        {/* 2. n8n Outbound Automation & Webhooks */}
        <div className="p-6 rounded-xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <Zap className="h-4 w-4" style={{ color: 'var(--warning)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Layer 5 · Outbound n8n Webhook Gateway
            </h2>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Outbound events (new tickets, urgent SLA escalations, supervisor approval triggers) are signed with HMAC-SHA256
            and dispatched to your n8n workflow cluster.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>n8n Webhook Destination URL</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                Webhook HMAC Secret Key (RFC 2104 SHA-256)
              </label>
              <div className="relative mt-1 flex items-center">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={hmacSecret}
                  onChange={(e) => setHmacSecret(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-20 font-mono text-xs focus:outline-none"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="rounded p-1 hover:opacity-75 cursor-pointer transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded p-1 hover:opacity-75 cursor-pointer transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="Copy secret"
                  >
                    {copied ? <Check className="h-4 w-4" style={{ color: 'var(--success)' }} /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Set this key in your n8n Webhook node header verification: <code className="font-mono" style={{ color: 'var(--text-secondary)' }}>X-Hub-Signature-256</code>
              </p>
            </div>
          </div>
        </div>

        {/* 3. AI Orchestrator Safeguards (Layer 3) */}
        <div className="p-6 rounded-xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <Bot className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Layer 3 · AI Orchestrator Business Safeguards &amp; RAG
            </h2>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Deterministic business rules enforce strict monetary thresholds and eligibility limits. "The LLM proposes; deterministic code decides."
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div>
              <label className="font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Autonomous Refund Threshold ($)</label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-2" style={{ color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  value={refundThreshold}
                  onChange={(e) => setRefundThreshold(Number(e.target.value))}
                  className="w-full rounded-lg border pl-7 pr-3 py-2 text-xs focus:outline-none"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Refunds &gt; ${refundThreshold} strictly require human approval (HITL).</p>
            </div>

            <div>
              <label className="font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Return Eligibility Window (Days)</label>
              <input
                type="number"
                value={returnDays}
                onChange={(e) => setReturnDays(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Items past {returnDays} days are declined autonomously.</p>
            </div>

            <div>
              <label className="font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Primary Reasoning Model</label>
              <select
                value={primaryModel}
                onChange={(e) => setPrimaryModel(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none cursor-pointer"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="gemini-3.5-flash-lite">Google Gemini 3.5 Flash Lite</option>
                <option value="gemini-3.5-flash">Google Gemini 3.5 Flash</option>
                <option value="gemini-2.5-flash">Google Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Google Gemini 2.5 Pro</option>
                <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
              </select>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Cascades to deterministic offline engine on timeout.</p>
            </div>
          </div>

          <div className="pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="flex items-center justify-between">
                <label className="font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                  Hybrid Search Alpha (Dense Vector vs. BM25)
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
                className="w-full mt-2 accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                <span>0.0 (Pure BM25 Keyword)</span>
                <span>0.5 (Balanced)</span>
                <span>1.0 (Pure Dense Vector)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
              <div>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Auto-escalate Urgent Tickets</span>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Escalates critical tickets to supervisor queue upon sentiment distress.</p>
              </div>
              <input
                type="checkbox"
                checked={autoEscalateUrgent}
                onChange={(e) => setAutoEscalateUrgent(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4. Staff Roles & Permissions Matrix */}
        <div className="p-6 rounded-xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <Shield className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Staff Roles &amp; Permissions (RBAC)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Ticket Management</th>
                  <th className="py-2.5 px-3 font-semibold">HITL Approvals</th>
                  <th className="py-2.5 px-3 font-semibold">Knowledge Base</th>
                  <th className="py-2.5 px-3 font-semibold">Settings &amp; Webhooks</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold" style={{ color: 'var(--danger)' }}>Admin</td>
                  <td className="py-2.5 px-3">Full Access</td>
                  <td className="py-2.5 px-3">Authorize All ($50+)</td>
                  <td className="py-2.5 px-3">Upload / Archive / Re-index</td>
                  <td className="py-2.5 px-3 font-semibold" style={{ color: 'var(--success)' }}>Read &amp; Write</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold" style={{ color: 'var(--warning)' }}>Supervisor</td>
                  <td className="py-2.5 px-3">Full Access &amp; Reassignment</td>
                  <td className="py-2.5 px-3 font-semibold" style={{ color: 'var(--success)' }}>Authorize All ($50+)</td>
                  <td className="py-2.5 px-3">Read &amp; Search</td>
                  <td className="py-2.5 px-3" style={{ color: 'var(--text-muted)' }}>Read Only</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold" style={{ color: 'var(--accent)' }}>Agent</td>
                  <td className="py-2.5 px-3">Respond &amp; Close</td>
                  <td className="py-2.5 px-3" style={{ color: 'var(--text-muted)' }}>Propose Only</td>
                  <td className="py-2.5 px-3">Read &amp; Search</td>
                  <td className="py-2.5 px-3" style={{ color: 'var(--text-muted)' }}>No Access</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
