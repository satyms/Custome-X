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
  Sparkles,
  ShieldCheck,
  Bot,
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Support Command Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time customer inquiries, automated routing, and ticket health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTickets}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-colors cursor-pointer min-h-[40px]"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/tickets"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-md shadow-indigo-600/20 transition-colors min-h-[40px]"
          >
            <span>Open Ticket Queue</span>
            <ArrowRight className="h-4 w-4" />
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

      {/* Quick System Status Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">AI Agent Automation</div>
            <div className="text-xs text-slate-400">Autonomous RAG &amp; Triaging Active</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Multi-Tenant Isolation</div>
            <div className="text-xs text-slate-400">PostgreSQL RLS Policies Enforced</div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Real-Time Routing</div>
            <div className="text-xs text-slate-400">ACID Atomic Ticket Rollback Engine</div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent Ticket Influx</h2>
            <p className="text-xs text-slate-400">Latest active support requests needing attention</p>
          </div>
          <Link
            to="/tickets"
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Full Queue ({totalCount})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3.5">Ticket</th>
                <th scope="col" className="px-6 py-3.5">Status</th>
                <th scope="col" className="px-6 py-3.5">Priority</th>
                <th scope="col" className="px-6 py-3.5">Created</th>
                <th scope="col" className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`dashboard-skel-${i}`}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-40 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Skeleton className="h-6 w-14 ml-auto rounded-md" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-rose-400">
                    {error}
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Inbox className="h-10 w-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-sm">No tickets found in current organization scope.</p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white max-w-xs truncate">
                      <div className="font-semibold text-slate-100">{t.title}</div>
                      <div className="text-xs font-mono text-slate-500">#{t.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          t.status === 'open'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : t.status === 'in_progress'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : t.status === 'escalated'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold uppercase ${
                          t.priority === 'urgent'
                            ? 'text-rose-400'
                            : t.priority === 'high'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/tickets/${t.id}`}
                        className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        Open →
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
