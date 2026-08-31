export type ExpenseStatusType = 'DRAFT' | 'SUBMITTED' | 'CANCELLED';
export type TransferStatusType = 'SUBMITTED' | 'CANCELLED';

export interface Expense {
  id: number;
  expense_number: string;
  date: string;
  expense_account: number;
  expense_account_name: string;
  expense_account_code: string;
  description: string;
  amount: number;
  payment_method?: 'CASH' | 'BANK' | 'CHEQUE';
  payment_account: number;
  payment_account_name: string;
  payment_account_code: string;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_bank?: string | null;
  reference_no?: string;
  attachment?: string | null;
  notes?: string;
  status: ExpenseStatusType;
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

export interface ExpensePayload {
  date?: string;
  expense_account: number;
  description: string;
  amount: number;
  payment_method?: 'CASH' | 'BANK' | 'CHEQUE';
  payment_account: number;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  reference_no?: string;
  notes?: string;
  submit_now?: boolean;
}

export interface AccountTransfer {
  id: number;
  transfer_number: string;
  date: string;
  from_account: number;
  from_account_name: string;
  from_account_code: string;
  to_account: number;
  to_account_name: string;
  to_account_code: string;
  amount: number;
  reference?: string;
  notes?: string;
  status: TransferStatusType;
  status_display: string;
  journal_entry?: number | null;
  journal_entry_number?: string | null;
  created_by?: number | null;
  created_by_name: string;
  cancelled_by?: number | null;
  cancelled_by_name?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountTransferPayload {
  date?: string;
  from_account: number;
  to_account: number;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface ExpenseReportSummary {
  total_records: number;
  submitted_count: number;
  total_expenses: number;
  cash_expenses: number;
  bank_expenses: number;
  account_breakdown: Record<string, number>;
}

export interface ExpenseReportRow {
  id: number;
  expense_number: string;
  date: string;
  expense_account_id: number;
  expense_account_name: string;
  expense_account_code: string;
  description: string;
  amount: number;
  payment_account_id: number;
  payment_account_name: string;
  payment_account_code: string;
  reference_no?: string;
  has_attachment: boolean;
  attachment_url?: string | null;
  status: ExpenseStatusType;
  status_display: string;
  created_by: string;
  submitted_by?: string | null;
  notes?: string;
}

export interface ComprehensiveExpenseReport {
  summary: ExpenseReportSummary;
  rows: ExpenseReportRow[];
}
