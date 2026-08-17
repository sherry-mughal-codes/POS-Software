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
    customer?: number;
    status?: string;
    payment_method?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<Sale[]> {
    const response = await api.get<Sale[]>('/sales/', { params });
    return response.data;
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
