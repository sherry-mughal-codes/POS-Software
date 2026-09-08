import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, Wallet, Calendar, FileText } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CommissionRecord, PayCommissionPayload } from '../../types/commission';
import { commissionService } from '../../services/commissionService';
import { accountingService } from '../../services/accountingService';
import { Account } from '../../types/accounting';
import { useToast } from '../../context/ToastContext';

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

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [chequeBank, setChequeBank] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const balanceDue = payable ? Number(payable.balance_due || 0) : 0;

  useEffect(() => {
    if (isOpen && payable) {
      setAmountInput(balanceDue.toFixed(2));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      setChequeNumber('');
      setChequeDate('');
      setChequeBank('');
      setNotes('');
      setValidationError(null);

      // Load Cash/Bank asset accounts for payment
      const fetchAccounts = async () => {
        try {
          setLoadingAccounts(true);
          const data = await accountingService.getAccounts({ is_active: true });
          const rawAccounts: Account[] = Array.isArray(data) ? data : (data as any)?.results || [];
          
          // Filter to liquid asset accounts (Cash / Bank)
          const liquidAccounts = rawAccounts.filter((acc) => {
            const isAsset = acc.account_type === 'ASSET';
            const code = acc.code || '';
            const name = (acc.name || '').toLowerCase();
            return isAsset && (code.startsWith('101') || code.startsWith('102') || name.includes('cash') || name.includes('bank') || name.includes('drawer'));
          });

          const candidates = liquidAccounts.length > 0 ? liquidAccounts : rawAccounts.filter((a) => a.account_type === 'ASSET');
          setAccounts(candidates);
          if (candidates.length > 0) {
            setSelectedAccountId(candidates[0].id);
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
      setValidationError(`Payment amount (Rs. ${amountNum.toLocaleString()}) cannot exceed remaining balance due (Rs. ${balanceDue.toLocaleString()}).`);
      return;
    }

    if (!selectedAccountId) {
      setValidationError('Please select a payment cash or bank account.');
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
        `Successfully posted commission payment of Rs. ${amountNum.toLocaleString()} for ${payable.sales_agent_name} (${res.payment_number || 'Voucher Created'}).`,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Settle Sales Agent Commission Payment" maxWidth="580px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {/* Payable Summary Header Box */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-medium)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Commission Voucher
              </span>
              <h4 style={{ margin: '0.1rem 0 0', color: 'var(--primary-400)', fontSize: '1.05rem', fontWeight: 700 }}>
                {payable.record_number}
              </h4>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Linked Invoice
              </span>
              <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.95rem' }}>
                {payable.sale_invoice_number}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.2rem 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sales Agent</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                {payable.sales_agent_name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#a855f7' }}>
                {payable.commission_rate_percentage}% Rate
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Commission</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                Rs. {Number(payable.commission_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Paid: Rs. {Number(payable.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '0.4rem 0.6rem', borderRadius: '0.35rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>Remaining Due</div>
              <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1rem' }}>
                Rs. {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {validationError && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--danger)',
              borderRadius: '0.45rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Payment Form Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
          {/* Amount to Pay */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Payment Amount (PKR) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--primary-400)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Pay Full Balance (Rs. {balanceDue.toLocaleString()})
              </button>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={balanceDue}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0.00"
              icon={<DollarSign size={15} />}
              required
            />
          </div>

          {/* Payment Account */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Disbursement Account <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
              disabled={loadingAccounts}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name} ({acc.account_type})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online / Digital</option>
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Settlement Date
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              icon={<Calendar size={15} />}
              required
            />
          </div>

          {/* Cheque Details (if applicable) */}
          {paymentMethod === 'CHEQUE' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Cheque Number
                </label>
                <Input
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="e.g. CHQ-88992"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Cheque Date
                </label>
                <Input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Cheque Bank
                </label>
                <Input
                  value={chequeBank}
                  onChange={(e) => setChequeBank(e.target.value)}
                  placeholder="e.g. HBL / Meezan"
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Settlement Notes / Memo
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes regarding this payment..."
              icon={<FileText size={15} />}
            />
          </div>
        </div>

        {/* Double Entry Accounting Notice */}
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            backgroundColor: 'rgba(56, 189, 248, 0.05)',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.35rem',
            border: '1px dashed rgba(56, 189, 248, 0.25)',
          }}
        >
          <strong>Accounting Entry:</strong> DR 2040 Sales Agent Commission Payable | CR Selected Liquid Account.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={<Wallet size={16} />} loading={submitting}>
            Confirm & Post Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
