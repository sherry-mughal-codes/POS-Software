export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type AdjustmentType = 'IN' | 'OUT';

export type AdjustmentReason =
  | 'DAMAGED'
  | 'LOST'
  | 'FOUND'
  | 'COUNTING_ERROR'
  | 'OPENING_STOCK'
  | 'EXPIRED'
  | 'OTHER';

export interface InventorySummaryItem {
  product_id: number;
  product_name: string;
  sku: string;
  barcode: string;
  category_id: number | null;
  category_name: string;
  unit_name: string;
  unit_abbr: string;
  current_stock: number;
  min_stock_level: number;
  stock_status: StockStatus;
  selling_price: number;
  weighted_average_cost: number;
  inventory_valuation: number;
}

export interface StockMovement {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  unit_name: string;
  unit_abbr: string;
  movement_type: string;
  movement_type_display: string;
  quantity: number;
  unit_cost: number;
  balance_after: number;
  total_cost: number;
  reference_type: string;
  reference_id: string;
  notes: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface StockAdjustmentItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  unit_name: string;
  unit_abbr: string;
  system_stock: number;
  actual_stock: number;
  difference_quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface StockAdjustment {
  id: number;
  adjustment_number: string;
  date: string;
  adjustment_type: AdjustmentType;
  adjustment_type_display: string;
  reason: AdjustmentReason;
  reason_display: string;
  notes: string;
  total_quantity: number;
  total_cost_impact: number;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  items: StockAdjustmentItem[];
}

export interface StockAdjustmentCreatePayload {
  adjustment_type: AdjustmentType;
  reason: AdjustmentReason;
  notes?: string;
  date?: string;
  items: {
    product: number;
    difference_quantity?: number;
    actual_stock?: number;
  }[];
}

export interface ProductStockCard {
  product_id: number;
  product_name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  min_stock_level: number;
  current_stock: number;
  stock_status: StockStatus;
  weighted_average_cost: number;
  total_valuation: number;
  total_stock_in: number;
  total_stock_out: number;
  timeline: {
    id: number;
    created_at: string;
    movement_type: string;
    movement_type_display: string;
    quantity: number;
    unit_cost: number;
    balance_after: number;
    reference_type: string;
    reference_id: string;
    notes: string;
    created_by: string;
  }[];
}

export interface InventoryReportRow {
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  unit: string;
  opening_stock: number;
  purchased: number;
  purchase_returned: number;
  sold: number;
  sales_returned: number;
  adjusted_in: number;
  adjusted_out: number;
  closing_stock: number;
  stock_status: StockStatus;
  unit_cost: number;
  valuation: number;
}

export interface ComprehensiveInventoryReport {
  summary: {
    total_products: number;
    total_opening_stock: number;
    total_purchased: number;
    total_purchase_returned: number;
    total_sold: number;
    total_sales_returned: number;
    total_adjusted_in: number;
    total_adjusted_out: number;
    total_closing_stock: number;
    total_inventory_valuation: number;
  };
  rows: InventoryReportRow[];
}
