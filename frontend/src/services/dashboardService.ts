/**
 * Executive Business Dashboard Service (Phase 13).
 */

import api from './api';
import { ExecutiveDashboardData, DashboardPeriod } from '../types/dashboard';

export const dashboardService = {
  /**
   * Fetches full executive dashboard analytics for the chosen period or custom date range.
   */
  async getDashboardData(
    period: DashboardPeriod = 'this_month',
    startDate?: string,
    endDate?: string,
    cashierId?: number
  ): Promise<ExecutiveDashboardData> {
    const params: Record<string, string> = { period };
    if (period === 'custom' && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    if (cashierId) {
      params.cashier_id = String(cashierId);
    }

    const res = await api.get<ExecutiveDashboardData>('/dashboard/', { params });
    return res.data;
  },

  /**
   * Universal CSV Exporter for tabular datasets.
   */
  exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
