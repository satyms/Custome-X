import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  Webhook,
} from 'lucide-react';
import { Toast } from '../components/ui/Toast';

interface AutomationWorkflow {
  id: string;
  name: string;
  trigger: string;
  destination: string;
  status: 'active' | 'paused';
  lastRun: string;
  executions: number;
  successRate: number;
  description: string;
}

const INITIAL_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: 'WF-1',
    name: 'New Ticket Ingestion & Agent Dispatch',
    trigger: 'Webhook: Shopify / WooCommerce (Order Event)',
    destination: 'POST /api/v1/tickets/webhook',
    status: 'active',
    lastRun: '1 min ago',
    executions: 1420,
    successRate: 99.8,
    description: 'Listens for customer inbound support requests, sanitizes payload, and initiates agent classification.',
  },
  {
    id: 'WF-2',
    name: 'Escalation to Human Supervisor Queue',
    trigger: 'Event: Ticket priority marked urgent / escalated',
    destination: 'Slack #urgent-support & n8n Router',
    status: 'active',
    lastRun: '14 mins ago',
    executions: 84,
    successRate: 100,
    description: 'Instantly alerts support supervisors when sentiment breaches distress thresholds or refund exceeds $50.',
  },
  {
    id: 'WF-3',
    name: 'HITL Gated Action Approval Dispatch',
    trigger: 'Action: Agent proposes financial modification',
    destination: 'POST /api/v1/approvals/evaluate',
    status: 'active',
    lastRun: '2 hours ago',
    executions: 312,
    successRate: 99.1,
    description: 'Blocks automated execution and creates an approval request record with AI rationale for staff stamp.',
  },
  {
    id: 'WF-4',
    name: 'Scheduled Knowledge ETL & Vector Refresh',
    trigger: 'Cron: Daily at 02:00 UTC',
    destination: 'Hybrid Search Index (pgvector 1536d)',
    status: 'active',
    lastRun: 'Yesterday at 02:00',
    executions: 45,
    successRate: 100,
    description: 'Re-indexes updated policy documentation and re-computes dense chunk embeddings.',
  },
];

export const AutomationsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(INITIAL_WORKFLOWS);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleStatus = (id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === id) {
          const nextStatus = wf.status === 'active' ? 'paused' : 'active';
          setToast({
            type: 'success',
            text: `Workflow ${wf.name} is now ${nextStatus}.`,
          });
          return { ...wf, status: nextStatus };
        }
        return wf;
      })
    );
  };

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.text} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Automations &amp; Webhooks
            </h1>
            <span
              className="px-2 py-0.5 rounded-full border text-xs font-mono font-medium"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
            >
              n8n Workflow Engine
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Real-time webhook routing, asynchronous notification dispatches, and scheduled RAG ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
            4 Active Workflows
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Total Executions</span>
            <Zap className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>1,861</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Past 30 days</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Overall Success Rate</span>
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--success)', fontFamily: "'Space Grotesk', sans-serif" }}>99.7%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>Exponential backoff enabled</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Avg Step Latency</span>
            <Clock className="h-4 w-4" style={{ color: 'var(--warning)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>38 ms</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Zero webhook queues dropped</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Dead-Letter Queue</span>
            <Layers className="h-4 w-4" style={{ color: 'var(--sky)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>0 Failed</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Clean DLQ status</p>
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="p-5 rounded-xl border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2.5">
                <span
                  className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                >
                  {wf.id}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    background: wf.status === 'active' ? 'var(--success-light)' : 'var(--bg-muted)',
                    color: wf.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
                  }}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${wf.status === 'active' ? 'animate-pulse' : ''}`} style={{ background: wf.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }} />
                  {wf.status === 'active' ? 'Active' : 'Paused'}
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  Success: {wf.successRate}%
                </span>
              </div>

              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{wf.name}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{wf.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <Webhook className="h-3.5 w-3.5" />
                  <span>{wf.trigger}</span>
                </span>
                <span>•</span>
                <span className="font-mono">{wf.destination}</span>
                <span>•</span>
                <span>Last executed: {wf.lastRun}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => toggleStatus(wf.id)}
                className="px-3.5 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors hover:bg-slate-50"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {wf.status === 'active' ? 'Pause Workflow' : 'Resume Workflow'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutomationsPage;
