import api from './api';
import {
  POSDaySession,
  DaySessionOpenPayload,
  DaySessionClosePayload,
  CurrentDaySessionResponse,
  XReportData,
  ZReportData,
  DaySessionsReport,
} from '../types/daySession';

export const daySessionService = {
  async getCurrentSession(): Promise<CurrentDaySessionResponse> {
    const response = await api.get('/sales/sessions/current/');
    return response.data;
  },

  async openDay(payload: DaySessionOpenPayload): Promise<POSDaySession> {
    const response = await api.post('/sales/sessions/open-day/', payload);
    return response.data;
  },

  async getXReport(): Promise<XReportData> {
    const response = await api.get('/sales/sessions/x-report/');
    return response.data;
  },

  async closeDay(payload: DaySessionClosePayload): Promise<{ session: POSDaySession; z_report: ZReportData }> {
    const response = await api.post('/sales/sessions/close-day/', payload);
    return response.data;
  },

  async getZReport(sessionId: number): Promise<ZReportData> {
    const response = await api.get(`/sales/sessions/${sessionId}/z-report/`);
    return response.data;
  },

  async getDaySessions(params?: { status?: string; date_from?: string; date_to?: string }): Promise<POSDaySession[]> {
    const response = await api.get('/sales/sessions/', { params });
    return response.data?.results || response.data || [];
  },

  async getDaySessionsReport(params?: { status?: string; start_date?: string; end_date?: string }): Promise<DaySessionsReport> {
    const response = await api.get('/sales/reports/sessions/', { params });
    return response.data;
  },
};
