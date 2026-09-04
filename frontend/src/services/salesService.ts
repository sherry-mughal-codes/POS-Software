import api from './api';
import {
  Sale,
  SaleCheckoutPayload,
  SalesReturn,
  SalesReturnPayload,
  ComprehensiveSalesReport,
} from '../types/sales';

export const salesService = {
  async getSales(params?: {
    page?: number;
    page_size?: number;
    customer?: number;
    status?: string;
    payment_method?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    all?: boolean;
  }): Promise<{ results: Sale[]; count: number }> {
    const response = await api.get<any>('/sales/', { params });
    if (response.data && Array.isArray(response.data.results)) {
      return { results: response.data.results, count: response.data.count ?? response.data.results.length };
    }
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length };
    }
    return { results: [], count: 0 };
  },

  async getSaleById(id: number): Promise<Sale> {
    const response = await api.get<Sale>(`/sales/${id}/`);
    return response.data;
  },

  async checkout(payload: SaleCheckoutPayload): Promise<Sale> {
    const response = await api.post<Sale>('/sales/checkout/', payload);
    return response.data;
  },

  async getReturns(): Promise<SalesReturn[]> {
    const response = await api.get<SalesReturn[]>('/sales/returns/');
    return response.data;
  },

  async processReturn(payload: SalesReturnPayload): Promise<SalesReturn> {
    const response = await api.post<SalesReturn>('/sales/returns/', payload);
    return response.data;
  },

  async getSalesReport(params?: {
    start_date?: string;
    end_date?: string;
    customer?: number;
    cashier?: number;
    payment_method?: string;
    status?: string;
  }): Promise<ComprehensiveSalesReport> {
    const response = await api.get<ComprehensiveSalesReport>('/sales/reports/summary/', { params });
    return response.data;
  },
};
