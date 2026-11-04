export interface Customer {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  created_at: string;
}

export interface CustomerCreatePayload {
  email: string;
  full_name: string;
  phone?: string | null;
  organization_id?: string;
}

export interface CustomerUpdatePayload {
  full_name?: string;
  phone?: string | null;
}
