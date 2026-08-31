/**
 * TypeScript interface definitions for Executive Business Management Dashboard (Phase 13).
 */

export type DashboardPeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface TodayBenchmark {
  sales: number;
  orders_count: number;
}

export interface DashboardSalesSummary {
  orders_count: number;
  gross_sales: number;
  discounts: number;
  tax: number;
  sales_returns: number;
  returns_count: number;
  net_sales: number;
  avg_order_value: number;
}

export interface DashboardProfitOverview {
  net_sales: number;
  cogs: number;
  gross_profit: number;
  gross_margin_percentage: number;
  operating_expenses: number;
  net_profit: number;
  net_margin_percentage: number;
}

export interface DashboardCashPosition {
  cash_in_hand: number;
  bank_balance: number;
  total_liquid_cash: number;
}

export interface TopDebtorItem {
  id: number;
  customer_id: string;
  name: string;
  phone: string;
  outstanding_balance: number;
}

export interface DashboardReceivablesSummary {
  total_receivables: number;
  customers_count: number;
  top_debtors: TopDebtorItem[];
}

export interface TopCreditorItem {
  id: number;
  supplier_id: string;
  name: string;
  company_name: string;
  phone: string;
  outstanding_payable: number;
}

export interface DashboardPayablesSummary {
  total_payables: number;
  suppliers_count: number;
  top_creditors: TopCreditorItem[];
}

export interface LowStockAlertItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  status: 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface DashboardInventoryHealth {
  total_skus: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_inventory_valuation: number;
  low_stock_alerts: LowStockAlertItem[];
}

export interface SalesTrendPoint {
  date: string;
  label: string;
  orders_count: number;
  gross_sales: number;
  returns: number;
  net_sales: number;
}

export interface TopProductItem {
  product_id: number;
  sku: string;
  name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  profit: number;
}

export interface PaymentDistributionItem {
  method_code: string;
  method_name: string;
  amount: number;
  percentage: number;
}

export interface CashierPerformanceItem {
  cashier_id: number;
  cashier_name: string;
  username: string;
  orders_count: number;
  gross_sales: number;
  returns: number;
  net_sales: number;
  avg_ticket: number;
}

export interface ExpenseCategoryBreakdownItem {
  category_name: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ActivePOSSessionSnapshot {
  id: number;
  session_number: string;
  opened_at: string;
  opened_by: string;
  opening_cash: number;
}

export interface DashboardWarrantySummary {
  warranty_claim_units: number;
  warranty_claim_valuation: number;
}

export interface ExecutiveDashboardData {
  period: DashboardPeriod | string;
  period_label: string;
  start_date: string;
  end_date: string;
  is_restricted_view: boolean;
  today_benchmark: TodayBenchmark;
  sales_summary: DashboardSalesSummary;
  profit_overview: DashboardProfitOverview;
  cash_position: DashboardCashPosition;
  receivables_summary: DashboardReceivablesSummary;
  payables_summary: DashboardPayablesSummary;
  inventory_health: DashboardInventoryHealth;
  warranty_summary?: DashboardWarrantySummary;
  sales_trend: SalesTrendPoint[];
  top_products_by_quantity: TopProductItem[];
  top_products_by_revenue: TopProductItem[];
  payment_distribution: PaymentDistributionItem[];
  cashier_performance: CashierPerformanceItem[];
  expense_categories: ExpenseCategoryBreakdownItem[];
  active_pos_session: ActivePOSSessionSnapshot | null;
}

