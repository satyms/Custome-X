import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ticketsApi } from '../api';
import type { TicketDetail, TicketStatus, SenderType } from '../types';
import {
  ArrowLeft,
  User,
  Clock,
  Send,
  Loader2,
  AlertTriangle,
  Bot,
  CheckCircle2,
} from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const loadTicket = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ticketsApi.getTicket(id);
      setTicket(data);
    } catch (err: unknown) {
      console.error('Failed to load ticket:', err);
      setError('Could not retrieve ticket details. It may not exist or belongs to another tenant.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !replyText.trim()) return;

    setIsSending(true);
    try {
      await ticketsApi.addMessage(id, {
        sender_type: 'agent' as SenderType,
        content: replyText.trim(),
      });
      setReplyText('');
      await loadTicket();
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!id) return;
    setIsUpdatingStatus(true);
    try {
      await ticketsApi.updateTicketStatus(id, newStatus);
      await loadTicket();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Invalid status transition or permission error.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
        <span>Loading ticket conversation...</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800">
        <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-white">Error Loading Ticket</h2>
        <p className="mt-1 text-sm text-slate-400">{error || 'Ticket not found.'}</p>
        <Link
          to="/tickets"
          className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Ticket Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tickets</span>
        </Link>

        {/* Status Transition Actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Transition Status:</span>
          {ticket.status !== 'in_progress' && ticket.status !== 'closed' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdatingStatus}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
            >
              In Progress
            </button>
          )}
          {ticket.status !== 'escalated' && ticket.status !== 'closed' && (
            <button
              onClick={() => handleStatusChange('escalated')}
              disabled={isUpdatingStatus}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
            >
              Escalate
            </button>
          )}
          {ticket.status !== 'resolved' && (
            <button
              onClick={() => handleStatusChange('resolved')}
              disabled={isUpdatingStatus}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
            >
              Resolve
            </button>
          )}
        </div>
      </div>

      {/* Ticket Header Card */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-slate-400">ID: {ticket.id}</span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
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
          <span className="text-xs uppercase font-semibold text-amber-400">
            {ticket.priority} priority
          </span>
        </div>
        <h1 className="mt-2 text-xl font-bold text-white">{ticket.title}</h1>
        {ticket.customer && (
          <p className="mt-2 text-xs text-slate-400 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-indigo-400" />
            <span>
              Customer: <strong className="text-slate-300">{ticket.customer.full_name}</strong> ({ticket.customer.email})
            </span>
          </p>
        )}
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">Message History</h2>
        {ticket.messages.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
            No messages recorded for this ticket.
          </div>
        ) : (
          ticket.messages.map((m) => {
            const isAgent = m.sender_type === 'agent';
            const isAi = m.sender_type === 'ai_assistant';
            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border ${
                  isAgent
                    ? 'bg-indigo-950/30 border-indigo-500/30 ml-4 md:ml-12'
                    : isAi
                    ? 'bg-purple-950/30 border-purple-500/30 ml-4 md:ml-12'
                    : 'bg-slate-900/60 border-slate-800 mr-4 md:mr-12'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    {isAi ? (
                      <span className="text-purple-400 flex items-center gap-1">
                        <Bot className="h-3.5 w-3.5" /> AI Assistant
                      </span>
                    ) : isAgent ? (
                      <span className="text-indigo-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Support Agent
                      </span>
                    ) : (
                      <span className="text-slate-300 flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> Customer
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm text-slate-200 whitespace-pre-wrap">{m.content}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Box */}
      <form onSubmit={handleSendReply} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <label htmlFor="reply" className="block text-sm font-medium text-slate-300">
          Post an Agent Reply
        </label>
        <textarea
          id="reply"
          rows={3}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your response to the customer..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSending || !replyText.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold cursor-pointer transition-colors"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Send Reply</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default TicketDetailPage;
