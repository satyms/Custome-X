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
  Layers,
  ArrowUpRight,
  Calendar,
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        );
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Escalated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Closed
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="text-[11px] font-semibold text-rose-600">Urgent</span>;
      case 'high':
        return <span className="text-[11px] font-semibold text-amber-600">High</span>;
      case 'normal':
        return <span className="text-[11px] font-medium text-slate-600">Normal</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-400">Low</span>;
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* 1. Header matching Twenty CRM */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 bg-transparent"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-slate-700" />
          <div>
            <h1 className="text-[16px] font-semibold tracking-tight text-slate-900">
              Support Overview
            </h1>
            <p className="text-xs text-slate-500">
              Real-time customer inquiries, automated routing, and ticket health
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTickets}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh overview metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/tickets"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <span>Open Pipeline</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* 2. KPI Metrics Summary Bar */}
      <TicketMetricsBar
        total={totalCount}
        open={openCount}
        inProgress={inProgressCount}
        escalated={escalatedCount}
        isLoading={isLoading}
      />

      {/* 3. System Health Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {[
          {
            icon: Bot,
            title: 'AI Agent Automation',
            desc: 'Autonomous RAG & Triaging Active',
            color: '#6366F1',
            bg: '#EEF2FF',
          },
          {
            icon: ShieldCheck,
            title: 'Multi-Tenant Isolation',
            desc: 'PostgreSQL RLS Policies Enforced',
            color: '#10B981',
            bg: '#ECFDF5',
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
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs"
          >
            <div className="p-2 rounded-lg shrink-0" style={{ background: bg }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">{title}</p>
              <p className="text-[11px] text-slate-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Recent Tickets Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
        {/* Table Top Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Recent Ticket Influx
            </h2>
            <p className="text-[11px] text-slate-400">Latest active support requests across your tenant</p>
          </div>
          <Link
            to="/tickets"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            <span>Full Pipeline ({totalCount})</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                <th className="px-5 py-2.5">Ticket</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5">Priority</th>
                <th className="px-5 py-2.5">Created</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td className="px-5 py-3">
                      <Skeleton className="h-3.5 w-40 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </td>
                    <td className="px-5 py-3"><Skeleton className="h-5 w-16 rounded-md" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-3.5 w-24" /></td>
                    <td className="px-5 py-3 text-right"><Skeleton className="h-6 w-12 ml-auto rounded-md" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-rose-500">
                    {error}
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    <Inbox className="h-6 w-6 mx-auto mb-1.5 text-slate-300" />
                    <p className="text-xs">No active tickets found</p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 line-clamp-1">{t.title}</div>
                      <div className="text-[11px] font-mono text-slate-400">#{t.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-5 py-3">{renderStatusBadge(t.status)}</td>
                    <td className="px-5 py-3">{renderPriorityBadge(t.priority)}</td>
                    <td className="px-5 py-3 text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {new Date(t.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/tickets/${t.id}`}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <span>View</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
