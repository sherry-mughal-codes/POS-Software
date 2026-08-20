export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface Account {
  id: number;
  code: string;
  name: string;
  account_type: AccountType;
  parent: number | null;
  parent_code?: string | null;
  parent_name?: string | null;
  is_active: boolean;
  is_system: boolean;
  is_header?: boolean;
  is_leaf?: boolean;
  description?: string | null;
  normal_balance: 'DEBIT' | 'CREDIT';
  current_balance: number;
  children_count: number;
  created_at: string;
  updated_at: string;
}

export interface JournalItem {
  id: number;
  account: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  description?: string | null;
}

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  posting_date?: string | null;
  reference_type: string;
  reference_id?: string | null;
  status: JournalEntryStatus;
  narration?: string | null;
  created_by?: number | null;
  created_by_username?: string | null;
  lines: JournalItem[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  linked_account: number;
  account_code: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AccountLedgerRow {
  id: number;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  reference_id?: string | null;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface AccountLedgerResponse {
  account: {
    id: number;
    code: string;
    name: string;
    type: AccountType;
    normal_balance: 'DEBIT' | 'CREDIT';
  };
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  rows: AccountLedgerRow[];
}

export interface TrialBalanceRow {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
}

export interface TrialBalanceResponse {
  as_of_date: string;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  rows: TrialBalanceRow[];
}

export interface IncomeStatementResponse {
  period: { start_date: string; end_date: string };
  revenue: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  expenses: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  net_profit: number;
}

export interface BalanceSheetResponse {
  as_of_date: string;
  assets: {
    rows: Array<{ id: number; code: string; name: string; amount: number }>;
    total: number;
  };
  liabilities: {
    rows: Array<{ id: number; code: string; name: string; amount: number }>;
    total: number;
  };
  equity: {
    rows: Array<{ id: number; code: string; name: string; amount: number }>;
    total: number;
  };
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

export interface SimulationPayload {
  transaction_type: 'CASH_SALE' | 'CREDIT_SALE' | 'SALE_RETURN' | 'EXPENSE' | 'CUSTOMER_PAYMENT' | 'SUPPLIER_PURCHASE';
  reference_id: string;
  amount: number;
  paid_amount?: number;
  payment_account_code?: string;
  secondary_account_code?: string;
  cogs_amount?: number;
  customer_or_supplier_name?: string;
  narration?: string;
}

export interface JournalItemCreatePayload {
  account: number;
  debit: number;
  credit: number;
  description?: string;
}

export type JournalPurposeType =
  | 'OPENING_BALANCE'
  | 'MANUAL'
  | 'TRANSFER'
  | 'EXPENSE'
  | 'STOCK_ADJUSTMENT'
  | 'REVERSAL';

export interface JournalEntryCreatePayload {
  entry_date?: string;
  reference_type?: string;
  purpose?: string;
  reference_id?: string;
  narration: string;
  lines: JournalItemCreatePayload[];
}
