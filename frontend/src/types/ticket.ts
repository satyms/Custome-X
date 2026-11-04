import type { Customer } from './customer';
import type { Message } from './message';

export type TicketStatus = 'open' | 'in_progress' | 'escalated' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  organization_id: string;
  customer_id: string;
  assigned_to?: string | null;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
}

export interface TicketCreatePayload {
  title: string;
  priority?: TicketPriority;
  customer_id: string;
  assigned_to?: string | null;
  initial_message: string;
}

export interface TicketUpdatePayload {
  title?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string | null;
}

export interface TicketDetail extends Ticket {
  messages: Message[];
  customer?: Customer | null;
}
