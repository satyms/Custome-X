export interface OrchestrationInput {
  ticket_id: string;
  customer_id: string;
  customer_email?: string;
  message: string;
  order_id?: string;
  channel?: string;
  session_history?: Array<{ role: string; content: string }>;
  organization_id?: string;
}

export interface ExtractedEntities {
  order_id?: string | null;
  sku?: string | null;
  tracking_number?: string | null;
  reason?: string | null;
  amount_cents?: number | null;
  category?: string | null;
  extra?: Record<string, unknown>;
}

export interface SourceCitation {
  source_type: string;
  document_id?: string | null;
  title?: string | null;
  chunk_id?: string | null;
  section?: string | null;
  table?: string | null;
  record_id?: string | null;
  snippet?: string | null;
}

export interface ProposedActionPayload {
  order_id?: string | null;
  refund_amount_cents?: number | null;
  reason?: string | null;
  tracking_number?: string | null;
  carrier?: string | null;
  sku?: string | null;
  note?: string | null;
  extra?: Record<string, unknown>;
}

export interface ProposedAction {
  action_type: string;
  payload: ProposedActionPayload;
  idempotency_key?: string | null;
}

export interface StepTrace {
  step_number: number;
  step_name: string;
  status: 'success' | 'warning' | 'filtered' | 'blocked' | string;
  summary: string;
  duration_ms: number;
  metadata?: Record<string, unknown>;
}

export interface OrchestrationResponse {
  intent: string;
  entities: ExtractedEntities;
  answer: string;
  sources: SourceCitation[];
  proposed_action?: ProposedAction | null;
  needs_human: boolean;
  confidence_score: number;
  reason?: string | null;
  tools_called: string[];
  execution_traces: StepTrace[];
  total_execution_time_ms: number;
}
