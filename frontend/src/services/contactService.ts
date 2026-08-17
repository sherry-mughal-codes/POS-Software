import apiClient from './api';
import {
  Customer,
  Supplier,
  CustomerFilterParams,
  SupplierFilterParams,
  CustomerPayment,
  CustomerPaymentPayload,
  CustomerStatement,
  CustomerOutstandingInfo,
  ReceivablesReport,
} from '../types/contact';

export const contactService = {
  // Customers
  async getCustomers(params?: CustomerFilterParams): Promise<Customer[]> {
    const response = await apiClient.get<Customer[]>('/customers/', { params });
    return response.data;
  },

  async getCustomer(id: number): Promise<Customer> {
    const response = await apiClient.get<Customer>(`/customers/${id}/`);
    return response.data;
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const response = await apiClient.post<Customer>('/customers/', data);
    return response.data;
  },

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer> {
    const response = await apiClient.patch<Customer>(`/customers/${id}/`, data);
    return response.data;
  },

  async deleteCustomer(id: number): Promise<void> {
    await apiClient.delete(`/customers/${id}/`);
  },

  async toggleCustomerStatus(id: number): Promise<{ id: number; is_active: boolean; detail: string }> {
    const response = await apiClient.post<{ id: number; is_active: boolean; detail: string }>(`/customers/${id}/toggle-status/`);
    return response.data;
  },

  async getNextCustomerId(): Promise<{ next_id: string }> {
    const response = await apiClient.get<{ next_id: string }>('/customers/next-id/');
    return response.data;
  },

  async getWalkinCustomer(): Promise<Customer> {
    const response = await apiClient.get<Customer>('/customers/walkin/');
    return response.data;
  },

  async getCustomerStatement(id: number, params?: { start_date?: string; end_date?: string }): Promise<CustomerStatement> {
    const response = await apiClient.get<CustomerStatement>(`/customers/${id}/statement/`, { params });
    return response.data;
  },

  async getCustomerOutstanding(id: number): Promise<CustomerOutstandingInfo> {
    const response = await apiClient.get<CustomerOutstandingInfo>(`/customers/${id}/outstanding/`);
    return response.data;
  },

  // Customer Payments
  async getCustomerPayments(params?: {
    customer?: number;
    status?: string;
    payment_method?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }): Promise<CustomerPayment[]> {
    const response = await apiClient.get<CustomerPayment[]>('/payments/', { params });
    return response.data;
  },

  async getCustomerPayment(id: number): Promise<CustomerPayment> {
    const response = await apiClient.get<CustomerPayment>(`/payments/${id}/`);
    return response.data;
  },

  async createCustomerPayment(payload: CustomerPaymentPayload): Promise<CustomerPayment> {
    const response = await apiClient.post<CustomerPayment>('/payments/', payload);
    return response.data;
  },

  async submitCustomerPayment(id: number): Promise<CustomerPayment> {
    const response = await apiClient.post<CustomerPayment>(`/payments/${id}/submit/`);
    return response.data;
  },

  async cancelCustomerPayment(id: number, reason: string): Promise<CustomerPayment> {
    const response = await apiClient.post<CustomerPayment>(`/payments/${id}/cancel/`, { reason });
    return response.data;
  },

  // Receivables Master Report
  async getReceivablesReport(params?: {
    start_date?: string;
    end_date?: string;
    customer?: number;
    status?: string;
  }): Promise<ReceivablesReport> {
    const response = await apiClient.get<ReceivablesReport>('/receivables/report/', { params });
    return response.data;
  },

  // Suppliers
  async getSuppliers(params?: SupplierFilterParams): Promise<Supplier[]> {
    const response = await apiClient.get<Supplier[]>('/suppliers/', { params });
    return response.data;
  },

  async getSupplier(id: number): Promise<Supplier> {
    const response = await apiClient.get<Supplier>(`/suppliers/${id}/`);
    return response.data;
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const response = await apiClient.post<Supplier>('/suppliers/', data);
    return response.data;
  },

  async updateSupplier(id: number, data: Partial<Supplier>): Promise<Supplier> {
    const response = await apiClient.patch<Supplier>(`/suppliers/${id}/`, data);
    return response.data;
  },

  async deleteSupplier(id: number): Promise<void> {
    await apiClient.delete(`/suppliers/${id}/`);
  },

  async toggleSupplierStatus(id: number): Promise<{ id: number; is_active: boolean; detail: string }> {
    const response = await apiClient.post<{ id: number; is_active: boolean; detail: string }>(`/suppliers/${id}/toggle-status/`);
    return response.data;
  },

  async getNextSupplierId(): Promise<{ next_id: string }> {
    const response = await apiClient.get<{ next_id: string }>('/suppliers/next-id/');
    return response.data;
  },
};
