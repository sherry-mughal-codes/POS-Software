export interface Category {
  id: number;
  code: string;
  name: string;
  parent: number | null;
  parent_name?: string | null;
  description?: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: number;
  name: string;
  short_code: string;
  allow_decimal: boolean;
  is_active: boolean;
  product_count: number;
  created_at: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  barcode?: string | null;
  category: number;
  category_name: string;
  category_code: string;
  unit: number;
  unit_name: string;
  unit_code: string;
  allow_decimal: boolean;
  purchase_price: number;
  selling_price: number;
  profit_margin_amount: number;
  profit_margin_percentage: number;
  image?: string | null;
  image_url?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFilterParams {
  search?: string;
  category?: number | string;
  unit?: number | string;
  is_active?: boolean;
}
