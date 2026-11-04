import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ticketsApi } from '../api';
import type { Ticket, TicketStatus, TicketPriority } from '../types';
import { TicketMetricsBar } from '../components/tickets/TicketMetricsBar';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Inbox,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination States
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Overall metric counts (computed or fetched across total organization queue)
  const [metricCounts, setMetricCounts] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    escalated: 0,
  });

  // Fetch metrics across tenant
  const fetchMetrics = async () => {
    try {
      const allRes = await ticketsApi.listTickets({ limit: 100 });
      const items = allRes.items;
      setMetricCounts({
        total: allRes.total,
        open: items.filter((t) => t.status === 'open').length,
        inProgress: items.filter((t) => t.status === 'in_progress').length,
        escalated: items.filter((t) => t.status === 'escalated' || t.priority === 'urgent').length,
      });
    } catch (err) {
      console.warn('Metrics count update failed:', err);
    }
  };

  // Fetch paginated tickets according to current filters
  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * pageSize;
      const params: {
        status?: TicketStatus;
        priority?: TicketPriority;
        limit: number;
        offset: number;
      } = {
        limit: pageSize,
        offset,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter as TicketStatus;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter as TicketPriority;
      }

      const res = await ticketsApi.listTickets(params);
      setTickets(res.items);
      setTotalCount(res.total);
      setHasMore(res.has_more);
    } catch (err: unknown) {
      console.error('Failed to load tickets queue:', err);
      setError('Could not retrieve tickets. Please ensure backend service is connected.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, currentPage, pageSize]);

  // Client-side search query filtering across current page view (title or UUID)
  const displayedTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim();
    return tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.customer_id && t.customer_id.toLowerCase().includes(q))
    );
  }, [tickets, searchQuery]);

  const resetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Priority badge styling
  const renderPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-3 w-3" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            High
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Normal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Low
          </span>
        );
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            In Progress
          </span>
        );
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Escalated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Closed
          </span>
        );
    }
  };

  const statusTabs = [
    { id: 'all', label: 'All Tickets' },
    { id: 'open', label: 'Open' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'escalated', label: 'Escalated' },
    { id: 'closed', label: 'Closed' },
  ];

  // Pagination calculation
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Support Ticket Queue
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Automated ticket routing, triage status, and triage queue
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchMetrics();
              fetchTickets();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-sm font-medium transition-colors cursor-pointer min-h-[40px]"
            title="Refresh queue"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Bar */}
      <TicketMetricsBar
        total={metricCounts.total}
        open={metricCounts.open}
        inProgress={metricCounts.inProgress}
        escalated={metricCounts.escalated}
        isLoading={isLoading && metricCounts.total === 0}
        selectedStatus={statusFilter}
        onFilterStatus={(s) => {
          setStatusFilter(s);
          setCurrentPage(1);
        }}
      />

      {/* Filter and Search Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Priority Controls */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket title, subject, or ID..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-h-[40px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Priority Filter Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-auto rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[40px] cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticket Queue Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span>Ticket</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3.5">Status</th>
                <th scope="col" className="px-6 py-3.5">Priority</th>
                <th scope="col" className="px-6 py-3.5">Customer / UUID</th>
                <th scope="col" className="px-6 py-3.5">Last Updated</th>
                <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80">
              {/* SKELETON LOADING STATE (Prevents Cumulative Layout Shift) */}
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-48 mb-1.5" />
                      <Skeleton className="h-3 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Skeleton className="h-7 w-16 ml-auto rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                /* ERROR STATE */
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-10 w-10 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <X className="h-5 w-5" />
                      </div>
                      <p className="text-sm text-rose-300 font-medium">{error}</p>
                      <button
                        onClick={fetchTickets}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : displayedTickets.length === 0 ? (
                /* EMPTY STATE */
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-semibold text-white">No Tickets Found</h3>
                      <p className="text-xs text-slate-400">
                        {statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery
                          ? 'No tickets match the selected filters or search criteria.'
                          : 'There are currently no tickets in your organization queue.'}
                      </p>
                      {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                /* ACTIVE TICKET ROWS */
                displayedTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors block max-w-sm truncate"
                      >
                        {ticket.title}
                      </Link>
                      <span className="font-mono text-xs text-slate-500">
                        #{ticket.id.slice(0, 8)}
                      </span>
                    </td>

                    <td className="px-6 py-4">{renderStatusBadge(ticket.status)}</td>

                    <td className="px-6 py-4">{renderPriorityBadge(ticket.priority)}</td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-400 truncate max-w-[140px]">
                      {ticket.customer_id.slice(0, 13)}...
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(ticket.updated_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-medium border border-slate-700/80 hover:border-indigo-500 transition-all min-h-[32px]"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Record range indicator */}
          <div className="text-xs text-slate-400">
            Showing <strong className="text-slate-200">{startItem}</strong> to{' '}
            <strong className="text-slate-200">{endItem}</strong> of{' '}
            <strong className="text-slate-200">{totalCount}</strong> tickets
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Previous / Next buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 text-xs font-mono text-slate-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!hasMore && currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;
