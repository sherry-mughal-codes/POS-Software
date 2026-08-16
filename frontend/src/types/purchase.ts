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
  payment_method?: number | null;
  payment_method_name?: string | null;
  payment_account?: number | null;
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
  refund_method: 'PAYABLE_DEDUCTION' | 'CASH_REFUND';
  notes?: string | null;
  created_by_username?: string | null;
  items: PurchaseReturnItem[];
  created_at: string;
}

export interface SupplierPayment {
  id: number;
  payment_number: string;
  supplier: number;
  supplier_name: string;
  supplier_company?: string;
  date: string;
  amount: number;
  payment_method: number;
  payment_method_name: string;
  payment_account: number;
  reference?: string | null;
  notes?: string | null;
  created_by_username?: string | null;
  created_at: string;
}

export interface SupplierStatement {
  supplier_id: number;
  supplier_name: string;
  company_name?: string;
  total_purchased: number;
  total_paid: number;
  total_returns: number;
  net_payable: number;
}

export interface PurchaseReportSummary {
  total_orders: number;
  total_purchases: number;
  total_paid: number;
  total_payable: number;
  total_returned: number;
  net_purchases: number;
}
