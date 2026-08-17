import api from './api';
import {
  Expense,
  ExpensePayload,
  AccountTransfer,
  AccountTransferPayload,
  ComprehensiveExpenseReport,
} from '../types/expense';

export const expenseService = {
  // Expenses CRUD & Workflows
  async getExpenses(params?: {
    status?: string;
    expense_account?: number;
    payment_account?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
  }): Promise<Expense[]> {
    const response = await api.get('/expenses/records/', { params });
    return response.data?.results || response.data || [];
  },

  async getExpense(id: number): Promise<Expense> {
    const response = await api.get(`/expenses/records/${id}/`);
    return response.data;
  },

  async createExpense(payload: ExpensePayload | FormData): Promise<Expense> {
    const headers = payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await api.post('/expenses/records/', payload, { headers });
    return response.data;
  },

  async updateExpense(id: number, payload: Partial<ExpensePayload> | FormData): Promise<Expense> {
    const headers = payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await api.patch(`/expenses/records/${id}/`, payload, { headers });
    return response.data;
  },

  async deleteExpense(id: number): Promise<void> {
    await api.delete(`/expenses/records/${id}/`);
  },

  async submitExpense(id: number): Promise<Expense> {
    const response = await api.post(`/expenses/records/${id}/submit/`);
    return response.data;
  },

  async cancelExpense(id: number, reason: string): Promise<Expense> {
    const response = await api.post(`/expenses/records/${id}/cancel/`, { reason });
    return response.data;
  },

  // Account Transfers
  async getTransfers(params?: {
    status?: string;
    from_account?: number;
    to_account?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<AccountTransfer[]> {
    const response = await api.get('/expenses/transfers/', { params });
    return response.data?.results || response.data || [];
  },

  async createTransfer(payload: AccountTransferPayload): Promise<AccountTransfer> {
    const response = await api.post('/expenses/transfers/', payload);
    return response.data;
  },

  async cancelTransfer(id: number, reason: string): Promise<AccountTransfer> {
    const response = await api.post(`/expenses/transfers/${id}/cancel/`, { reason });
    return response.data;
  },

  // Expense Reports
  async getExpenseReport(params?: {
    start_date?: string;
    end_date?: string;
    expense_account?: number;
    payment_account?: number;
    user?: number;
    status?: string;
  }): Promise<ComprehensiveExpenseReport> {
    const response = await api.get('/expenses/reports/summary/', { params });
    return response.data;
  },
};
