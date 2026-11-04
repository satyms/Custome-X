import apiClient from './client';
import type {
  Ticket,
  TicketDetail,
  TicketCreatePayload,
  TicketUpdatePayload,
  TicketStatus,
  Message,
  MessageCreatePayload,
  PaginatedResponse,
  PaginationParams,
} from '../types';

export interface TicketFilterParams extends PaginationParams {
  customer_id?: string;
  assigned_to?: string;
}

export const ticketsApi = {
  async listTickets(params?: TicketFilterParams): Promise<PaginatedResponse<Ticket>> {
    const response = await apiClient.get<PaginatedResponse<Ticket>>('/tickets', {
      params,
    });
    return response.data;
  },

  async getTicket(id: string): Promise<TicketDetail> {
    const response = await apiClient.get<TicketDetail>(`/tickets/${id}`);
    return response.data;
  },

  async createTicket(payload: TicketCreatePayload): Promise<Ticket> {
    const response = await apiClient.post<Ticket>('/tickets', payload);
    return response.data;
  },

  async updateTicket(id: string, payload: TicketUpdatePayload): Promise<Ticket> {
    const response = await apiClient.patch<Ticket>(`/tickets/${id}`, payload);
    return response.data;
  },

  async updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
    return this.updateTicket(id, { status });
  },

  async addMessage(ticketId: string, payload: MessageCreatePayload): Promise<Message> {
    const response = await apiClient.post<Message>(`/tickets/${ticketId}/messages`, payload);
    return response.data;
  },

  async deleteTicket(id: string): Promise<void> {
    await apiClient.delete(`/tickets/${id}`);
  },
};

export default ticketsApi;
