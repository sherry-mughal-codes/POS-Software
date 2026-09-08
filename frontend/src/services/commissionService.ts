import { apiClient } from './api';
import { SalesAgent, CreateSalesAgentData, UpdateSalesAgentData } from '../types/commission';

export interface SalesAgentFilterParams {
  search?: string;
  is_active?: boolean;
  status?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CommissionPayablesFilterParams {
  search?: string;
  sales_agent?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const commissionService = {
  getAgents: async (params?: SalesAgentFilterParams): Promise<{ results: SalesAgent[]; count: number } | SalesAgent[]> => {
    const response = await apiClient.get('/commission/agents/', { params });
    return response.data;
  },

  getAgent: async (id: number): Promise<SalesAgent> => {
    const response = await apiClient.get(`/commission/agents/${id}/`);
    return response.data;
  },

  createAgent: async (data: CreateSalesAgentData): Promise<SalesAgent> => {
    const response = await apiClient.post('/commission/agents/', data);
    return response.data;
  },

  updateAgent: async (id: number, data: UpdateSalesAgentData): Promise<SalesAgent> => {
    const response = await apiClient.put(`/commission/agents/${id}/`, data);
    return response.data;
  },

  patchAgent: async (id: number, data: Partial<UpdateSalesAgentData>): Promise<SalesAgent> => {
    const response = await apiClient.patch(`/commission/agents/${id}/`, data);
    return response.data;
  },

  toggleAgentStatus: async (id: number): Promise<{ id: number; name: string; is_active: boolean; detail: string }> => {
    const response = await apiClient.post(`/commission/agents/${id}/toggle-status/`);
    return response.data;
  },

  deleteAgent: async (id: number): Promise<void> => {
    await apiClient.delete(`/commission/agents/${id}/`);
  },

  // Commission Payables & Settlements (Phase 2)
  getPayables: async (params?: CommissionPayablesFilterParams): Promise<{ results: any[]; count: number } | any[]> => {
    const response = await apiClient.get('/commission/payables/', { params });
    return response.data;
  },

  getPayableById: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/commission/payables/${id}/`);
    return response.data;
  },

  payCommission: async (id: number, payload: any): Promise<any> => {
    const response = await apiClient.post(`/commission/payables/${id}/pay/`, payload);
    return response.data;
  },

  getCommissionSlip: async (id: number, paymentId?: number): Promise<any> => {
    const params = paymentId ? { payment_id: paymentId } : {};
    const response = await apiClient.get(`/commission/payables/${id}/slip/`, { params });
    return response.data;
  },
};

