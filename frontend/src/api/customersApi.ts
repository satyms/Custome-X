import apiClient from './client';
import type {
  Customer,
  CustomerCreatePayload,
  PaginatedResponse,
  PaginationParams,
} from '../types';

export interface CustomerFilterParams extends PaginationParams {
  email?: string;
}

export const customersApi = {
  async listCustomers(params?: CustomerFilterParams): Promise<PaginatedResponse<Customer>> {
    const response = await apiClient.get<PaginatedResponse<Customer>>('/customers', {
      params,
    });
    return response.data;
  },

  async getCustomer(id: string): Promise<Customer> {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  async createCustomer(payload: CustomerCreatePayload): Promise<Customer> {
    const response = await apiClient.post<Customer>('/customers', payload);
    return response.data;
  },
};

export default customersApi;
