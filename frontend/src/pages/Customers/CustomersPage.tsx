import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Edit2,
  Power,
  RefreshCw,
  DollarSign,
  Receipt,
  FileText,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Printer,
  TrendingDown,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CustomerModal } from './CustomerModal';
import { CustomerBulkImportModal } from './CustomerBulkImportModal';
import {
  Customer,
  CustomerPayment,
  CustomerStatement,
  ReceivablesReport,
  PaymentMethodKind,
} from '../../types/contact';
import { Account } from '../../types/accounting';
import { contactService } from '../../services/contactService';
import { accountingService } from '../../services/accountingService';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const CustomersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'payments' | 'receivables'>('customers');

  // Customer List State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for Customers
  const [searchQuery, setSearchQuery] = useState('');
  const [creditFilter, setCreditFilter] = useState<'ALL' | 'CREDIT_ENABLED' | 'CASH_ONLY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Payments History State
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Receivables Report State
  const [receivablesReport, setReceivablesReport] = useState<ReceivablesReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Accounts master data
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKind>('CASH');
  const [paymentAccountId, setPaymentAccountId] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Statement Modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementData, setStatementData] = useState<CustomerStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementStartDate, setStatementStartDate] = useState('');
  const [statementEndDate, setStatementEndDate] = useState('');

  // Cancel Payment Modal
  const [cancelPaymentTarget, setCancelPaymentTarget] = useState<CustomerPayment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Fetch Payment Accounts
  useEffect(() => {
    accountingService.getAccounts().then((accs) => {
      if (accs) {
        const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
        const cashBank = accs.filter(
          (a) => a.account_type === 'ASSET' && isLeaf(a) && (a.code.startsWith('101') || a.code.startsWith('102') || a.parent_code === '1010' || a.parent_code === '1020')
        );
        setPaymentAccounts(cashBank.length > 0 ? cashBank : accs.filter((a) => a.account_type === 'ASSET' && isLeaf(a)));
      }
    });
  }, []);

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactService.getCustomers();
      setCustomers(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await contactService.getCustomerPayments({
        search: paymentSearch || undefined,
        status: paymentStatusFilter || undefined,
      });
      setPayments(data || []);
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentSearch, paymentStatusFilter]);

  // Fetch Receivables Report
  const fetchReceivablesReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const data = await contactService.getReceivablesReport();
      setReceivablesReport(data);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'customers') fetchCustomers();
    else if (activeTab === 'payments') fetchPayments();
    else if (activeTab === 'receivables') fetchReceivablesReport();
  }, [activeTab, fetchCustomers, fetchPayments, fetchReceivablesReport]);

  const handleToggleStatus = async (cust: Customer) => {
    if (cust.is_walkin) return;
    try {
      await contactService.toggleCustomerStatus(cust.id);
      fetchCustomers();
    } catch (err: any) {
      alert(err?.message || 'Failed to update customer status.');
    }
  };

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setIsCustomerModalOpen(true);
  };

  // Payment Modal Handlers
  const handleOpenPaymentModal = (cust?: Customer) => {
    const target = cust || customers.find((c) => !c.is_walkin && (c.outstanding_balance || 0) > 0) || customers.find((c) => !c.is_walkin);
    setSelectedCustomerForPayment(target || null);
    setPaymentAmount(target && target.outstanding_balance ? target.outstanding_balance.toString() : '');
    setPaymentMethod('CASH');
    setPaymentAccountId(paymentAccounts[0]?.id || 0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPayment) return;
    setPaymentError(null);
    setPaymentSubmitting(true);

    const amt = parseFloat(paymentAmount);
    const outstanding = selectedCustomerForPayment.outstanding_balance || 0;

    if (amt <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      setPaymentSubmitting(false);
      return;
    }

    if (amt > outstanding) {
      setPaymentError(
        `Payment amount (Rs. ${formatMoney(amt)}) exceeds customer's outstanding receivable (Rs. ${formatMoney(outstanding)}). Overpayment is not allowed.`
      );
      setPaymentSubmitting(false);
      return;
    }

    try {
      await contactService.createCustomerPayment({
        customer: selectedCustomerForPayment.id,
        amount: amt,
        payment_method: paymentMethod,
        payment_account: paymentAccountId || undefined,
        date: paymentDate,
        reference: paymentReference,
        notes: paymentNotes,
        submit_now: true,
      });
      setIsPaymentModalOpen(false);
      fetchCustomers();
      if (activeTab === 'payments') fetchPayments();
    } catch (err: any) {
      setPaymentError(err?.response?.data?.detail || err?.message || 'Failed to record customer payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Statement Modal Handlers
  const handleOpenStatement = async (cust: Customer) => {
    setStatementCustomer(cust);
    setStatementLoading(true);
    setStatementStartDate('');
    setStatementEndDate('');
    try {
      const stmt = await contactService.getCustomerStatement(cust.id);
      setStatementData(stmt);
    } finally {
      setStatementLoading(false);
    }
  };

  const handleFilterStatement = async () => {
    if (!statementCustomer) return;
    setStatementLoading(true);
    try {
      const stmt = await contactService.getCustomerStatement(statementCustomer.id, {
        start_date: statementStartDate || undefined,
        end_date: statementEndDate || undefined,
      });
      setStatementData(stmt);
    } finally {
      setStatementLoading(false);
    }
  };

  // Cancel Payment Handlers
  const handleOpenCancelPayment = (pay: CustomerPayment) => {
    setCancelPaymentTarget(pay);
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancelPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelPaymentTarget) return;
    setCancelSubmitting(true);
    setCancelError(null);

    try {
      await contactService.cancelCustomerPayment(cancelPaymentTarget.id, cancelReason);
      setCancelPaymentTarget(null);
      fetchPayments();
      fetchCustomers();
    } catch (err: any) {
      setCancelError(err?.response?.data?.detail || err?.message || 'Failed to cancel payment.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customer_id && c.customer_id.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q));

    let matchesCredit = true;
    if (creditFilter === 'CREDIT_ENABLED') matchesCredit = c.credit_enabled;
    if (creditFilter === 'CASH_ONLY') matchesCredit = !c.credit_enabled;

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = c.is_active;
    if (statusFilter === 'INACTIVE') matchesStatus = !c.is_active;

    return matchesSearch && matchesCredit && matchesStatus;
  });

  // Metrics
  const totalCount = customers.length;
  const creditEligibleCount = customers.filter((c) => c.credit_enabled).length;
  const totalReceivables = customers.reduce((acc, c) => acc + (c.outstanding_balance || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Customers & Receivables
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="outline"
            icon={<RefreshCw size={13} />}
            loading={loading || paymentsLoading || reportLoading}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={() => {
              if (activeTab === 'customers') fetchCustomers();
              else if (activeTab === 'payments') fetchPayments();
              else if (activeTab === 'receivables') fetchReceivablesReport();
            }}
            title="Refresh Data"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            icon={<DollarSign size={14} />}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={() => handleOpenPaymentModal()}
          >
            Record Payment
          </Button>

          <Button
            variant="secondary"
            icon={<FileSpreadsheet size={14} />}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={() => setIsBulkImportModalOpen(true)}
          >
            Import Bulk
          </Button>

          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={handleOpenAddCustomer}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              fontWeight: 700,
              padding: '0.25rem 0.55rem',
              fontSize: '0.75rem',
            }}
          >
            Register Customer
          </Button>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
        <button
          onClick={() => setActiveTab('customers')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'customers' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'customers' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Users size={14} />
          <span>Customers Directory ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'payments' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'payments' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Receipt size={14} />
          <span>Payment Vouchers</span>
        </button>

        <button
          onClick={() => setActiveTab('receivables')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'receivables' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'receivables' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <BarChart3 size={14} />
          <span>Receivables Aging Report</span>
        </button>
      </div>

      {/* TAB 1: CUSTOMERS DIRECTORY & BALANCES */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Standardized Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Receivables</span>
                <DollarSign size={15} style={{ color: 'var(--danger)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(totalReceivables)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Outstanding customer credit</div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Credit Authorized</span>
                <CreditCard size={15} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                {creditEligibleCount}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Allowed on-account purchases</div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Customers</span>
                <Users size={15} style={{ color: 'var(--primary-400)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                {totalCount}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Registered + Walk-in</div>
            </div>
          </div>

          {/* Standard Compact Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.65rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-subtle)',
                }}
              />
              <input
                type="text"
                placeholder="Search customer name, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.3rem 0.6rem 0.3rem 1.85rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={creditFilter}
              onChange={(e) => setCreditFilter(e.target.value as any)}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.3rem 0.6rem',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                outline: 'none',
                minWidth: '130px',
              }}
            >
              <option value="ALL">All Credit Policies</option>
              <option value="CREDIT_ENABLED">Credit Authorized</option>
              <option value="CASH_ONLY">Cash Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.3rem 0.6rem',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                outline: 'none',
                minWidth: '110px',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            {(searchQuery || creditFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setCreditFilter('ALL');
                  setStatusFilter('ALL');
                }}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.71875rem' }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Customer Table Card */}
          <Card
            title="Registered Customers & Receivable Balances"
            subtitle={`${filteredCustomers.length} records matching filters`}
            icon={<Users size={20} />}
          >
            {loading ? (
              <LoadingSpinner label="Loading customer master records..." />
            ) : error ? (
              <div style={{ padding: '1.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '0.5rem' }}>
                {error}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No customers match the search criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                      <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Customer ID</th>
                      <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Customer / Ledger Name</th>
                      <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Contact Info</th>
                      <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Address / Area</th>
                      <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Receivable Balance</th>
                      <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Credit Policy</th>
                      <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((cust) => {
                      const balance = cust.outstanding_balance || 0;
                      return (
                        <tr
                          key={cust.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: cust.is_walkin ? 'rgba(56, 189, 248, 0.03)' : 'transparent',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = cust.is_walkin ? 'rgba(56, 189, 248, 0.03)' : 'transparent')}
                        >
                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            <code
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                color: cust.is_walkin ? 'var(--primary-400)' : 'var(--text-main)',
                                backgroundColor: 'var(--bg-app)',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '0.25rem',
                              }}
                            >
                              {cust.customer_id}
                            </code>
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong style={{ color: 'var(--text-main)', fontSize: '0.8125rem' }}>{cust.name}</strong>
                              {cust.is_walkin && <Badge variant="phase">Default Walk-in</Badge>}
                            </div>
                            {cust.notes && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.1rem' }}>
                                {cust.notes}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            {cust.phone ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                                <Phone size={11} style={{ color: 'var(--primary-400)' }} />
                                <span>{cust.phone}</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.6875rem' }}>No phone</span>
                            )}
                            {cust.email && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                <Mail size={11} />
                                <span>{cust.email}</span>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {cust.address ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <MapPin size={11} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
                                <span>{cust.address}</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-subtle)' }}>—</span>
                            )}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                            {cust.is_walkin ? (
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>Rs. 0.00 (Cash-only)</span>
                            ) : balance > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--danger)', fontSize: '0.85rem' }}>
                                  Rs. {formatMoney(balance)}
                                </span>
                                <span style={{ fontSize: '0.625rem', color: 'var(--danger)', fontWeight: 600 }}>Due Receivable</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)', fontSize: '0.78125rem' }}>
                                  Rs. 0.00
                                </span>
                                <span style={{ fontSize: '0.625rem', color: 'var(--success)', fontWeight: 600 }}>All Cleared</span>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                            {cust.credit_enabled ? (
                              <Badge variant="success">Credit Enabled</Badge>
                            ) : (
                              <Badge variant="warning">Cash Only</Badge>
                            )}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                            <Badge variant={cust.is_active ? 'success' : 'danger'}>
                              {cust.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem' }}>
                              {!cust.is_walkin && balance > 0 && (
                                <Button
                                  variant="primary"
                                  icon={<DollarSign size={13} />}
                                  style={{ padding: '0.3rem 0.45rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                                  onClick={() => handleOpenPaymentModal(cust)}
                                  title="Record Payment / Receive Cash"
                                />
                              )}

                              {!cust.is_walkin && (
                                <Button
                                  variant="outline"
                                  icon={<FileText size={13} />}
                                  style={{ padding: '0.3rem 0.45rem' }}
                                  onClick={() => handleOpenStatement(cust)}
                                  title="View Statement of Account"
                                />
                              )}

                              <Button
                                variant="outline"
                                icon={<Edit2 size={13} />}
                                style={{ padding: '0.3rem 0.45rem' }}
                                onClick={() => handleOpenEditCustomer(cust)}
                                title="Edit Customer Profile"
                              />

                              {!cust.is_walkin && (
                                <Button
                                  variant="outline"
                                  icon={<Power size={13} />}
                                  title={cust.is_active ? 'Deactivate customer' : 'Reactivate customer'}
                                  style={{
                                    padding: '0.3rem 0.45rem',
                                    color: cust.is_active ? 'var(--warning)' : 'var(--success)',
                                    borderColor: cust.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                                  }}
                                  onClick={() => handleToggleStatus(cust)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: CUSTOMER PAYMENTS HISTORY */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Standard Compact Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.65rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-subtle)',
                }}
              />
              <input
                type="text"
                placeholder="Search voucher # or customer name..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.3rem 0.6rem 0.3rem 1.85rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.3rem 0.6rem',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                outline: 'none',
                minWidth: '120px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <Button
              variant="primary"
              icon={<Search size={12} />}
              onClick={fetchPayments}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Filter
            </Button>

            {(paymentSearch || paymentStatusFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentSearch('');
                  setPaymentStatusFilter('');
                }}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.71875rem' }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Payments Table */}
          <Card title={`Customer Payment Receipts (${payments.length})`} subtitle="Double-entry integrated Accounts Receivable settlement vouchers" icon={<Receipt size={18} />}>
            {paymentsLoading ? (
              <LoadingSpinner label="Loading payment history..." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Payment #</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Customer</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Method / Account</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Amount Paid (Rs.)</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Reference</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Created By</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No customer payment vouchers recorded yet. Click "Record Payment" to create one.
                        </td>
                      </tr>
                    ) : (
                      payments.map((pay) => (
                        <tr
                          key={pay.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{pay.payment_number}</code>
                            {pay.journal_entry_number && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                                GL: {pay.journal_entry_number}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                            {pay.date}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{pay.customer_name}</div>
                            <code style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{pay.customer_code}</code>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <Badge variant="phase">{pay.payment_method_display}</Badge>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                              [{pay.payment_account_code}] {pay.payment_account_name}
                            </div>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--success)', fontSize: '0.875rem' }}>
                            Rs. {formatMoney(pay.amount)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                            {pay.reference || '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            {pay.status === 'SUBMITTED' && <Badge variant="success">Submitted</Badge>}
                            {pay.status === 'DRAFT' && <Badge variant="warning">Draft</Badge>}
                            {pay.status === 'CANCELLED' && <Badge variant="danger">Cancelled</Badge>}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {pay.created_by_name}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            {pay.status === 'SUBMITTED' && (
                              <Button
                                variant="outline"
                                icon={<RotateCcw size={13} />}
                                onClick={() => handleOpenCancelPayment(pay)}
                                title="Cancel Payment & Reverse Accounts Receivable"
                                style={{ padding: '0.3rem 0.45rem' }}
                              />
                            )}
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

      {/* TAB 3: RECEIVABLES AGING REPORT */}
      {activeTab === 'receivables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {reportLoading ? (
            <LoadingSpinner label="Generating customer receivables report..." />
          ) : receivablesReport ? (
            <>
              {/* Standardized KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Outstanding Receivables</span>
                    <DollarSign size={15} style={{ color: 'var(--danger)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(receivablesReport.summary.total_outstanding_receivables)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Active customer credit debt
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Credit Invoiced</span>
                    <CreditCard size={15} style={{ color: 'var(--primary-400)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(receivablesReport.summary.total_credit_sales)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Net Invoiced: Rs. {formatMoney(receivablesReport.summary.net_credit_invoiced ?? (receivablesReport.summary.total_credit_sales - (receivablesReport.summary.total_sales_returns || 0)))}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Returns Deductions</span>
                    <TrendingDown size={15} style={{ color: 'var(--info)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(receivablesReport.summary.total_sales_returns || 0)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Sales return credits & allowances
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Payments Collected</span>
                    <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(receivablesReport.summary.total_payments_collected)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Cleared via cash/bank receipts
                  </div>
                </div>
              </div>

              {/* Receivables Breakdown Table */}
              <Card title="Customer Credit Breakdown" subtitle="Detailed receivable balances and collection status per registered customer" icon={<BarChart3 size={18} />}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Customer ID</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Customer Name</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Phone</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Total Invoiced (Rs.)</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Total Paid (Rs.)</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Net Outstanding (Rs.)</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivablesReport.rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No registered customer records found.
                          </td>
                        </tr>
                      ) : (
                        receivablesReport.rows.map((row) => (
                          <tr
                            key={row.customer_id}
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td style={{ padding: '0.625rem 0.75rem' }}>
                              <code style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.customer_code}</code>
                            </td>

                            <td style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {row.name}
                            </td>

                            <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                              {row.phone}
                            </td>

                            <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                              Rs. {formatMoney(row.total_credit_sales)}
                            </td>

                            <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                              Rs. {formatMoney(row.total_payments)}
                            </td>

                            <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: row.outstanding_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                              Rs. {formatMoney(row.outstanding_balance)}
                            </td>

                            <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                              {row.outstanding_balance > 0 ? (
                                <Badge variant="danger">Outstanding</Badge>
                              ) : (
                                <Badge variant="success">Paid</Badge>
                              )}
                            </td>

                            <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                              <Button
                                variant="outline"
                                icon={<FileText size={13} />}
                                onClick={() => {
                                  const c = customers.find((cust) => cust.id === row.customer_id);
                                  if (c) handleOpenStatement(c);
                                }}
                                title="View Statement of Account"
                                style={{ padding: '0.3rem 0.45rem' }}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* RECORD CUSTOMER PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Customer Payment Receipt"
        maxWidth="540px"
      >
        <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {paymentError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{paymentError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Select Customer *
            </label>
            <select
              value={selectedCustomerForPayment?.id || 0}
              onChange={(e) => {
                const target = customers.find((c) => c.id === parseInt(e.target.value));
                setSelectedCustomerForPayment(target || null);
                if (target && target.outstanding_balance) {
                  setPaymentAmount(target.outstanding_balance.toString());
                }
              }}
              required
              style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            >
              <option value={0} disabled>Select a customer...</option>
              {customers
                .filter((c) => !c.is_walkin)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.customer_id}] {c.name} — Outstanding: Rs. {formatMoney(c.outstanding_balance || 0)}
                  </option>
                ))}
            </select>
          </div>

          {selectedCustomerForPayment && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Outstanding Balance:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: (selectedCustomerForPayment.outstanding_balance || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  Rs. {formatMoney(selectedCustomerForPayment.outstanding_balance || 0)}
                </div>
              </div>

              {(selectedCustomerForPayment.outstanding_balance || 0) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  icon={<CheckCircle size={13} />}
                  onClick={() => setPaymentAmount(selectedCustomerForPayment.outstanding_balance!.toString())}
                >
                  Pay Full Balance
                </Button>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Payment Amount (Rs.) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
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
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodKind)}
                required
                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CARD">Credit / Debit Card</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Deposit Into (Account) *
              </label>
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(parseInt(e.target.value))}
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

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Reference / Cheque # / Slip # (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. CHEQUE-10291 or Bank Ref"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Additional payment details..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} disabled={paymentSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={paymentSubmitting}
              icon={<CheckCircle size={15} />}
              style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
            >
              Post Payment Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* CUSTOMER STATEMENT MODAL */}
      {statementCustomer && (
        <Modal
          isOpen={!!statementCustomer}
          onClose={() => setStatementCustomer(null)}
          title={`Statement of Account — ${statementCustomer.name} (${statementCustomer.customer_id})`}
          maxWidth="780px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header / Date Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <div><strong>Phone:</strong> {statementCustomer.phone || '-'} | <strong>Address:</strong> {statementCustomer.address || '-'}</div>
                <div style={{ marginTop: '0.2rem' }}>
                  <strong>Credit Status:</strong> {statementCustomer.credit_enabled ? 'Authorized' : 'Cash Only'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.35rem 0.5rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.35rem 0.5rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                />
                <Button variant="primary" icon={<Search size={12} />} onClick={handleFilterStatement} style={{ padding: '0.35rem 0.625rem', fontSize: '0.75rem' }}>
                  Filter
                </Button>
              </div>
            </div>

            {/* Summary Bar */}
            {statementData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.625rem' }}>
                <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Invoiced</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                    Rs. {formatMoney(statementData.summary.total_debit)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Credit purchases billed</div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Payments Paid</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '0.15rem' }}>
                    Rs. {formatMoney(statementData.summary.total_payments ?? statementData.summary.total_credit)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Customer cash receipts</div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Sales Returns</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--info)', marginTop: '0.15rem' }}>
                    Rs. {formatMoney(statementData.summary.total_returns ?? 0)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Goods returned credits</div>
                </div>

                <div
                  className="glass-card"
                  style={{
                    padding: '0.625rem 0.75rem',
                    border: statementData.summary.closing_balance > 0 ? '1px solid var(--danger)' : statementData.summary.closing_balance < 0 ? '1px solid var(--info)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', color: statementData.summary.closing_balance > 0 ? 'var(--danger)' : statementData.summary.closing_balance < 0 ? 'var(--info)' : 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {statementData.summary.closing_balance > 0 ? 'Due Balance' : statementData.summary.closing_balance < 0 ? 'Store Credit' : 'Balance'}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: statementData.summary.closing_balance > 0 ? 'var(--danger)' : statementData.summary.closing_balance < 0 ? 'var(--info)' : 'var(--success)', marginTop: '0.15rem' }}>
                    {statementData.summary.closing_balance < 0
                      ? `- Rs. ${formatMoney(Math.abs(statementData.summary.closing_balance))}`
                      : `Rs. ${formatMoney(statementData.summary.closing_balance)}`}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {statementData.summary.closing_balance > 0 ? 'Customer owes' : statementData.summary.closing_balance < 0 ? 'Overpaid / Advance credit' : 'Account fully settled'}
                  </div>
                </div>
              </div>
            )}

            {/* Itemized Table */}
            {statementLoading ? (
              <LoadingSpinner label="Generating customer statement..." />
            ) : statementData ? (
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)' }}>
                      <th style={{ padding: '0.5rem 0.625rem', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '0.5rem 0.625rem', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '0.5rem 0.625rem', fontWeight: 600 }}>Reference</th>
                      <th style={{ padding: '0.5rem 0.625rem', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '0.5rem 0.625rem', fontWeight: 600, textAlign: 'right' }}>Debit (+)</th>
                      <th style={{ padding: '0.5rem 0.625rem', fontWeight: 600, textAlign: 'right' }}>Credit (-)</th>
                      <th style={{ padding: '0.5rem 0.625rem', fontWeight: 600, textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No credit transactions found for this customer.
                        </td>
                      </tr>
                    ) : (
                      statementData.rows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.5rem 0.625rem', color: 'var(--text-muted)' }}>{row.date}</td>
                          <td style={{ padding: '0.5rem 0.625rem' }}>
                            {row.type === 'SALE' && <Badge variant="phase">Credit Sale</Badge>}
                            {row.type === 'PAYMENT' && <Badge variant="success">Payment</Badge>}
                            {row.type === 'RETURN' && <Badge variant="warning">Return</Badge>}
                          </td>
                          <td style={{ padding: '0.5rem 0.625rem' }}>
                            <code style={{ fontWeight: 700, color: 'var(--primary-400)' }}>{row.reference}</code>
                          </td>
                          <td style={{ padding: '0.5rem 0.625rem', color: 'var(--text-muted)' }}>{row.description}</td>
                          <td style={{ padding: '0.5rem 0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.debit > 0 ? 'var(--text-main)' : 'var(--text-subtle)' }}>
                            {row.debit > 0 ? `Rs. ${formatMoney(row.debit)}` : '-'}
                          </td>
                          <td style={{ padding: '0.5rem 0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.credit > 0 ? (row.type === 'RETURN' ? 'var(--info)' : 'var(--success)') : 'var(--text-subtle)' }}>
                            {row.credit > 0 ? (
                              row.type === 'RETURN' ? (
                                <span title="Cash refund paid to customer at counter">
                                  Rs. {formatMoney(row.credit)} <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>(Refund)</span>
                                </span>
                              ) : (
                                `Rs. ${formatMoney(row.credit)}`
                              )
                            ) : '-'}
                          </td>
                          <td style={{ padding: '0.5rem 0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: row.running_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            Rs. {formatMoney(row.running_balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <Button variant="outline" onClick={() => window.print()} icon={<Printer size={14} />}>
                Print Statement
              </Button>
              <Button variant="primary" onClick={() => setStatementCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCEL PAYMENT MODAL */}
      {cancelPaymentTarget && (
        <Modal
          isOpen={!!cancelPaymentTarget}
          onClose={() => setCancelPaymentTarget(null)}
          title={`Cancel Payment Receipt (${cancelPaymentTarget.payment_number})`}
          maxWidth="460px"
        >
          <form onSubmit={handleConfirmCancelPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cancelError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{cancelError}</span>
              </div>
            )}

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Are you sure you want to cancel payment receipt <strong>{cancelPaymentTarget.payment_number}</strong> of <strong>Rs. {formatMoney(cancelPaymentTarget.amount)}</strong> for <strong>{cancelPaymentTarget.customer_name}</strong>?
              <div style={{ marginTop: '0.5rem', color: 'var(--warning)', fontWeight: 600 }}>
                This will automatically restore the customer's outstanding receivable balance and post a counter-reversal journal entry in the General Ledger.
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
                placeholder="e.g. Cheque bounced, entered incorrect customer..."
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => setCancelPaymentTarget(null)} disabled={cancelSubmitting}>
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

      {/* Customer Register / Edit Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customerToEdit={editingCustomer}
        onSaved={fetchCustomers}
      />

      {/* Customer Bulk Import Modal */}
      <CustomerBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={() => {
          fetchCustomers();
        }}
      />
    </div>
  );
};
