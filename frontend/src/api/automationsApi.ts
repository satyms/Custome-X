import apiClient from './client';

export interface WorkflowEvent {
  id: string;
  organization_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: 'queued' | 'success' | 'failed' | 'retrying';
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStats {
  total_executions: number;
  successful_executions: number;
  failed_dlq_events: number;
  queued_or_retrying: number;
  success_rate_percent: number;
  active_workflows: number;
}

export interface WorkflowRetryResponse {
  event_id: string;
  status: string;
  retry_count: number;
  message: string;
}

export const automationsApi = {
  getEvents: async (params?: { status?: string; event_type?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get<WorkflowEvent[]>('/automations/events', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get<WorkflowStats>('/automations/stats');
    return response.data;
  },

  retryEvent: async (eventId: string) => {
    const response = await apiClient.post<WorkflowRetryResponse>(`/automations/events/${eventId}/retry`);
    return response.data;
  },

  dispatchTestEvent: async (eventType: string = 'ticket.created') => {
    const response = await apiClient.post<WorkflowEvent>('/automations/dispatch-test', null, {
      params: { event_type: eventType },
    });
    return response.data;
  },
};

export default automationsApi;
