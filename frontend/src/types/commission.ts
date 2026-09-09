export interface SalesAgent {
  id: number;
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
  commission_percentage: string | number;
  joining_date: string;
  is_active: boolean;
  notes: string;
  outstanding_balance?: number;
  advance_credit_balance?: number;
  total_commission?: number;
  total_paid?: number;
  total_adjusted?: number;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSalesAgentData {
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  commission_percentage?: number | string;
  joining_date?: string;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateSalesAgentData {
  name?: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  commission_percentage?: number | string;
  joining_date?: string;
  is_active?: boolean;
  notes?: string;
}

export type CommissionStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'ADJUSTED' | 'CANCELLED';

export interface CommissionPayment {
  id: number;
  payment_number: string;
  commission_record: number;
  commission_record_number?: string;
  sales_agent: number;
  sales_agent_name?: string;
  date: string;
  amount: number | string;
  payment_account: number;
  payment_account_name?: string;
  payment_method: string;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export interface CommissionAdjustment {
  id: number;
  commission_record: number;
  sales_return?: number;
  sales_return_number?: string;
  date: string;
  returned_subtotal: number | string;
  adjusted_amount: number | string;
  adjustment_type: string;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export interface CommissionRecord {
  id: number;
  record_number: string;
  commission_number?: string;
  sale: number;
  sale_invoice_number: string;
  invoice_number?: string;
  sale_date: string;
  customer_name?: string;
  customer_id?: string;
  sale_grand_total?: number | string;
  sales_agent: number;
  sales_agent_name: string;
  sales_agent_code: string;
  sales_agent_phone?: string;
  sales_agent_is_active?: boolean;
  agent_name_snapshot?: string;
  agent_code_snapshot?: string;
  date: string;
  status: CommissionStatus;
  status_display: string;
  commission_rate_percentage: number | string;
  commission_percentage?: number | string;
  commission_base_amount: number | string;
  commission_base?: number | string;
  commission_amount: number | string;
  paid_amount: number | string;
  balance_due: number | string;
  net_payable_amount?: number | string;
  remaining_payable_amount?: number | string;
  adjusted_amount: number | string;
  advance_credit: number | string;
  advance_credit_amount?: number | string;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  payments?: CommissionPayment[];
  adjustments?: CommissionAdjustment[];
}

export interface PayCommissionPayload {
  amount: number | string;
  payment_account: number;
  payment_method?: string;
  date?: string;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  notes?: string;
}

export interface CommissionSlipData {
  company: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  payable: CommissionRecord;
  payment?: CommissionPayment;
  all_payments?: CommissionPayment[];
  adjustments?: CommissionAdjustment[];
  print_timestamp: string;
}

export interface SystemModule {
  id: number;
  key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  is_core: boolean;
  display_order: number;
  updated_at?: string | null;
}
