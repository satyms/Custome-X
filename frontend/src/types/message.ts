export type SenderType = 'customer' | 'agent' | 'system' | 'ai_assistant';

export interface Message {
  id: string;
  ticket_id: string;
  sender_type: SenderType;
  sender_id?: string | null;
  content: string;
  created_at: string;
}

export interface MessageCreatePayload {
  sender_type: SenderType;
  sender_id?: string | null;
  content: string;
}
