import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketsApi } from '../api';
import type { Ticket } from '../types';
import { TicketMetricsBar } from '../components/tickets/TicketMetricsBar';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Inbox,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Bot,
  Activity,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketsApi.listTickets({ limit: 10 });
      setTickets(response.items);
      setTotalCount(response.total);
    } catch (err: unknown) {
      console.error('Failed to fetch dashboard tickets:', err);
      setError('Could not load recent tickets. Ensure your backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const escalatedCount = tickets.filter((t) => t.status === 'escalated' || t.priority === 'urgent').length;

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return { bg: 'var(--sky-light)', text: 'var(--sky)', dot: 'var(--sky)' };
      case 'in_progress': return { bg: 'var(--warning-light)', text: 'var(--warning)', dot: 'var(--warning)' };
      case 'escalated': return { bg: 'var(--danger-light)', text: 'var(--danger)', dot: 'var(--danger)' };
      default: return { bg: 'var(--success-light)', text: 'var(--success)', dot: 'var(--success)' };
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'var(--danger)';
      case 'high': return 'var(--warning)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Support Overview
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Real-time customer inquiries, automated routing, and ticket health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors hover:bg-slate-50 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            Open Queue
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <TicketMetricsBar
        total={totalCount}
        open={openCount}
        inProgress={inProgressCount}
        escalated={escalatedCount}
        isLoading={isLoading}
      />

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            icon: Bot,
            title: 'AI Agent Automation',
            desc: 'Autonomous RAG & Triaging Active',
            color: 'var(--accent)',
            bg: 'var(--accent-light)',
          },
          {
            icon: ShieldCheck,
            title: 'Multi-Tenant Isolation',
            desc: 'PostgreSQL RLS Policies Enforced',
            color: 'var(--success)',
            bg: 'var(--success-light)',
          },
          {
            icon: Activity,
            title: 'Real-Time Routing',
            desc: 'ACID Atomic Ticket Rollback Engine',
            color: '#8B5CF6',
            bg: '#F5F3FF',
          },
        ].map(({ icon: Icon, title, desc, color, bg }) => (
          <div
            key={title}
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="p-2 rounded-lg shrink-0" style={{ background: bg }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tickets Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Table Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Recent Ticket Influx
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Latest active support requests</p>
          </div>
          <Link
            to="/tickets"
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Full Queue ({totalCount})
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--border)` }}>
                {['Ticket', 'Status', 'Priority', 'Created', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} style={{ borderBottom: `1px solid var(--border)` }}>
                    <td className="px-5 py-3.5"><Skeleton className="h-4 w-40 mb-1" /><Skeleton className="h-3 w-20" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-5 w-14 rounded-full" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-6 w-14 ml-auto rounded-md" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--danger)' }}>
                    {error}
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Inbox className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tickets found.</p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const sc = statusColor(t.status);
                  return (
                    <tr
                      key={t.id}
                      className="transition-colors"
                      style={{ borderBottom: `1px solid var(--border)` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t.title}</div>
                        <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>#{t.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: sc.dot }} />
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold uppercase" style={{ color: priorityColor(t.priority) }}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors"
                          style={{ color: 'var(--accent)', borderColor: 'var(--accent-light)', background: 'var(--accent-light)' }}
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
