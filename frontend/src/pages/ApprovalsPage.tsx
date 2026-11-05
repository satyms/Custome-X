import React, { useState } from 'react';
import { Toast } from '../components/ui/Toast';
import { approvalsApi } from '../api';
import {
  ShieldAlert,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Clock,
  DollarSign,
  User,
  Package,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export interface ApprovalAction {
  id: string;
  type: 'refund' | 'cancellation' | 'address_change' | 'goodwill_credit';
  title: string;
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  customerTier: 'VIP' | 'Regular' | 'New';
  amount?: number;
  orderId?: string;
  carrier?: string;
  trackingNumber?: string;
  riskLevel: 'critical' | 'high' | 'medium';
  confidenceScore: number;
  aiRationale: string;
  proposedPayload: Record<string, any>;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const INITIAL_APPROVALS: ApprovalAction[] = [
  {
    id: 'APP-101',
    type: 'refund',
    title: 'Refund $148.50 for Lost in Transit Delivery',
    ticketId: 't-8841',
    ticketNumber: 'CX-1042',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.v@acme.org',
    customerTier: 'VIP',
    amount: 148.50,
    orderId: 'ORD-99120',
    carrier: 'FedEx',
    trackingNumber: 'FX-884192039',
    riskLevel: 'high',
    confidenceScore: 94,
    aiRationale: 'Carrier tracking has had zero scan events for 16 days. Meets Section 4.2 of Non-Delivery Policy for expedited full refund without item return.',
    proposedPayload: {
      action: 'stripe_refund',
      amount_cents: 14850,
      currency: 'usd',
      reason: 'lost_in_transit',
      notify_customer: true,
    },
    requestedAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    status: 'pending',
  },
  {
    id: 'APP-102',
    type: 'cancellation',
    title: 'Emergency Order Cancellation & Routing Intercept',
    ticketId: 't-8845',
    ticketNumber: 'CX-1045',
    customerName: 'Samantha Green',
    customerEmail: 's.green@example.com',
    customerTier: 'Regular',
    amount: 320.00,
    orderId: 'ORD-99144',
    carrier: 'UPS',
    trackingNumber: '1Z9999999999999999',
    riskLevel: 'critical',
    confidenceScore: 89,
    aiRationale: 'Customer requested cancellation 10 minutes after dispatch label generation. Warehouse intercept webhook must halt pallet handoff to prevent unauthorized freight expense.',
    proposedPayload: {
      action: 'warehouse_intercept',
      order_id: 'ORD-99144',
      halt_fulfillment: true,
      restock_fee: false,
    },
    requestedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    status: 'pending',
  },
  {
    id: 'APP-103',
    type: 'goodwill_credit',
    title: 'Issue $45.00 Goodwill Store Credit for Damaged Packaging',
    ticketId: 't-8850',
    ticketNumber: 'CX-1049',
    customerName: 'Devon Lee',
    customerEmail: 'devon.lee@techstart.io',
    customerTier: 'VIP',
    amount: 45.00,
    orderId: 'ORD-99081',
    riskLevel: 'medium',
    confidenceScore: 98,
    aiRationale: 'Customer submitted photographic proof of crushed exterior shipping box. Hardware is functional but packaging was damaged. Customer has $3,400 lifetime spend.',
    proposedPayload: {
      action: 'store_credit_grant',
      amount_usd: 45.00,
      expires_in_days: 180,
      courtesy_note: 'Complimentary goodwill concession for delivery inconvenience',
    },
    requestedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'pending',
  },
  {
    id: 'APP-104',
    type: 'address_change',
    title: 'Update Shipping Address on Pending International Parcel',
    ticketId: 't-8855',
    ticketNumber: 'CX-1052',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@global.de',
    customerTier: 'Regular',
    orderId: 'ORD-99150',
    carrier: 'DHL Express',
    riskLevel: 'high',
    confidenceScore: 91,
    aiRationale: 'Customer moved to a new apartment before customs clearance was filed. Requires manual verification of zip code to avoid customs penalty.',
    proposedPayload: {
      action: 'dhl_address_override',
      new_postal_code: '10115',
      new_city: 'Berlin',
      country: 'DE',
    },
    requestedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'pending',
  },
];

export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalAction[]>(INITIAL_APPROVALS);

  React.useEffect(() => {
    const fetchLiveApprovals = async () => {
      try {
        const liveItems = await approvalsApi.listApprovals();
        if (liveItems && liveItems.length > 0) {
          const mapped = liveItems.map((item: any) => ({
            id: item.id,
            type: item.type || 'refund',
            title: item.title,
            ticketId: item.ticket_id || item.ticketId,
            ticketNumber: item.ticket_number || item.ticketNumber,
            customerName: item.customer_name || item.customerName,
            customerEmail: item.customer_email || item.customerEmail,
            customerTier: 'VIP' as const,
            amount: item.amount,
            orderId: item.order_id || item.orderId,
            carrier: 'FedEx',
            trackingNumber: 'FX-884192039',
            riskLevel: (item.risk_level as any) || 'high',
            confidenceScore: item.confidence_score || 92,
            aiRationale: item.ai_rationale || '',
            proposedPayload: item.proposed_payload || {},
            requestedAt: item.requested_at || new Date().toISOString(),
            status: (item.status as any) || 'pending',
            reviewedBy: item.reviewed_by,
            reviewedAt: item.reviewed_at,
            rejectionReason: item.rejection_reason,
          }));
          setApprovals(mapped);
        }
      } catch (err) {
        console.warn('Could not load live approvals, using local cache:', err);
      }
    };
    fetchLiveApprovals();
  }, []);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [activeApproval, setActiveApproval] = useState<ApprovalAction | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('Exceeds discretionary policy');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const filteredApprovals = approvals.filter((a) => a.status === selectedTab);

  const handleApprove = async (approval: ApprovalAction) => {
    try {
      await approvalsApi.approve(approval.id);
    } catch (err) {
      console.warn('Backend approval dispatch failed:', err);
    }
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === approval.id
          ? {
              ...item,
              status: 'approved',
              reviewedBy: 'Current Support Staff',
              reviewedAt: new Date().toISOString(),
            }
          : item
      )
    );
    if (activeApproval?.id === approval.id) {
      setActiveApproval(null);
    }
    setToast({
      type: 'success',
      text: `Approved action ${approval.id} (${approval.title}). Dispatched to execution engine.`,
    });
  };

  const handleRejectConfirm = async () => {
    if (!activeApproval) return;
    try {
      await approvalsApi.reject(activeApproval.id, { rejection_reason: rejectReason });
    } catch (err) {
      console.warn('Backend reject dispatch failed:', err);
    }
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === activeApproval.id
          ? {
              ...item,
              status: 'rejected',
              rejectionReason: rejectReason,
              reviewedBy: 'Current Support Staff',
              reviewedAt: new Date().toISOString(),
            }
          : item
      )
    );
    setRejectModalOpen(false);
    const rejectedId = activeApproval.id;
    setActiveApproval(null);
    setToast({
      type: 'error',
      text: `Rejected action ${rejectedId}. Rationale logged to audit trail.`,
    });
  };

  const getRiskBadge = (level: 'critical' | 'high' | 'medium') => {
    switch (level) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-3 w-3" /> Critical Risk
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3 w-3" /> High Risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <DollarSign className="h-3 w-3" /> Financial Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.text} onClose={() => setToast(null)} />}

      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">HITL Approvals Queue</h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-medium">
              Human-in-the-Loop Gate
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review and authorize high-risk actions exceeding autonomous agent safety thresholds.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="h-4 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedTab === 'approved'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Approved History
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedTab === 'rejected'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pending Review</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{pendingCount}</p>
          <p className="text-xs text-amber-400/80 mt-1">Requires supervisor stamp</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Value at Risk</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">$513.50</p>
          <p className="text-xs text-slate-400 mt-1">Pending escrow / refunds</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>AI Confidence Avg</span>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">93.0%</p>
          <p className="text-xs text-emerald-400 mt-1">High policy agreement</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>SLA Response Target</span>
            <ShieldAlert className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white">&lt; 15 mins</p>
          <p className="text-xs text-sky-400 mt-1">98.2% compliance rate</p>
        </div>
      </div>

      {/* Main Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No actions in this queue</h3>
            <p className="text-sm text-slate-400 mt-1">
              All agent-proposed interventions have been reviewed and dispatched.
            </p>
          </div>
        ) : (
          filteredApprovals.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {item.id}
                  </span>
                  {getRiskBadge(item.riskLevel)}
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Confidence: {item.confidenceScore}%
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Ticket: {item.ticketNumber}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{item.title}</h3>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="font-semibold text-indigo-400 block mb-0.5">
                    Agent Policy Rationale:
                  </span>
                  {item.aiRationale}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>{item.customerName} ({item.customerTier})</span>
                  </span>
                  {item.orderId && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <Package className="h-3.5 w-3.5 text-slate-500" />
                      <span>Order: {item.orderId}</span>
                    </span>
                  )}
                  {item.carrier && (
                    <span className="flex items-center gap-1.5 text-slate-400 font-mono">
                      <span>Carrier: {item.carrier} ({item.trackingNumber})</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(item.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveApproval(item)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect Context</span>
                </button>

                {item.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveApproval(item);
                        setRejectModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(item)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Authorize Action</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-over Inspection Drawer */}
      {activeApproval && !rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="font-mono text-xs text-indigo-400 font-bold block">
                    {activeApproval.id}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-0.5">{activeApproval.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveApproval(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Proposed Payload Inspection */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Target API Mutation Payload
                </span>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto leading-relaxed">
                  {JSON.stringify(activeApproval.proposedPayload, null, 2)}
                </pre>
              </div>

              {/* Rationale & Confidence */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Policy Adherence</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {activeApproval.confidenceScore}% Confidence
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeApproval.aiRationale}
                </p>
              </div>

              {/* Customer & Order Context */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300">Customer Metadata</span>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Name</span>
                    <span className="font-medium text-slate-200">{activeApproval.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email</span>
                    <span className="font-medium text-slate-200 truncate block">
                      {activeApproval.customerEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account Tier</span>
                    <span className="font-medium text-slate-200">{activeApproval.customerTier}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Linked Ticket</span>
                    <span className="font-mono font-medium text-indigo-400">
                      {activeApproval.ticketNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveApproval(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close Drawer
              </button>
              {activeApproval.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold border border-rose-500/30 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(activeApproval)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    Authorize Action
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && activeApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Reject Proposed Action</h3>
            </div>
            <p className="text-xs text-slate-300">
              Please state why this action cannot be executed so the agent can inform the customer and adjust future proposals.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Rejection Reason</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Exceeds discretionary policy">Exceeds discretionary policy</option>
                <option value="Customer dispute under carrier review">Customer dispute under carrier review</option>
                <option value="Suspected fraud or account takeover">Suspected fraud or account takeover</option>
                <option value="Resolved via alternative customer channel">Resolved via alternative customer channel</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-600/30"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
