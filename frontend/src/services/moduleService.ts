import { apiClient } from './api';
import { SystemModule } from '../types/commission';

export const moduleService = {
  getModules: async (): Promise<{ modules: SystemModule[] }> => {
    const response = await apiClient.get('/core/modules/');
    return response.data;
  },

  toggleModule: async (key: string, is_enabled?: boolean): Promise<SystemModule & { detail: string }> => {
    const payload = is_enabled !== undefined ? { is_enabled } : {};
    const response = await apiClient.post(`/core/modules/${key}/toggle/`, payload);
    return response.data;
  },
};
