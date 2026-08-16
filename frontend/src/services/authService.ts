import apiClient from './api';
import { LoginResponse, User } from '../types/auth';

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login/', {
      username,
      password,
    });
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me/');
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout/');
    } catch {
      // Best-effort logout
    }
  },

  async refreshToken(refresh: string): Promise<{ access: string }> {
    const response = await apiClient.post<{ access: string }>('/auth/refresh/', {
      refresh,
    });
    return response.data;
  },
};
