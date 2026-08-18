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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Badge variant="success" pulse>Double-Entry Engine</Badge>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Chart of Accounts & General Ledger
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Double-entry accounting foundation with automatic journal creation, trial balance verification, and financial reporting.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw size={16} />}
          loading={loading}
          onClick={fetchAccountingData}
        >
          Refresh Ledger
        </Button>
      </div>

      {/* High-Level Accounting Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
      }}>
        {/* Total Assets */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Assets</span>
            <DollarSign size={18} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            Rs. {balanceSheet ? balanceSheet.assets.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Cash, Bank, Inventory & Receivables</div>
        </div>

        {/* Total Liabilities */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Liabilities</span>
            <Scale size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
            Rs. {balanceSheet ? balanceSheet.liabilities.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Accounts Payable & Taxes</div>
        </div>

        {/* Total Equity */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Owner's Equity</span>
            <TrendingUp size={18} style={{ color: '#a5b4fc' }} />
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
            Rs. {balanceSheet ? balanceSheet.equity.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Capital & Retained Earnings</div>
        </div>

        {/* Net Operating Profit */}
        <div className="glass-card" style={{ padding: '1.25rem', borderColor: (incomeStatement?.net_profit || 0) >= 0 ? 'var(--success-border)' : 'var(--danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Net Operating Profit</span>
            <Badge variant={(incomeStatement?.net_profit || 0) >= 0 ? 'success' : 'danger'}>
              {(incomeStatement?.net_profit || 0) >= 0 ? 'Profitable' : 'Loss'}
            </Badge>
          </div>
          <div style={{
            fontSize: '1.375rem',
            fontWeight: 800,
            color: (incomeStatement?.net_profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
            fontFamily: 'var(--font-mono)',
          }}>
            Rs. {incomeStatement ? incomeStatement.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Revenue minus Expenses</div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.5rem',
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
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: isSelected ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: isSelected ? 'var(--primary-500)' : 'var(--bg-elevated)',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '9999px',
                }}>
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
