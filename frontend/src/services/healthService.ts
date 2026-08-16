import { apiClient } from './api';
import { HealthCheckResponse, ApiRootResponse } from '../types/api';

export const healthService = {
  /**
   * Fetch health status from /api/v1/health/
   */
  async getHealth(): Promise<HealthCheckResponse> {
    const response = await apiClient.get<HealthCheckResponse>('/health/');
    return response.data;
  },

  /**
   * Fetch API root discovery info from /api/v1/
   */
  async getApiRoot(): Promise<ApiRootResponse> {
    const response = await apiClient.get<ApiRootResponse>('/');
    return response.data;
  },
};
