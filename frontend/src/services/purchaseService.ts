import apiClient from './api';
import {
  Purchase,
  PurchaseCreatePayload,
  PurchaseReturn,
  SupplierPayment,
  SupplierPaymentCreatePayload,
  SupplierStatement,
  SupplierPayablesReport,
  PurchaseReportSummary,
} from '../types/purchase';

export const purchaseService = {
  // Purchases
  async getPurchases(params?: any): Promise<Purchase[]> {
    const response = await apiClient.get<Purchase[]>('/purchases/orders/', { params });
    return response.data;
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
  async getPurchaseReturns(): Promise<PurchaseReturn[]> {
    const response = await apiClient.get<PurchaseReturn[]>('/purchases/returns/');
    return response.data;
  },

  async createPurchaseReturn(data: {
    purchase_id: number;
    refund_method: string;
    notes?: string;
    items: { purchase_item_id: number; quantity: number }[];
  }): Promise<PurchaseReturn> {
    const response = await apiClient.post<PurchaseReturn>('/purchases/returns/', data);
    return response.data;
  },

  // Supplier Payments
  async getSupplierPayments(params?: any): Promise<SupplierPayment[]> {
    const response = await apiClient.get<SupplierPayment[]>('/purchases/payments/', { params });
    return response.data;
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

