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
        <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-medium">Loading ticket conversation...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div
          className="max-w-md p-8 text-center rounded-2xl border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <AlertTriangle className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--danger)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Ticket Not Found</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            This ticket does not exist or has been removed from your organization.
          </p>
          <Link
            to="/tickets"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-semibold"
            style={{ background: 'var(--accent)' }}
          >
            <ArrowLeft className="h-4 w-4" /> Return to Ticket Queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-app)' }}>
      {/* Toast Notification Alert */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Context Breadcrumb & Panel Visibility Toggles */}
      <div
        className="h-12 px-4 border-b flex items-center justify-between shrink-0"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <Link
            to="/tickets"
            className="flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Tickets</span>
          </Link>
          <span style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="font-mono text-xs font-semibold" style={{ color: 'var(--accent)' }}>#{ticket.id.slice(0, 8)}</span>
          <span style={{ color: 'var(--border-strong)' }} className="hidden md:inline">/</span>
          <span className="text-xs font-medium truncate max-w-xs md:max-w-md hidden md:inline" style={{ color: 'var(--text-primary)' }}>
            {ticket.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle Left Queue Panel */}
          <button
            type="button"
            onClick={() => setShowLeftQueue(!showLeftQueue)}
            className="p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: showLeftQueue ? 'var(--accent-light)' : 'transparent',
              borderColor: 'var(--border)',
              color: showLeftQueue ? 'var(--accent)' : 'var(--text-muted)',
            }}
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
            className="p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: showRightInspector ? 'var(--accent-light)' : 'transparent',
              borderColor: 'var(--border)',
              color: showRightInspector ? 'var(--accent)' : 'var(--text-muted)',
            }}
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
          <aside
            className="w-72 lg:w-80 border-r flex flex-col shrink-0"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {/* Search Queue Header */}
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Filter active queue..."
                  className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none"
                  style={{
                    background: 'var(--bg-app)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
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
                <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
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
                      className={`w-full text-left p-3 transition-colors cursor-pointer border-l-2 ${
                        isActive
                          ? 'border-l-indigo-600'
                          : 'border-l-transparent hover:bg-slate-50'
                      }`}
                      style={{
                        background: isActive ? 'var(--accent-light)' : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          #{item.id.slice(0, 8)}
                        </span>
                        <span
                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                          style={{
                            background: item.priority === 'urgent' ? 'var(--danger-light)' : item.priority === 'high' ? 'var(--warning-light)' : 'var(--bg-muted)',
                            color: item.priority === 'urgent' ? 'var(--danger)' : item.priority === 'high' ? 'var(--warning)' : 'var(--text-muted)',
                          }}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                      <div className="flex items-center justify-between mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
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
        <section className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-app)' }}>
          {/* Conversation Header Bar */}
          <div
            className="px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight truncate max-w-xl" style={{ color: 'var(--text-primary)' }}>
                  {ticket.title}
                </h1>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    background:
                      ticket.status === 'open'
                        ? 'var(--sky-light)'
                        : ticket.status === 'in_progress'
                        ? 'var(--warning-light)'
                        : ticket.status === 'escalated'
                        ? 'var(--danger-light)'
                        : 'var(--success-light)',
                    color:
                      ticket.status === 'open'
                        ? 'var(--sky)'
                        : ticket.status === 'in_progress'
                        ? 'var(--warning)'
                        : ticket.status === 'escalated'
                        ? 'var(--danger)'
                        : 'var(--success)',
                  }}
                >
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <span>Created {new Date(ticket.created_at).toLocaleString()}</span>
                <span>•</span>
                <span>Customer ID: {ticket.customer_id.slice(0, 8)}...</span>
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : connectionStatus === 'reconnecting'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-slate-400'
                  }`}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {connectionStatus === 'connected'
                    ? 'Live Stream'
                    : connectionStatus === 'reconnecting'
                    ? 'Reconnecting'
                    : 'Real-time Sync'}
                </span>
              </div>

              {/* Status Transition Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Status:</span>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                  className="border rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none cursor-pointer"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Chronological Message History Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Initial Audit Log Marker */}
            <div className="flex items-center justify-center my-1">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <CheckCircle className="h-3 w-3" style={{ color: 'var(--success)' }} />
                <span>Ticket initialized with priority: {ticket.priority}</span>
              </div>
            </div>

            {ticket.messages.length === 0 ? (
              <div
                className="p-8 text-center text-sm rounded-xl border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
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
                      className={`max-w-2xl rounded-2xl p-4 border transition-all ${
                        isCustomer
                          ? 'rounded-tl-sm'
                          : isAi
                          ? 'rounded-tr-sm'
                          : 'rounded-tr-sm'
                      } ${isOptimistic ? 'opacity-70 animate-pulse' : ''}`}
                      style={{
                        background: isCustomer ? 'var(--bg-card)' : isAi ? '#FAF5FF' : 'var(--bg-card)',
                        borderColor: isAi ? '#E9D5FF' : 'var(--border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Sender Meta Header */}
                      <div className="flex items-center justify-between gap-4 text-xs mb-2">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {isCustomer ? (
                            <>
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center text-[10px]"
                                style={{ background: 'var(--sky-light)', color: 'var(--sky)' }}
                              >
                                <User className="h-3 w-3" />
                              </div>
                              <span style={{ color: 'var(--sky)' }}>
                                {ticket.customer?.full_name || 'Customer'}
                              </span>
                            </>
                          ) : isAi ? (
                            <>
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center text-[10px]"
                                style={{ background: '#F3E8FF', color: '#9333EA' }}
                              >
                                <Bot className="h-3 w-3" />
                              </div>
                              <span style={{ color: '#9333EA' }}>AI Assistant</span>
                            </>
                          ) : (
                            <>
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center text-[10px]"
                                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                              <span style={{ color: 'var(--accent)' }}>Support Agent</span>
                            </>
                          )}
                        </div>

                        <span className="text-[11px] flex items-center gap-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                          <Clock className="h-3 w-3" />
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Content Body */}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {message.content}
                      </p>

                      {isOptimistic && (
                        <span className="text-[10px] mt-1 block italic font-mono" style={{ color: 'var(--accent)' }}>
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
              <div className="flex items-start gap-2.5 justify-start">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  <Bot className="h-4 w-4" />
                </div>
                <div
                  className="max-w-xl rounded-2xl p-4 border"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--accent)',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.1)',
                  }}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                      <span className="h-2 w-2 rounded-full animate-ping" style={{ background: 'var(--accent)' }} />
                      {activeTypist || 'AI Agent Streaming'}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Real-time Stream</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {streamingContent}
                    <span className="inline-block w-1.5 h-3.5 ml-1 animate-pulse align-middle" style={{ background: 'var(--accent)' }} />
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
          <div className="p-4 border-t shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div
              className="rounded-xl border transition-colors"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-card)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type an agent reply to customer... (Press Ctrl + Enter to send)"
                rows={3}
                className="w-full bg-transparent p-3.5 text-sm focus:outline-none resize-none"
                style={{ color: 'var(--text-primary)' }}
              />

              {/* Composer Toolbar & Actions */}
              <div
                className="flex flex-col sm:flex-row items-center justify-between px-3 py-2 border-t gap-2"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
              >
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    style={{
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                      borderColor: 'var(--border)',
                    }}
                    title="Simulate Real-time AI Assistant stream response"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>{isStreaming ? 'Streaming...' : 'Stream AI Reply'}</span>
                  </button>
                  <span className="hidden sm:inline font-mono">
                    <kbd className="px-1.5 py-0.5 rounded border text-[10px]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      Ctrl
                    </kbd>{' '}
                    +{' '}
                    <kbd className="px-1.5 py-0.5 rounded border text-[10px]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
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
                    className="border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer min-h-[34px]"
                    style={{ background: 'var(--accent)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
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
          <aside
            className="w-80 lg:w-88 border-l p-5 flex flex-col gap-4 overflow-y-auto shrink-0"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {/* Customer Profile Section */}
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2 border-b pb-2.5" style={{ borderColor: 'var(--border)' }}>
                <User className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Customer Context
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  {ticket.customer?.full_name ? ticket.customer.full_name.slice(0, 2).toUpperCase() : 'CU'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {ticket.customer?.full_name || 'Direct Inquirer'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {ticket.customer?.email || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Mail className="h-3.5 w-3.5" /> Email
                  </span>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>{ticket.customer?.email || 'N/A'}</span>
                    {ticket.customer?.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(ticket.customer!.email, 'email')}
                        className="p-0.5 hover:opacity-75 cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
                        title="Copy email"
                      >
                        {copiedField === 'email' ? (
                          <Check className="h-3 w-3" style={{ color: 'var(--success)' }} />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {ticket.customer?.phone || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Metadata Inspector */}
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2 border-b pb-2.5" style={{ borderColor: 'var(--border)' }}>
                <Shield className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Ticket Inspector
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* UUID */}
                <div>
                  <span className="block mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Ticket UUID</span>
                  <div
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border font-mono text-[11px]"
                    style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <span className="truncate">{ticket.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ticket.id, 'uuid')}
                      className="ml-2 hover:opacity-75 cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                      title="Copy Ticket ID"
                    >
                      {copiedField === 'uuid' ? (
                        <Check className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <span className="block mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Priority Urgency</span>
                  <select
                    value={ticket.priority}
                    onChange={(e) =>
                      handleUpdatePriority(e.target.value as TicketPriority)
                    }
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Status Indicator */}
                <div>
                  <span className="block mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Lifecycle Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background:
                          ticket.status === 'open'
                            ? 'var(--sky)'
                            : ticket.status === 'in_progress'
                            ? 'var(--warning)'
                            : ticket.status === 'escalated'
                            ? 'var(--danger)'
                            : 'var(--success)',
                      }}
                    />
                    <span className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Assigned Agent */}
                <div>
                  <span className="block mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Assigned Agent</span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {ticket.assigned_to ? `#${ticket.assigned_to.slice(0, 8)}` : 'Unassigned (Queue Pool)'}
                  </span>
                </div>

                {/* Timestamps */}
                <div className="pt-2 border-t space-y-1.5 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
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
