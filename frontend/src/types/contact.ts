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
  opening_balance?: number;
  outstanding_balance?: number;
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
  opening_balance?: number;
  outstanding_payable?: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
export interface ContactBulkImportResult {
  total_rows: number;
  created_count: number;
  skipped_count: number;
  errors: string[];
  created_customers?: any[];
  created_suppliers?: any[];
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

export type PaymentMethodKind = 'CASH' | 'BANK' | 'CARD';
export type PaymentStatusKind = 'DRAFT' | 'SUBMITTED' | 'CANCELLED';

export interface CustomerPayment {
  id: number;
  payment_number: string;
  customer: number;
  customer_name: string;
  customer_code: string;
  date: string;
  amount: number;
  payment_method: PaymentMethodKind;
  payment_method_display: string;
  payment_account: number;
  payment_account_name: string;
  payment_account_code: string;
  reference?: string | null;
  notes?: string | null;
  status: PaymentStatusKind;
  status_display: string;
  journal_entry?: number | null;
  journal_entry_number?: string | null;
  created_by?: number | null;
  created_by_name: string;
  submitted_by?: number | null;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  cancelled_by?: number | null;
  cancelled_by_name?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPaymentPayload {
  customer: number;
  amount: number;
  date?: string;
  payment_method: PaymentMethodKind;
  payment_account?: number;
  reference?: string;
  notes?: string;
  submit_now?: boolean;
}

export interface CustomerStatementRow {
  date: string;
  type: 'SALE' | 'PAYMENT' | 'RETURN';
  type_display: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface CustomerStatement {
  customer: {
    id: number;
    customer_id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    credit_enabled: boolean;
    is_walkin: boolean;
  };
  period: {
    start_date?: string | null;
    end_date?: string | null;
  };
  summary: {
    total_debit: number;
    total_sales?: number;
    total_payments?: number;
    total_returns?: number;
    total_credit: number;
    closing_balance: number;
  };
  rows: CustomerStatementRow[];
}

export interface CustomerOutstandingInfo {
  customer_id: number;
  customer_code: string;
  customer_name: string;
  is_walkin: boolean;
  credit_enabled: boolean;
  total_credit_sales: number;
  total_payments: number;
  total_returns: number;
  outstanding_balance: number;
}

export interface ReceivablesReportRow {
  customer_id: number;
  customer_code: string;
  name: string;
  phone: string;
  credit_enabled: boolean;
  total_credit_sales: number;
  total_payments: number;
  outstanding_balance: number;
  status: string;
}

export interface ReceivablesReportSummary {
  total_registered_customers: number;
  total_credit_sales: number;
  total_sales_returns?: number;
  net_credit_invoiced?: number;
  total_payments_collected: number;
  total_outstanding_receivables: number;
}

export interface ReceivablesReport {
  summary: ReceivablesReportSummary;
  rows: ReceivablesReportRow[];
}
