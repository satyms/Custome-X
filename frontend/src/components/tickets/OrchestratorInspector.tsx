import React, { useState } from 'react';
import type { OrchestrationResponse, StepTrace } from '../../types/orchestrator';
import { agentApi } from '../../api';
import {
  Sparkles,
  Bot,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface OrchestratorInspectorProps {
  ticketId: string;
  customerId: string;
  customerEmail?: string;
  latestCustomerMessage?: string;
  onApplyDraft: (draftText: string) => void;
}

export const OrchestratorInspector: React.FC<OrchestratorInspectorProps> = ({
  ticketId,
  customerId,
  customerEmail,
  latestCustomerMessage,
  onApplyDraft,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<OrchestrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTraces, setShowTraces] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const handleRunOrchestrator = async () => {
    setIsRunning(true);
    setError(null);

    const message =
      latestCustomerMessage?.trim() ||
      'Customer inquiry regarding recent order status and refund eligibility.';

    try {
      const data = await agentApi.orchestrate({
        ticket_id: ticketId,
        customer_id: customerId,
        customer_email: customerEmail,
        message,
        channel: 'web_chat',
      });
      setResult(data);
    } catch (err: unknown) {
      console.error('Orchestration failed:', err);
      let errMsg = 'Failed to execute orchestration pipeline.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axErr = err as { response?: { data?: { error?: { message?: string } } } };
        if (axErr.response?.data?.error?.message) {
          errMsg = axErr.response.data.error.message;
        }
      }
      setError(errMsg);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              AI Orchestration (Layer 3)
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              7-Step Deterministic Pipeline
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunOrchestrator}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer min-h-[32px]"
          title="Run 7-step autonomous reasoning engine"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
              <span>Run Pipeline</span>
            </>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Idle Prompt */}
      {!result && !isRunning && !error && (
        <div className="py-4 text-center">
          <Bot className="h-7 w-7 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">
            Execute the 7-step engine to verify customer ownership, retrieve RAG policies, and plan actions.
          </p>
        </div>
      )}

      {/* Execution Results */}
      {result && (
        <div className="space-y-3.5 text-xs">
          {/* Status & Confidence Header */}
          <div className="flex items-center justify-between bg-slate-850 p-2.5 rounded-lg border border-slate-750">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  result.needs_human ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span className="font-semibold text-slate-200">
                {result.needs_human ? 'Escalated to Staff' : 'Autonomous Decision'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-slate-400">
                {result.total_execution_time_ms.toFixed(1)}ms
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                {(result.confidence_score * 100).toFixed(0)}% Conf
              </span>
            </div>
          </div>

          {/* Intent & Entities */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Classified Intent:</span>
              <span className="font-mono font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
                {result.intent}
              </span>
            </div>

            {result.entities.order_id && (
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Order ID:</span>
                <span className="font-mono text-slate-200">
                  {result.entities.order_id}
                </span>
              </div>
            )}

            {result.entities.sku && (
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>SKU:</span>
                <span className="font-mono text-slate-200">
                  {result.entities.sku}
                </span>
              </div>
            )}
          </div>

          {/* Human Escalation Alert */}
          {result.needs_human && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Supervisor Approval Gate</span>
                <span className="text-[11px] text-amber-200/90 leading-tight block">
                  {result.reason || 'High-risk action requires human verification.'}
                </span>
              </div>
            </div>
          )}

          {/* Action Proposal */}
          {result.proposed_action && (
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1.5">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold block">
                Proposed Action
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-200 font-medium">
                  {result.proposed_action.action_type}
                </span>
                {result.proposed_action.payload.refund_amount_cents && (
                  <span className="font-mono text-emerald-400 font-bold">
                    ${(result.proposed_action.payload.refund_amount_cents / 100).toFixed(2)}
                  </span>
                )}
              </div>
              {result.proposed_action.payload.note && (
                <p className="text-[11px] text-slate-400 italic">
                  {result.proposed_action.payload.note}
                </p>
              )}
            </div>
          )}

          {/* Suggested Customer Reply */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">Draft Reply</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyDraft(result.answer)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
                  title="Copy text"
                >
                  {copiedDraft ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{copiedDraft ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-200 text-xs leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
              {result.answer}
            </div>

            <button
              type="button"
              onClick={() => onApplyDraft(result.answer)}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Insert Draft into Composer</span>
            </button>
          </div>

          {/* 7-Step Execution Traces Accordion */}
          {result.execution_traces.length > 0 && (
            <div className="border-t border-slate-800/80 pt-2">
              <button
                type="button"
                onClick={() => setShowTraces(!showTraces)}
                className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 text-[11px] font-medium py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                  <span>7-Step Verification Traces ({result.execution_traces.length})</span>
                </span>
                {showTraces ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {showTraces && (
                <div className="mt-2 space-y-1.5 pl-1">
                  {result.execution_traces.map((trace: StepTrace) => (
                    <div
                      key={trace.step_number}
                      className="p-2 rounded bg-slate-800/60 border border-slate-750 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          Step {trace.step_number}: {trace.step_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {trace.duration_ms.toFixed(1)}ms
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        {trace.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RAG Sources Cited */}
          {result.sources.length > 0 && (
            <div className="border-t border-slate-800/80 pt-2">
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 text-[11px] font-medium py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                  <span>Sources Cited ({result.sources.length})</span>
                </span>
                {showSources ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {showSources && (
                <div className="mt-2 space-y-1.5 pl-1">
                  {result.sources.map((src, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-800/60 border border-slate-750 text-[10px] space-y-0.5"
                    >
                      <div className="font-semibold text-slate-300">
                        {src.title || src.source_type}
                      </div>
                      {src.snippet && (
                        <p className="text-slate-400 italic">
                          "{src.snippet.slice(0, 150)}..."
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrchestratorInspector;
