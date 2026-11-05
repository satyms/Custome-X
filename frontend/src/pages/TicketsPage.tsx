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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderColor: '#FECACA' }}>
            <ShieldAlert className="h-3 w-3" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: 'var(--warning-light)', color: 'var(--warning)', borderColor: '#FDE68A' }}>
            High
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ background: 'var(--sky-light)', color: 'var(--sky)', borderColor: '#BAE6FD' }}>
            Normal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ background: 'var(--sky-light)', color: 'var(--sky)', borderColor: '#BAE6FD' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--sky)' }} />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ background: 'var(--warning-light)', color: 'var(--warning)', borderColor: '#FDE68A' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--warning)' }} />
            In Progress
          </span>
        );
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: 'var(--danger-light)', color: 'var(--danger)', borderColor: '#FECACA' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--danger)' }} />
            Escalated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ background: 'var(--success-light)', color: 'var(--success)', borderColor: '#A7F3D0' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--success)' }} />
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
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            Support Ticket Queue
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer min-h-[40px] hover:bg-slate-50 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}
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
      <div className="rounded-xl border p-4 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
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
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px]"
                style={{
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket title, subject, or ID..."
              className="w-full rounded-lg border pl-9 pr-9 py-2 text-sm focus:outline-none min-h-[40px]"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-muted)',
                color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Priority Filter Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-auto rounded-lg border px-3 py-2 text-sm focus:outline-none min-h-[40px] cursor-pointer"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)', color: 'var(--text-primary)' }}
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
              {/* SKELETON LOADING STATE */}
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
                /* ERROR STATE */
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
                /* EMPTY STATE */
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
                /* ACTIVE TICKET ROWS */
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
          {/* Record range indicator */}
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{startItem}</strong> to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{endItem}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong> tickets
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
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

            {/* Previous / Next buttons */}
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
    </div>
  );
};

export default TicketsPage;
