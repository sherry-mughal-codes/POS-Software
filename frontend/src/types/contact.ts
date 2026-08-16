export interface Customer {
  id: number;
  customer_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_walkin: boolean;
  credit_enabled: boolean;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  supplier_id: string;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_id?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerFilterParams {
  search?: string;
  credit_enabled?: boolean;
  is_active?: boolean;
}

export interface SupplierFilterParams {
  search?: string;
  is_active?: boolean;
}
