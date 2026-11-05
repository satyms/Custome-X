import apiClient from './client';

export interface ApprovalAction {
  id: string;
  type: string;
  title: string;
  ticket_id: string;
  ticket_number: string;
  customer_name: string;
  customer_email: string;
  amount?: number;
  order_id?: string;
  risk_level: string;
  confidence_score: number;
  ai_rationale: string;
  proposed_payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export interface ApprovalDecisionPayload {
  note?: string;
  rejection_reason?: string;
}

export const approvalsApi = {
  async listApprovals(status?: string): Promise<ApprovalAction[]> {
    const params = status ? { status } : {};
    const res = await apiClient.get<ApprovalAction[]>('/approvals', { params });
    return res.data;
  },

  async getPending(): Promise<ApprovalAction[]> {
    const res = await apiClient.get<ApprovalAction[]>('/approvals/pending');
    return res.data;
  },

  async approve(id: string, payload?: ApprovalDecisionPayload): Promise<ApprovalAction> {
    const res = await apiClient.post<ApprovalAction>(`/approvals/${id}/approve`, payload || {});
    return res.data;
  },

  async reject(id: string, payload: ApprovalDecisionPayload): Promise<ApprovalAction> {
    const res = await apiClient.post<ApprovalAction>(`/approvals/${id}/reject`, payload);
    return res.data;
  },
};

export default approvalsApi;
