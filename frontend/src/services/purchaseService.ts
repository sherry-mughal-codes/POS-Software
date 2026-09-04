import apiClient from './api';
import {
  Purchase,
  PurchaseCreatePayload,
  PurchaseReturn,
  PurchaseReturnCreatePayload,
  SupplierPayment,
  SupplierPaymentCreatePayload,
  SupplierStatement,
  SupplierPayablesReport,
  PurchaseReportSummary,
} from '../types/purchase';

export const purchaseService = {
  // Purchases
  async getPurchases(params?: any): Promise<{ results: Purchase[]; count: number }> {
    const response = await apiClient.get<any>('/purchases/orders/', { params });
    if (response.data && Array.isArray(response.data.results)) {
      return { results: response.data.results, count: response.data.count ?? response.data.results.length };
    }
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length };
    }
    return { results: [], count: 0 };
  },

  async getPurchase(id: number): Promise<Purchase> {
    const response = await apiClient.get<Purchase>(`/purchases/orders/${id}/`);
    return response.data;
  },

  async createPurchase(data: PurchaseCreatePayload): Promise<Purchase> {
    const response = await apiClient.post<Purchase>('/purchases/orders/', data);
    return response.data;
  },

  async updatePurchase(id: number, data: PurchaseCreatePayload): Promise<Purchase> {
    const response = await apiClient.put<Purchase>(`/purchases/orders/${id}/`, data);
    return response.data;
  },

  async submitDraftPurchase(id: number): Promise<Purchase> {
    const response = await apiClient.post<Purchase>(`/purchases/orders/${id}/submit/`);
    return response.data;
  },

  async cancelPurchase(id: number, reason: string): Promise<Purchase> {
    const response = await apiClient.post<Purchase>(`/purchases/orders/${id}/cancel/`, { reason });
    return response.data;
  },

  // Returns
  async getPurchaseReturns(params?: any): Promise<{ results: PurchaseReturn[]; count: number }> {
    const response = await apiClient.get<any>('/purchases/returns/', { params });
    if (response.data && Array.isArray(response.data.results)) {
      return { results: response.data.results, count: response.data.count ?? response.data.results.length };
    }
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length };
    }
    return { results: [], count: 0 };
  },

  async createPurchaseReturn(data: PurchaseReturnCreatePayload): Promise<PurchaseReturn> {
    const response = await apiClient.post<PurchaseReturn>('/purchases/returns/', data);
    return response.data;
  },

  // Supplier Payments
  async getSupplierPayments(params?: any): Promise<{ results: SupplierPayment[]; count: number }> {
    const response = await apiClient.get<any>('/purchases/payments/', { params });
    if (response.data && Array.isArray(response.data.results)) {
      return { results: response.data.results, count: response.data.count ?? response.data.results.length };
    }
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length };
    }
    return { results: [], count: 0 };
  },

  async createSupplierPayment(data: SupplierPaymentCreatePayload): Promise<SupplierPayment> {
    const response = await apiClient.post<SupplierPayment>('/purchases/payments/', data);
    return response.data;
  },

  async submitSupplierPayment(id: number): Promise<SupplierPayment> {
    const response = await apiClient.post<SupplierPayment>(`/purchases/payments/${id}/submit/`);
    return response.data;
  },

  async cancelSupplierPayment(id: number, reason: string): Promise<SupplierPayment> {
    const response = await apiClient.post<SupplierPayment>(`/purchases/payments/${id}/cancel/`, { reason });
    return response.data;
  },

  async getSupplierStatement(supplierId: number, params?: { start_date?: string; end_date?: string }): Promise<SupplierStatement> {
    const response = await apiClient.get<SupplierStatement>(`/purchases/supplier-statement/${supplierId}/`, { params });
    return response.data;
  },

  async getSupplierPayablesReport(params?: any): Promise<SupplierPayablesReport> {
    const response = await apiClient.get<SupplierPayablesReport>('/purchases/reports/payables/', { params });
    return response.data;
  },

  async getPurchaseReport(params?: any): Promise<PurchaseReportSummary> {
    const response = await apiClient.get<PurchaseReportSummary>('/purchases/reports/summary/', { params });
    return response.data;
  },
};

