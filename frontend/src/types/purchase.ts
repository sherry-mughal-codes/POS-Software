export interface PurchaseItem {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  unit_name?: string;
  unit_code?: string;
  quantity: number;
  purchase_rate: number;
  tax_rate: number;
  subtotal: number;
  returned_quantity: number;
  remaining_returnable_quantity: number;
}

export interface Purchase {
  id: number;
  purchase_number: string;
  supplier: number;
  supplier_name: string;
  supplier_company?: string;
  date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CANCELLED';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  payable_amount: number;
  is_fully_paid: boolean;
  returned_amount?: number;
  returns_count?: number;
  payment_method?: number | null;
  payment_method_name?: string | null;
  payment_account?: number | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_bank?: string | null;
  supplier_invoice_number?: string | null;
  supplier_invoice_file?: string | null;
  notes?: string | null;
  created_by?: number | null;
  created_by_username?: string | null;
  items: PurchaseItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseCreatePayload {
  supplier: number;
  date?: string;
  discount_amount?: number;
  tax_amount?: number;
  paid_amount?: number;
  payment_method?: number | null;
  payment_account?: number | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_bank?: string | null;
  supplier_invoice_number?: string | null;
  supplier_invoice_file?: string | null;
  notes?: string;
  submit_immediately?: boolean;
  items: {
    product: number;
    quantity: number;
    purchase_rate: number;
    tax_rate?: number;
  }[];
}

export interface PurchaseReturnItem {
  id: number;
  purchase_item: number;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_rate: number;
  subtotal: number;
}

export type PurchaseReturnRefundMethod = 'PAYABLE_DEDUCTION' | 'CASH' | 'BANK' | 'CHEQUE' | 'CASH_REFUND';

export interface PurchaseReturn {
  id: number;
  return_number: string;
  original_purchase: number;
  original_purchase_number: string;
  supplier: number;
  supplier_name: string;
  supplier_company?: string;
  date: string;
  total_amount: number;
  refund_method: PurchaseReturnRefundMethod;
  payment_account?: number | null;
  payment_account_name?: string | null;
  payment_account_code?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_bank?: string | null;
  notes?: string | null;
  created_by_username?: string | null;
  items: PurchaseReturnItem[];
  created_at: string;
}

export interface PurchaseReturnCreatePayload {
  purchase_id: number;
  refund_method: PurchaseReturnRefundMethod;
  payment_account?: number;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  notes?: string;
  items: { purchase_item_id: number; quantity: number }[];
}

export type SupplierPaymentStatus = 'DRAFT' | 'SUBMITTED' | 'CANCELLED';
export type SupplierPaymentMethodType = 'CASH' | 'BANK' | 'CHEQUE';

export interface SupplierPayment {
  id: number;
  payment_number: string;
  supplier: number;
  supplier_name: string;
  supplier_company?: string;
  date: string;
  amount: number;
  payment_method: SupplierPaymentMethodType | string;
  payment_method_display?: string;
  payment_account: number;
  payment_account_name?: string;
  payment_account_code?: string;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_bank?: string | null;
  reference?: string | null;
  notes?: string | null;
  status: SupplierPaymentStatus;
  status_display?: string;
  journal_entry?: number | null;
  journal_entry_number?: string | null;
  reversal_journal_entry?: number | null;
  created_by?: number | null;
  created_by_username?: string | null;
  submitted_by?: number | null;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  cancelled_by?: number | null;
  cancelled_by_name?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SupplierPaymentCreatePayload {
  supplier: number;
  amount: number;
  payment_method: SupplierPaymentMethodType;
  payment_account: number;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  date?: string;
  reference?: string;
  notes?: string;
  submit_now?: boolean;
}

export interface SupplierStatementRow {
  date: string;
  reference: string;
  transaction_type: 'PURCHASE' | 'PURCHASE_RETURN' | 'SUPPLIER_PAYMENT' | string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface SupplierStatement {
  supplier_id: number;
  supplier_name: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  start_date?: string | null;
  end_date?: string | null;
  summary: {
    opening_balance: number;
    total_purchases: number;
    upfront_paid?: number;
    voucher_payments?: number;
    total_payments: number;
    total_returns: number;
    closing_payable: number;
  };
  rows: SupplierStatementRow[];
}

export interface SupplierPayableSummaryItem {
  supplier_id: number;
  supplier_name: string;
  company_name?: string;
  phone?: string;
  opening_balance: number;
  total_purchases: number;
  upfront_paid?: number;
  voucher_payments?: number;
  total_payments: number;
  total_returns: number;
  outstanding_payable: number;
}

export interface SupplierPayablesReport {
  summary: {
    total_suppliers: number;
    total_purchases: number;
    total_returns: number;
    total_payments: number;
    total_outstanding_payables: number;
  };
  supplier_summaries: SupplierPayableSummaryItem[];
  payments: SupplierPayment[];
}

export interface PurchaseReportSummary {
  total_orders: number;
  total_purchases: number;
  opening_balance?: number;
  total_paid: number;
  total_payable: number;
  total_returned: number;
  net_purchases: number;
}
