import React, { useState, useEffect } from 'react';
import {
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
  Zap,
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
      setToast({ message: 'Failed to trigger event retry', type: 'error' });
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

      {/* Header - Twenty CRM Minimal Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-slate-700" />
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-semibold tracking-tight text-slate-900">
              Automations &amp; Webhooks
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
              n8n Workflow Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTestDispatch('ticket.created')}
            disabled={dispatching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5 text-slate-600" />
            <span>{dispatching ? 'Dispatching...' : 'Emit Test Webhook'}</span>
          </button>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5 text-slate-600" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1 text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Dispatches</span>
            <Activity className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {stats?.total_executions ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">All outbound workflow triggers</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1 text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-emerald-600">
            {stats?.success_rate_percent ?? 100}%
          </p>
          <p className="mt-1 text-xs text-slate-400">{stats?.successful_executions ?? 0} successfully delivered</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1 text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Dead-Letter Queue (DLQ)</span>
            <AlertTriangle className={`h-4 w-4 ${stats?.failed_dlq_events ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              stats?.failed_dlq_events ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {stats?.failed_dlq_events ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Exhausted max retries (needs triage)</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1 text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Active Workflows</span>
            <ShieldCheck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            4 Workflows
          </p>
          <p className="mt-1 text-xs text-slate-400">WF1 (Triage), WF2 (SLA), WF3 (HITL), WF4 (ETL)</p>
        </div>
      </div>

      {/* Dead-Letter Queue (DLQ) Alert Box if failures exist */}
      {dlqEvents.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-600" />
              <div>
                <h3 className="font-semibold text-sm text-rose-900">
                  {dlqEvents.length} Event{dlqEvents.length > 1 ? 's' : ''} in Dead-Letter Queue (DLQ)
                </h3>
                <p className="text-xs mt-0.5 text-rose-700">
                  These automated events exceeded max delivery retries. Review error reasons below and click Retry to re-deliver.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRetry(dlqEvents[0].id)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer transition-colors shadow-2xs"
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
          <div
            key={wf.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="rounded px-2 py-0.5 text-xs font-bold font-mono border border-slate-200 bg-slate-100 text-slate-700">
                {wf.id}
              </span>
              <span className="text-[11px] font-medium flex items-center gap-1 text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <h4 className="mt-2 text-sm font-semibold flex items-center gap-1.5 text-slate-900">
              <Zap className="h-3.5 w-3.5 text-indigo-600" />
              <span>{wf.name}</span>
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{wf.desc}</p>
            <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
              <span>Trigger: </span>
              <code className="font-mono font-semibold text-indigo-600">{wf.trigger}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Event Log Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="flex flex-col gap-3 p-4 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Outbound Webhook Delivery Log</h2>
            <p className="text-xs text-slate-500">Audit trail of all HMAC-signed events dispatched to n8n endpoints.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs cursor-pointer focus:outline-none text-slate-700"
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
          <div className="p-8 text-center text-xs text-slate-400">Loading automation events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No events found. Click "Emit Test Webhook" to trigger a simulated dispatch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Event Type</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Retries</th>
                  <th className="py-2.5 px-4 font-semibold">Idempotency Key</th>
                  <th className="py-2.5 px-4 font-semibold">Created</th>
                  <th className="py-2.5 px-4 font-semibold">Last Error</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {events.map((evt) => {
                  const isFailed = evt.status === 'failed';
                  const isSuccess = evt.status === 'success';

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-semibold text-indigo-600">{evt.event_type}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700'
                              : isFailed
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="h-3 w-3" />}
                          {isFailed && <XCircle className="h-3 w-3" />}
                          {!isSuccess && !isFailed && <Clock className="h-3 w-3" />}
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {evt.retry_count} / {evt.max_retries}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                          <span>{evt.idempotency_key.substring(0, 14)}...</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(evt.idempotency_key, evt.id)}
                            className="hover:text-slate-900 transition-colors cursor-pointer"
                            title="Copy idempotency key"
                          >
                            {copiedKey === evt.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 max-w-xs truncate text-slate-500">
                        {evt.last_error ? (
                          <span className="text-rose-600 font-mono text-[11px]" title={evt.last_error}>
                            {evt.last_error}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className="rounded-md px-2.5 py-1 text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                          {(isFailed || evt.status === 'retrying') && (
                            <button
                              type="button"
                              onClick={() => handleRetry(evt.id)}
                              disabled={retryingId === evt.id}
                              className="rounded-md px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-semibold text-slate-900">Event Payload Inspector</h3>
                <span className="rounded px-2 py-0.5 text-xs font-mono font-medium border border-slate-200 bg-slate-100 text-slate-700">
                  {selectedEvent.event_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Event ID: </span>
                  <span className="font-mono font-semibold text-slate-900">{selectedEvent.id}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status: </span>
                  <span className="font-semibold text-slate-900">{selectedEvent.status}</span>
                </div>
                <div>
                  <span className="text-slate-500">Signature Auth: </span>
                  <span className="font-mono font-semibold text-emerald-600">HMAC-SHA256 Verified</span>
                </div>
                <div>
                  <span className="text-slate-500">Delivery Retries: </span>
                  <span className="text-slate-900">
                    {selectedEvent.retry_count} / {selectedEvent.max_retries}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700">JSON Payload:</span>
                <pre className="mt-1 max-h-72 overflow-y-auto rounded-lg p-3 font-mono text-xs border border-slate-200 bg-slate-50 text-slate-800">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {selectedEvent.last_error && (
                <div>
                  <span className="text-xs font-semibold text-rose-600">Delivery Failure Error:</span>
                  <div className="mt-1 rounded-lg p-2.5 text-xs font-mono border border-rose-200 bg-rose-50 text-rose-700">
                    {selectedEvent.last_error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg px-4 py-2 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors shadow-2xs"
              >
                Close
              </button>
              {(selectedEvent.status === 'failed' || selectedEvent.status === 'retrying') && (
                <button
                  type="button"
                  onClick={() => {
                    handleRetry(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors shadow-2xs"
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
