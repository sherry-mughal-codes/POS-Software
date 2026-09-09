import React, { useState, useEffect } from 'react';
import { AlertCircle, Wallet } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { CommissionRecord, PayCommissionPayload } from '../../types/commission';
import { commissionService } from '../../services/commissionService';
import { accountingService } from '../../services/accountingService';
import { Account } from '../../types/accounting';
import { useToast } from '../../context/ToastContext';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface CommissionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: CommissionRecord | null;
  onPaymentSuccess: (updatedRecord?: CommissionRecord) => void;
}

export const CommissionPaymentModal: React.FC<CommissionPaymentModalProps> = ({
  isOpen,
  onClose,
  payable,
  onPaymentSuccess,
}) => {
  const { showSuccess, showError } = useToast();

  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE'>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [chequeBank, setChequeBank] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const balanceDue = payable
    ? (payable.remaining_payable_amount !== undefined
        ? Number(payable.remaining_payable_amount)
        : payable.balance_due !== undefined
        ? Number(payable.balance_due)
        : Math.max(0, Number(payable.commission_amount || 0) - Number(payable.adjusted_amount || 0) - Number(payable.paid_amount || 0)))
    : 0;

  // Filter accounts based on payment method
  const getFilteredPaymentAccounts = (pm: 'CASH' | 'BANK' | 'CHEQUE') => {
    if (pm === 'CASH') {
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

  const handlePaymentMethodChange = (pm: 'CASH' | 'BANK' | 'CHEQUE') => {
    setPaymentMethod(pm);
    const validAccs = getFilteredPaymentAccounts(pm);
    if (validAccs.length > 0 && !validAccs.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(validAccs[0].id);
    }
  };

  useEffect(() => {
    if (isOpen && payable) {
      setAmountInput(balanceDue.toFixed(2));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      setChequeNumber('');
      setChequeDate(new Date().toISOString().split('T')[0]);
      setChequeBank('');
      setNotes('');
      setValidationError(null);

      // Load Chart of Accounts
      const fetchAccounts = async () => {
        try {
          setLoadingAccounts(true);
          const data = await accountingService.getAccounts({ is_active: true });
          const rawAccounts: Account[] = Array.isArray(data) ? data : (data as any)?.results || [];
          
          const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
          const payList = rawAccounts.filter(
            (a) => a.account_type === 'ASSET' && isLeaf(a) && (a.code.startsWith('101') || a.code.startsWith('102') || a.parent_code === '1010' || a.parent_code === '1020')
          );
          const validPayList = payList.length > 0 ? payList : rawAccounts.filter((a) => a.account_type === 'ASSET');
          setPaymentAccounts(validPayList);

          // Default cash account
          const cashAccs = validPayList.filter((a) => a.code.startsWith('101') || a.parent_code === '1010' || a.name.toLowerCase().includes('cash'));
          if (cashAccs.length > 0) {
            setSelectedAccountId(cashAccs[0].id);
          } else if (validPayList.length > 0) {
            setSelectedAccountId(validPayList[0].id);
          }
        } catch {
          // ignore
        } finally {
          setLoadingAccounts(false);
        }
      };

      fetchAccounts();
    }
  }, [isOpen, payable, balanceDue]);

  if (!payable) return null;

  const voucherNum = payable.commission_number || payable.record_number || `COM-${payable.id}`;
  const invoiceNum = payable.invoice_number || payable.sale_invoice_number || `INV-${payable.sale}`;
  const agentName = payable.sales_agent_name || (payable as any).agent_name_snapshot || 'Sales Agent';
  const ratePct = payable.commission_percentage !== undefined ? Number(payable.commission_percentage) : Number(payable.commission_rate_percentage || 0);

  const handlePayFull = () => {
    setAmountInput(balanceDue.toFixed(2));
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const amountNum = parseFloat(amountInput);
    if (isNaN(amountNum) || amountNum <= 0) {
      setValidationError('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (amountNum > balanceDue + 0.0001) {
      setValidationError(`Payment amount (Rs. ${formatMoney(amountNum)}) cannot exceed remaining balance due (Rs. ${formatMoney(balanceDue)}).`);
      return;
    }

    if (!selectedAccountId) {
      setValidationError('Please select a payment cash or bank account.');
      return;
    }

    if (paymentMethod === 'CHEQUE' && !chequeNumber.trim()) {
      setValidationError('Cheque Number is required when Cheque is selected.');
      return;
    }

    const payload: PayCommissionPayload = {
      amount: amountNum,
      payment_account: selectedAccountId,
      payment_method: paymentMethod,
      date: paymentDate,
      cheque_number: paymentMethod === 'CHEQUE' ? chequeNumber : undefined,
      cheque_date: paymentMethod === 'CHEQUE' && chequeDate ? chequeDate : undefined,
      cheque_bank: paymentMethod === 'CHEQUE' ? chequeBank : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      setSubmitting(true);
      const res = await commissionService.payCommission(payable.id, payload);
      showSuccess(
        `Successfully posted commission payment of Rs. ${formatMoney(amountNum)} for ${agentName} (${res.payment_number || 'Voucher Created'}).`,
        'Payment Recorded'
      );
      onPaymentSuccess(res.commission_record || res);
      onClose();
    } catch (err: any) {
      console.error('Payment failed:', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.amount || err?.message || 'Failed to record commission payment.';
      setValidationError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      showError(msg, 'Payment Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settle Sales Agent Commission Payment" maxWidth="560px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Payable Summary Header Box */}
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-medium)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
                Commission Voucher
              </span>
              <div style={{ color: 'var(--primary-400)', fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {voucherNum}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
                Linked Sale Invoice
              </span>
              <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9375rem', fontFamily: 'var(--font-mono)' }}>
                {invoiceNum}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.1rem 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.625rem' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Sales Agent</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                {agentName}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#a855f7', fontFamily: 'var(--font-mono)' }}>
                {ratePct.toFixed(2)}% Rate
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Total Commission</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(payable.commission_amount)}
              </div>
              {Number(payable.adjusted_amount || 0) > 0 && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  Return: -Rs. {formatMoney(payable.adjusted_amount)}
                </div>
              )}
              <div style={{ fontSize: '0.6875rem', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                Paid: Rs. {formatMoney(payable.paid_amount)}
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '0.35rem 0.55rem', borderRadius: '0.35rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--danger)', fontWeight: 600 }}>Remaining Due</div>
              <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.9375rem', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(balanceDue)}
              </div>
            </div>
          </div>

          {Number(payable.adjusted_amount || 0) > 0 && (
            <div style={{ fontSize: '0.71875rem', color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(234, 179, 8, 0.08)', padding: '0.35rem 0.6rem', borderRadius: '0.35rem', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
              <span>Includes Rs. {formatMoney(payable.adjusted_amount)} credit deduction from sales return reversal.</span>
            </div>
          )}
        </div>

        {validationError && (
          <div
            style={{
              padding: '0.625rem 0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--danger)',
              borderRadius: '0.375rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Payment Amount & Date Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Payment Amount (Rs.) *
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                style={{
                  fontSize: '0.71875rem',
                  color: 'var(--primary-400)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Pay Full (Rs. {formatMoney(balanceDue)})
              </button>
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              max={balanceDue}
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Settlement Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Payment Method 1st, Disbursement Account 2nd */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => handlePaymentMethodChange(e.target.value as 'CASH' | 'BANK' | 'CHEQUE')}
              required
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.5rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="CASH">Cash</option>
              <option value="BANK">Bank / Card</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              {paymentMethod === 'CASH' ? 'Disbursement Account (Cash 101x) *' : 'Disbursement Account (Bank 102x) *'}
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
              disabled={loadingAccounts}
              required
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.5rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              {getFilteredPaymentAccounts(paymentMethod).map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.code}] {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Cheque Inputs when Payment Method is Cheque */}
        {paymentMethod === 'CHEQUE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.06)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-400)' }}>
              Cheque Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  Cheque Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CHQ-55201"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
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
                  style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Bank Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Meezan Bank, HBL, Allied Bank..."
                value={chequeBank}
                onChange={(e) => setChequeBank(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Settlement Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Settlement Notes / Remarks
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional settlement memo or reference..."
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              color: 'var(--text-main)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Double Entry Accounting Footnote */}
        <div
          style={{
            fontSize: '0.71875rem',
            color: 'var(--text-muted)',
            backgroundColor: 'rgba(56, 189, 248, 0.05)',
            padding: '0.45rem 0.65rem',
            borderRadius: '0.35rem',
            border: '1px dashed rgba(56, 189, 248, 0.25)',
          }}
        >
          <strong>Accounting Entry:</strong> DR 2040 Sales Agent Commission Payable | CR Selected Liquid Account.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting} style={{ padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Wallet size={15} />}
            loading={submitting}
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.8125rem',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              fontWeight: 700,
            }}
          >
            Confirm & Post Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
