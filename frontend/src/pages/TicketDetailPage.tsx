import React, { useEffect, useState, useRef, useTransition } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ticketsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTicketWebSocket } from '../hooks/useTicketWebSocket';
import type {
  TicketDetail,
  Ticket,
  TicketStatus,
  TicketPriority,
  Message,
  SenderType,
} from '../types';
import { Toast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import {
  ArrowLeft,
  User,
  Clock,
  Send,
  Loader2,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  Check,
  Search,
  CheckCircle,
  Mail,
  Phone,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [, startTransition] = useTransition();

  // Active Ticket and Mini Queue State
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [queueTickets, setQueueTickets] = useState<Ticket[]>([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQueueLoading, setIsQueueLoading] = useState<boolean>(false);

  // Layout Responsive Panels
  const [showLeftQueue, setShowLeftQueue] = useState<boolean>(true);
  const [showRightInspector, setShowRightInspector] = useState<boolean>(true);

  // Reply Composer State
  const [replyText, setReplyText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusAction, setStatusAction] = useState<TicketStatus | 'keep_open'>('keep_open');

  // Interactive UI Helpers
  const [toastMessage, setToastMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Real-time WebSocket Stream & Simulation Hook
  const {
    connectionStatus,
    isStreaming,
    streamingContent,
    activeTypist,
    simulateAIStream,
  } = useTicketWebSocket({
    ticketId: id,
    onNewMessage: (msg) => {
      setTicket((prev) => {
        if (!prev) return null;
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
    },
    onStatusChange: (newStatus) => {
      setTicket((prev) => (prev ? { ...prev, status: newStatus as TicketStatus } : null));
    },
  });

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom smoothly
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch ticket details
  const loadTicketDetail = async (ticketId: string, initial = false) => {
    if (initial) setIsLoading(true);
    try {
      const data = await ticketsApi.getTicket(ticketId);
      setTicket(data);
    } catch (err) {
      console.error('Failed to load ticket details:', err);
      setToastMessage({
        type: 'error',
        text: 'Failed to load ticket details or ticket belongs to another tenant.',
      });
    } finally {
      if (initial) setIsLoading(false);
    }
  };

  // Fetch mini queue list for left sidebar
  const loadMiniQueue = async () => {
    setIsQueueLoading(true);
    try {
      const res = await ticketsApi.listTickets({ limit: 30 });
      setQueueTickets(res.items);
    } catch (err) {
      console.warn('Mini queue fetch failed:', err);
    } finally {
      setIsQueueLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTicketDetail(id, true);
    }
    loadMiniQueue();
  }, [id]);

  // Scroll to bottom when ticket messages update
  useEffect(() => {
    if (ticket?.messages) {
      scrollToBottom('auto');
    }
  }, [ticket?.id]);

  // Handle Copy to Clipboard
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Optimistic Message Submission with Rich Reply Composer
  const handleSendMessage = async (customNextStatus?: TicketStatus) => {
    if (!id || !replyText.trim() || isSending) return;

    const trimmedContent = replyText.trim();
    const targetStatus =
      customNextStatus || (statusAction !== 'keep_open' ? statusAction : undefined);

    // 1. Construct Optimistic Message
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      ticket_id: id,
      sender_type: 'agent' as SenderType,
      sender_id: user?.id || null,
      content: trimmedContent,
      created_at: new Date().toISOString(),
    };

    // 2. Append optimistically to local UI state
    setTicket((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, optimisticMessage],
        status: targetStatus || prev.status,
      };
    });

    setReplyText('');
    setIsSending(true);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      // 3. Dispatch HTTP request in background
      const sentMessage = await ticketsApi.addMessage(id, {
        sender_type: 'agent' as SenderType,
        sender_id: user?.id || undefined,
        content: trimmedContent,
      });

      // 4. Update status if requested
      if (targetStatus && targetStatus !== ticket?.status) {
        await ticketsApi.updateTicketStatus(id, targetStatus);
      }

      // 5. Replace optimistic message with confirmed backend response
      setTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.map((m) => (m.id === tempId ? sentMessage : m)),
          status: targetStatus || prev.status,
        };
      });

      // Refresh mini queue in background to update status/timestamps
      startTransition(() => {
        loadMiniQueue();
      });
    } catch (err) {
      console.error('Failed to post reply:', err);
      // Rollback optimistic message on failure
      setTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== tempId),
        };
      });
      setReplyText(trimmedContent); // restore user's input
      setToastMessage({
        type: 'error',
        text: 'Failed to send message. Please retry.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard shortcut listener (Ctrl + Enter / Cmd + Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Update Status directly via dropdown
  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!id || !ticket) return;
    try {
      const updated = await ticketsApi.updateTicketStatus(id, newStatus);
      setTicket((prev) => (prev ? { ...prev, status: updated.status } : null));
      setToastMessage({
        type: 'success',
        text: `Ticket status updated to ${newStatus.replace('_', ' ')}.`,
      });
      loadMiniQueue();
    } catch (err) {
      console.error('Status update failed:', err);
      setToastMessage({
        type: 'error',
        text: 'Invalid status transition or permission denied.',
      });
    }
  };

  // Update Priority directly via dropdown
  const handleUpdatePriority = async (newPriority: TicketPriority) => {
    if (!id || !ticket) return;
    try {
      const updated = await ticketsApi.updateTicket(id, { priority: newPriority });
      setTicket((prev) => (prev ? { ...prev, priority: updated.priority } : null));
      setToastMessage({
        type: 'success',
        text: `Priority updated to ${newPriority}.`,
      });
      loadMiniQueue();
    } catch (err) {
      console.error('Priority update failed:', err);
      setToastMessage({
        type: 'error',
        text: 'Failed to update priority.',
      });
    }
  };

  // Filter mini queue tickets
  const filteredQueue = queueTickets.filter(
    (t) =>
      t.title.toLowerCase().includes(queueSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(queueSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Loading ticket conversation...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="max-w-md p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
          <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Ticket Not Found</h2>
          <p className="mt-1 text-sm text-slate-400">
            This ticket does not exist or has been removed from your organization.
          </p>
          <Link
            to="/tickets"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Ticket Queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden -m-6 md:-m-8">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Context Breadcrumb & Panel Visibility Toggles */}
      <div className="h-13 px-4 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/tickets"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">All Tickets</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-xs text-indigo-400">#{ticket.id.slice(0, 8)}</span>
          <span className="text-slate-600 hidden md:inline">/</span>
          <span className="text-xs font-medium text-slate-200 truncate max-w-xs md:max-w-md hidden md:inline">
            {ticket.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Left Queue Panel */}
          <button
            type="button"
            onClick={() => setShowLeftQueue(!showLeftQueue)}
            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showLeftQueue
                ? 'bg-slate-800 border-slate-700 text-indigo-400'
                : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Queue Panel"
          >
            {showLeftQueue ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>

          {/* Toggle Right Inspector Panel */}
          <button
            type="button"
            onClick={() => setShowRightInspector(!showRightInspector)}
            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showRightInspector
                ? 'bg-slate-800 border-slate-700 text-indigo-400'
                : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Context Inspector"
          >
            {showRightInspector ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* 3-Column Workspace Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================= */}
        {/* COLUMN 1 (LEFT): MINI TICKET QUEUE */}
        {/* ========================================================= */}
        {showLeftQueue && (
          <aside className="w-72 lg:w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
            {/* Search Queue Header */}
            <div className="p-3 border-b border-slate-800/80">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Filter active queue..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
              {isQueueLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={`skel-queue-${i}`} className="p-3 space-y-2">
                    <Skeleton className="h-3.5 w-36" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))
              ) : filteredQueue.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No tickets found matching search.
                </div>
              ) : (
                filteredQueue.map((item) => {
                  const isActive = item.id === ticket.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id !== ticket.id) {
                          navigate(`/tickets/${item.id}`);
                        }
                      }}
                      className={`w-full text-left p-3.5 transition-colors cursor-pointer border-l-2 ${
                        isActive
                          ? 'bg-slate-800/70 border-l-indigo-500 text-white'
                          : 'border-l-transparent text-slate-300 hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] text-slate-400">
                          #{item.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            item.priority === 'urgent'
                              ? 'bg-rose-500/10 text-rose-400'
                              : item.priority === 'high'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-xs font-medium truncate text-slate-100">{item.title}</p>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                        <span className="capitalize">{item.status.replace('_', ' ')}</span>
                        <span>{new Date(item.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* ========================================================= */}
        {/* COLUMN 2 (CENTER): CONVERSATION THREAD & RICH COMPOSER */}
        {/* ========================================================= */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {/* Conversation Header Bar */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-white tracking-tight truncate max-w-xl">
                  {ticket.title}
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
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
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Created {new Date(ticket.created_at).toLocaleString()}</span>
                <span>•</span>
                <span>Customer ID: {ticket.customer_id.slice(0, 8)}...</span>
              </p>
            </div>

            {/* Live WebSocket Connection Pill */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-[11px] font-mono shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : connectionStatus === 'reconnecting'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="text-slate-300">
                  {connectionStatus === 'connected'
                    ? 'Live Stream'
                    : connectionStatus === 'reconnecting'
                    ? 'Reconnecting'
                    : 'Real-time Sync'}
                </span>
              </div>
            </div>

            {/* Quick Status Transition Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={ticket.status}
                onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Chronological Message History Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Initial Audit Log Marker */}
            <div className="flex items-center justify-center my-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                <span>Ticket initialized with priority: {ticket.priority}</span>
              </div>
            </div>

            {ticket.messages.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800/80">
                No conversation history found for this ticket.
              </div>
            ) : (
              ticket.messages.map((message, index) => {
                const isCustomer = message.sender_type === 'customer';
                const isAi = message.sender_type === 'ai_assistant';
                const isOptimistic = message.id.startsWith('optimistic-');

                return (
                  <div
                    key={message.id || index}
                    className={`flex flex-col ${
                      isCustomer ? 'items-start' : 'items-end'
                    }`}
                  >
                    {/* Message Bubble Card */}
                    <div
                      className={`max-w-2xl rounded-2xl p-4 shadow-md transition-all ${
                        isCustomer
                          ? 'bg-slate-900 border border-slate-800 rounded-tl-sm'
                          : isAi
                          ? 'bg-purple-950/40 border border-purple-500/30 rounded-tr-sm'
                          : 'bg-indigo-950/40 border border-indigo-500/30 rounded-tr-sm'
                      } ${isOptimistic ? 'opacity-70 animate-pulse' : ''}`}
                    >
                      {/* Sender Meta Header */}
                      <div className="flex items-center justify-between gap-4 text-xs mb-2">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {isCustomer ? (
                            <>
                              <div className="h-5 w-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">
                                <User className="h-3 w-3" />
                              </div>
                              <span className="text-sky-300">
                                {ticket.customer?.full_name || 'Customer'}
                              </span>
                            </>
                          ) : isAi ? (
                            <>
                              <div className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px]">
                                <Bot className="h-3 w-3" />
                              </div>
                              <span className="text-purple-300">AI Assistant</span>
                            </>
                          ) : (
                            <>
                              <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                              <span className="text-indigo-300">Support Agent</span>
                            </>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Content Body */}
                      <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>

                      {isOptimistic && (
                        <span className="text-[10px] text-indigo-400 mt-1 block italic font-mono">
                          Delivering reply...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Real-time Streaming AI/Agent Token Bubble */}
            {isStreaming && (
              <div className="flex items-start gap-3 justify-start animate-fade-in">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="max-w-xl rounded-2xl p-4 bg-slate-900 border border-indigo-500/40 text-slate-100 shadow-xl">
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                      {activeTypist || 'AI Agent Streaming'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Real-time Token Stream</span>
                  </div>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {streamingContent}
                    <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                  </p>
                </div>
              </div>
            )}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* ========================================================= */}
          {/* RICH REPLY COMPOSER */}
          {/* ========================================================= */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md shrink-0">
            <div className="rounded-xl border border-slate-700 bg-slate-850 focus-within:border-indigo-500 transition-colors shadow-lg">
              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type an agent reply to customer... (Press Ctrl + Enter to send)"
                rows={3}
                className="w-full bg-transparent p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
              />

              {/* Composer Toolbar & Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-3 py-2 border-t border-slate-700/60 bg-slate-900/50 gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      simulateAIStream(undefined, async (finalText) => {
                        if (!id) return;
                        try {
                          const aiMsg = await ticketsApi.addMessage(id, {
                            sender_type: 'ai_assistant' as SenderType,
                            content: finalText,
                          });
                          setTicket((prev) =>
                            prev ? { ...prev, messages: [...prev.messages, aiMsg] } : null
                          );
                          setToastMessage({
                            type: 'success',
                            text: 'AI response stream completed & persisted.',
                          });
                        } catch (e) {
                          console.warn('AI simulated message append:', e);
                        }
                      });
                    }}
                    disabled={isStreaming}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    title="Simulate Real-time AI Assistant stream response"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>{isStreaming ? 'Streaming...' : 'Stream AI Reply'}</span>
                  </button>
                  <span className="hidden sm:inline font-mono">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                      Ctrl
                    </kbd>{' '}
                    +{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                      Enter
                    </kbd>{' '}
                    to send
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Status Action Selector */}
                  <select
                    value={statusAction}
                    onChange={(e) =>
                      setStatusAction(e.target.value as TicketStatus | 'keep_open')
                    }
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="keep_open">Send &amp; Keep Open</option>
                    <option value="in_progress">Send &amp; In Progress</option>
                    <option value="escalated">Send &amp; Escalate</option>
                    <option value="resolved">Send &amp; Resolve</option>
                    <option value="closed">Send &amp; Close</option>
                  </select>

                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={isSending || !replyText.trim()}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer min-h-[36px]"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reply</span>
                        <Send className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* COLUMN 3 (RIGHT): CONTEXT INSPECTOR */}
        {/* ========================================================= */}
        {showRightInspector && (
          <aside className="w-80 lg:w-88 border-l border-slate-800 bg-slate-900/50 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
            {/* Customer Profile Section */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <User className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Customer Context
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                  {ticket.customer?.full_name ? ticket.customer.full_name.slice(0, 2).toUpperCase() : 'CU'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {ticket.customer?.full_name || 'Direct Inquirer'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {ticket.customer?.email || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </span>
                  <div className="flex items-center gap-1 font-mono text-slate-200">
                    <span className="truncate max-w-[140px]">{ticket.customer?.email || 'N/A'}</span>
                    {ticket.customer?.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(ticket.customer!.email, 'email')}
                        className="text-slate-400 hover:text-white p-0.5"
                        title="Copy email"
                      >
                        {copiedField === 'email' ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </span>
                  <span className="font-mono text-slate-200">
                    {ticket.customer?.phone || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Metadata Inspector */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Shield className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Ticket Inspector
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* UUID */}
                <div>
                  <span className="text-slate-500 block mb-1">Ticket UUID</span>
                  <div className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono text-[11px] text-slate-300">
                    <span className="truncate">{ticket.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ticket.id, 'uuid')}
                      className="ml-2 text-slate-400 hover:text-white"
                      title="Copy Ticket ID"
                    >
                      {copiedField === 'uuid' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <span className="text-slate-500 block mb-1">Priority Urgency</span>
                  <select
                    value={ticket.priority}
                    onChange={(e) =>
                      handleUpdatePriority(e.target.value as TicketPriority)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Status Indicator */}
                <div>
                  <span className="text-slate-500 block mb-1">Lifecycle Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        ticket.status === 'open'
                          ? 'bg-sky-400'
                          : ticket.status === 'in_progress'
                          ? 'bg-amber-400'
                          : ticket.status === 'escalated'
                          ? 'bg-rose-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-semibold capitalize text-slate-200">
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Assigned Agent */}
                <div>
                  <span className="text-slate-500 block mb-1">Assigned Agent</span>
                  <span className="font-mono text-slate-300">
                    {ticket.assigned_to ? `#${ticket.assigned_to.slice(0, 8)}` : 'Unassigned (Queue Pool)'}
                  </span>
                </div>

                {/* Timestamps */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Opened:</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span>{new Date(ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default TicketDetailPage;
