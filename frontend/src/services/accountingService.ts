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
  async getAccounts(params?: { account_type?: string; is_active?: boolean; search?: string }): Promise<Account[]> {
    const response = await apiClient.get<Account[]>('/accounting/accounts/', { params });
    return response.data;
  },

  async createAccount(data: Partial<Account>): Promise<Account> {
    const response = await apiClient.post<Account>('/accounting/accounts/', data);
    return response.data;
  },

  async updateAccount(id: number, data: Partial<Account>): Promise<Account> {
    const response = await apiClient.patch<Account>(`/accounting/accounts/${id}/`, data);
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
    const response = await apiClient.get<JournalEntry[]>('/accounting/journal-entries/', { params });
    return response.data;
  },

  async getJournalEntry(id: number): Promise<JournalEntry> {
    const response = await apiClient.get<JournalEntry>(`/accounting/journal-entries/${id}/`);
    return response.data;
  },

  async reverseJournalEntry(id: number, reason: string): Promise<JournalEntry> {
    const response = await apiClient.post<JournalEntry>(`/accounting/journal-entries/${id}/reverse/`, { reason });
    return response.data;
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await apiClient.get<PaymentMethod[]>('/accounting/payment-methods/');
    return response.data;
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
