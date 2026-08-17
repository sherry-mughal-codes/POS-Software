/**
 * Enterprise System Settings Service.
 */

import api from './api';

export interface SystemSettingItem {
  key: string;
  value: string;
  description: string;
  group: string;
  updated_at: string | null;
}

export interface SystemSettingsPayload {
  settings: Record<string, string>;
  grouped: Record<string, SystemSettingItem[]>;
}

export const settingsService = {
  async getSettings(): Promise<SystemSettingsPayload> {
    const res = await api.get<SystemSettingsPayload>('/settings/');
    return res.data;
  },

  async updateSettings(settings: Record<string, string>): Promise<SystemSettingsPayload> {
    const res = await api.post<SystemSettingsPayload>('/settings/', { settings });
    return res.data;
  },
};
