import apiClient from './api';
import { User, Role, Permission, AuditLogEntry, CreateUserData, UpdateUserData } from '../types/auth';

export const userService = {
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get<any>('/users/', { params: { all: true } });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async createUser(data: CreateUserData): Promise<User> {
    const response = await apiClient.post<User>('/users/', data);
    return response.data;
  },

  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${id}/`, data);
    return response.data;
  },

  async toggleUserStatus(id: number): Promise<{ id: number; username: string; is_active: boolean; detail: string }> {
    const response = await apiClient.post(`/users/${id}/toggle-status/`);
    return response.data;
  },

  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get<any>('/roles/', { params: { all: true } });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async createRole(data: { name: string; permission_ids?: number[] }): Promise<Role> {
    const response = await apiClient.post<Role>('/roles/', data);
    return response.data;
  },

  async updateRole(id: number, permissionIds: number[]): Promise<Role> {
    const response = await apiClient.patch<Role>(`/roles/${id}/`, {
      permission_ids: permissionIds,
    });
    return response.data;
  },

  async deleteRole(id: number): Promise<void> {
    await apiClient.delete(`/roles/${id}/`);
  },

  async getPermissions(): Promise<Permission[]> {
    const response = await apiClient.get<any>('/permissions/');
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const response = await apiClient.get<any>('/audit-logs/', { params: { all: true } });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },
};
