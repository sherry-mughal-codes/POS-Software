export type DaySessionStatusKind = 'OPEN' | 'CLOSED';

export interface POSDaySession {
  id: number;
  session_number: string;
  date: string;
  status: DaySessionStatusKind;
  status_display: string;
  opening_cash: number;
  opened_by: number;
  opened_by_name: string;
  opened_at: string;
  opening_notes?: string | null;
  closed_by?: number | null;
  closed_by_name?: string | null;
  closed_at?: string | null;
  expected_cash?: number | null;
  actual_cash?: number | null;
  cash_difference?: number | null;
  difference_reason?: string | null;
  closing_notes?: string | null;
  z_report_snapshot?: ZReportData | null;
  created_at: string;
  updated_at: string;
}

export interface DaySessionOpenPayload {
  opening_cash: number;
  opening_notes?: string;
  date?: string;
}

export interface DaySessionClosePayload {
  actual_cash: number;
  difference_reason?: string;
  closing_notes?: string;
}

export interface XReportSalesSummary {
  invoices_count: number;
  gross_sales: number;
  discounts: number;
  tax: number;
  net_sales: number;
  cash_sales: number;
  card_sales: number;
  credit_sales: number;
}

export interface XReportReturnsSummary {
  returns_count: number;
  total_returns: number;
  cash_refunds: number;
  credit_refunds: number;
}

export interface XReportStreamSummary {
  count: number;
  total: number;
  cash: number;
  bank: number;
}

export interface XReportTransfersSummary {
  cash_transfers_in: number;
  cash_transfers_out: number;
}

export interface XReportDrawerSummary {
  opening_cash: number;
  total_cash_in: number;
  total_cash_out: number;
  expected_cash: number;
}

export interface XReportData {
  report_type: 'X_REPORT';
  generated_at: string;
  session_id: number;
  session_number: string;
  date: string;
  status: DaySessionStatusKind;
  opened_by: string;
  opened_at: string;
  closed_by?: string | null;
  closed_at?: string | null;
  opening_cash: number;
  sales: XReportSalesSummary;
  returns: XReportReturnsSummary;
  customer_payments: XReportStreamSummary;
  expenses: XReportStreamSummary;
  supplier_payments: XReportStreamSummary;
  salary_payments: XReportStreamSummary;
  transfers: XReportTransfersSummary;
  cash_drawer: XReportDrawerSummary;
}

export interface ZReportClosingAudit {
  expected_cash: number;
  actual_cash: number;
  cash_difference: number;
  difference_type: 'EXACT' | 'SHORTAGE' | 'EXCESS';
  difference_reason?: string | null;
  closing_notes?: string | null;
  closed_by: string;
  closed_at: string;
}

export interface ZReportData extends Omit<XReportData, 'report_type'> {
  report_type: 'Z_REPORT';
  closing_audit: ZReportClosingAudit;
}

export interface CurrentDaySessionResponse {
  active: boolean;
  detail?: string;
  session?: POSDaySession;
  x_report?: XReportData;
}

export interface DaySessionsReportSummary {
  total_sessions: number;
  open_sessions: number;
  closed_sessions: number;
  total_opening_cash: number;
  total_expected_cash: number;
  total_actual_cash: number;
  total_cash_difference: number;
}

export interface DaySessionsReport {
  summary: DaySessionsReportSummary;
  rows: POSDaySession[];
}
