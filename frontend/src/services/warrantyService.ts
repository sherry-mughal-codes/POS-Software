import api from './api';
import {
  CustomerWarrantyClaim,
  CustomerWarrantyClaimPayload,
  WarrantyEligibleSale,
  SupplierWarrantyClaim,
  SupplierWarrantyClaimPayload,
  AvailableSupplierClaimItem,
  WarrantyMetrics,
} from '../types/warranty';

export const warrantyService = {
  // Customer Claims API
  searchSales: async (query: string): Promise<WarrantyEligibleSale[]> => {
    const response = await api.get<WarrantyEligibleSale[]>('/warranty/customer-claims/search-invoice/', {
      params: { query },
    });
    return response.data;
  },

  createCustomerClaim: async (payload: CustomerWarrantyClaimPayload): Promise<CustomerWarrantyClaim> => {
    const response = await api.post<CustomerWarrantyClaim>('/warranty/customer-claims/complete-claim/', payload);
    return response.data;
  },

  getCustomerClaims: async (params?: {
    search?: string;
    status?: string;
    supplier_id?: number;
    customer_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<CustomerWarrantyClaim[]> => {
    const response = await api.get<CustomerWarrantyClaim[]>('/warranty/customer-claims/', { params });
    return response.data;
  },

  // Supplier Claims API
  getAvailableSupplierItems: async (supplierId: number): Promise<AvailableSupplierClaimItem[]> => {
    const response = await api.get<AvailableSupplierClaimItem[]>('/warranty/supplier-claims/available-items/', {
      params: { supplier_id: supplierId },
    });
    return response.data;
  },

  processSupplierDispatch: async (payload: SupplierWarrantyClaimPayload): Promise<SupplierWarrantyClaim> => {
    const response = await api.post<SupplierWarrantyClaim>('/warranty/supplier-claims/process-dispatch/', payload);
    return response.data;
  },

  completeSupplierReceipt: async (claimId: number): Promise<SupplierWarrantyClaim> => {
    const response = await api.post<SupplierWarrantyClaim>(`/warranty/supplier-claims/${claimId}/complete-receipt/`);
    return response.data;
  },

  getSupplierClaims: async (params?: {
    search?: string;
    status?: string;
    supplier_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<SupplierWarrantyClaim[]> => {
    const response = await api.get<SupplierWarrantyClaim[]>('/warranty/supplier-claims/', { params });
    return response.data;
  },

  // Warranty Metrics
  getWarrantyMetrics: async (): Promise<WarrantyMetrics> => {
    const response = await api.get<WarrantyMetrics>('/warranty/metrics/');
    return response.data;
  },

  getDashboardMetrics: async (): Promise<WarrantyMetrics> => {
    const response = await api.get<WarrantyMetrics>('/warranty/metrics/');
    return response.data;
  },
};
