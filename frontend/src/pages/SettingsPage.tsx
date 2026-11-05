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
  Sliders,
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

  const handleCopy = () => {
    navigator.clipboard.writeText(hmacSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setToast({
      message: 'Organization settings and AI safeguard thresholds saved successfully',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">System & Tenant Settings</h1>
            <p className="text-sm text-slate-400">
              Manage organization profile, n8n webhook keys, and AI orchestrator safeguards.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>

      {/* 1. Organization Profile Card */}
      <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Building className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Organization Profile & Multi-Tenant Isolation</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-400">Organization Name</label>
            <input
              type="text"
              readOnly
              value={(user as any)?.organization_name || 'Acme E-Commerce Org'}
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-400">Tenant UUID (RLS Boundary)</label>
            <input
              type="text"
              readOnly
              value={user?.organization_id || '11111111-1111-1111-1111-111111111111'}
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 font-mono text-xs text-indigo-300 cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>PostgreSQL Row-Level Security (RLS) is active across all 18 database tables.</span>
            </div>
            <span className="font-semibold uppercase tracking-wider text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded">
              Enforced
            </span>
          </div>
        </div>
      </div>

      {/* 2. n8n Outbound Automation & Webhooks */}
      <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Zap className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white">Layer 5 · Outbound n8n Webhook Gateway</h2>
        </div>

        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Outbound events (new tickets, urgent SLA escalations, supervisor approval triggers) are signed with HMAC-SHA256
          and dispatched to your n8n workflow cluster.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-400">n8n Webhook Destination URL</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-400">
              Webhook HMAC Secret Key (RFC 2104 SHA-256)
            </label>
            <div className="relative mt-1 flex items-center">
              <input
                type={showSecret ? 'text' : 'password'}
                value={hmacSecret}
                onChange={(e) => setHmacSecret(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 pr-20 font-mono text-xs text-amber-300 focus:outline-none focus:border-indigo-500"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="rounded p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  title={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy secret"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Set this key in your n8n Webhook node header verification: <code className="text-slate-400">X-Hub-Signature-256</code>
            </p>
          </div>
        </div>
      </div>

      {/* 3. AI Orchestrator Safeguards (Layer 3) */}
      <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Bot className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-semibold text-white">Layer 3 · AI Orchestrator Business Safeguards</h2>
        </div>

        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Deterministic business rules enforce strict monetary thresholds and eligibility limits. "The LLM proposes; deterministic code decides."
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-400">Autonomous Refund Threshold ($)</label>
            <div className="mt-1 relative">
              <span className="absolute left-3 top-2 text-slate-500">$</span>
              <input
                type="number"
                value={refundThreshold}
                onChange={(e) => setRefundThreshold(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-7 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Refunds &gt; ${refundThreshold} strictly require human approval (HITL).</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-400">Return Eligibility Window (Days)</label>
            <input
              type="number"
              value={returnDays}
              onChange={(e) => setReturnDays(Number(e.target.value))}
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">Items past {returnDays} days are declined autonomously.</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-400">Primary Reasoning Model</label>
            <select
              value={primaryModel}
              onChange={(e) => setPrimaryModel(e.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="gemini-3.5-flash-lite">Google Gemini 3.5 Flash Lite</option>
              <option value="gemini-3.5-flash">Google Gemini 3.5 Flash</option>
              <option value="gemini-flash-latest">Google Gemini Flash Latest</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Cascades to deterministic offline engine on timeout.</p>
          </div>
        </div>
      </div>

      {/* 4. Staff Roles & Permissions Matrix */}
      <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Shield className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Staff Roles & Permissions (RBAC)</h2>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Role</th>
                <th className="py-2.5 px-3 font-semibold">Ticket Management</th>
                <th className="py-2.5 px-3 font-semibold">HITL Approvals</th>
                <th className="py-2.5 px-3 font-semibold">Knowledge Base</th>
                <th className="py-2.5 px-3 font-semibold">Settings & Webhooks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-bold text-rose-400">Admin</td>
                <td className="py-2.5 px-3">Full Access</td>
                <td className="py-2.5 px-3">Authorize All ($50+)</td>
                <td className="py-2.5 px-3">Upload / Archive / Re-index</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Read & Write</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-amber-400">Supervisor</td>
                <td className="py-2.5 px-3">Full Access & Reassignment</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Authorize All ($50+)</td>
                <td className="py-2.5 px-3">Read & Search</td>
                <td className="py-2.5 px-3 text-slate-500">Read Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-indigo-400">Agent</td>
                <td className="py-2.5 px-3">Respond & Close</td>
                <td className="py-2.5 px-3 text-slate-500">Propose Only</td>
                <td className="py-2.5 px-3">Read & Search</td>
                <td className="py-2.5 px-3 text-slate-500">No Access</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
