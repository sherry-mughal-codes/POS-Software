import React, { useState, useEffect, useCallback } from 'react';
import { Scale, TrendingUp, PieChart, RefreshCw } from 'lucide-react';
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

export const FinancialReportsTab: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'TRIAL_BALANCE' | 'INCOME_STATEMENT' | 'BALANCE_SHEET'>('TRIAL_BALANCE');
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementResponse | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeReport === 'TRIAL_BALANCE') {
        const data = await accountingService.getTrialBalance();
        setTrialBalance(data);
      } else if (activeReport === 'INCOME_STATEMENT') {
        const data = await accountingService.getIncomeStatement();
        setIncomeStatement(data);
      } else if (activeReport === 'BALANCE_SHEET') {
        const data = await accountingService.getBalanceSheet();
        setBalanceSheet(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch financial report.');
    } finally {
      setLoading(false);
    }
  }, [activeReport]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Report Switcher & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveReport('TRIAL_BALANCE')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeReport === 'TRIAL_BALANCE' ? 'var(--primary-400)' : 'var(--border-subtle)',
              backgroundColor: activeReport === 'TRIAL_BALANCE' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-elevated)',
              color: activeReport === 'TRIAL_BALANCE' ? 'var(--primary-400)' : 'var(--text-muted)',
              cursor: 'pointer',
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
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeReport === 'INCOME_STATEMENT' ? 'var(--success)' : 'var(--border-subtle)',
              backgroundColor: activeReport === 'INCOME_STATEMENT' ? 'var(--success-bg)' : 'var(--bg-elevated)',
              color: activeReport === 'INCOME_STATEMENT' ? 'var(--success)' : 'var(--text-muted)',
              cursor: 'pointer',
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
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeReport === 'BALANCE_SHEET' ? 'var(--accent-500)' : 'var(--border-subtle)',
              backgroundColor: activeReport === 'BALANCE_SHEET' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-elevated)',
              color: activeReport === 'BALANCE_SHEET' ? '#a5b4fc' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <PieChart size={16} />
            <span>Balance Sheet</span>
          </button>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw size={14} />}
          loading={loading}
          onClick={fetchReports}
        >
          Recalculate
        </Button>
      </div>

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
              subtitle={`Verified as of ${trialBalance.as_of_date}`}
              icon={<Scale size={20} />}
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
                    {trialBalance.rows.map((row) => (
                      <tr key={row.account_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                            {row.account_code}
                          </code>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{row.account_name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.account_type}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.debit > 0 ? 'var(--primary-400)' : 'var(--text-subtle)' }}>
                          {row.debit > 0 ? `Rs. ${row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.credit > 0 ? 'var(--warning)' : 'var(--text-subtle)' }}>
                          {row.credit > 0 ? `Rs. ${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-medium)', fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-main)' }}>Grand Total:</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', fontSize: '1rem' }}>
                        Rs. {trialBalance.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)', fontSize: '1rem' }}>
                        Rs. {trialBalance.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              subtitle={`Period: ${incomeStatement.period.start_date} to ${incomeStatement.period.end_date}`}
              icon={<TrendingUp size={20} />}
              action={
                <Badge variant={incomeStatement.net_profit >= 0 ? 'success' : 'danger'}>
                  Net {incomeStatement.net_profit >= 0 ? 'Profit' : 'Loss'}: Rs. {Math.abs(incomeStatement.net_profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Badge>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Revenue Section */}
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>1. Operating Revenue</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {incomeStatement.revenue.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </h4>
                  <div style={{ backgroundColor: 'var(--bg-app)', borderRadius: '0.5rem', padding: '0.5rem 1rem' }}>
                    {incomeStatement.revenue.rows.length === 0 ? (
                      <div style={{ padding: '0.75rem', color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>No revenue recorded in this period.</div>
                    ) : (
                      incomeStatement.revenue.rows.map((row) => (
                        <div key={row.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                          <span><code style={{ color: 'var(--primary-400)' }}>[{row.code}]</code> {row.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Expenses Section */}
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>2. Operating & COGS Expenses</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {incomeStatement.expenses.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </h4>
                  <div style={{ backgroundColor: 'var(--bg-app)', borderRadius: '0.5rem', padding: '0.5rem 1rem' }}>
                    {incomeStatement.expenses.rows.length === 0 ? (
                      <div style={{ padding: '0.75rem', color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>No expenses recorded in this period.</div>
                    ) : (
                      incomeStatement.expenses.rows.map((row) => (
                        <div key={row.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                          <span><code style={{ color: 'var(--primary-400)' }}>[{row.code}]</code> {row.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Net Summary */}
                <div style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Net Operating Profit / (Loss)</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Revenue minus Operating Expenses and COGS</p>
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: incomeStatement.net_profit >= 0 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    Rs. {incomeStatement.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ================= BALANCE SHEET ================= */}
          {activeReport === 'BALANCE_SHEET' && balanceSheet && (
            <Card
              title="Balance Sheet"
              subtitle={`Financial position as of ${balanceSheet.as_of_date}`}
              icon={<PieChart size={20} />}
              action={
                <Badge variant={balanceSheet.is_balanced ? 'success' : 'danger'}>
                  {balanceSheet.is_balanced ? 'Balanced (Assets = Liabilities + Equity)' : 'Unbalanced'}
                </Badge>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Left: Assets */}
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary-400)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Assets</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {balanceSheet.assets.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {balanceSheet.assets.rows.map((r) => (
                      <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                        <span><code style={{ color: 'var(--text-subtle)' }}>[{r.code}]</code> {r.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Liabilities & Equity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Liabilities */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Liabilities</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {balanceSheet.liabilities.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {balanceSheet.liabilities.rows.length === 0 ? (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>No liabilities recorded.</div>
                      ) : (
                        balanceSheet.liabilities.rows.map((r) => (
                          <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                            <span><code style={{ color: 'var(--text-subtle)' }}>[{r.code}]</code> {r.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Equity</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {balanceSheet.equity.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {balanceSheet.equity.rows.map((r) => (
                        <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                          <span><code style={{ color: 'var(--text-subtle)' }}>[{r.code}]</code> {r.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
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
