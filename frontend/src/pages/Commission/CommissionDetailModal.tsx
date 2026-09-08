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

  const balanceDue = Number(payable.balance_due || 0);
  const totalCommission = Number(payable.commission_amount || 0);
  const paidAmount = Number(payable.paid_amount || 0);
  const advanceCredit = Number(payable.advance_credit || 0);
  const baseAmount = Number(payable.commission_base_amount || 0);

  const payments = payable.payments || [];
  const adjustments = payable.adjustments || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Commission Record: ${payable.record_number}`} maxWidth="750px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Header Card */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.625rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Status & Reference
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <h3 style={{ margin: 0, color: 'var(--primary-400)', fontSize: '1.2rem', fontWeight: 700 }}>
                  {payable.record_number}
                </h3>
                {getStatusBadge(payable.status)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Customer Sale Invoice
              </div>
              <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '1.05rem', marginTop: '0.2rem' }}>
                {payable.sale_invoice_number}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Sale Date: {payable.sale_date || payable.date}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Metric Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sales Agent</span>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                {payable.sales_agent_name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#a855f7' }}>
                Code: {payable.sales_agent_code}
              </div>
            </div>

            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Commission Base</span>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                Rs. {baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Rate: {payable.commission_rate_percentage}%
              </div>
            </div>

            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calculated Total</span>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                Rs. {totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
                Paid: Rs. {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: balanceDue > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '0.375rem', border: balanceDue > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)' }}>
              <span style={{ fontSize: '0.7rem', color: balanceDue > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                {balanceDue > 0 ? 'Balance Due' : 'Settlement Status'}
              </span>
              <div style={{ fontWeight: 800, color: balanceDue > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '1rem' }}>
                Rs. {balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              {advanceCredit > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--warning)', fontWeight: 600 }}>
                  Advance Credit: Rs. {advanceCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Payment History */}
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <DollarSign size={15} color="var(--success)" />
            Payment & Settlement History ({payments.length})
          </h4>

          {payments.length === 0 ? (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '0.375rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              No payments have been recorded for this commission voucher yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-medium)', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Payment #</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Date</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Disbursement Account</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Method</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--primary-400)' }}>
                        {p.payment_number}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-main)' }}>{p.date}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-main)' }}>
                        {p.payment_account_name || 'Cash Account'}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>
                        {p.payment_method}
                        {p.cheque_number ? ` (Chq #${p.cheque_number})` : ''}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                        Rs. {Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={15} color="var(--warning)" />
              Sales Return Adjustments & Deductions ({adjustments.length})
            </h4>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border-medium)', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Return Order</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Date</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Type</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Returned Subtotal</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Commission Reversed</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--warning)' }}>
                        {a.sales_return_number || 'Return Order'}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-main)' }}>{a.date}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>
                        <Badge variant="warning">{a.adjustment_type}</Badge>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                        Rs. {Number(a.returned_subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                        - Rs. {Number(a.adjusted_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            padding: '0.6rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
          }}
        >
          <div><strong>GL Accrual Entry:</strong> DR 5090 Sales Commission Expense | CR 2040 Sales Agent Commission Payable</div>
          <div><strong>GL Settlement Entry:</strong> DR 2040 Sales Agent Commission Payable | CR Liquid Cash/Bank Account</div>
        </div>

        {/* Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <div>
            {onOpenPrintSlip && (
              <Button
                variant="outline"
                icon={<Printer size={15} />}
                onClick={() => onOpenPrintSlip(payable)}
              >
                Print Settlement Slip
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {canPay && balanceDue > 0 && onOpenPayModal && (
              <Button
                variant="primary"
                icon={<DollarSign size={15} />}
                onClick={() => {
                  onClose();
                  onOpenPayModal(payable);
                }}
              >
                Pay Commission (Rs. {balanceDue.toLocaleString()})
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
