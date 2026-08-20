import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Receipt,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Building,
  Banknote,
  Send,
  Edit2,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Expense, ComprehensiveExpenseReport } from '../../types/expense';
import { Account } from '../../types/accounting';
import { expenseService } from '../../services/expenseService';
import { accountingService } from '../../services/accountingService';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const ExpensesDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'reports'>('expenses');

  // Accounts master data
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);

  // Expenses Tab State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('');
  const [expenseAccountFilter, setExpenseAccountFilter] = useState('');
  const [expensePaymentFilter, setExpensePaymentFilter] = useState('');
  const [expenseDateFrom, setExpenseDateFrom] = useState('');
  const [expenseDateTo, setExpenseDateTo] = useState('');

  // Reports Tab State
  const [reportData, setReportData] = useState<ComprehensiveExpenseReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({
    expense_account: 0,
    payment_account: 0,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference_no: '',
    notes: '',
    submit_now: true,
  });
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Cancel Modal
  const [cancelTarget, setCancelTarget] = useState<Expense | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Fetch Chart of Accounts
  useEffect(() => {
    accountingService.getAccounts().then((accounts) => {
      if (accounts) {
        const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
        const expList = accounts.filter((a) => a.account_type === 'EXPENSE' && isLeaf(a));
        const payList = accounts.filter(
          (a) => a.account_type === 'ASSET' && isLeaf(a) && (a.code.startsWith('101') || a.code.startsWith('102') || a.parent_code === '1010' || a.parent_code === '1020')
        );
        setExpenseAccounts(expList);
        setPaymentAccounts(payList.length > 0 ? payList : accounts.filter((a) => a.account_type === 'ASSET' && isLeaf(a)));
      }
    });
  }, []);

  // Fetch Expenses
  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const data = await expenseService.getExpenses({
        search: expenseSearch || undefined,
        status: expenseStatusFilter || undefined,
        expense_account: expenseAccountFilter ? parseInt(expenseAccountFilter) : undefined,
        payment_account: expensePaymentFilter ? parseInt(expensePaymentFilter) : undefined,
        date_from: expenseDateFrom || undefined,
        date_to: expenseDateTo || undefined,
      });
      setExpenses(data || []);
    } finally {
      setExpensesLoading(false);
    }
  }, [expenseSearch, expenseStatusFilter, expenseAccountFilter, expensePaymentFilter, expenseDateFrom, expenseDateTo]);

  // Fetch Report
  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const data = await expenseService.getExpenseReport({
        start_date: reportDateFrom || undefined,
        end_date: reportDateTo || undefined,
      });
      setReportData(data);
    } finally {
      setReportLoading(false);
    }
  }, [reportDateFrom, reportDateTo]);

  useEffect(() => {
    if (activeTab === 'expenses') fetchExpenses();
    else if (activeTab === 'reports') fetchReport();
  }, [activeTab, fetchExpenses, fetchReport]);

  // Handlers for Expense Form
  const handleOpenCreateExpense = () => {
    setEditingExpense(null);
    setExpenseFormData({
      expense_account: expenseAccounts[0]?.id || 0,
      payment_account: paymentAccounts[0]?.id || 0,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference_no: '',
      notes: '',
      submit_now: true,
    });
    setExpenseError(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseFormData({
      expense_account: exp.expense_account,
      payment_account: exp.payment_account,
      amount: exp.amount.toString(),
      date: exp.date,
      description: exp.description,
      reference_no: exp.reference_no || '',
      notes: exp.notes || '',
      submit_now: false,
    });
    setExpenseError(null);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    setExpenseSubmitting(true);

    try {
      if (editingExpense) {
        await expenseService.updateExpense(editingExpense.id, {
          expense_account: expenseFormData.expense_account,
          payment_account: expenseFormData.payment_account,
          amount: parseFloat(expenseFormData.amount),
          date: expenseFormData.date,
          description: expenseFormData.description,
          reference_no: expenseFormData.reference_no,
          notes: expenseFormData.notes,
        });
      } else {
        await expenseService.createExpense({
          expense_account: expenseFormData.expense_account,
          payment_account: expenseFormData.payment_account,
          amount: parseFloat(expenseFormData.amount),
          date: expenseFormData.date,
          description: expenseFormData.description,
          reference_no: expenseFormData.reference_no,
          notes: expenseFormData.notes,
          submit_now: expenseFormData.submit_now,
        });
      }
      setIsExpenseModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      setExpenseError(err?.response?.data?.detail || err?.message || 'Failed to save expense.');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleSubmitDraftExpense = async (id: number) => {
    try {
      await expenseService.submitExpense(id);
      fetchExpenses();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to submit expense.');
    }
  };

  // Handlers for Cancellation
  const handleOpenCancelModal = (item: Expense) => {
    setCancelTarget(item);
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    setCancelError(null);

    try {
      await expenseService.cancelExpense(cancelTarget.id, cancelReason);
      fetchExpenses();
      setCancelTarget(null);
    } catch (err: any) {
      setCancelError(err?.response?.data?.detail || err?.message || 'Failed to cancel transaction.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Expense Management
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={handleOpenCreateExpense}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              fontWeight: 700,
              padding: '0.25rem 0.55rem',
              fontSize: '0.75rem',
            }}
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'expenses' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'expenses' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Receipt size={14} />
          <span>Expense Logs ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'reports' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'reports' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <BarChart3 size={14} />
          <span>Expense Analytics</span>
        </button>
      </div>

      {/* TAB 1: EXPENSES LIST */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filters Bar */}
          <Card title="Expenses Filters" subtitle="Filter by expense category, payment source, status or date range" icon={<Filter size={18} />}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Search Expense / Receipt
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input
                    type="text"
                    placeholder="EXP-2026-00001 or Bill ref..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.5rem 0.45rem 2rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Expense Category
                </label>
                <select
                  value={expenseAccountFilter}
                  onChange={(e) => setExpenseAccountFilter(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">All Categories</option>
                  {expenseAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Paid From (Account)
                </label>
                <select
                  value={expensePaymentFilter}
                  onChange={(e) => setExpensePaymentFilter(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">All Payment Accounts</option>
                  {paymentAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Status
                </label>
                <select
                  value={expenseStatusFilter}
                  onChange={(e) => setExpenseStatusFilter(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">All Statuses</option>
                  <option value="SUBMITTED">Submitted (Posted)</option>
                  <option value="DRAFT">Draft</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="primary" icon={<Filter size={13} />} onClick={fetchExpenses} style={{ flex: 1 }}>
                  Apply
                </Button>
                <Button
                  variant="outline"
                  icon={<RefreshCw size={13} />}
                  onClick={() => {
                    setExpenseSearch('');
                    setExpenseAccountFilter('');
                    setExpensePaymentFilter('');
                    setExpenseStatusFilter('');
                    setExpenseDateFrom('');
                    setExpenseDateTo('');
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Expenses Table */}
          <Card title={`Operational Expense Records (${expenses.length})`} subtitle="Double-entry integrated operational disbursement ledger" icon={<Receipt size={18} />}>
            {expensesLoading ? (
              <LoadingSpinner label="Loading expenses..." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Expense #</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Category / Account</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Paid From</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Amount (Rs.)</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Created By</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No expenses recorded yet. Click "Record Expense" to create one.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((exp) => (
                        <tr
                          key={exp.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{exp.expense_number}</code>
                            {exp.journal_entry_number && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                                GL: {exp.journal_entry_number}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                            {exp.date}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{exp.expense_account_name}</div>
                            <code style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{exp.expense_account_code}</code>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div>{exp.description}</div>
                            {exp.reference_no && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Ref: {exp.reference_no}</div>
                            )}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <Badge variant="phase">{exp.payment_account_name}</Badge>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            Rs. {formatMoney(exp.amount)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            {exp.status === 'SUBMITTED' && <Badge variant="success">Submitted</Badge>}
                            {exp.status === 'DRAFT' && <Badge variant="warning">Draft</Badge>}
                            {exp.status === 'CANCELLED' && <Badge variant="danger">Cancelled</Badge>}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            <div>{exp.created_by_name}</div>
                            {exp.submitted_by_name && (
                              <div style={{ color: 'var(--text-subtle)' }}>Sub: {exp.submitted_by_name}</div>
                            )}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                              {exp.status === 'DRAFT' && (
                                <>
                                  <Button
                                    variant="primary"
                                    icon={<Send size={12} />}
                                    onClick={() => handleSubmitDraftExpense(exp.id)}
                                    title="Submit & Post to Ledger"
                                  >
                                    Submit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    icon={<Edit2 size={12} />}
                                    onClick={() => handleOpenEditExpense(exp)}
                                    title="Edit Draft"
                                  />
                                </>
                              )}

                              {exp.status === 'SUBMITTED' && (
                                <Button
                                  variant="outline"
                                  icon={<RotateCcw size={12} />}
                                  onClick={() => handleOpenCancelModal(exp)}
                                  title="Cancel Expense & Reverse Ledger"
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: EXPENSE ANALYTICS & REPORT */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Date Filter Bar */}
          <Card title="Analytics Filters" subtitle="Analyze expenses by reporting period" icon={<Filter size={18} />}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Date From
                </label>
                <input
                  type="date"
                  value={reportDateFrom}
                  onChange={(e) => setReportDateFrom(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Date To
                </label>
                <input
                  type="date"
                  value={reportDateTo}
                  onChange={(e) => setReportDateTo(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="primary" icon={<Filter size={13} />} onClick={fetchReport}>
                  Generate Report
                </Button>
                <Button
                  variant="outline"
                  icon={<RefreshCw size={13} />}
                  onClick={() => {
                    setReportDateFrom('');
                    setReportDateTo('');
                  }}
                />
              </div>
            </div>
          </Card>

          {reportLoading ? (
            <LoadingSpinner label="Generating expense report..." />
          ) : reportData ? (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Posted Expenses</span>
                    <DollarSign size={18} style={{ color: 'var(--danger)' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(reportData.summary.total_expenses)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {reportData.summary.submitted_count} Submitted Transactions
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Cash Drawer Expenses</span>
                    <Banknote size={18} style={{ color: 'var(--warning)' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(reportData.summary.cash_expenses)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Paid from Cash Accounts
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Bank Account Expenses</span>
                    <Building size={18} style={{ color: 'var(--primary-400)' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(reportData.summary.bank_expenses)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Paid via Bank Transfers / Cheques
                  </div>
                </div>
              </div>

              {/* Category Breakdown Cards */}
              <Card title="Category Breakdown" subtitle="Distribution of expenses across standard Chart of Accounts" icon={<BarChart3 size={18} />}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {Object.entries(reportData.summary.account_breakdown).map(([catName, amt]) => (
                    <div
                      key={catName}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        minWidth: '180px',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{catName}</span>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                        Rs. {formatMoney(amt)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* CREATE / EDIT EXPENSE MODAL */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpense ? `Edit Expense (${editingExpense.expense_number})` : 'Record Operational Expense'}
        maxWidth="580px"
      >
        <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {expenseError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{expenseError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Expense Category / Account *
              </label>
              <select
                value={expenseFormData.expense_account}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, expense_account: parseInt(e.target.value) })}
                required
                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              >
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Payment Account (Paid From) *
              </label>
              <select
                value={expenseFormData.payment_account}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, payment_account: parseInt(e.target.value) })}
                required
                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              >
                {paymentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Amount (Rs.) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={expenseFormData.amount}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Date *
              </label>
              <input
                type="date"
                value={expenseFormData.date}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Electricity bill for August, Office stationery, etc."
              value={expenseFormData.description}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Reference / Receipt / Voucher # (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. BILL-99201 or RCPT-12"
              value={expenseFormData.reference_no}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, reference_no: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Additional internal audit remarks..."
              value={expenseFormData.notes}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          {!editingExpense && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.375rem' }}>
              <input
                type="checkbox"
                id="submit_now_checkbox"
                checked={expenseFormData.submit_now}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, submit_now: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="submit_now_checkbox" style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <strong>Submit & Post immediately</strong> (Generates General Ledger journal entry)
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsExpenseModalOpen(false)} disabled={expenseSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={expenseSubmitting} icon={<CheckCircle size={15} />}>
              {editingExpense ? 'Update Expense' : expenseFormData.submit_now ? 'Submit & Post (Rs.)' : 'Save as Draft'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelTarget && (
        <Modal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title="Cancel Expense Transaction"
          maxWidth="460px"
        >
          <form onSubmit={handleConfirmCancel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cancelError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{cancelError}</span>
              </div>
            )}

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Are you sure you want to cancel <strong>{cancelTarget.expense_number}</strong> for <strong>Rs. {formatMoney(cancelTarget.amount)}</strong>?
              <div style={{ marginTop: '0.5rem', color: 'var(--warning)', fontWeight: 600 }}>
                This will automatically post a counter-reversal journal entry in the General Ledger.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Reason for Cancellation *
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Incorrect amount, duplicate entry..."
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelSubmitting}>
                Keep Active
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={cancelSubmitting}
                icon={<RotateCcw size={15} />}
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                Confirm Cancellation & Reversal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
