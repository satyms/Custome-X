export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ApiErrorDetail {
  loc?: (string | number)[];
  msg: string;
  type?: string;
  field?: string;
  message?: string;
}

export interface ApiErrorResponse {
  error?: {
    code: string;
    message: string;
    request_id?: string;
    details?: Array<{ field: string; message: string }>;
  };
  detail?: string | ApiErrorDetail[];
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  status?: string;
  priority?: string;
}
