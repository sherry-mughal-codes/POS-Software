import React, { useState, useEffect } from 'react';
import {
  Banknote,
  CreditCard,
  UserCheck,
  Split,
  AlertTriangle,
  CheckCircle,
  Coins,
  Printer,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { PaymentMethodType } from '../../../types/sales';
import { Customer } from '../../../types/contact';
import { Account } from '../../../types/accounting';
import { accountingService } from '../../../services/accountingService';

interface POSCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customer: Customer;
  onConfirmCheckout: (payload: {
    payment_method: PaymentMethodType;
    payment_account?: number;
    paid_amount: number;
    payments_breakdown?: { payment_method: PaymentMethodType; payment_account?: number; amount: number }[];
    notes?: string;
  }, autoPrint?: boolean) => Promise<void>;
  loading: boolean;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Calculates human-realistic smart cash payment amounts.
 * Uses each official currency note level (10, 20, 50, 100, 500, 1000, 5000)
 * to round up progressively across all price ranges.
 */
const getSmartCashSuggestions = (total: number): number[] => {
  if (total <= 0) return [50, 100, 500, 1000, 5000];

  const suggestions: Set<number> = new Set();

  // 1. Next 10 note round (e.g. 6167 -> 6170, 133 -> 140, 125 -> 130)
  const ceil10 = Math.ceil(total / 10) * 10;
  if (ceil10 > total) suggestions.add(ceil10);

  // 2. Next 20 note round (e.g. 125 -> 140)
  const ceil20 = Math.ceil(total / 20) * 20;
  if (ceil20 > total && ceil20 < Math.ceil(total / 50) * 50) suggestions.add(ceil20);

  // 3. Next 50 note round (e.g. 1320 -> 1350, 220 -> 250, 133 -> 150)
  const ceil50 = Math.ceil(total / 50) * 50;
  if (ceil50 > total) suggestions.add(ceil50);

  // 4. Next 100 note round (e.g. 6167 -> 6200, 1320 -> 1400, 220 -> 300, 133 -> 200)
  const ceil100 = Math.ceil(total / 100) * 100;
  if (ceil100 > total) suggestions.add(ceil100);

  // 5. Next 500 note round (e.g. 6167 -> 6500, 1320 -> 1500, 220 -> 500)
  const ceil500 = Math.ceil(total / 500) * 500;
  if (ceil500 > total) suggestions.add(ceil500);

  // 6. Next 1000 note round (e.g. 6167 -> 7000, 1320 -> 2000, 600 -> 1000)
  const ceil1000 = Math.ceil(total / 1000) * 1000;
  if (ceil1000 > total) suggestions.add(ceil1000);

  // 7. Next 5000 note round (e.g. 6167 -> 10000, 1320 -> 5000, 600 -> 5000)
  const ceil5000 = Math.ceil(total / 5000) * 5000;
  if (ceil5000 > total) suggestions.add(ceil5000);

  // 8. Higher single standard banknotes (> total)
  const standardBanknotes = [50, 100, 500, 1000, 5000];
  for (const note of standardBanknotes) {
    if (note > total) {
      suggestions.add(note);
    }
  }

  const sorted = Array.from(suggestions)
    .filter((amt) => amt > total)
    .sort((a, b) => a - b);

  return sorted.slice(0, 6);
};

export const POSCheckoutModal: React.FC<POSCheckoutModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  customer,
  onConfirmCheckout,
  loading,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH');
  const [cashTendered, setCashTendered] = useState<string>(grandTotal.toString());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<number | undefined>();
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | undefined>();

  // Split payment fields
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [splitCredit, setSplitCredit] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('CASH');
      setCashTendered(grandTotal.toString());
      setNotes('');
      setError(null);
      setSplitCash(grandTotal.toString());
      setSplitCard('0');
      setSplitCredit('0');

      accountingService.getAccounts({ is_active: true }).then((accs) => {
        setAccounts(accs);
        const cParent = accs.find((a) => a.code === '1010');
        const bParent = accs.find((a) => a.code === '1020');

        // Strictly children of Cash Accounts parent (1010)
        const cashAccs = accs.filter(
          (a) =>
            a.is_active &&
            !a.is_header &&
            (a.parent_code === '1010' || (cParent && a.parent === cParent.id))
        );

        // Strictly children of Bank & Digital Accounts parent (1020)
        const bankAccs = accs.filter(
          (a) =>
            a.is_active &&
            !a.is_header &&
            (a.parent_code === '1020' || (bParent && a.parent === bParent.id))
        );

        if (cashAccs.length > 0) setSelectedCashAccountId(cashAccs[0].id);
        if (bankAccs.length > 0) setSelectedBankAccountId(bankAccs[0].id);
      }).catch(console.error);
    }
  }, [isOpen, grandTotal]);

  const cashParent = accounts.find((a) => a.code === '1010');
  const bankParent = accounts.find((a) => a.code === '1020');

  const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));

  // Strictly children of Cash Accounts parent (1010)
  const cashAccounts = accounts.filter(
    (a) =>
      a.is_active &&
      isLeaf(a) &&
      (a.parent_code === '1010' || (cashParent && a.parent === cashParent.id))
  );

  // Strictly children of Bank & Digital Accounts parent (1020)
  const bankAccounts = accounts.filter(
    (a) =>
      a.is_active &&
      isLeaf(a) &&
      (a.parent_code === '1020' || (bankParent && a.parent === bankParent.id))
  );

  const tenderedNumber = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNumber - grandTotal);
  const remainingDue = Math.max(0, grandTotal - tenderedNumber);

  const isCreditAllowed = !customer.is_walkin && customer.credit_enabled;

  const handleQuickCash = (amount: number) => {
    setCashTendered(amount.toString());
  };

  const handleSplitCashChange = (val: string) => {
    setSplitCash(val);
    const cNum = parseFloat(val);
    const credNum = parseFloat(splitCredit) || 0;
    if (!isNaN(cNum)) {
      const rem = Math.max(0, grandTotal - cNum - credNum);
      setSplitCard(rem === 0 ? '0' : Number(rem.toFixed(2)).toString());
    } else if (val === '') {
      const rem = Math.max(0, grandTotal - credNum);
      setSplitCard(rem === 0 ? '0' : Number(rem.toFixed(2)).toString());
    }
  };

  const handleSplitCardChange = (val: string) => {
    setSplitCard(val);
    const cardNum = parseFloat(val);
    const credNum = parseFloat(splitCredit) || 0;
    if (!isNaN(cardNum)) {
      const rem = Math.max(0, grandTotal - cardNum - credNum);
      setSplitCash(rem === 0 ? '0' : Number(rem.toFixed(2)).toString());
    } else if (val === '') {
      const rem = Math.max(0, grandTotal - credNum);
      setSplitCash(rem === 0 ? '0' : Number(rem.toFixed(2)).toString());
    }
  };

  const handleSplitCreditChange = (val: string) => {
    setSplitCredit(val);
    const credNum = parseFloat(val);
    const cNum = parseFloat(splitCash) || 0;
    if (!isNaN(credNum)) {
      const rem = Math.max(0, grandTotal - credNum - cNum);
      setSplitCard(rem === 0 ? '0' : Number(rem.toFixed(2)).toString());
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      const isF9 = e.key === 'F9' || e.code === 'F9' || e.keyCode === 120;
      if (isF9 && !loading) {
        e.preventDefault();
        e.stopPropagation();
        handlePerformSubmit(true);
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, true);
    return () => window.removeEventListener('keydown', handleModalKeyDown, true);
  });

  const handlePerformSubmit = async (autoPrint: boolean = true) => {
    setError(null);

    try {
      if (paymentMethod === 'CASH') {
        if (tenderedNumber < grandTotal) {
          setError(`Cash tendered (Rs. ${formatMoney(tenderedNumber)}) is less than total (Rs. ${formatMoney(grandTotal)}).`);
          return;
        }
        await onConfirmCheckout({
          payment_method: 'CASH',
          payment_account: selectedCashAccountId,
          paid_amount: tenderedNumber,
          notes,
        }, autoPrint);
      } else if (paymentMethod === 'CARD') {
        await onConfirmCheckout({
          payment_method: 'CARD',
          payment_account: selectedBankAccountId,
          paid_amount: grandTotal,
          notes,
        }, autoPrint);
      } else if (paymentMethod === 'CREDIT') {
        if (!isCreditAllowed) {
          setError('Credit purchases are not enabled for this customer.');
          return;
        }
        await onConfirmCheckout({
          payment_method: 'CREDIT',
          paid_amount: 0,
          notes,
        }, autoPrint);
      } else if (paymentMethod === 'SPLIT') {
        const cVal = parseFloat(splitCash) || 0;
        const cardVal = parseFloat(splitCard) || 0;
        const credVal = parseFloat(splitCredit) || 0;
        const totalAllocated = cVal + cardVal + credVal;

        if (Math.abs(totalAllocated - grandTotal) > 0.01) {
          setError(`Split sum (Rs. ${formatMoney(totalAllocated)}) does not match Grand Total (Rs. ${formatMoney(grandTotal)}).`);
          return;
        }

        if (credVal > 0 && !isCreditAllowed) {
          setError('Credit portion not allowed for this customer.');
          return;
        }

        const breakdown: { payment_method: PaymentMethodType; payment_account?: number; amount: number }[] = [];
        if (cVal > 0) breakdown.push({ payment_method: 'CASH', payment_account: selectedCashAccountId, amount: cVal });
        if (cardVal > 0) breakdown.push({ payment_method: 'CARD', payment_account: selectedBankAccountId, amount: cardVal });
        if (credVal > 0) breakdown.push({ payment_method: 'CREDIT', amount: credVal });

        await onConfirmCheckout({
          payment_method: 'SPLIT',
          paid_amount: cVal + cardVal,
          payments_breakdown: breakdown,
          notes,
        }, autoPrint);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to complete sale checkout.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="POS Sale Payment & Checkout"
      maxWidth="560px"
    >
      <form onSubmit={(e) => { e.preventDefault(); handlePerformSubmit(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Payable Total Header */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Amount Payable
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
              Rs. {formatMoney(grandTotal)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {customer.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {customer.is_walkin ? 'Walk-in' : `ID: ${customer.customer_id}`}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--danger)',
              borderRadius: '0.5rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Method Selector Tabs */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Select Payment Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              style={{
                padding: '0.75rem 0.5rem',
                borderRadius: '0.5rem',
                border: paymentMethod === 'CASH' ? '2px solid var(--primary-400)' : '1px solid var(--border-subtle)',
                backgroundColor: paymentMethod === 'CASH' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                color: paymentMethod === 'CASH' ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <Banknote size={20} />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              style={{
                padding: '0.75rem 0.5rem',
                borderRadius: '0.5rem',
                border: paymentMethod === 'CARD' ? '2px solid var(--primary-400)' : '1px solid var(--border-subtle)',
                backgroundColor: paymentMethod === 'CARD' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                color: paymentMethod === 'CARD' ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <CreditCard size={20} />
              <span>Card</span>
            </button>

            <button
              type="button"
              onClick={() => isCreditAllowed && setPaymentMethod('CREDIT')}
              disabled={!isCreditAllowed}
              title={!isCreditAllowed ? 'Customer is not eligible for credit' : 'Charge to Customer Receivable'}
              style={{
                padding: '0.75rem 0.5rem',
                borderRadius: '0.5rem',
                border: paymentMethod === 'CREDIT' ? '2px solid var(--primary-400)' : '1px solid var(--border-subtle)',
                backgroundColor: paymentMethod === 'CREDIT' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                color: paymentMethod === 'CREDIT' ? 'var(--primary-400)' : !isCreditAllowed ? 'var(--text-subtle)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: isCreditAllowed ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.375rem',
                opacity: isCreditAllowed ? 1 : 0.45,
              }}
            >
              <UserCheck size={20} />
              <span>Credit</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('SPLIT')}
              style={{
                padding: '0.75rem 0.5rem',
                borderRadius: '0.5rem',
                border: paymentMethod === 'SPLIT' ? '2px solid var(--primary-400)' : '1px solid var(--border-subtle)',
                backgroundColor: paymentMethod === 'SPLIT' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                color: paymentMethod === 'SPLIT' ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <Split size={20} />
              <span>Split</span>
            </button>
          </div>
        </div>

        {/* CASH Payment Body: Tendered & Change Return */}
        {paymentMethod === 'CASH' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                Cash Tendered / Received (Rs.)
              </label>
              <input
                type="number"
                step="any"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Smart Dynamic Cash Denomination Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleQuickCash(grandTotal)}
                style={{
                  padding: '0.375rem 0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid',
                  borderColor: tenderedNumber === grandTotal ? 'var(--primary-400)' : 'var(--border-subtle)',
                  backgroundColor: tenderedNumber === grandTotal ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                  color: tenderedNumber === grandTotal ? 'var(--primary-400)' : 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Exact (Rs. {formatMoney(grandTotal)})
              </button>

              {getSmartCashSuggestions(grandTotal).map((suggestionAmount) => {
                const isSelected = tenderedNumber === suggestionAmount;
                return (
                  <button
                    key={suggestionAmount}
                    type="button"
                    onClick={() => handleQuickCash(suggestionAmount)}
                    style={{
                      padding: '0.375rem 0.625rem',
                      borderRadius: '0.375rem',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary-400)' : 'var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--primary-400)' : 'var(--text-main)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Rs. {formatMoney(suggestionAmount)}
                  </button>
                );
              })}
            </div>

            {/* Change Banner */}
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: tenderedNumber >= grandTotal ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${tenderedNumber >= grandTotal ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coins size={20} style={{ color: tenderedNumber >= grandTotal ? 'var(--success)' : 'var(--danger)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {tenderedNumber >= grandTotal ? 'Change to Return:' : 'Shortfall Amount:'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  color: tenderedNumber >= grandTotal ? 'var(--success)' : 'var(--danger)',
                }}
              >
                Rs. {formatMoney(tenderedNumber >= grandTotal ? changeDue : remainingDue)}
              </span>
            </div>

            {/* Cash Drawer Account Selection */}
            {cashAccounts.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Deposit Into Cash Drawer Account
                </label>
                <select
                  value={selectedCashAccountId || ''}
                  onChange={(e) => setSelectedCashAccountId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                >
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} (Bal: Rs. {formatMoney(acc.current_balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* CARD / Bank / Digital Payment Body */}
        {paymentMethod === 'CARD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={20} style={{ color: 'var(--primary-400)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Bank / Card / Online Receipt:
                </span>
              </div>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--primary-400)',
                }}
              >
                Rs. {formatMoney(grandTotal)}
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Receiving Bank / Digital Account (JazzCash, EasyPaisa, Meezan, HBL) *
              </label>
              <select
                value={selectedBankAccountId || ''}
                onChange={(e) => setSelectedBankAccountId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.name} (Bal: Rs. {formatMoney(acc.current_balance)})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                Selected account will be automatically debited in the General Ledger upon checkout.
              </div>
            </div>
          </div>
        )}

        {/* CREDIT Notice */}
        {paymentMethod === 'CREDIT' && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              Full Credit Sale Allocation
            </div>
            <div>
              Rs. {formatMoney(grandTotal)} will be charged to customer <strong>{customer.name}</strong>'s Accounts Receivable balance.
            </div>
          </div>
        )}

        {/* SPLIT Payment Body */}
        {paymentMethod === 'SPLIT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Cash (Rs.)
                </label>
                <input
                  type="number"
                  step="any"
                  value={splitCash}
                  onChange={(e) => handleSplitCashChange(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Card (Rs.)
                </label>
                <input
                  type="number"
                  step="any"
                  value={splitCard}
                  onChange={(e) => handleSplitCardChange(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Credit (Rs.)
                </label>
                <input
                  type="number"
                  step="any"
                  disabled={!isCreditAllowed}
                  value={splitCredit}
                  onChange={(e) => handleSplitCreditChange(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', opacity: isCreditAllowed ? 1 : 0.5 }}
                />
              </div>
            </div>

            {parseFloat(splitCard) > 0 && bankAccounts.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Receiving Bank / Digital Account for Card portion *
                </label>
                <select
                  value={selectedBankAccountId || ''}
                  onChange={(e) => setSelectedBankAccountId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} (Bal: Rs. {formatMoney(acc.current_balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {parseFloat(splitCash) > 0 && cashAccounts.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Deposit Cash portion into *
                </label>
                <select
                  value={selectedCashAccountId || ''}
                  onChange={(e) => setSelectedCashAccountId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                >
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} (Bal: Rs. {formatMoney(acc.current_balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
            Sale Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="Special delivery instructions or cashier note..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.5rem',
              color: 'var(--text-main)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handlePerformSubmit(false)}
            icon={<CheckCircle size={15} />}
            style={{
              borderColor: 'var(--border-medium)',
              fontWeight: 700,
            }}
          >
            Complete Sale & Return to POS
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<Printer size={15} />}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              fontWeight: 800,
            }}
          >
            Complete Sale & Print
          </Button>
        </div>
      </form>
    </Modal>
  );
};
