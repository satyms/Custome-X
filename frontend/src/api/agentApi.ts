import apiClient from './client';
import type {
  OrchestrationInput,
  OrchestrationResponse,
} from '../types/orchestrator';

export const agentApi = {
  async orchestrate(payload: OrchestrationInput): Promise<OrchestrationResponse> {
    const response = await apiClient.post<OrchestrationResponse>(
      '/agent/orchestrate',
      payload
    );
    return response.data;
  },

  async runAgent(ticketId: string, customerId?: string, instruction?: string) {
    const response = await apiClient.post('/agent/run-agent', {
      ticket_id: ticketId,
      customer_id: customerId,
      instruction,
    });
    return response.data;
  },

  async getReplySuggestion(ticketId: string) {
    const response = await apiClient.post('/agent/reply-suggestion', {
      ticket_id: ticketId,
    });
    return response.data;
  },
};

export default agentApi;
