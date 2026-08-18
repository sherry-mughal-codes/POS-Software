import apiClient from './api';
import { Product, Category, Unit, ProductFilterParams } from '../types/product';

export const productService = {
  // Products
  async getProducts(params?: ProductFilterParams): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/products/', { params });
    return response.data;
  },

  async getProduct(id: number): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${id}/`);
    return response.data;
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await apiClient.post<Product>('/products/', data);
    return response.data;
  },

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    const response = await apiClient.patch<Product>(`/products/${id}/`, data);
    return response.data;
  },

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}/`);
  },

  async toggleProductStatus(id: number): Promise<{ id: number; is_active: boolean; detail: string }> {
    const response = await apiClient.post<{ id: number; is_active: boolean; detail: string }>(`/products/${id}/toggle-status/`);
    return response.data;
  },

  async lookupBarcode(barcode: string): Promise<Product> {
    const response = await apiClient.get<Product>('/products/lookup-barcode/', {
      params: { barcode },
    });
    return response.data;
  },

  async getNextSku(): Promise<{ next_sku: string }> {
    const response = await apiClient.get<{ next_sku: string }>('/products/next-sku/');
    return response.data;
  },

  async bulkImport(data: FormData | any[]): Promise<any> {
    if (data instanceof FormData) {
      const response = await apiClient.post('/products/bulk-import/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }
    const response = await apiClient.post('/products/bulk-import/', data);
    return response.data;
  },

  async downloadImportTemplate(): Promise<Blob> {
    const response = await apiClient.get('/products/import-template/', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<Category[]>('/categories/');
    return response.data;
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    const response = await apiClient.post<Category>('/categories/', data);
    return response.data;
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    const response = await apiClient.patch<Category>(`/categories/${id}/`, data);
    return response.data;
  },

  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`/categories/${id}/`);
  },

  // Units
  async getUnits(): Promise<Unit[]> {
    const response = await apiClient.get<Unit[]>('/units/');
    return response.data;
  },

  async createUnit(data: Partial<Unit>): Promise<Unit> {
    const response = await apiClient.post<Unit>('/units/', data);
    return response.data;
  },

  async updateUnit(id: number, data: Partial<Unit>): Promise<Unit> {
    const response = await apiClient.patch<Unit>(`/units/${id}/`, data);
    return response.data;
  },

  async deleteUnit(id: number): Promise<void> {
    await apiClient.delete(`/units/${id}/`);
  },
};
