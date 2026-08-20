export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethodType = 'CASH' | 'CARD' | 'CREDIT' | 'SPLIT';

export interface CartItem {
  product_id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  image_url?: string | null;
  unit_name?: string;
  unit_abbr?: string;
  unit_price: number;
  available_stock: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface SaleItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  product_barcode?: string;
  unit_name: string;
  unit_abbr: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  subtotal: number;
  returned_quantity: number;
  returnable_quantity: number;
}

export interface SalePayment {
  id: number;
  payment_method: PaymentMethodType;
  payment_method_display: string;
  payment_account?: number;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface SalesReturnItem {
  id: number;
  sale_item: number;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SalesReturn {
  id: number;
  return_number: string;
  original_sale: number;
  original_invoice_number: string;
  date: string;
  refund_amount: number;
  reason: string;
  notes?: string;
  created_by?: number;
  created_by_name: string;
  created_at: string;
  items: SalesReturnItem[];
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer: number;
  customer_name: string;
  customer_code: string;
  customer_phone?: string;
  customer_is_walkin: boolean;
  date: string;
  status: SaleStatus;
  status_display: string;
  payment_method: PaymentMethodType;
  payment_method_display: string;
  payment_account?: number;
  payment_account_name?: string;
  payment_account_code?: string;
  payment_status?: 'PAID' | 'PARTIAL' | 'UNPAID';
  payment_status_display?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  due_amount: number;
  returned_amount: number;
  notes?: string;
  created_by?: number;
  cashier_name: string;
  created_at: string;
  updated_at: string;
  items: SaleItem[];
  payments: SalePayment[];
  returns: SalesReturn[];
}

export interface SaleCheckoutPayload {
  customer: number;
  items: {
    product: number;
    quantity: number;
    unit_price?: number;
    discount?: number;
  }[];
  payment_method: PaymentMethodType;
  payment_account?: number;
  discount_amount?: number;
  tax_amount?: number;
  paid_amount?: number;
  payments_breakdown?: {
    payment_method: PaymentMethodType;
    payment_account?: number;
    amount: number;
    notes?: string;
  }[];
  notes?: string;
  date?: string;
}

export interface SalesReturnPayload {
  sale_id: number;
  items: {
    sale_item_id: number;
    quantity: number;
  }[];
  reason: string;
  notes?: string;
  date?: string;
}

export interface SalesReportRow {
  id: number;
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_id: number;
  cashier_name: string;
  payment_method: PaymentMethodType;
  payment_method_display: string;
  status: SaleStatus;
  items_count: number;
  subtotal: number;
  discount: number;
  grand_total: number;
  returned_amount: number;
  net_amount: number;
  paid_amount: number;
  due_amount: number;
}

export interface SalesReportSummary {
  total_invoices: number;
  gross_sales: number;
  total_discounts: number;
  total_returns: number;
  net_sales: number;
  total_paid: number;
  total_due: number;
  cash_sales: number;
  card_sales: number;
  credit_sales: number;
}

export interface ComprehensiveSalesReport {
  summary: SalesReportSummary;
  rows: SalesReportRow[];
}
