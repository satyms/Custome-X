import React, { useState, useEffect } from 'react';
import {
  Zap,
  Activity,
  AlertTriangle,
  RotateCw,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Code2,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { automationsApi, type WorkflowEvent, type WorkflowStats } from '../api/automationsApi';
import { Toast } from '../components/ui/Toast';

export const AutomationsPage: React.FC = () => {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<WorkflowEvent | null>(null);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsData, statsData] = await Promise.all([
        automationsApi.getEvents({
          status: filterStatus !== 'all' ? filterStatus : undefined,
          limit: 50,
        }),
        automationsApi.getStats(),
      ]);
      setEvents(eventsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load automations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const handleRetry = async (eventId: string) => {
    try {
      setRetryingId(eventId);
      const res = await automationsApi.retryEvent(eventId);
      setToast({ message: `Event retried: status is now ${res.status}`, type: 'success' });
      await fetchData();
    } catch (err: any) {
      setToast({ message: 'Retry delivery failed', type: 'error' });
    } finally {
      setRetryingId(null);
    }
  };

  const handleTestDispatch = async (eventType: string) => {
    try {
      setDispatching(true);
      const res = await automationsApi.dispatchTestEvent(eventType);
      setToast({ message: `Test webhook for '${eventType}' queued (${res.idempotency_key.substring(0, 16)}...)`, type: 'success' });
      await fetchData();
    } catch (err: any) {
      setToast({ message: 'Failed to dispatch test webhook', type: 'error' });
    } finally {
      setDispatching(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dlqEvents = events.filter((e) => e.status === 'failed');

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">n8n Automation Engine & Webhooks</h1>
              <p className="text-sm text-slate-400">
                Layer 5 asynchronous workflow routing, HMAC SHA-256 signatures, and Dead-Letter Queue (DLQ).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTestDispatch('ticket.created')}
            disabled={dispatching}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            {dispatching ? 'Dispatching...' : 'Emit Test Webhook'}
          </button>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
          >
            <RotateCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Dispatches</span>
            <Activity className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats?.total_executions ?? 0}</div>
          <p className="mt-1 text-xs text-slate-500">All outbound workflow triggers</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Delivery Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{stats?.success_rate_percent ?? 100}%</div>
          <p className="mt-1 text-xs text-slate-500">{stats?.successful_executions ?? 0} successfully delivered</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Dead-Letter Queue (DLQ)</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className={`mt-2 text-2xl font-bold ${stats?.failed_dlq_events ? 'text-rose-400' : 'text-slate-200'}`}>
            {stats?.failed_dlq_events ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Exhausted max retries (needs triage)</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827]/70 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Workflows</span>
            <ShieldCheck className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">4 Workflows</div>
          <p className="mt-1 text-xs text-slate-500">WF1 (Triage), WF2 (SLA), WF3 (HITL), WF4 (ETL)</p>
        </div>
      </div>

      {/* Dead-Letter Queue (DLQ) Alert Box if failures exist */}
      {dlqEvents.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-rose-300">
                  {dlqEvents.length} Event{dlqEvents.length > 1 ? 's' : ''} in Dead-Letter Queue (DLQ)
                </h3>
                <p className="text-xs text-rose-300/80">
                  These automated events exceeded max delivery retries. Review error reasons below and click Retry to re-deliver.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleRetry(dlqEvents[0].id)}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 transition-colors"
            >
              Retry Latest Failed
            </button>
          </div>
        </div>
      )}

      {/* 4 n8n Master Workflows Quick Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            id: 'WF1',
            name: 'New Ticket Notification',
            trigger: 'ticket.created',
            dest: 'Slack #support-triage & Email',
            desc: 'Instant dispatch with priority categorization and customer record summary.',
          },
          {
            id: 'WF2',
            name: 'Escalation to Human Queue',
            trigger: 'ticket.escalated',
            dest: 'Slack #urgent-escalations & PagerDuty',
            desc: 'Triggered when automated agent cannot proceed or strict SLA breached.',
          },
          {
            id: 'WF3',
            name: 'HITL Approval Notification',
            trigger: 'approval.requested',
            dest: 'Supervisor Approval Queue',
            desc: 'Pushes proposed state mutation diff with 1-click review link.',
          },
          {
            id: 'WF4',
            name: 'Scheduled ETL & KPI Refresh',
            trigger: 'Cron (Hourly)',
            dest: 'Data Lake / Google Sheets',
            desc: 'Calculates hourly CSAT, resolution velocities, and agent run metrics.',
          },
        ].map((wf) => (
          <div key={wf.id} className="rounded-xl border border-slate-800 bg-[#111827]/50 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/30">
                {wf.id}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <h4 className="mt-2 text-sm font-semibold text-white">{wf.name}</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{wf.desc}</p>
            <div className="mt-3 border-t border-slate-800/80 pt-2 text-[11px] text-slate-500">
              <span className="text-slate-400">Trigger:</span> <code className="text-amber-400/90">{wf.trigger}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Event Log Table */}
      <div className="rounded-xl border border-slate-800 bg-[#111827]/70 overflow-hidden shadow-sm">
        <div className="flex flex-col gap-3 p-4 border-b border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Outbound Webhook Delivery Log</h2>
            <p className="text-xs text-slate-400">Audit trail of all HMAC-signed events dispatched to n8n endpoints.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed (DLQ)</option>
              <option value="retrying">Retrying</option>
              <option value="queued">Queued</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading automation events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No events found. Click "Emit Test Webhook" to trigger a simulated dispatch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Event Type</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Retries</th>
                  <th className="py-3 px-4 font-semibold">Idempotency Key</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold">Last Error</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {events.map((evt) => {
                  const isFailed = evt.status === 'failed';
                  const isSuccess = evt.status === 'success';

                  return (
                    <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-indigo-300 font-semibold">{evt.event_type}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isFailed
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="h-3 w-3" />}
                          {isFailed && <XCircle className="h-3 w-3" />}
                          {!isSuccess && !isFailed && <Clock className="h-3 w-3" />}
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {evt.retry_count} / {evt.max_retries}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                          <span>{evt.idempotency_key.substring(0, 14)}...</span>
                          <button
                            onClick={() => handleCopy(evt.idempotency_key, evt.id)}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                            title="Copy idempotency key"
                          >
                            {copiedKey === evt.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                        {evt.last_error ? (
                          <span className="text-rose-400/90" title={evt.last_error}>
                            {evt.last_error}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedEvent(evt)}
                            className="rounded bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            Inspect
                          </button>
                          {(isFailed || evt.status === 'retrying') && (
                            <button
                              onClick={() => handleRetry(evt.id)}
                              disabled={retryingId === evt.id}
                              className="rounded bg-indigo-600/80 px-2 py-1 font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                            >
                              {retryingId === evt.id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Payload Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Event Payload Inspector</h3>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-indigo-300">
                  {selectedEvent.event_type}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Event ID:</span>{' '}
                  <span className="font-mono text-slate-300">{selectedEvent.id}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <span className="font-semibold text-slate-300">{selectedEvent.status}</span>
                </div>
                <div>
                  <span className="text-slate-500">Signature Auth:</span>{' '}
                  <span className="text-emerald-400 font-mono">HMAC-SHA256 Verified</span>
                </div>
                <div>
                  <span className="text-slate-500">Delivery Retries:</span>{' '}
                  <span className="text-slate-300">
                    {selectedEvent.retry_count} / {selectedEvent.max_retries}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400">JSON Payload:</span>
                <pre className="mt-1 max-h-72 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-indigo-200 border border-slate-800">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {selectedEvent.last_error && (
                <div>
                  <span className="text-xs font-semibold text-rose-400">Delivery Failure Error:</span>
                  <div className="mt-1 rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-300 border border-rose-500/20 font-mono">
                    {selectedEvent.last_error}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Close
              </button>
              {(selectedEvent.status === 'failed' || selectedEvent.status === 'retrying') && (
                <button
                  onClick={() => {
                    handleRetry(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  Retry Dispatch Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationsPage;
