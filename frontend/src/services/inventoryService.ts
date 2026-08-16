import api from './api';
import {
  InventorySummaryItem,
  StockMovement,
  StockAdjustment,
  StockAdjustmentCreatePayload,
  ProductStockCard,
  ComprehensiveInventoryReport,
} from '../types/inventory';

export const inventoryService = {
  getSummary: async (): Promise<InventorySummaryItem[]> => {
    const res = await api.get<InventorySummaryItem[]>('/inventory/summary/');
    return res.data;
  },

  getMovements: async (params?: {
    product?: number | string;
    movement_type?: string;
    reference_id?: string;
    reference_type?: string;
  }): Promise<StockMovement[]> => {
    const res = await api.get<StockMovement[]>('/inventory/movements/', { params });
    return res.data;
  },

  getStockCard: async (productId: number | string): Promise<ProductStockCard> => {
    const res = await api.get<ProductStockCard>(`/inventory/stock-card/${productId}/`);
    return res.data;
  },

  getAdjustments: async (): Promise<StockAdjustment[]> => {
    const res = await api.get<StockAdjustment[]>('/inventory/adjustments/');
    return res.data;
  },

  createAdjustment: async (payload: StockAdjustmentCreatePayload): Promise<StockAdjustment> => {
    const res = await api.post<StockAdjustment>('/inventory/adjustments/', payload);
    return res.data;
  },

  getComprehensiveReport: async (params?: {
    start_date?: string;
    end_date?: string;
    product?: number | string;
    category?: number | string;
    movement_type?: string;
    stock_status?: string;
  }): Promise<ComprehensiveInventoryReport> => {
    const res = await api.get<ComprehensiveInventoryReport>('/inventory/reports/comprehensive/', { params });
    return res.data;
  },
};
