import apiClient from './api';
import { User, Role, Permission, AuditLogEntry, CreateUserData, UpdateUserData } from '../types/auth';

export const userService = {
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/users/');
    return response.data;
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
    const response = await apiClient.get<Role[]>('/roles/');
    return response.data;
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
    const response = await apiClient.get<Permission[]>('/permissions/');
    return response.data;
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const response = await apiClient.get<AuditLogEntry[]>('/audit-logs/');
    return response.data;
  },
};
