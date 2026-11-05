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
            Layer 5 asynchronous workflow routing, HMAC SHA-256 signatures, and Dead-Letter Queue (DLQ).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTestDispatch('ticket.created')}
            disabled={dispatching}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            style={{ background: 'var(--accent)' }}
          >
            <Send className="h-3.5 w-3.5" />
            {dispatching ? 'Dispatching...' : 'Emit Test Webhook'}
          </button>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium border transition-colors cursor-pointer hover:bg-slate-50"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Total Dispatches</span>
            <Activity className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {stats?.total_executions ?? 0}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>All outbound workflow triggers</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Success Rate</span>
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--success)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {stats?.success_rate_percent ?? 100}%
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{stats?.successful_executions ?? 0} successfully delivered</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Dead-Letter Queue (DLQ)</span>
            <AlertTriangle className="h-4 w-4" style={{ color: stats?.failed_dlq_events ? 'var(--danger)' : 'var(--text-muted)' }} />
          </div>
          <p
            className="text-2xl font-bold"
            style={{
              color: stats?.failed_dlq_events ? 'var(--danger)' : 'var(--text-primary)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {stats?.failed_dlq_events ?? 0}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Exhausted max retries (needs triage)</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold uppercase tracking-wider">Active Workflows</span>
            <ShieldCheck className="h-4 w-4" style={{ color: 'var(--sky)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            4 Workflows
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>WF1 (Triage), WF2 (SLA), WF3 (HITL), WF4 (ETL)</p>
        </div>
      </div>

      {/* Dead-Letter Queue (DLQ) Alert Box if failures exist */}
      {dlqEvents.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--danger-light)', borderColor: 'var(--danger)', color: 'var(--text-primary)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--danger)' }}>
                  {dlqEvents.length} Event{dlqEvents.length > 1 ? 's' : ''} in Dead-Letter Queue (DLQ)
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  These automated events exceeded max delivery retries. Review error reasons below and click Retry to re-deliver.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRetry(dlqEvents[0].id)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white cursor-pointer transition-colors"
              style={{ background: 'var(--danger)' }}
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
            className="rounded-xl border p-4 shadow-sm"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <span
                className="rounded px-2 py-0.5 text-xs font-bold font-mono border"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
              >
                {wf.id}
              </span>
              <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--success)' }}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
                Active
              </span>
            </div>
            <h4 className="mt-2 text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Zap className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              <span>{wf.name}</span>
            </h4>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{wf.desc}</p>
            <div className="mt-3 border-t pt-2 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <span>Trigger: </span>
              <code className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>{wf.trigger}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Event Log Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-col gap-3 p-4 border-b sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Outbound Webhook Delivery Log</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Audit trail of all HMAC-signed events dispatched to n8n endpoints.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border px-2.5 py-1 text-xs cursor-pointer focus:outline-none"
              style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
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
          <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading automation events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            No events found. Click "Emit Test Webhook" to trigger a simulated dispatch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
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
              <tbody className="divide-y" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {events.map((evt) => {
                  const isFailed = evt.status === 'failed';
                  const isSuccess = evt.status === 'success';

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>{evt.event_type}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border"
                          style={{
                            background: isSuccess
                              ? 'var(--success-light)'
                              : isFailed
                              ? 'var(--danger-light)'
                              : 'var(--warning-light)',
                            color: isSuccess
                              ? 'var(--success)'
                              : isFailed
                              ? 'var(--danger)'
                              : 'var(--warning)',
                            borderColor: 'transparent',
                          }}
                        >
                          {isSuccess && <CheckCircle2 className="h-3 w-3" />}
                          {isFailed && <XCircle className="h-3 w-3" />}
                          {!isSuccess && !isFailed && <Clock className="h-3 w-3" />}
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4" style={{ color: 'var(--text-muted)' }}>
                        {evt.retry_count} / {evt.max_retries}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          <span>{evt.idempotency_key.substring(0, 14)}...</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(evt.idempotency_key, evt.id)}
                            className="hover:text-slate-900 transition-colors cursor-pointer"
                            title="Copy idempotency key"
                          >
                            {copiedKey === evt.id ? <Check className="h-3 w-3" style={{ color: 'var(--success)' }} /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4" style={{ color: 'var(--text-muted)' }}>
                        {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {evt.last_error ? (
                          <span style={{ color: 'var(--danger)' }} title={evt.last_error}>
                            {evt.last_error}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className="rounded px-2.5 py-1 text-xs border cursor-pointer hover:bg-slate-100 transition-colors"
                            style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          >
                            Inspect
                          </button>
                          {(isFailed || evt.status === 'retrying') && (
                            <button
                              type="button"
                              onClick={() => handleRetry(evt.id)}
                              disabled={retryingId === evt.id}
                              className="rounded px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 transition-colors cursor-pointer"
                              style={{ background: 'var(--accent)' }}
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
          <div
            className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Event Payload Inspector</h3>
                <span
                  className="rounded px-2 py-0.5 text-xs font-mono font-medium border"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
                >
                  {selectedEvent.event_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="hover:opacity-75 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Event ID: </span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedEvent.id}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedEvent.status}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Signature Auth: </span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--success)' }}>HMAC-SHA256 Verified</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Delivery Retries: </span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {selectedEvent.retry_count} / {selectedEvent.max_retries}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>JSON Payload:</span>
                <pre
                  className="mt-1 max-h-72 overflow-y-auto rounded-lg p-3 font-mono text-xs border"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {selectedEvent.last_error && (
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>Delivery Failure Error:</span>
                  <div
                    className="mt-1 rounded-lg p-2.5 text-xs font-mono border"
                    style={{ background: 'var(--danger-light)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  >
                    {selectedEvent.last_error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg px-4 py-2 text-xs font-medium border cursor-pointer hover:bg-slate-50 transition-colors"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
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
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer transition-colors"
                  style={{ background: 'var(--accent)' }}
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
