import React from 'react';
import {
  DollarSign,
  ShieldAlert,
  Printer,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CommissionRecord } from '../../types/commission';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface CommissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: CommissionRecord | null;
  onOpenPayModal?: (payable: CommissionRecord) => void;
  onOpenPrintSlip?: (payable: CommissionRecord) => void;
  canPay?: boolean;
}

export const CommissionDetailModal: React.FC<CommissionDetailModalProps> = ({
  isOpen,
  onClose,
  payable,
  onOpenPayModal,
  onOpenPrintSlip,
  canPay = false,
}) => {
  if (!payable) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">Fully Paid</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="warning">Partially Paid</Badge>;
      case 'UNPAID':
        return <Badge variant="danger">Unpaid</Badge>;
      case 'ADJUSTED':
        return <Badge variant="info">Return Adjusted</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const voucherNum = payable.commission_number || payable.record_number || `COM-${payable.id}`;
  const invoiceNum = payable.invoice_number || payable.sale_invoice_number || `INV-${payable.sale}`;
  const agentName = payable.sales_agent_name || (payable as any).agent_name_snapshot || 'Sales Agent';
  const agentCode = payable.sales_agent_code || (payable as any).agent_code_snapshot || '';
  const ratePct = payable.commission_percentage !== undefined ? Number(payable.commission_percentage) : Number(payable.commission_rate_percentage || 0);

  const balanceDue = payable.remaining_payable_amount !== undefined
    ? Number(payable.remaining_payable_amount)
    : payable.balance_due !== undefined
    ? Number(payable.balance_due)
    : Math.max(0, Number(payable.commission_amount || 0) - Number(payable.adjusted_amount || 0) - Number(payable.paid_amount || 0));

  const totalCommission = Number(payable.commission_amount || 0);
  const paidAmount = Number(payable.paid_amount || 0);
  const advanceCredit = Number(payable.advance_credit || payable.advance_credit_amount || 0);
  const baseAmount = payable.commission_base !== undefined ? Number(payable.commission_base) : Number(payable.commission_base_amount || 0);

  const payments = payable.payments || [];
  const adjustments = payable.adjustments || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Commission Voucher: ${voucherNum}`} maxWidth="720px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Top Header Card */}
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
                Status & Reference
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                <span style={{ color: 'var(--primary-400)', fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {voucherNum}
                </span>
                {getStatusBadge(payable.status)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
                Customer Sale Invoice
              </div>
              <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9375rem', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                {invoiceNum}
              </div>
              <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                Date: {payable.sale_date || payable.date}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Metric Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            <div style={{ padding: '0.45rem 0.65rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Sales Agent</span>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                {agentName}
              </div>
              {agentCode && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {agentCode}
                </div>
              )}
            </div>

            <div style={{ padding: '0.45rem 0.65rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Commission Base</span>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(baseAmount)}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Rate: {ratePct.toFixed(2)}%
              </div>
            </div>

            <div style={{ padding: '0.45rem 0.65rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Calculated Total</span>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(totalCommission)}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                Paid: Rs. {formatMoney(paidAmount)}
              </div>
            </div>

            <div
              style={{
                padding: '0.45rem 0.65rem',
                backgroundColor: balanceDue > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                borderRadius: '0.375rem',
                border: balanceDue > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <span style={{ fontSize: '0.6875rem', color: balanceDue > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                {balanceDue > 0 ? 'Balance Due' : 'Settlement Status'}
              </span>
              <div style={{ fontWeight: 800, color: balanceDue > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '0.9375rem', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(balanceDue)}
              </div>
              {advanceCredit > 0 && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  Adv: Rs. {formatMoney(advanceCredit)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Payment History */}
        <div>
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <DollarSign size={14} color="var(--success)" />
            Disbursement & Settlement History ({payments.length})
          </h4>

          {payments.length === 0 ? (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '0.375rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              No disbursements have been recorded for this commission voucher yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-medium)', borderRadius: '0.375rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.45rem 0.65rem' }}>Payment #</th>
                    <th style={{ padding: '0.45rem 0.65rem' }}>Date</th>
                    <th style={{ padding: '0.45rem 0.65rem' }}>Disbursement Account</th>
                    <th style={{ padding: '0.45rem 0.65rem' }}>Method</th>
                    <th style={{ padding: '0.45rem 0.65rem', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                        {p.payment_number}
                      </td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-main)' }}>{p.date || (p as any).payment_date}</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-main)' }}>
                        {p.payment_account_name || 'Cash Account'}
                      </td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-muted)' }}>
                        {p.payment_method}
                        {p.cheque_number ? ` (Chq #${p.cheque_number})` : ''}
                      </td>
                      <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                        Rs. {formatMoney(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Sales Return Adjustments (if any) */}
        {adjustments.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldAlert size={14} color="var(--warning)" />
              Sales Return Adjustments & Reversals ({adjustments.length})
            </h4>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border-medium)', borderRadius: '0.375rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.45rem 0.65rem' }}>Return Order</th>
                    <th style={{ padding: '0.45rem 0.65rem' }}>Date</th>
                    <th style={{ padding: '0.45rem 0.65rem' }}>Type</th>
                    <th style={{ padding: '0.45rem 0.65rem', textAlign: 'right' }}>Returned Base</th>
                    <th style={{ padding: '0.45rem 0.65rem', textAlign: 'right' }}>Commission Reversed</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                        {a.sales_return_number || (a as any).return_number || 'Return Order'}
                      </td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-main)' }}>{a.date}</td>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-muted)' }}>
                        <Badge variant="warning">{a.adjustment_type || 'RETURN'}</Badge>
                      </td>
                      <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Rs. {formatMoney(a.returned_subtotal || (a as any).returned_base_amount)}
                      </td>
                      <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                        - Rs. {formatMoney(a.adjusted_amount || (a as any).reversal_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* General Ledger Double-Entry Audit Footnote */}
        <div
          style={{
            fontSize: '0.71875rem',
            color: 'var(--text-muted)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            padding: '0.45rem 0.65rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.15rem',
          }}
        >
          <div><strong>GL Accrual Entry:</strong> DR 5090 Sales Commission Expense | CR 2040 Sales Agent Commission Payable</div>
          <div><strong>GL Settlement Entry:</strong> DR 2040 Sales Agent Commission Payable | CR Liquid Cash/Bank Account</div>
        </div>

        {/* Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
          <div>
            {onOpenPrintSlip && (
              <Button
                variant="outline"
                icon={<Printer size={14} />}
                onClick={() => onOpenPrintSlip(payable)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78125rem' }}
              >
                Print Slip
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} style={{ padding: '0.35rem 0.75rem', fontSize: '0.78125rem' }}>
              Close
            </Button>
            {canPay && balanceDue > 0 && onOpenPayModal && (
              <Button
                variant="primary"
                icon={<DollarSign size={14} />}
                onClick={() => {
                  onClose();
                  onOpenPayModal(payable);
                }}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78125rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  fontWeight: 700,
                }}
              >
                Pay Commission (Rs. {formatMoney(balanceDue)})
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
