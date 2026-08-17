import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  Building,
  AlertCircle,
  Send,
  FileText,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
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

interface SupplierPayablesTabProps {
  onRefreshAll?: () => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type ViewMode = 'accounts' | 'vouchers' | 'reports';

export const SupplierPayablesTab: React.FC<SupplierPayablesTabProps> = ({ onRefreshAll }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('accounts');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [statements, setStatements] = useState<Record<number, SupplierStatement>>({});
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Vouchers list state
  const [vouchers, setVouchers] = useState<SupplierPayment[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherFilterStatus, setVoucherFilterStatus] = useState<string>('ALL');

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
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Cancel Payment Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingPayment, setCancellingPayment] = useState<SupplierPayment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Fetch initial directory data
  const fetchPayablesData = useCallback(async () => {
    setLoading(true);
    try {
      const [suppList, accs] = await Promise.all([
        contactService.getSuppliers({ is_active: true }),
        accountingService.getAccounts(),
      ]);

      setSuppliers(suppList || []);
      const validAccs = (accs || []).filter((a) => ['1010', '1020', '1030'].includes(a.code) || a.account_type === 'ASSET');
      setPaymentAccounts(validAccs);
      if (validAccs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(validAccs[0].id.toString());
      }

      // Fetch running statements for all suppliers
      const stmts: Record<number, SupplierStatement> = {};
      await Promise.all(
        (suppList || []).map(async (s) => {
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
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  // Fetch vouchers history
  const fetchVouchers = useCallback(async () => {
    setVouchersLoading(true);
    try {
      const params: any = {};
      if (voucherFilterStatus !== 'ALL') {
        params.status = voucherFilterStatus;
      }
      const data = await purchaseService.getSupplierPayments(params);
      setVouchers(data || []);
    } catch {
      // ignore
    } finally {
      setVouchersLoading(false);
    }
  }, [voucherFilterStatus]);

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
      // ignore
    } finally {
      setReportLoading(false);
    }
  }, [reportStartDate, reportEndDate, reportSupplierId]);

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
    setReference('');
    setNotes('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setSubmitNow(true);
    setPaymentError(null);

    // Auto-select cash account 1010
    const cashAcc = paymentAccounts.find((a) => a.code === '1010') || paymentAccounts[0];
    if (cashAcc) {
      setSelectedAccountId(cashAcc.id.toString());
    }

    setIsPaymentModalOpen(true);
  };

  // Change payment method handler
  const handleMethodChange = (method: SupplierPaymentMethodType) => {
    setPayMethod(method);
    if (method === 'CASH') {
      const cashAcc = paymentAccounts.find((a) => a.code === '1010');
      if (cashAcc) setSelectedAccountId(cashAcc.id.toString());
    } else if (method === 'BANK' || method === 'CHEQUE') {
      const bankAcc = paymentAccounts.find((a) => a.code === '1020');
      if (bankAcc) setSelectedAccountId(bankAcc.id.toString());
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

    setSavingPayment(true);
    setPaymentError(null);

    try {
      const payload: SupplierPaymentCreatePayload = {
        supplier: selectedSupplierForPay.id,
        amount: payAmount,
        payment_method: payMethod,
        payment_account: parseInt(selectedAccountId),
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
      fetchVouchers();
      fetchPayablesData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit payment voucher.');
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

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.company_name && s.company_name.toLowerCase().includes(q)) ||
      s.supplier_id.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Accounts Payable</span>
            <DollarSign size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalOutstanding)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Net owed across all vendors</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Lifetime Purchases</span>
            <Building size={18} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalPurchasedAll)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total inventory billed</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Disbursed Paid</span>
            <ArrowUpRight size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalPaidAll)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Cash & bank settlements</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Returns Deductions</span>
            <TrendingDown size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalReturnsAll)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Vendor debit notes</div>
        </div>
      </div>

      {/* Sub-View Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setViewMode('accounts')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: viewMode === 'accounts' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'accounts' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <Building size={14} />
            <span>Supplier Accounts ({suppliers.length})</span>
          </button>

          <button
            onClick={() => setViewMode('vouchers')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: viewMode === 'vouchers' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'vouchers' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <CreditCard size={14} />
            <span>Payment Vouchers</span>
          </button>

          <button
            onClick={() => setViewMode('reports')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: viewMode === 'reports' ? 'var(--primary-500)' : 'transparent',
              color: viewMode === 'reports' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={14} />
            <span>Payables Audit Report</span>
          </button>
        </div>

        {viewMode === 'accounts' && (
          <div style={{ width: '320px' }}>
            <Input
              placeholder="Search by vendor name, code, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={14} />}
            />
          </div>
        )}
      </div>

      {/* VIEW 1: SUPPLIER ACCOUNTS DIRECTORY */}
      {viewMode === 'accounts' && (
        <Card
          title="Supplier Accounts & Outstanding Payables"
          subtitle="Real-time statement of account derived dynamically from purchases, returns, and payment vouchers"
          icon={<CreditCard size={20} />}
        >
          {loading ? (
            <LoadingSpinner label="Calculating supplier ledger balances..." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Contact & Phone</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Total Purchased</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Total Paid</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Returns Credit</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Net Payable</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No supplier records found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => {
                      const stmt = statements[s.id];
                      const totalPurchased = stmt?.summary?.total_purchases ?? (stmt as any)?.total_purchased ?? 0;
                      const totalPaid = stmt?.summary?.total_payments ?? (stmt as any)?.total_paid ?? 0;
                      const upfrontPaid = stmt?.summary?.upfront_paid ?? 0;
                      const voucherPaid = stmt?.summary?.voucher_payments ?? 0;
                      const totalReturns = stmt?.summary?.total_returns ?? (stmt as any)?.total_returns ?? 0;
                      const netPayable = stmt?.summary?.closing_payable ?? (stmt as any)?.net_payable ?? (s.outstanding_payable ?? 0);

                      return (
                        <tr
                          key={s.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {s.company_name || s.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
                              <code style={{ fontSize: '0.75rem', color: 'var(--primary-400)' }}>{s.supplier_id}</code>
                              {s.tax_id && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>• NTN: {s.tax_id}</span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                            <div>{s.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{s.phone || 'No phone'}</div>
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            Rs. {formatMoney(totalPurchased)}
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            <div style={{ color: 'var(--success)', fontWeight: 600 }}>
                              Rs. {formatMoney(totalPaid)}
                            </div>
                            {(upfrontPaid > 0 || voucherPaid > 0) && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                                {upfrontPaid > 0 ? `Upfront: Rs. ${formatMoney(upfrontPaid)}` : ''}
                                {voucherPaid > 0 ? `${upfrontPaid > 0 ? ' | ' : ''}Vouchers: Rs. ${formatMoney(voucherPaid)}` : ''}
                                {totalPaid > totalPurchased ? ` (Rs. ${formatMoney(totalPaid - totalPurchased)} advance)` : ''}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            Rs. {formatMoney(totalReturns)}
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {netPayable > 0 ? (
                              <span style={{ color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                                Rs. {formatMoney(netPayable)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--success)' }}>Rs. 0.00</span>
                            )}
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                              <Button
                                variant="primary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                icon={<Send size={13} />}
                                onClick={() => handleOpenPaymentModal(s)}
                                disabled={netPayable <= 0}
                                title={netPayable <= 0 ? 'No outstanding payable balance to settle' : 'Disburse Payment Voucher'}
                              >
                                Pay
                              </Button>

                              <Button
                                variant="outline"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                icon={<FileText size={13} />}
                                onClick={() => handleOpenStatementModal(s)}
                                title="View Statement of Account"
                              >
                                Statement
                              </Button>
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
        </Card>
      )}

      {/* VIEW 2: PAYMENT VOUCHERS HISTORY */}
      {viewMode === 'vouchers' && (
        <Card
          title="Supplier Payment Vouchers & Settlement Audit"
          subtitle="Chronological log of all cash and bank disbursements reducing Accounts Payable"
          icon={<CreditCard size={20} />}
          action={
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={voucherFilterStatus}
                onChange={(e) => setVoucherFilterStatus(e.target.value)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="DRAFT">Draft</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <Button variant="outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} icon={<RefreshCw size={13} />} onClick={fetchVouchers}>
                Refresh
              </Button>
            </div>
          }
        >
          {vouchersLoading ? (
            <LoadingSpinner label="Loading payment vouchers..." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Payment #</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Payment Method</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Account / Ref</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
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
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{v.payment_number}</code>
                            {v.journal_entry_number && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                                GL: {v.journal_entry_number}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            {v.date}
                          </td>

                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {v.supplier_company || v.supplier_name}
                            </div>
                          </td>

                          <td style={{ padding: '0.875rem 1rem' }}>
                            <Badge variant="phase">
                              {v.payment_method_display || v.payment_method}
                            </Badge>
                          </td>

                          <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem' }}>
                            <div style={{ color: 'var(--text-main)' }}>{v.payment_account_name || 'Cash/Bank'}</div>
                            {v.reference && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Ref: {v.reference}</div>
                            )}
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: v.status === 'CANCELLED' ? 'var(--text-muted)' : 'var(--success)' }}>
                            Rs. {formatMoney(v.amount)}
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                            {v.status === 'SUBMITTED' && <Badge variant="success">Submitted</Badge>}
                            {v.status === 'DRAFT' && <Badge variant="warning">Draft</Badge>}
                            {v.status === 'CANCELLED' && <Badge variant="danger">Cancelled</Badge>}
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                              {v.status === 'DRAFT' && (
                                <Button
                                  variant="primary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                  icon={<CheckCircle2 size={13} />}
                                  onClick={() => handleSubmitDraftPayment(v)}
                                >
                                  Submit
                                </Button>
                              )}

                              {v.status === 'SUBMITTED' && (
                                <Button
                                  variant="outline"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                  icon={<RotateCcw size={13} />}
                                  onClick={() => handleOpenCancelModal(v)}
                                  title="Cancel payment and post reversal GL entry"
                                >
                                  Cancel
                                </Button>
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
        </Card>
      )}

      {/* VIEW 3: CONSOLIDATED PAYABLES REPORT */}
      {viewMode === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Consolidated Supplier Payables & Settlement Report"
            subtitle="Multi-dimensional auditing matrix across all vendor accounts"
            icon={<FileText size={20} />}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendors Audited</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{reportData.summary.total_suppliers}</div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period Purchases</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(reportData.summary.total_purchases)}</div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period Payments</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(reportData.summary.total_payments)}</div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period Returns</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--info)', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(reportData.summary.total_returns)}</div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>Closing Payables</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(reportData.summary.total_outstanding_payables)}</div>
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
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase' }}>Vendor</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {selectedSupplierForPay.company_name || selectedSupplierForPay.name}
                  </div>
                  <code style={{ fontSize: '0.75rem', color: 'var(--primary-400)' }}>{selectedSupplierForPay.supplier_id}</code>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Outstanding</div>
                  <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
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
                    {m === 'CASH' ? 'Cash in Hand' : m === 'BANK' ? 'Bank Transfer' : 'Cheque'}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Account */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Disburse From GL Account *
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
                {paymentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name} (Balance: Rs. {formatMoney(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>

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
                  Cheque / Reference #
                </label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. CHQ-9901, FT-302"
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

              <Button variant="outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', marginLeft: 'auto' }} icon={<Printer size={13} />} onClick={() => window.print()}>
                Print Statement
              </Button>
            </div>

            {statementLoading ? (
              <LoadingSpinner label="Loading chronological ledger statement..." />
            ) : activeStatement ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Statement Header Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {activeStatement.company_name || activeStatement.supplier_name}
                    </h3>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      Vendor Code: <code style={{ color: 'var(--primary-400)' }}>{selectedSupplierForStatement.supplier_id}</code>
                    </div>
                    {selectedSupplierForStatement.phone && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Phone: {selectedSupplierForStatement.phone}</div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Closing Outstanding Payable</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: activeStatement.summary.closing_payable > 0 ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--font-mono)' }}>
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
