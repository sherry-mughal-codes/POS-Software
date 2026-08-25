/**
 * Database Backup & Disaster Recovery Service (Frontend Client).
 */

import api from './api';

export interface BackupItem {
  id: number;
  filename: string;
  file_path: string;
  file_size_bytes: number;
  file_size_formatted: string;
  backup_type: 'MANUAL' | 'AUTOMATIC_DAILY' | 'IMPORT_RESTORE';
  status: 'LOCAL_ONLY' | 'DROPBOX_SYNCED' | 'FAILED' | 'RESTORED';
  dropbox_path?: string | null;
  error_message?: string | null;
  created_by?: string;
  created_at: string;
  file_exists: boolean;
}

export interface BackupStatusResponse {
  backups: BackupItem[];
  auto_backup_enabled: boolean;
  auto_backup_time: string;
  backup_retention_days: number;
  dropbox_backup_enabled: boolean;
  dropbox_access_token_set: boolean;
  dropbox_folder_path: string;
}

export interface DropboxTestResult {
  success: boolean;
  name?: string;
  email?: string;
  account_id?: string;
  space_used_mb?: number;
  space_total_mb?: number;
  error?: string;
}

export const backupService = {
  /**
   * Retrieves all database backup history and active configuration.
   */
  async getBackups(): Promise<BackupStatusResponse> {
    const res = await api.get<BackupStatusResponse>('/core/backups/');
    return res.data;
  },

  /**
   * Triggers an immediate manual database backup and Dropbox sync.
   */
  async createBackup(notes?: string): Promise<any> {
    const res = await api.post('/core/backups/', { notes });
    return res.data;
  },

  /**
   * Downloads a specific .sql backup file directly from the backend to the user's laptop.
   */
  async downloadBackup(backupId: number, filename: string): Promise<void> {
    const response = await api.get(`/core/backups/download/${backupId}/`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/sql' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  /**
   * Deletes a local backup .sql file and its database record.
   */
  async deleteBackup(backupId: number): Promise<void> {
    await api.delete(`/core/backups/${backupId}/`);
  },

  /**
   * Restores the database from single/multiple uploaded .sql dump files, .zip folder archive, or an existing backup ID.
   */
  async restoreBackup(payload: { files?: File[]; file?: File; backupId?: number }): Promise<any> {
    const formData = new FormData();
    if (payload.files && payload.files.length > 0) {
      payload.files.forEach((f) => {
        formData.append('files', f);
      });
    } else if (payload.file) {
      formData.append('file', payload.file);
    }

    if (payload.backupId) {
      formData.append('backup_id', String(payload.backupId));
    }

    const res = await api.post('/core/backups/restore/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Manually syncs a specific backup file to Dropbox.
   */
  async syncToDropbox(backupId: number): Promise<any> {
    const res = await api.post(`/core/backups/${backupId}/sync-dropbox/`);
    return res.data;
  },

  /**
   * Tests the Dropbox API connection.
   */
  async testDropbox(accessToken?: string): Promise<DropboxTestResult> {
    const res = await api.post<DropboxTestResult>('/core/backups/test-dropbox/', {
      access_token: accessToken,
    });
    return res.data;
  },
};

