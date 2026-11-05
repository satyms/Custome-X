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
  Kanban,
  LayoutList,
  Plus,
  Calendar,
  Building2,
  ArrowUpRight,
  MoreHorizontal,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Table vs Board (Kanban) - exactly like reference image
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination States
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Overall metric counts
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

  // Client-side search query filtering
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <ShieldAlert className="h-3 w-3" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            High
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: 'var(--sky-light)', color: 'var(--sky)' }}>
            Normal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--sky-light)', color: 'var(--sky)' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--sky)' }} />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--warning)' }} />
            In Progress
          </span>
        );
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--danger)' }} />
            Escalated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--success)' }} />
            Closed
          </span>
        );
    }
  };

  // Board columns definition matching reference image
  const boardColumns = [
    {
      id: 'open' as TicketStatus,
      title: 'Open Influx',
      dotColor: '#0EA5E9',
      icon: CircleDot,
      count: displayedTickets.filter((t) => t.status === 'open').length,
    },
    {
      id: 'in_progress' as TicketStatus,
      title: 'In Progress',
      dotColor: '#F59E0B',
      icon: Clock,
      count: displayedTickets.filter((t) => t.status === 'in_progress').length,
    },
    {
      id: 'escalated' as TicketStatus,
      title: 'Supervisor Escalated',
      dotColor: '#EF4444',
      icon: AlertCircle,
      count: displayedTickets.filter((t) => t.status === 'escalated').length,
    },
    {
      id: 'closed' as TicketStatus,
      title: 'Resolved & Closed',
      dotColor: '#10B981',
      icon: CheckCircle2,
      count: displayedTickets.filter((t) => t.status === 'closed').length,
    },
  ];

  // Pagination calculation
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-5">
      {/* Top Header matching reference image: Title on left, Action buttons on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            Tickets Pipeline
          </h1>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-mono font-medium border"
            style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
          >
            {totalCount} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle Button */}
          <div className="flex items-center p-0.5 rounded-lg border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: viewMode === 'board' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'board' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'board' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
              title="Board View"
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer"
              style={{
                background: viewMode === 'table' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
              title="Table View"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => {
              fetchMetrics();
              fetchTickets();
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer hover:bg-slate-50 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            title="Refresh queue"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Create Button matching reference image "+ Create opportunity" */}
          <Link
            to="/tickets"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Ticket</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar matching reference image */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, customer, or ID..."
              className="w-full rounded-lg border pl-8 pr-8 py-1.5 text-xs focus:outline-none"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Quick status counters */}
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: '#0EA5E9' }} /> Open: {metricCounts.open}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: '#F59E0B' }} /> Active: {metricCounts.inProgress}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: '#EF4444' }} /> Escalated: {metricCounts.escalated}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: KANBAN BOARD VIEW (1-to-1 match with Reference Image)             */}
      {/* ========================================================================= */}
      {viewMode === 'board' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1020px]">
            {boardColumns.map((col) => {
              const colTickets = displayedTickets.filter((t) => t.status === col.id);
              const ColIcon = col.icon;

              return (
                <div
                  key={col.id}
                  className="flex-1 min-w-[250px] flex flex-col rounded-xl border p-3"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  {/* Column Header matching reference image: Circle + Label + Count + '+' button */}
                  <div className="flex items-center justify-between pb-3 border-b mb-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <ColIcon className="h-4 w-4" style={{ color: col.dotColor }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {col.title}
                      </span>
                      <span
                        className="px-1.5 py-0.2 rounded-full text-[11px] font-mono font-medium"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                      >
                        {colTickets.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      title={`Add ticket to ${col.title}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Column Cards */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-18rem)] pr-0.5">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={`skel-col-${col.id}-${i}`}
                          className="p-3.5 rounded-lg border space-y-2"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg-app)' }}
                        >
                          <Skeleton className="h-4 w-3/4 mb-1" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      ))
                    ) : colTickets.length === 0 ? (
                      <div className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        No tickets in {col.title.toLowerCase()}
                      </div>
                    ) : (
                      colTickets.map((ticket) => (
                        <Link
                          key={ticket.id}
                          to={`/tickets/${ticket.id}`}
                          className="block p-3.5 rounded-xl border transition-all hover:shadow-md group cursor-pointer"
                          style={{
                            background: '#FFFFFF',
                            borderColor: 'var(--border)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          }}
                        >
                          {/* Top Row: Title + quick action icon */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3
                              className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {ticket.title}
                            </h3>
                            <ArrowUpRight
                              className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: 'var(--accent)' }}
                            />
                          </div>

                          {/* Customer Row with building/org icon */}
                          <div className="flex items-center gap-1.5 text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">Customer #{ticket.customer_id.slice(0, 8)}</span>
                          </div>

                          {/* Priority and ID pill row */}
                          <div className="flex items-center justify-between gap-1 text-[11px] pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-1.5">
                              {renderPriorityBadge(ticket.priority)}
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>

                          {/* Bottom Row: Agent avatar pill matching reference image */}
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t text-[11px]" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                                style={{ background: 'var(--accent)' }}
                              >
                                {ticket.assigned_to ? ticket.assigned_to.slice(0, 2).toUpperCase() : 'AG'}
                              </div>
                              <span className="truncate font-medium max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>
                                {ticket.assigned_to ? `Agent #${ticket.assigned_to.slice(0, 6)}` : 'Support Queue'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              #{ticket.id.slice(0, 6)}
                            </span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>

                  {/* Column Footer */}
                  <div className="pt-3 mt-3 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <span>{colTickets.length} items</span>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-100 cursor-pointer"
                      title="Column options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: TABLE VIEW                                                       */
        /* ========================================================================= */
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ color: 'var(--text-secondary)' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid var(--border)` }}>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>
                    <div className="flex items-center gap-1.5">
                      <span>Ticket</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>Status</th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>Priority</th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>Customer / UUID</th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>Last Updated</th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse" style={{ borderBottom: `1px solid var(--border)` }}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-48 mb-1.5" />
                        <Skeleton className="h-3 w-24" />
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-7 w-16 ml-auto rounded-lg" /></td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="h-10 w-10 mx-auto rounded-full flex items-center justify-center" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                          <X className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
                        <button
                          onClick={fetchTickets}
                          className="px-4 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer"
                          style={{ background: 'var(--accent)' }}
                        >
                          Try Again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : displayedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="h-12 w-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                          <Inbox className="h-6 w-6" />
                        </div>
                        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No Tickets Found</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery
                            ? 'No tickets match the selected filters or search criteria.'
                            : 'There are currently no tickets in your organization queue.'}
                        </p>
                        {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border"
                            style={{ color: 'var(--accent)', borderColor: 'var(--accent-light)', background: 'var(--accent-light)' }}
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="transition-colors group cursor-pointer"
                      style={{ borderBottom: `1px solid var(--border)` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="font-semibold block max-w-sm truncate transition-colors"
                          style={{ color: 'var(--text-primary)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                        >
                          {ticket.title}
                        </Link>
                        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          #{ticket.id.slice(0, 8)}
                        </span>
                      </td>

                      <td className="px-6 py-4">{renderStatusBadge(ticket.status)}</td>

                      <td className="px-6 py-4">{renderPriorityBadge(ticket.priority)}</td>

                      <td className="px-6 py-4 font-mono text-xs truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                        {ticket.customer_id.slice(0, 13)}...
                      </td>

                      <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
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
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border transition-all min-h-[32px]"
                          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent)';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.borderColor = 'var(--accent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-muted)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
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
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{startItem}</strong> to{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{endItem}</strong> of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong> tickets
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded-md px-2 py-1 text-xs focus:outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1 || isLoading}
                  className="p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="px-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!hasMore && currentPage >= totalPages}
                  className="p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
