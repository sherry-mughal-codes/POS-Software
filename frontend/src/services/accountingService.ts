import apiClient from './api';
import {
  Account,
  JournalEntry,
  PaymentMethod,
  AccountLedgerResponse,
  TrialBalanceResponse,
  IncomeStatementResponse,
  BalanceSheetResponse,
  SimulationPayload,
} from '../types/accounting';

export const accountingService = {
  async getAccounts(params?: {
    account_type?: string;
    is_active?: boolean;
    search?: string;
    leaf_only?: boolean;
    parent_code?: string;
  }): Promise<Account[]> {
    const response = await apiClient.get<any>('/accounting/accounts/', { params: { ...params, all: true } });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async createAccount(data: Partial<Account>): Promise<Account> {
    const response = await apiClient.post<Account>('/accounting/accounts/', data);
    return response.data;
  },

  async updateAccount(id: number, data: Partial<Account>): Promise<Account> {
    const response = await apiClient.patch<Account>(`/accounting/accounts/${id}/`, data);
    return response.data;
  },

  async deleteAccount(id: number): Promise<void> {
    await apiClient.delete(`/accounting/accounts/${id}/`);
  },

  async setAccountOpeningBalance(
    id: number,
    data: { amount: number; date?: string; narration?: string }
  ): Promise<{ message: string; new_balance: number; equity_balance: number }> {
    const response = await apiClient.post<{ message: string; new_balance: number; equity_balance: number }>(
      `/accounting/accounts/${id}/set-opening-balance/`,
      data
    );
    return response.data;
  },

  async getAccountLedger(id: number, startDate?: string, endDate?: string): Promise<AccountLedgerResponse> {
    const response = await apiClient.get<AccountLedgerResponse>(`/accounting/accounts/${id}/ledger/`, {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getJournalEntries(params?: {
    reference_type?: string;
    reference_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<JournalEntry[]> {
    const response = await apiClient.get<any>('/accounting/journal-entries/', { params: { ...params, all: true } });
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async getJournalEntriesPaginated(params?: {
    reference_type?: string;
    reference_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: JournalEntry[]; count: number }> {
    const response = await apiClient.get<any>('/accounting/journal-entries/', { params });
    if (response.data && Array.isArray(response.data.results)) {
      return { results: response.data.results, count: response.data.count ?? response.data.results.length };
    }
    if (Array.isArray(response.data)) {
      return { results: response.data, count: response.data.length };
    }
    return { results: [], count: 0 };
  },

  async getJournalEntry(id: number): Promise<JournalEntry> {
    const response = await apiClient.get<JournalEntry>(`/accounting/journal-entries/${id}/`);
    return response.data;
  },

  async createJournalEntry(payload: import('../types/accounting').JournalEntryCreatePayload): Promise<JournalEntry> {
    const response = await apiClient.post<JournalEntry>('/accounting/journal-entries/', payload);
    return response.data;
  },

  async reverseJournalEntry(id: number, reason: string): Promise<JournalEntry> {
    const response = await apiClient.post<JournalEntry>(`/accounting/journal-entries/${id}/reverse/`, { reason });
    return response.data;
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await apiClient.get<any>('/accounting/payment-methods/');
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async getTrialBalance(asOfDate?: string): Promise<TrialBalanceResponse> {
    const response = await apiClient.get<TrialBalanceResponse>('/accounting/reports/trial-balance/', {
      params: { as_of_date: asOfDate },
    });
    return response.data;
  },

  async getIncomeStatement(startDate?: string, endDate?: string): Promise<IncomeStatementResponse> {
    const response = await apiClient.get<IncomeStatementResponse>('/accounting/reports/income-statement/', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getBalanceSheet(asOfDate?: string): Promise<BalanceSheetResponse> {
    const response = await apiClient.get<BalanceSheetResponse>('/accounting/reports/balance-sheet/', {
      params: { as_of_date: asOfDate },
    });
    return response.data;
  },

  async simulateTransaction(payload: SimulationPayload): Promise<{ message: string; journal_entry: JournalEntry }> {
    const response = await apiClient.post('/accounting/simulate-transaction/', payload);
    return response.data;
  },
};
