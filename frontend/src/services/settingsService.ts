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

export interface DocumentSequenceInfo {
  key: string;
  title: string;
  prefix_key: string;
  start_key: string;
  prefix: string;
  start_number: number;
  current_number: number;
  current_display: string;
  next_preview: string;
}

export interface SystemSettingsPayload {
  settings: Record<string, string>;
  grouped: Record<string, SystemSettingItem[]>;
  document_sequences?: Record<string, DocumentSequenceInfo>;
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
