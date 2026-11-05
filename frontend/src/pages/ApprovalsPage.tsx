import React, { useState } from 'react';
import { Toast } from '../components/ui/Toast';
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
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [activeApproval, setActiveApproval] = useState<ApprovalAction | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('Exceeds discretionary policy');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const filteredApprovals = approvals.filter((a) => a.status === selectedTab);

  const handleApprove = (approval: ApprovalAction) => {
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

  const handleRejectConfirm = () => {
    if (!activeApproval) return;
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
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
          >
            <ShieldAlert className="h-3 w-3" /> Critical Risk
          </span>
        );
      case 'high':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}
          >
            <AlertTriangle className="h-3 w-3" /> High Risk
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--sky-light)', color: 'var(--sky)' }}
          >
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              HITL Approvals Queue
            </h1>
            <span
              className="px-2 py-0.5 rounded-full border text-xs font-mono font-medium"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
            >
              Human-in-the-Loop Gate
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Review and authorize high-risk actions exceeding autonomous agent safety thresholds.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => setSelectedTab('pending')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            style={{
              background: selectedTab === 'pending' ? 'var(--accent)' : 'transparent',
              color: selectedTab === 'pending' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span
                className="h-4 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{
                  background: selectedTab === 'pending' ? '#ffffff' : 'var(--danger)',
                  color: selectedTab === 'pending' ? 'var(--accent)' : '#ffffff',
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('approved')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: selectedTab === 'approved' ? 'var(--accent)' : 'transparent',
              color: selectedTab === 'approved' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            Approved History
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('rejected')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: selectedTab === 'rejected' ? 'var(--accent)' : 'transparent',
              color: selectedTab === 'rejected' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Pending Review</span>
            <Clock className="h-4 w-4" style={{ color: 'var(--warning)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{pendingCount}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--warning)' }}>Requires supervisor stamp</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Value at Risk</span>
            <DollarSign className="h-4 w-4" style={{ color: 'var(--success)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>$513.50</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Pending escrow / refunds</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>AI Confidence Avg</span>
            <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>93.0%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>High policy agreement</p>
        </div>

        <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>SLA Response Target</span>
            <ShieldAlert className="h-4 w-4" style={{ color: 'var(--sky)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>&lt; 15 mins</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sky)' }}>98.2% compliance rate</p>
        </div>
      </div>

      {/* Main Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="p-12 text-center rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--success)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No actions in this queue</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              All agent-proposed interventions have been reviewed and dispatched.
            </p>
          </div>
        ) : (
          filteredApprovals.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border shadow-sm transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                  >
                    {item.id}
                  </span>
                  {getRiskBadge(item.riskLevel)}
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded border"
                    style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
                  >
                    Confidence: {item.confidenceScore}%
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    Ticket: {item.ticketNumber}
                  </span>
                </div>

                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>

                <p
                  className="text-xs leading-relaxed p-3 rounded-lg border"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  <span className="font-semibold block mb-0.5" style={{ color: 'var(--accent)' }}>
                    Agent Policy Rationale:
                  </span>
                  {item.aiRationale}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{item.customerName} ({item.customerTier})</span>
                  </span>
                  {item.orderId && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <Package className="h-3.5 w-3.5" />
                      <span>Order: {item.orderId}</span>
                    </span>
                  )}
                  {item.carrier && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <span>Carrier: {item.carrier} ({item.trackingNumber})</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(item.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setActiveApproval(item)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 min-h-[38px]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
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
                      className="px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                      style={{
                        background: 'var(--danger-light)',
                        color: 'var(--danger)',
                        borderColor: 'transparent',
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(item)}
                      className="px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                      style={{ background: 'var(--success)' }}
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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          <div
            className="w-full max-w-xl h-full border-l p-6 flex flex-col justify-between overflow-y-auto shadow-2xl"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <span className="font-mono text-xs font-bold block" style={{ color: 'var(--accent)' }}>
                    {activeApproval.id}
                  </span>
                  <h2 className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{activeApproval.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveApproval(null)}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-100"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Proposed Payload Inspection */}
              <div className="space-y-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Target API Mutation Payload
                </span>
                <pre
                  className="p-3.5 rounded-xl border text-xs font-mono overflow-x-auto leading-relaxed"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--success)' }}
                >
                  {JSON.stringify(activeApproval.proposedPayload, null, 2)}
                </pre>
              </div>

              {/* Rationale & Confidence */}
              <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Policy Adherence</span>
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>
                    {activeApproval.confidenceScore}% Confidence
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {activeApproval.aiRationale}
                </p>
              </div>

              {/* Customer & Order Context */}
              <div className="space-y-3">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Customer Metadata</span>
                <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl border" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                  <div>
                    <span className="block font-medium" style={{ color: 'var(--text-muted)' }}>Name</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{activeApproval.customerName}</span>
                  </div>
                  <div>
                    <span className="block font-medium" style={{ color: 'var(--text-muted)' }}>Email</span>
                    <span className="font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
                      {activeApproval.customerEmail}
                    </span>
                  </div>
                  <div>
                    <span className="block font-medium" style={{ color: 'var(--text-muted)' }}>Account Tier</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{activeApproval.customerTier}</span>
                  </div>
                  <div>
                    <span className="block font-medium" style={{ color: 'var(--text-muted)' }}>Linked Ticket</span>
                    <span className="font-mono font-medium" style={{ color: 'var(--accent)' }}>
                      {activeApproval.ticketNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t flex items-center justify-end gap-2.5" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setActiveApproval(null)}
                className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-slate-50"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Close Drawer
              </button>
              {activeApproval.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(activeApproval)}
                    className="px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-sm cursor-pointer"
                    style={{ background: 'var(--success)' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2.5" style={{ color: 'var(--danger)' }}>
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Reject Proposed Action</h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Please state why this action cannot be executed so the agent can inform the customer and adjust future proposals.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Rejection Reason</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
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
                className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-slate-50"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-sm"
                style={{ background: 'var(--danger)' }}
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
