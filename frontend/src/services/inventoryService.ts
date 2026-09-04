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
    const res = await api.get<any>('/inventory/summary/');
    if (res.data && Array.isArray(res.data.results)) {
      return res.data.results;
    }
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  getMovements: async (params?: {
    product?: number | string;
    movement_type?: string;
    reference_id?: string;
    reference_type?: string;
  }): Promise<StockMovement[]> => {
    const res = await api.get<any>('/inventory/movements/', { params: { ...params, all: true } });
    if (res.data && Array.isArray(res.data.results)) {
      return res.data.results;
    }
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  getStockCard: async (productId: number | string): Promise<ProductStockCard> => {
    const res = await api.get<ProductStockCard>(`/inventory/stock-card/${productId}/`);
    return res.data;
  },

  getAdjustments: async (): Promise<StockAdjustment[]> => {
    const res = await api.get<any>('/inventory/adjustments/', { params: { all: true } });
    if (res.data && Array.isArray(res.data.results)) {
      return res.data.results;
    }
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return [];
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
