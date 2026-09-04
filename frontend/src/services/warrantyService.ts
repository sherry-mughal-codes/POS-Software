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
    const response = await api.get<any>('/warranty/customer-claims/search-invoice/', {
      params: { query },
    });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
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
    const response = await api.get<any>('/warranty/customer-claims/', { params: { ...params, all: true } });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  getCustomerClaimsPaginated: async (params?: {
    search?: string;
    status?: string;
    supplier_id?: number;
    customer_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: CustomerWarrantyClaim[]; count: number }> => {
    const response = await api.get<any>('/warranty/customer-claims/', { params });
    if (response.data && Array.isArray(response.data.results)) {
      return { results: response.data.results, count: response.data.count ?? response.data.results.length };
    }
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length };
    }
    return { results: [], count: 0 };
  },

  // Supplier Claims API
  getAvailableSupplierItems: async (supplierId: number): Promise<AvailableSupplierClaimItem[]> => {
    const response = await api.get<any>('/warranty/supplier-claims/available-items/', {
      params: { supplier_id: supplierId },
    });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
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
    const response = await api.get<any>('/warranty/supplier-claims/', { params: { ...params, all: true } });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  getSupplierClaimsPaginated: async (params?: {
    search?: string;
    status?: string;
    supplier_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: SupplierWarrantyClaim[]; count: number }> => {
    const response = await api.get<any>('/warranty/supplier-claims/', { params });
    if (response.data && Array.isArray(response.data.results)) {
      return { results: response.data.results, count: response.data.count ?? response.data.results.length };
    }
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length };
    }
    return { results: [], count: 0 };
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
