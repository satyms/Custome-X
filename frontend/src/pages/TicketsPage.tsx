import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketsApi } from '../api';
import type { Ticket, TicketStatus, TicketPriority } from '../types';
import {
  Inbox,
  Search,
  Filter,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params: { status?: TicketStatus; priority?: TicketPriority; limit: number } = { limit: 50 };
      if (statusFilter !== 'all') {
        params.status = statusFilter as TicketStatus;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter as TicketPriority;
      }
      const res = await ticketsApi.listTickets(params);
      setTickets(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const filteredTickets = tickets.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Ticket Queue</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage and resolve incoming support requests ({total} total)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTickets}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition-colors cursor-pointer min-h-[40px]"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by title or UUID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
            <span>Loading tickets...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Inbox className="h-10 w-10 mx-auto text-slate-600 mb-3" />
            <p className="text-sm">No tickets match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Ticket ID</th>
                  <th scope="col" className="px-6 py-3.5">Title</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5">Priority</th>
                  <th scope="col" className="px-6 py-3.5">Last Updated</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-indigo-400">
                      #{ticket.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-100 max-w-md truncate">
                      {ticket.title}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          ticket.status === 'open'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : ticket.status === 'in_progress'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : ticket.status === 'escalated'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold uppercase ${
                          ticket.priority === 'urgent'
                            ? 'text-rose-400'
                            : ticket.priority === 'high'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(ticket.updated_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
