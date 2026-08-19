import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderTree,
  BookOpen,
  Book,
  BarChart3,
  DollarSign,
  TrendingUp,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ChartOfAccountsTab } from './ChartOfAccountsTab';
import { JournalEntriesTab } from './JournalEntriesTab';
import { AccountLedgerTab } from './AccountLedgerTab';
import { FinancialReportsTab } from './FinancialReportsTab';
import { Account, JournalEntry, BalanceSheetResponse, IncomeStatementResponse } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';

export const AccountingDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COA' | 'JOURNAL' | 'LEDGER' | 'REPORTS'>('COA');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResponse | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<number | null>(null);

  const fetchAccountingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accs, jEntries, bs, is] = await Promise.all([
        accountingService.getAccounts(),
        accountingService.getJournalEntries(),
        accountingService.getBalanceSheet(),
        accountingService.getIncomeStatement(),
      ]);
      setAccounts(accs);
      setEntries(jEntries);
      setBalanceSheet(bs);
      setIncomeStatement(is);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch accounting foundation data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountingData();
  }, [fetchAccountingData]);

  const handleNavigateToLedger = (accountId: number) => {
    setSelectedLedgerAccountId(accountId);
    setActiveTab('LEDGER');
  };

  const tabs = [
    { id: 'COA', label: 'Chart of Accounts', icon: <FolderTree size={16} />, count: accounts.length },
    { id: 'JOURNAL', label: 'Journal Entries', icon: <BookOpen size={16} />, count: entries.length },
    { id: 'LEDGER', label: 'Account Ledger', icon: <Book size={16} /> },
    { id: 'REPORTS', label: 'Financial Reports', icon: <BarChart3 size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Double Entry Ledger
          </h2>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw size={13} />}
          loading={loading}
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
          onClick={fetchAccountingData}
        >
          Refresh Ledger
        </Button>
      </div>

      {/* High-Level Accounting Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.625rem',
      }}>
        {/* Total Assets */}
        <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Assets</span>
            <DollarSign size={15} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            Rs. {balanceSheet ? balanceSheet.assets.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Cash, Bank, Inventory & AR</div>
        </div>

        {/* Total Liabilities */}
        <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Liabilities</span>
            <Scale size={15} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
            Rs. {balanceSheet ? balanceSheet.liabilities.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Payables & Accruals</div>
        </div>

        {/* Total Equity */}
        <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Owner's Equity</span>
            <TrendingUp size={15} style={{ color: '#a5b4fc' }} />
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
            Rs. {balanceSheet ? balanceSheet.equity.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Capital & Retained Earnings</div>
        </div>

        {/* Net Operating Profit */}
        <div className="glass-card" style={{ padding: '0.625rem 0.875rem', borderColor: (incomeStatement?.net_profit || 0) >= 0 ? 'var(--success-border)' : 'var(--danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Operating Profit</span>
            <Badge variant={(incomeStatement?.net_profit || 0) >= 0 ? 'success' : 'danger'}>
              {(incomeStatement?.net_profit || 0) >= 0 ? 'Profit' : 'Loss'}
            </Badge>
          </div>
          <div style={{
            fontSize: '1.125rem',
            fontWeight: 800,
            color: (incomeStatement?.net_profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
            fontFamily: 'var(--font-mono)',
          }}>
            Rs. {incomeStatement ? incomeStatement.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Revenue minus Expenses</div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.35rem',
        overflowX: 'auto',
      }}>
        {tabs.map((t) => {
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: isSelected ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.78125rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  style={{
                    backgroundColor: isSelected ? 'var(--primary-500)' : 'rgba(255, 255, 255, 0.08)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '0.6875rem',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '1rem',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Rendering */}
      {loading && accounts.length === 0 ? (
        <LoadingSpinner label="Loading accounting ledger..." />
      ) : error ? (
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '0.5rem' }}>
          {error}
        </div>
      ) : (
        <>
          {activeTab === 'COA' && (
            <ChartOfAccountsTab
              accounts={accounts}
              loading={loading}
              onRefresh={fetchAccountingData}
              onSelectAccountForLedger={handleNavigateToLedger}
            />
          )}

          {activeTab === 'JOURNAL' && (
            <JournalEntriesTab
              entries={entries}
              accounts={accounts}
              loading={loading}
              onRefresh={fetchAccountingData}
            />
          )}

          {activeTab === 'LEDGER' && (
            <AccountLedgerTab
              accounts={accounts}
              initialAccountId={selectedLedgerAccountId}
            />
          )}

          {activeTab === 'REPORTS' && (
            <FinancialReportsTab />
          )}
        </>
      )}
    </div>
  );
};
