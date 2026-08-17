import api from './api';
import {
  Employee,
  EmployeePayload,
  Attendance,
  AttendancePayload,
  SalarySlip,
  SalarySlipPayload,
  SalaryPayment,
  SalaryPaymentPayload,
  EmployeeReport,
  AttendanceReport,
  PayrollReport,
} from '../types/employee';

export const employeeService = {
  // Employees CRUD & Status
  async getEmployees(params?: { search?: string; department?: string; job_title?: string; is_active?: boolean }): Promise<Employee[]> {
    const response = await api.get('/employees/records/', { params });
    return response.data?.results || response.data || [];
  },

  async getEmployee(id: number): Promise<Employee> {
    const response = await api.get(`/employees/records/${id}/`);
    return response.data;
  },

  async createEmployee(payload: EmployeePayload): Promise<Employee> {
    const response = await api.post('/employees/records/', payload);
    return response.data;
  },

  async updateEmployee(id: number, payload: Partial<EmployeePayload>): Promise<Employee> {
    const response = await api.patch(`/employees/records/${id}/`, payload);
    return response.data;
  },

  async toggleEmployeeStatus(id: number): Promise<{ id: number; full_name: string; is_active: boolean; detail: string }> {
    const response = await api.post(`/employees/records/${id}/toggle-status/`);
    return response.data;
  },

  async getNextEmployeeId(): Promise<{ next_id: string }> {
    const response = await api.get('/employees/records/next-id/');
    return response.data;
  },

  // Attendance
  async getAttendance(params?: {
    employee?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
  }): Promise<Attendance[]> {
    const response = await api.get('/employees/attendance/', { params });
    return response.data?.results || response.data || [];
  },

  async recordAttendance(payload: AttendancePayload): Promise<Attendance> {
    const response = await api.post('/employees/attendance/', payload);
    return response.data;
  },

  // Salary Slips & Payroll
  async getSalarySlips(params?: {
    employee?: number;
    month?: number;
    year?: number;
    status?: string;
  }): Promise<SalarySlip[]> {
    const response = await api.get('/employees/slips/', { params });
    return response.data?.results || response.data || [];
  },

  async getSalarySlip(id: number): Promise<SalarySlip> {
    const response = await api.get(`/employees/slips/${id}/`);
    return response.data;
  },

  async createSalarySlip(payload: SalarySlipPayload): Promise<SalarySlip> {
    const response = await api.post('/employees/slips/', payload);
    return response.data;
  },

  async submitSalarySlip(id: number): Promise<SalarySlip> {
    const response = await api.post(`/employees/slips/${id}/submit/`);
    return response.data;
  },

  async cancelSalarySlip(id: number, reason: string): Promise<SalarySlip> {
    const response = await api.post(`/employees/slips/${id}/cancel/`, { reason });
    return response.data;
  },

  // Salary Payments
  async getSalaryPayments(params?: { employee?: number; salary_slip?: number }): Promise<SalaryPayment[]> {
    const response = await api.get('/employees/payments/', { params });
    return response.data?.results || response.data || [];
  },

  async disburseSalaryPayment(payload: SalaryPaymentPayload): Promise<SalaryPayment> {
    const response = await api.post('/employees/payments/', payload);
    return response.data;
  },

  async cancelSalaryPayment(id: number, reason: string): Promise<SalaryPayment> {
    const response = await api.post(`/employees/payments/${id}/cancel/`, { reason });
    return response.data;
  },

  // Reports
  async getEmployeeReport(params?: { department?: string; job_title?: string; is_active?: boolean }): Promise<EmployeeReport> {
    const response = await api.get('/employees/reports/employees/', { params });
    return response.data;
  },

  async getAttendanceReport(params?: {
    start_date?: string;
    end_date?: string;
    employee?: number;
    department?: string;
    status?: string;
  }): Promise<AttendanceReport> {
    const response = await api.get('/employees/reports/attendance/', { params });
    return response.data;
  },

  async getPayrollReport(params?: {
    start_date?: string;
    end_date?: string;
    month?: number;
    year?: number;
    employee?: number;
    department?: string;
    status?: string;
  }): Promise<PayrollReport> {
    const response = await api.get('/employees/reports/payroll/', { params });
    return response.data;
  },
};
