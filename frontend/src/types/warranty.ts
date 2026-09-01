export type CustomerWarrantyClaimStatus = 'COMPLETED' | 'CANCELLED';

export type SupplierWarrantyClaimStatus = 'IN_PROGRESS' | 'WARRANTY_COMPLETED' | 'CANCELLED';

export interface CustomerWarrantyClaim {
  id: number;
  claim_number: string;
  original_sale: number;
  sale_invoice_number: string;
  sale_item: number;
  customer: number;
  customer_name: string;
  customer_phone: string;
  claimed_product: number;
  claimed_product_name: string;
  claimed_product_sku: string;
  supplier: number;
  supplier_name: string;
  supplier_company?: string;
  replacement_product: number;
  replacement_product_name: string;
  replacement_product_sku: string;
  quantity: number;
  claim_date: string;
  warranty_expiry_date?: string | null;
  original_unit_cost: number;
  replacement_unit_cost: number;
  valuation: number;
  status: CustomerWarrantyClaimStatus;
  journal_entry?: number | null;
  notes?: string;
  created_by?: number | null;
  created_by_username?: string;
  created_at: string;
  completed_at?: string | null;
  remaining_supplier_claimable_quantity: number;
  supplier_claimed_quantity: number;
}

export interface WarrantyEligibleSaleItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  unit_name: string;
  quantity_sold: number;
  unit_price: number;
  unit_cost: number;
  warranty_period_days?: number | null;
  warranty_expiry_date?: string | null;
  claimed_quantity: number;
  remaining_claimable_quantity: number;
  warranty_status: 'ACTIVE' | 'EXPIRED' | 'ALREADY_CLAIMED' | 'NO_WARRANTY';
  warranty_status_label: string;
  is_eligible: boolean;
  suggested_supplier?: {
    id: number;
    name: string;
    company_name: string;
    phone: string;
  } | null;
  current_stock: number;
}

export interface WarrantyEligibleSale {
  id: number;
  invoice_number: string;
  date: string;
  customer_id?: number | null;
  customer_name: string;
  customer_phone: string;
  grand_total: number;
  items: WarrantyEligibleSaleItem[];
}

export interface CustomerWarrantyClaimPayload {
  sale_id: number;
  sale_item_id: number;
  replacement_product_id: number;
  quantity: number;
  supplier_id: number;
  notes?: string;
}

export interface SupplierWarrantyClaimItem {
  id: number;
  customer_warranty_claim: number;
  customer_claim_number: string;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_cost: number;
  valuation: number;
}

export interface SupplierWarrantyClaim {
  id: number;
  claim_number: string;
  supplier: number;
  supplier_name: string;
  supplier_company?: string;
  date: string;
  status: SupplierWarrantyClaimStatus;
  total_quantity: number;
  total_valuation: number;
  dispatch_journal_entry?: number | null;
  completion_journal_entry?: number | null;
  notes?: string;
  created_by?: number | null;
  created_by_username?: string;
  created_at: string;
  processed_at?: string | null;
  completed_at?: string | null;
  items: SupplierWarrantyClaimItem[];
}

export interface AvailableSupplierClaimItem {
  customer_warranty_claim_id: number;
  claim_number: string;
  invoice_number: string;
  customer_name: string;
  product_id: number;
  product_name: string;
  product_sku: string;
  claim_date: string;
  warranty_expiry_date?: string | null;
  total_claim_quantity: number;
  available_quantity: number;
  unit_cost: number;
  valuation: number;
}

export interface SupplierWarrantyClaimPayload {
  supplier_id: number;
  items: {
    customer_warranty_claim_id: number;
    quantity: number;
  }[];
  notes?: string;
}

export interface WarrantyMetrics {
  warranty_claim_units: number;
  warranty_claim_valuation: number;
  in_progress_supplier_claim_units?: number;
}

export type WarrantyDashboardMetrics = WarrantyMetrics;

