import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  Building,
  AlertCircle,
  Send,
  FileText,
  Printer,
  Filter,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  RotateCcw,
  User,
  Phone,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { Supplier } from '../../types/contact';
import { Account } from '../../types/accounting';
import {
  SupplierPayment,
  SupplierPaymentCreatePayload,
  SupplierStatement,
  SupplierPayablesReport,
  SupplierPaymentMethodType,
} from '../../types/purchase';
import { contactService } from '../../services/contactService';
import { accountingService } from '../../services/accountingService';
import { purchaseService } from '../../services/purchaseService';
import { daySessionService } from '../../services/daySessionService';
import { SupplierStatementSlipModal } from './SupplierStatementSlipModal';
import { useToast } from '../../context/ToastContext';

interface SupplierPayablesTabProps {
  onRefreshAll?: () => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type ViewMode = 'accounts' | 'vouchers' | 'reports';

export const SupplierPayablesTab: React.FC<SupplierPayablesTabProps> = ({ onRefreshAll }) => {
  const { showError, showSuccess } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('accounts');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierTotalCount, setSupplierTotalCount] = useState<number>(0);
  const [statements, setStatements] = useState<Record<number, SupplierStatement>>({});
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierPage, setSupplierPage] = useState<number>(1);
  const [supplierPageSize, setSupplierPageSize] = useState<number>(50);

  // Vouchers list state
  const [vouchers, setVouchers] = useState<SupplierPayment[]>([]);
  const [voucherTotalCount, setVoucherTotalCount] = useState<number>(0);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherFilterStatus, setVoucherFilterStatus] = useState<string>('ALL');
  const [voucherPage, setVoucherPage] = useState<number>(1);
  const [voucherPageSize, setVoucherPageSize] = useState<number>(50);

  useEffect(() => {
    setSupplierPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setVoucherPage(1);
  }, [voucherFilterStatus]);

  // Master Payables Report state
  const [reportData, setReportData] = useState<SupplierPayablesReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportSupplierId, setReportSupplierId] = useState<string>('ALL');

  // Disburse Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<SupplierPaymentMethodType>('CASH');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [chequeBank, setChequeBank] = useState<string>('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [submitNow, setSubmitNow] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // View Statement Modal
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [activeStatement, setActiveStatement] = useState<SupplierStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementStartDate, setStatementStartDate] = useState('');
  const [statementEndDate, setStatementEndDate] = useState('');
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<Supplier | null>(null);
  const [isStatementSlipModalOpen, setIsStatementSlipModalOpen] = useState(false);

  // Cancel Payment Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingPayment, setCancellingPayment] = useState<SupplierPayment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Filter accounts based on Cash vs Card/Bank vs Cheque
  const getFilteredPaymentAccounts = (method: SupplierPaymentMethodType) => {
    if (method === 'CASH') {
      return paymentAccounts.filter(
        (a) =>
          (a.code.startsWith('101') || a.parent_code === '1010' || (a.name.toLowerCase().includes('cash') && !a.code.startsWith('102'))) &&
          !a.name.toLowerCase().includes('jazz') &&
          !a.name.toLowerCase().includes('easy') &&
          !a.code.startsWith('102')
      );
    }
    return paymentAccounts.filter(
      (a) =>
        a.code.startsWith('102') ||
        a.parent_code === '1020' ||
        a.name.toLowerCase().includes('bank') ||
        a.name.toLowerCase().includes('card') ||
        a.name.toLowerCase().includes('jazz') ||
        a.name.toLowerCase().includes('easy')
    );
  };

  // Fetch initial directory data
  const fetchPayablesData = useCallback(async () => {
    setLoading(true);
    try {
      const [suppData, accs] = await Promise.all([
        contactService.getSuppliers({
          page: supplierPage,
          page_size: supplierPageSize,
          search: searchQuery || undefined,
        }),
        accountingService.getAccounts(),
      ]);

      const suppList = suppData.results || suppData || [];
      setSuppliers(suppList);
      setSupplierTotalCount(suppData.count ?? (suppData.results ? suppData.results.length : 0));

      const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
      const validAccs = (accs || []).filter(
        (a) => a.account_type === 'ASSET' && isLeaf(a) && (a.code.startsWith('101') || a.code.startsWith('102') || a.parent_code === '1010' || a.parent_code === '1020')
      );
      setPaymentAccounts(validAccs);
      if (validAccs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(validAccs[0].id.toString());
      }

      // Fetch running statements for page suppliers
      const stmts: Record<number, SupplierStatement> = {};
      await Promise.all(
        suppList.map(async (s) => {
          try {
            const st = await purchaseService.getSupplierStatement(s.id);
            stmts[s.id] = st;
          } catch {
            // ignore
          }
        })
      );
      setStatements(stmts);
    } catch {
      showError('Failed to load supplier payables accounts.', 'Data Error');
    } finally {
      setLoading(false);
    }
  }, [supplierPage, supplierPageSize, searchQuery, showError, selectedAccountId]);

  // Fetch vouchers history
  const fetchVouchers = useCallback(async () => {
    setVouchersLoading(true);
    try {
      const data = await purchaseService.getSupplierPayments({
        page: voucherPage,
        page_size: voucherPageSize,
        status: voucherFilterStatus !== 'ALL' ? voucherFilterStatus : undefined,
      });
      setVouchers(data.results || []);
      setVoucherTotalCount(data.count ?? (data.results ? data.results.length : 0));
    } catch {
      showError('Failed to load supplier payment vouchers.', 'Vouchers Error');
    } finally {
      setVouchersLoading(false);
    }
  }, [voucherPage, voucherPageSize, voucherFilterStatus, showError]);

  // Fetch master report
  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const params: any = {};
      if (reportStartDate) params.start_date = reportStartDate;
      if (reportEndDate) params.end_date = reportEndDate;
      if (reportSupplierId !== 'ALL') params.supplier = reportSupplierId;
      const data = await purchaseService.getSupplierPayablesReport(params);
      setReportData(data);
    } catch {
      showError('Failed to generate supplier payables audit report.', 'Report Error');
    } finally {
      setReportLoading(false);
    }
  }, [reportStartDate, reportEndDate, reportSupplierId, showError]);

  useEffect(() => {
    fetchPayablesData();
  }, [fetchPayablesData]);

  useEffect(() => {
    if (viewMode === 'vouchers') {
      fetchVouchers();
    } else if (viewMode === 'reports') {
      fetchReport();
    }
  }, [viewMode, fetchVouchers, fetchReport]);

  // Open Disburse Payment Modal
  const handleOpenPaymentModal = (supp: Supplier) => {
    setSelectedSupplierForPay(supp);
    const stmt = statements[supp.id];
    const maxPayable = stmt?.summary?.closing_payable ?? (supp.outstanding_payable ?? 0);
    setPayAmount(maxPayable);
    setPayMethod('CASH');
    setChequeNumber('');
    setChequeDate(new Date().toLocaleDateString('en-CA'));
    setChequeBank('');
    setReference('');
    setNotes('');
    setPaymentDate(new Date().toLocaleDateString('en-CA'));
    setSubmitNow(true);
    setPaymentError(null);

    const cashAccs = getFilteredPaymentAccounts('CASH');
    if (cashAccs.length > 0) {
      setSelectedAccountId(cashAccs[0].id.toString());
    }

    setIsPaymentModalOpen(true);

    daySessionService.getCurrentSession().then((res) => {
      if (res?.active && res?.session?.date) {
        setPaymentDate(res.session.date);
        setChequeDate(res.session.date);
      }
    }).catch(() => {});
  };

  // Change payment method handler
  const handleMethodChange = (method: SupplierPaymentMethodType) => {
    setPayMethod(method);
    const validAccs = getFilteredPaymentAccounts(method);
    if (validAccs.length > 0) {
      setSelectedAccountId(validAccs[0].id.toString());
    }
  };

  // Record Payment Submit
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPay) return;
    if (payAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    const stmt = statements[selectedSupplierForPay.id];
    const maxPayable = stmt?.summary?.closing_payable ?? (selectedSupplierForPay.outstanding_payable ?? 0);
    if (payAmount > maxPayable) {
      setPaymentError(`Maximum payable amount is Rs. ${formatMoney(maxPayable)}. Overpayment is not permitted.`);
      return;
    }

    if (payMethod === 'CHEQUE' && !chequeNumber.trim()) {
      setPaymentError('Cheque Number is required.');
      return;
    }

    setSavingPayment(true);
    setPaymentError(null);

    try {
      const payload: SupplierPaymentCreatePayload = {
        supplier: selectedSupplierForPay.id,
        amount: payAmount,
        payment_method: payMethod,
        payment_account: parseInt(selectedAccountId),
        cheque_number: payMethod === 'CHEQUE' ? chequeNumber.trim() : undefined,
        cheque_date: payMethod === 'CHEQUE' ? chequeDate : undefined,
        cheque_bank: payMethod === 'CHEQUE' ? chequeBank.trim() : undefined,
        date: paymentDate,
        reference: reference.trim(),
        notes: notes.trim(),
        submit_now: submitNow,
      };

      await purchaseService.createSupplierPayment(payload);
      setIsPaymentModalOpen(false);
      await fetchPayablesData();
      if (viewMode === 'vouchers') fetchVouchers();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setPaymentError(err?.message || 'Failed to record supplier payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  // Open Statement Modal
  const handleOpenStatementModal = async (supp: Supplier) => {
    setSelectedSupplierForStatement(supp);
    setStatementStartDate('');
    setStatementEndDate('');
    setStatementLoading(true);
    setIsStatementModalOpen(true);

    try {
      const stmt = await purchaseService.getSupplierStatement(supp.id);
      setActiveStatement(stmt);
    } catch {
      // ignore
    } finally {
      setStatementLoading(false);
    }
  };

  // Filter Statement within date range
  const handleFilterStatement = async () => {
    if (!selectedSupplierForStatement) return;
    setStatementLoading(true);
    try {
      const params: any = {};
      if (statementStartDate) params.start_date = statementStartDate;
      if (statementEndDate) params.end_date = statementEndDate;
      const stmt = await purchaseService.getSupplierStatement(selectedSupplierForStatement.id, params);
      setActiveStatement(stmt);
    } catch {
      // ignore
    } finally {
      setStatementLoading(false);
    }
  };

  // Submit Draft Payment
  const handleSubmitDraftPayment = async (payment: SupplierPayment) => {
    try {
      await purchaseService.submitSupplierPayment(payment.id);
      showSuccess(`Payment voucher ${payment.payment_number} submitted successfully!`, 'Voucher Submitted');
      fetchVouchers();
      fetchPayablesData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showError(err?.message || 'Failed to submit payment voucher.', 'Payment Error');
    }
  };

  // Cancel Payment
  const handleOpenCancelModal = (payment: SupplierPayment) => {
    setCancellingPayment(payment);
    setCancelReason('');
    setCancelError(null);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingPayment) return;
    if (!cancelReason.trim()) {
      setCancelError('A cancellation reason is required.');
      return;
    }

    setCancellingLoading(true);
    setCancelError(null);

    try {
      await purchaseService.cancelSupplierPayment(cancellingPayment.id, cancelReason.trim());
      setIsCancelModalOpen(false);
      fetchVouchers();
      fetchPayablesData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel supplier payment.');
    } finally {
      setCancellingLoading(false);
    }
  };

  // Summary Metrics calculations
  const totalOutstanding = Object.values(statements).reduce(
    (sum, s) => sum + (s.summary ? s.summary.closing_payable : (s as any).net_payable || 0),
    0
  );
  const totalPurchasedAll = Object.values(statements).reduce(
    (sum, s) => sum + (s.summary ? s.summary.total_purchases : (s as any).total_purchased || 0),
    0
  );
  const totalPaidAll = Object.values(statements).reduce(
    (sum, s) => sum + (s.summary ? s.summary.total_payments : (s as any).total_paid || 0),
    0
  );
  const totalReturnsAll = Object.values(statements).reduce(
    (sum, s) => sum + (s.summary ? s.summary.total_returns : (s as any).total_returns || 0),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Standardized Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Accounts Payable</span>
            <DollarSign size={14} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalOutstanding)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Net owed across vendors</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Lifetime Purchases</span>
            <Building size={14} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalPurchasedAll)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Total inventory billed</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Disbursed Paid</span>
            <ArrowUpRight size={14} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalPaidAll)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Cash & bank settlements</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Returns Deductions</span>
            <TrendingDown size={14} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalReturnsAll)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Vendor debit notes</div>
        </div>
      </div>

      {/* Sub-View Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.2rem', borderRadius: '0.375rem', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setViewMode('accounts')}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: viewMode === 'accounts' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'accounts' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <Building size={13} />
            <span>Supplier Accounts ({suppliers.length})</span>
          </button>

          <button
            onClick={() => setViewMode('vouchers')}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: viewMode === 'vouchers' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'vouchers' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <CreditCard size={13} />
            <span>Payment Vouchers</span>
          </button>

          <button
            onClick={() => setViewMode('reports')}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: viewMode === 'reports' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'reports' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={13} />
            <span>Payables Audit Report</span>
          </button>
        </div>

        {viewMode === 'accounts' && (
          <div style={{ width: '280px' }}>
            <input
              type="text"
              placeholder="Search vendor name, code, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.35rem 0.5rem',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* VIEW 1: SUPPLIER ACCOUNTS DIRECTORY */}
      {viewMode === 'accounts' && (
        <Card
          title={`Supplier Accounts & Payables (${supplierTotalCount})`}
          icon={<CreditCard size={18} />}
        >
          {loading ? (
            <LoadingSpinner label="Calculating supplier ledger balances..." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Contact & Phone</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Total Purchased</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Total Paid</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Returns Credit</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Net Payable</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No supplier records found matching your search.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((s) => {
                      const stmt = statements[s.id];
                      const totalPurchased = stmt?.summary?.total_purchases ?? ((s as any).total_purchased ?? 0);
                      const totalPaid = stmt?.summary?.total_payments ?? ((s as any).total_paid ?? 0);
                      const totalReturns = stmt?.summary?.total_returns ?? 0;
                      const netPayable = stmt?.summary?.closing_payable ?? (s.outstanding_payable ?? 0);

                      return (
                        <tr
                          key={s.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Building size={13} style={{ color: 'var(--primary-400)' }} />
                              <span>{s.company_name || s.name}</span>
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              Code: {s.supplier_id || (s as any).code}
                            </div>
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <User size={11} />
                              <span>{s.name}</span>
                            </div>
                            {s.phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                                <Phone size={11} />
                                <span>{s.phone}</span>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                            Rs. {formatMoney(totalPurchased)}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 600 }}>
                            Rs. {formatMoney(totalPaid)}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)', fontWeight: 600 }}>
                            Rs. {formatMoney(totalReturns)}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: netPayable > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            Rs. {formatMoney(netPayable)}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                              {netPayable > 0 && (
                                <Button
                                  variant="primary"
                                  icon={<Send size={11} />}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.71875rem' }}
                                  onClick={() => handleOpenPaymentModal(s)}
                                  title="Disburse Payment to Supplier"
                                >
                                  Pay
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                icon={<FileText size={12} />}
                                style={{ padding: '0.25rem 0.45rem' }}
                                onClick={() => handleOpenStatementModal(s)}
                                title="View Complete Statement of Account"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && supplierTotalCount > 0 && (
            <Pagination
              currentPage={supplierPage}
              totalItems={supplierTotalCount}
              pageSize={supplierPageSize}
              onPageChange={setSupplierPage}
              onPageSizeChange={setSupplierPageSize}
            />
          )}
        </Card>
      )}

      {/* VIEW 2: PAYMENT VOUCHERS HISTORY */}
      {viewMode === 'vouchers' && (
        <Card
          title={`Payment Vouchers Log (${voucherTotalCount})`}
          icon={<CreditCard size={18} />}
          action={
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={voucherFilterStatus}
                onChange={(e) => setVoucherFilterStatus(e.target.value)}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="DRAFT">Draft</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <Button variant="outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} icon={<RefreshCw size={12} />} onClick={fetchVouchers} title="Refresh Vouchers">
                Refresh
              </Button>
            </div>
          }
        >
          {vouchersLoading ? (
            <LoadingSpinner label="Loading payment vouchers..." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Payment #</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Payment Method</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Account / Ref</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No supplier payment vouchers recorded yet.
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => {
                      return (
                        <tr
                          key={v.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            <code style={{ fontWeight: 800, color: 'var(--primary-400)', fontSize: '0.75rem' }}>{v.payment_number}</code>
                            {v.journal_entry_number && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
                                GL: {v.journal_entry_number}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {v.date}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                              {v.supplier_company || v.supplier_name}
                            </div>
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            <Badge variant="phase">
                              {v.payment_method_display || v.payment_method}
                            </Badge>
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
                            <div style={{ color: 'var(--text-main)' }}>{v.payment_account_name || 'Cash/Bank'}</div>
                            {v.reference && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Ref: {v.reference}</div>
                            )}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: v.status === 'CANCELLED' ? 'var(--text-muted)' : 'var(--success)' }}>
                            Rs. {formatMoney(v.amount)}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                            {v.status === 'SUBMITTED' && <Badge variant="success">Submitted</Badge>}
                            {v.status === 'DRAFT' && <Badge variant="warning">Draft</Badge>}
                            {v.status === 'CANCELLED' && <Badge variant="danger">Cancelled</Badge>}
                          </td>

                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                              {v.status === 'DRAFT' && (
                                <Button
                                  variant="primary"
                                  style={{ padding: '0.25rem 0.45rem' }}
                                  icon={<CheckCircle2 size={12} />}
                                  title="Submit & Post Payment Voucher"
                                  onClick={() => handleSubmitDraftPayment(v)}
                                />
                              )}

                              {v.status === 'SUBMITTED' && (
                                <Button
                                  variant="outline"
                                  style={{ padding: '0.25rem 0.45rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                  icon={<XCircle size={12} />}
                                  onClick={() => handleOpenCancelModal(v)}
                                  title="Cancel payment and post reversal GL entry"
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!vouchersLoading && voucherTotalCount > 0 && (
            <Pagination
              currentPage={voucherPage}
              totalItems={voucherTotalCount}
              pageSize={voucherPageSize}
              onPageChange={setVoucherPage}
              onPageSizeChange={setVoucherPageSize}
            />
          )}
        </Card>
      )}

      {/* VIEW 3: CONSOLIDATED PAYABLES REPORT */}
      {viewMode === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Payables Audit Report"
            icon={<FileText size={18} />}
          >
            {/* Report Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>Date From</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>Date To</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>Supplier</label>
                <select
                  value={reportSupplierId}
                  onChange={(e) => setReportSupplierId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <option value="ALL">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.company_name || s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <Button variant="primary" icon={<Filter size={14} />} onClick={fetchReport} loading={reportLoading}>
                  Generate Report
                </Button>
                <Button variant="outline" icon={<RefreshCw size={14} />} onClick={() => { setReportStartDate(''); setReportEndDate(''); setReportSupplierId('ALL'); fetchReport(); }}>
                  Reset
                </Button>
              </div>
            </div>

            {reportLoading ? (
              <LoadingSpinner label="Generating payables report..." />
            ) : reportData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Summary Matrix Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.625rem' }}>
                  <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Vendors Audited</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.15rem' }}>{reportData.summary.total_suppliers}</div>
                  </div>

                  <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Period Purchases</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>Rs. {formatMoney(reportData.summary.total_purchases)}</div>
                  </div>

                  <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Period Payments</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>Rs. {formatMoney(reportData.summary.total_payments)}</div>
                  </div>

                  <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Period Returns</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--info)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>Rs. {formatMoney(reportData.summary.total_returns)}</div>
                  </div>

                  <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase' }}>Closing Payables</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>Rs. {formatMoney(reportData.summary.total_outstanding_payables)}</div>
                  </div>
                </div>

                {/* Detailed Supplier Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Supplier</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Opening Balance</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Purchases (+)</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Returns (-)</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Payments (-)</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Closing Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.supplier_summaries.map((row) => (
                        <tr key={row.supplier_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {row.company_name || row.supplier_name}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            Rs. {formatMoney(row.opening_balance)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            Rs. {formatMoney(row.total_purchases)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            Rs. {formatMoney(row.total_returns)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                            Rs. {formatMoney(row.total_payments)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: row.outstanding_payable > 0 ? 'var(--warning)' : 'var(--success)' }}>
                            Rs. {formatMoney(row.outstanding_payable)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {/* DISBURSE PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !savingPayment && setIsPaymentModalOpen(false)}
        title="Disburse Supplier Payment Voucher"
        maxWidth="540px"
      >
        {selectedSupplierForPay && (
          <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Vendor Balance Hero */}
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.625rem 0.875rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase' }}>Vendor</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedSupplierForPay.company_name || selectedSupplierForPay.name}
                  </div>
                  <code style={{ fontSize: '0.6875rem', color: 'var(--primary-400)' }}>{selectedSupplierForPay.supplier_id}</code>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Current Outstanding</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(statements[selectedSupplierForPay.id]?.summary?.closing_payable ?? (selectedSupplierForPay.outstanding_payable ?? 0))}
                  </div>
                </div>
              </div>
            </div>

            {paymentError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: '0.375rem', color: 'var(--danger)', fontSize: '0.8125rem' }}>
                <AlertCircle size={16} />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Disbursement Amount (Rs.) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const maxPayable = statements[selectedSupplierForPay.id]?.summary?.closing_payable ?? (selectedSupplierForPay.outstanding_payable ?? 0);
                    setPayAmount(maxPayable);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-400)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Pay Full Outstanding
                </button>
              </div>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={payAmount || ''}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter settlement amount"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Payment Method *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {(['CASH', 'BANK', 'CHEQUE'] as SupplierPaymentMethodType[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMethodChange(m)}
                    style={{
                      padding: '0.625rem',
                      borderRadius: '0.375rem',
                      border: payMethod === m ? '2px solid var(--primary-500)' : '1px solid var(--border-medium)',
                      backgroundColor: payMethod === m ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-input)',
                      color: payMethod === m ? 'var(--primary-400)' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    {m === 'CASH' ? 'Cash' : m === 'BANK' ? 'Bank / Card' : 'Cheque'}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Account */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                {payMethod === 'CASH' ? 'Disburse From Cash Drawer Account *' : 'Disburse From Bank Account *'}
              </label>
              <select
                required
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
              >
                {getFilteredPaymentAccounts(payMethod).map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name} (Balance: Rs. {formatMoney(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Cheque Inputs when Payment Method is Cheque */}
            {payMethod === 'CHEQUE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.06)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                  Cheque Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Cheque Number *
                    </label>
                    <Input
                      required
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="e.g. CHQ-9901"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Cheque Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--border-medium)',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-main)',
                        fontSize: '0.8125rem',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    Payee / Supplier Bank (Optional)
                  </label>
                  <Input
                    value={chequeBank}
                    onChange={(e) => setChequeBank(e.target.value)}
                    placeholder="e.g. Meezan Bank, HBL, Allied Bank..."
                  />
                </div>
              </div>
            )}

            {/* Date & Reference */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Reference / Slip #
                </label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. FT-302, Slip-101"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Payment Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional explanation / receipt notes..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                }}
              />
            </div>

            {/* Submit Now toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="submitNowCheckbox"
                checked={submitNow}
                onChange={(e) => setSubmitNow(e.target.checked)}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              <label htmlFor="submitNowCheckbox" style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                Post immediately to General Ledger (Submit & Clear Payable)
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="outline" type="button" onClick={() => setIsPaymentModalOpen(false)} disabled={savingPayment}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={savingPayment} icon={<Send size={15} />}>
                Confirm Disbursement
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* SUPPLIER STATEMENT MODAL */}
      <Modal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        title="Supplier Statement of Account"
        maxWidth="760px"
      >
        {selectedSupplierForStatement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Statement Filter Toolbar */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '0.375rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>From Date</label>
                <input
                  type="date"
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  style={{
                    padding: '0.375rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.25rem' }}>To Date</label>
                <input
                  type="date"
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  style={{
                    padding: '0.375rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                  }}
                />
              </div>

              <Button variant="primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} icon={<Filter size={13} />} onClick={handleFilterStatement} loading={statementLoading}>
                Filter
              </Button>

              <Button variant="outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', marginLeft: 'auto' }} icon={<Printer size={13} />} onClick={() => setIsStatementSlipModalOpen(true)}>
                Print Statement Slip (80mm/58mm)
              </Button>
            </div>

            {statementLoading ? (
              <LoadingSpinner label="Loading chronological ledger statement..." />
            ) : activeStatement ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Statement Header Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.625rem 0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {activeStatement.company_name || activeStatement.supplier_name}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      Vendor Code: <code style={{ color: 'var(--primary-400)' }}>{selectedSupplierForStatement.supplier_id}</code>
                    </div>
                    {selectedSupplierForStatement.phone && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Phone: {selectedSupplierForStatement.phone}</div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Closing Outstanding Payable</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: activeStatement.summary.closing_payable > 0 ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                      Rs. {formatMoney(activeStatement.summary.closing_payable)}
                    </div>
                  </div>
                </div>

                {/* Statement KPI Matrix */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ padding: '0.625rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.375rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>Opening Balance</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '0.125rem' }}>
                      Rs. {formatMoney(activeStatement.summary.opening_balance)}
                    </div>
                  </div>

                  <div style={{ padding: '0.625rem', backgroundColor: 'rgba(99, 102, 241, 0.06)', borderRadius: '0.375rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--primary-400)' }}>Purchases (+)</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '0.125rem' }}>
                      Rs. {formatMoney(activeStatement.summary.total_purchases)}
                    </div>
                  </div>

                  <div style={{ padding: '0.625rem', backgroundColor: 'rgba(6, 182, 212, 0.06)', borderRadius: '0.375rem', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--info)' }}>Returns (-)</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '0.125rem' }}>
                      Rs. {formatMoney(activeStatement.summary.total_returns)}
                    </div>
                  </div>

                  <div style={{ padding: '0.625rem', backgroundColor: 'rgba(16, 185, 129, 0.06)', borderRadius: '0.375rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Total Settled (-)</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '0.125rem' }}>
                      Rs. {formatMoney(activeStatement.summary.total_payments)}
                    </div>
                    {((activeStatement.summary.upfront_paid || 0) > 0) && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                        Upfront: Rs. {formatMoney(activeStatement.summary.upfront_paid)}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '0.625rem', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '0.375rem', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600 }}>Closing Payable</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--warning)', marginTop: '0.125rem' }}>
                      Rs. {formatMoney(activeStatement.summary.closing_payable)}
                    </div>
                  </div>
                </div>

                {/* Line by line chronological ledger table */}
                <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)' }}>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Reference</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Type & Description</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Debit (-)</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Credit (+)</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance Row */}
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-subtle)' }}>-</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-subtle)' }}>OPENING</td>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Opening Payable Balance</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>-</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>-</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          Rs. {formatMoney(activeStatement.summary.opening_balance)}
                        </td>
                      </tr>

                      {activeStatement.rows.map((r, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>{r.date}</td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <code style={{ color: 'var(--primary-400)', fontSize: '0.75rem' }}>{r.reference}</code>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div>{r.description}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{r.transaction_type}</div>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.debit > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {r.debit > 0 ? `Rs. ${formatMoney(r.debit)}` : '-'}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.credit > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {r.credit > 0 ? `Rs. ${formatMoney(r.credit)}` : '-'}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: r.running_balance > 0 ? 'var(--warning)' : 'var(--success)' }}>
                            Rs. {formatMoney(r.running_balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* SUPPLIER STATEMENT THERMAL SLIP PRINT MODAL */}
      <SupplierStatementSlipModal
        isOpen={isStatementSlipModalOpen}
        onClose={() => setIsStatementSlipModalOpen(false)}
        supplier={selectedSupplierForStatement}
        statement={activeStatement}
        startDate={statementStartDate}
        endDate={statementEndDate}
      />

      {/* CANCEL PAYMENT MODAL */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => !cancellingLoading && setIsCancelModalOpen(false)}
        title="Cancel Supplier Payment Voucher"
        maxWidth="480px"
      >
        {cancellingPayment && (
          <form onSubmit={handleConfirmCancel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: '0.375rem', color: 'var(--danger)', fontSize: '0.8125rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Cancellation Warning:</strong> This will post a General Ledger counter-reversal entry, restore the supplier payable, and reverse the cash/bank deduction.
              </div>
            </div>

            {cancelError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{cancelError}</div>
            )}

            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Payment Voucher:</div>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>{cancellingPayment.payment_number}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--warning)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                Amount: Rs. {formatMoney(cancellingPayment.amount)}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Cancellation Reason *
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for voiding payment voucher..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" type="button" onClick={() => setIsCancelModalOpen(false)} disabled={cancellingLoading}>
                Back
              </Button>
              <Button
                variant="outline"
                type="submit"
                loading={cancellingLoading}
                icon={<RotateCcw size={15} />}
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                Confirm Cancellation
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
