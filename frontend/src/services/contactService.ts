import apiClient from './api';
import { Customer, Supplier, CustomerFilterParams, SupplierFilterParams } from '../types/contact';

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
