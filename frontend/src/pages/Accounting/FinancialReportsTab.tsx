import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Scale,
  TrendingUp,
  PieChart,
  Filter,
  Search,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  TrialBalanceResponse,
  IncomeStatementResponse,
  BalanceSheetResponse,
} from '../../types/accounting';
import { accountingService } from '../../services/accountingService';

type ReportType = 'TRIAL_BALANCE' | 'INCOME_STATEMENT' | 'BALANCE_SHEET';
type PeriodPreset = 'this_month' | 'today' | 'this_week' | 'last_month' | 'this_quarter' | 'this_year' | 'all_time' | 'custom';

interface FinancialReportsTabProps {
  refreshTrigger?: number;
}

const computePresetDates = (preset: PeriodPreset): { start: string; end: string } => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { start: todayStr, end: todayStr };
  }
  if (preset === 'this_week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { start: d.toISOString().split('T')[0], end: todayStr };
  }
  if (preset === 'this_month') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return { start: `${y}-${m}-01`, end: todayStr };
  }
  if (preset === 'last_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
    };
  }
  if (preset === 'this_quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
    return { start: firstDay.toISOString().split('T')[0], end: todayStr };
  }
  if (preset === 'this_year') {
    const y = now.getFullYear();
    return { start: `${y}-01-01`, end: todayStr };
  }
  return { start: '', end: todayStr };
};

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const FinancialReportsTab: React.FC<FinancialReportsTabProps> = ({ refreshTrigger }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('TRIAL_BALANCE');
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementResponse | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [startDate, setStartDate] = useState<string>(() => computePresetDates('this_month').start);
  const [endDate, setEndDate] = useState<string>(() => computePresetDates('this_month').end);
  const [asOfDate, setAsOfDate] = useState<string>(() => computePresetDates('this_month').end);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hideZeroBalances, setHideZeroBalances] = useState<boolean>(true);

  // Handle Preset Change
  const handlePeriodPresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    if (preset !== 'custom') {
      const { start, end } = computePresetDates(preset);
      setStartDate(start);
      setEndDate(end);
      setAsOfDate(end);
    }
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeReport === 'TRIAL_BALANCE') {
        const effectiveAsOf = periodPreset === 'all_time' ? undefined : (asOfDate || undefined);
        const data = await accountingService.getTrialBalance(effectiveAsOf);
        setTrialBalance(data);
      } else if (activeReport === 'INCOME_STATEMENT') {
        const effectiveStart = periodPreset === 'all_time' ? undefined : (startDate || undefined);
        const effectiveEnd = periodPreset === 'all_time' ? undefined : (endDate || undefined);
        const data = await accountingService.getIncomeStatement(effectiveStart, effectiveEnd);
        setIncomeStatement(data);
      } else if (activeReport === 'BALANCE_SHEET') {
        const effectiveAsOf = periodPreset === 'all_time' ? undefined : (asOfDate || undefined);
        const data = await accountingService.getBalanceSheet(effectiveAsOf);
        setBalanceSheet(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch financial report.');
    } finally {
      setLoading(false);
    }
  }, [activeReport, periodPreset, asOfDate, startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshTrigger]);

  // Client-side filtered rows for Trial Balance
  const filteredTrialBalanceRows = useMemo(() => {
    if (!trialBalance) return [];
    return trialBalance.rows.filter((row) => {
      if (hideZeroBalances && row.debit === 0 && row.credit === 0) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = row.account_name.toLowerCase().includes(term);
        const matchesCode = row.account_code.toLowerCase().includes(term);
        const matchesType = (row.account_type || '').toLowerCase().includes(term);
        return matchesName || matchesCode || matchesType;
      }
      return true;
    });
  }, [trialBalance, hideZeroBalances, searchTerm]);

  // Client-side filtered rows for Income Statement
  const filteredRevenueRows = useMemo(() => {
    if (!incomeStatement) return [];
    return incomeStatement.revenue.rows.filter((r) => {
      if (hideZeroBalances && r.amount === 0) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term);
      }
      return true;
    });
  }, [incomeStatement, hideZeroBalances, searchTerm]);

  const filteredExpenseRows = useMemo(() => {
    if (!incomeStatement) return [];
    return incomeStatement.expenses.rows.filter((r) => {
      if (hideZeroBalances && r.amount === 0) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term);
      }
      return true;
    });
  }, [incomeStatement, hideZeroBalances, searchTerm]);

  // Client-side filtered rows for Balance Sheet
  const filteredAssetRows = useMemo(() => {
    if (!balanceSheet) return [];
    return balanceSheet.assets.rows.filter((r) => {
      if (hideZeroBalances && r.amount === 0) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term);
      }
      return true;
    });
  }, [balanceSheet, hideZeroBalances, searchTerm]);

  const filteredLiabilityRows = useMemo(() => {
    if (!balanceSheet) return [];
    return balanceSheet.liabilities.rows.filter((r) => {
      if (hideZeroBalances && r.amount === 0) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term);
      }
      return true;
    });
  }, [balanceSheet, hideZeroBalances, searchTerm]);

  const filteredEquityRows = useMemo(() => {
    if (!balanceSheet) return [];
    return balanceSheet.equity.rows.filter((r) => {
      if (hideZeroBalances && r.amount === 0) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term);
      }
      return true;
    });
  }, [balanceSheet, hideZeroBalances, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Report Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveReport('TRIAL_BALANCE')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              border: '1px solid',
              borderColor: activeReport === 'TRIAL_BALANCE' ? 'var(--primary-400)' : 'var(--border-subtle)',
              backgroundColor: activeReport === 'TRIAL_BALANCE' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-elevated)',
              color: activeReport === 'TRIAL_BALANCE' ? 'var(--primary-400)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Scale size={16} />
            <span>Trial Balance</span>
          </button>

          <button
            onClick={() => setActiveReport('INCOME_STATEMENT')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              border: '1px solid',
              borderColor: activeReport === 'INCOME_STATEMENT' ? 'var(--success)' : 'var(--border-subtle)',
              backgroundColor: activeReport === 'INCOME_STATEMENT' ? 'var(--success-bg)' : 'var(--bg-elevated)',
              color: activeReport === 'INCOME_STATEMENT' ? 'var(--success)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <TrendingUp size={16} />
            <span>Profit & Loss (P&L)</span>
          </button>

          <button
            onClick={() => setActiveReport('BALANCE_SHEET')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              border: '1px solid',
              borderColor: activeReport === 'BALANCE_SHEET' ? 'var(--accent-500)' : 'var(--border-subtle)',
              backgroundColor: activeReport === 'BALANCE_SHEET' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-elevated)',
              color: activeReport === 'BALANCE_SHEET' ? '#a5b4fc' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <PieChart size={16} />
            <span>Balance Sheet</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Filter Control Panel */}
      <Card
        title="Report Parameters & Date Range Filters"
        icon={<Filter size={16} />}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem', alignItems: 'flex-end' }}>
          {/* Period Preset */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Period Preset
            </label>
            <select
              value={periodPreset}
              onChange={(e) => handlePeriodPresetChange(e.target.value as PeriodPreset)}
              style={{
                width: '100%',
                padding: '0.35rem 0.6rem',
                fontSize: '0.78125rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            >
              <option value="this_month">This Month</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Financial Year</option>
              <option value="all_time">All Time (Cumulative)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          {activeReport === 'INCOME_STATEMENT' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  disabled={periodPreset === 'all_time'}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPeriodPreset('custom');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.78125rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    opacity: periodPreset === 'all_time' ? 0.5 : 1,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  disabled={periodPreset === 'all_time'}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPeriodPreset('custom');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.78125rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    opacity: periodPreset === 'all_time' ? 0.5 : 1,
                  }}
                />
              </div>
            </>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                As of Date
              </label>
              <input
                type="date"
                value={asOfDate}
                disabled={periodPreset === 'all_time'}
                onChange={(e) => {
                  setAsOfDate(e.target.value);
                  setPeriodPreset('custom');
                }}
                style={{
                  width: '100%',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.78125rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                  opacity: periodPreset === 'all_time' ? 0.5 : 1,
                }}
              />
            </div>
          )}

          {/* Account Filter / Search */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Search Line Item / Code
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                placeholder="Filter by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.35rem 0.65rem 0.35rem 1.9rem',
                  fontSize: '0.78125rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Toggles bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hideZeroBalances}
              onChange={(e) => setHideZeroBalances(e.target.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-500)', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 600 }}>Hide accounts with zero (0.00) balances</span>
          </label>

          <Button variant="primary" icon={<Filter size={14} />} onClick={fetchReports}>
            Apply Parameters
          </Button>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner label="Generating real-time financial report..." />
      ) : error ? (
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '0.5rem' }}>
          {error}
        </div>
      ) : (
        <>
          {/* ================= TRIAL BALANCE ================= */}
          {activeReport === 'TRIAL_BALANCE' && trialBalance && (
            <Card
              title="General Ledger Trial Balance"
              icon={<Scale size={16} />}
              action={
                <Badge variant={trialBalance.is_balanced ? 'success' : 'danger'}>
                  {trialBalance.is_balanced ? 'Balanced (DR = CR)' : 'Unbalanced'}
                </Badge>
              }
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Account Code</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Account Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Debit (DR)</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Credit (CR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrialBalanceRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No accounts match the current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTrialBalanceRows.map((row) => (
                        <tr key={row.account_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', fontWeight: 700 }}>
                              {row.account_code}
                            </code>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.account_name}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.account_type}</span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.debit > 0 ? 'var(--primary-400)' : 'var(--text-subtle)', fontWeight: row.debit > 0 ? 700 : 400 }}>
                            {row.debit > 0 ? `Rs. ${formatMoney(row.debit)}` : '—'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.credit > 0 ? 'var(--warning)' : 'var(--text-subtle)', fontWeight: row.credit > 0 ? 700 : 400 }}>
                            {row.credit > 0 ? `Rs. ${formatMoney(row.credit)}` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-medium)', fontWeight: 800, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                        Grand Total:
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', fontSize: '1.0625rem' }}>
                        Rs. {formatMoney(trialBalance.total_debit)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)', fontSize: '1.0625rem' }}>
                        Rs. {formatMoney(trialBalance.total_credit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* ================= PROFIT & LOSS ================= */}
          {activeReport === 'INCOME_STATEMENT' && incomeStatement && (
            <Card
              title="Profit & Loss Statement (Income Statement)"
              icon={<TrendingUp size={16} />}
              action={
                <Badge variant={incomeStatement.net_profit >= 0 ? 'success' : 'danger'}>
                  Net {incomeStatement.net_profit >= 0 ? 'Profit' : 'Loss'}: Rs. {formatMoney(Math.abs(incomeStatement.net_profit))}
                </Badge>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Revenue Section */}
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>1. Operating Revenue</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem' }}>Rs. {formatMoney(incomeStatement.revenue.total)}</span>
                  </h4>
                  <div style={{ backgroundColor: 'var(--bg-app)', borderRadius: '0.5rem', padding: '0.5rem 1rem', border: '1px solid var(--border-subtle)' }}>
                    {filteredRevenueRows.length === 0 ? (
                      <div style={{ padding: '0.75rem', color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>No revenue accounts recorded in this period.</div>
                    ) : (
                      filteredRevenueRows.map((row) => (
                        <div key={row.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                          <span><code style={{ color: 'var(--primary-400)', fontWeight: 700 }}>[{row.code}]</code> {row.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>Rs. {formatMoney(row.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Expenses Section */}
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>2. Operating Expenses & Cost of Goods Sold (COGS)</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem' }}>Rs. {formatMoney(incomeStatement.expenses.total)}</span>
                  </h4>
                  <div style={{ backgroundColor: 'var(--bg-app)', borderRadius: '0.5rem', padding: '0.5rem 1rem', border: '1px solid var(--border-subtle)' }}>
                    {filteredExpenseRows.length === 0 ? (
                      <div style={{ padding: '0.75rem', color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>No expense accounts recorded in this period.</div>
                    ) : (
                      filteredExpenseRows.map((row) => (
                        <div key={row.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                          <span><code style={{ color: 'var(--danger)', fontWeight: 700 }}>[{row.code}]</code> {row.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>Rs. {formatMoney(row.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Net Summary */}
                <div style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem 1.5rem',
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Net Operating Profit / (Loss)</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                      Total Operating Revenue minus COGS and Operating Expenses
                    </p>
                  </div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: incomeStatement.net_profit >= 0 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    Rs. {formatMoney(incomeStatement.net_profit)}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ================= BALANCE SHEET ================= */}
          {activeReport === 'BALANCE_SHEET' && balanceSheet && (
            <Card
              title="Balance Sheet"
              icon={<PieChart size={16} />}
              action={
                <Badge variant={balanceSheet.is_balanced ? 'success' : 'danger'}>
                  {balanceSheet.is_balanced ? 'Balanced (Assets = Liabilities + Equity)' : 'Unbalanced'}
                </Badge>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Left: Assets */}
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary-400)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>1. Total Assets</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(balanceSheet.assets.total)}</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredAssetRows.length === 0 ? (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>No asset line items match filter.</div>
                    ) : (
                      filteredAssetRows.map((r) => (
                        <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                          <span><code style={{ color: 'var(--text-subtle)', fontWeight: 700 }}>[{r.code}]</code> {r.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {formatMoney(r.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Liabilities & Equity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Liabilities */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>2. Liabilities</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(balanceSheet.liabilities.total)}</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {filteredLiabilityRows.length === 0 ? (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>No liabilities recorded.</div>
                      ) : (
                        filteredLiabilityRows.map((r) => (
                          <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                            <span><code style={{ color: 'var(--text-subtle)', fontWeight: 700 }}>[{r.code}]</code> {r.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {formatMoney(r.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>3. Equity</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(balanceSheet.equity.total)}</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {filteredEquityRows.length === 0 ? (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>No equity accounts recorded.</div>
                      ) : (
                        filteredEquityRows.map((r) => (
                          <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                            <span><code style={{ color: 'var(--text-subtle)', fontWeight: 700 }}>[{r.code}]</code> {r.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {formatMoney(r.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
