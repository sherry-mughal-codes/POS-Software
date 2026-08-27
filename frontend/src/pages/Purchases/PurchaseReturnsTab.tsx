import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Purchase, PurchaseItem, PurchaseReturn, PurchaseReturnRefundMethod } from '../../types/purchase';
import { Account } from '../../types/accounting';
import { purchaseService } from '../../services/purchaseService';
import { accountingService } from '../../services/accountingService';

interface PurchaseReturnsTabProps {
  returns: PurchaseReturn[];
  onRefresh: () => void;
  returnTargetPurchase: Purchase | null;
  onCloseReturnModal: () => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const PurchaseReturnsTab: React.FC<PurchaseReturnsTabProps> = ({
  returns,
  onRefresh,
  returnTargetPurchase,
  onCloseReturnModal,
}) => {
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [refundMethod, setRefundMethod] = useState<PurchaseReturnRefundMethod>('CASH');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accountingService.getAccounts({ is_active: true, leaf_only: true })
      .then((accs) => setAccounts(accs || []))
      .catch(() => {});
  }, []);

  const cashAccounts = accounts.filter(
    (a) =>
      a.account_type === 'ASSET' &&
      (a.code.startsWith('101') || a.parent_code === '1010' || (a.name.toLowerCase().includes('cash') && !a.code.startsWith('102'))) &&
      !a.name.toLowerCase().includes('jazz') &&
      !a.name.toLowerCase().includes('easy') &&
      !a.code.startsWith('102')
  );
  const bankAccounts = accounts.filter(
    (a) =>
      a.account_type === 'ASSET' &&
      (a.code.startsWith('102') ||
        a.parent_code === '1020' ||
        a.name.toLowerCase().includes('bank') ||
        a.name.toLowerCase().includes('card') ||
        a.name.toLowerCase().includes('jazz') ||
        a.name.toLowerCase().includes('easy'))
  );
  const liquidAccounts = [...cashAccounts, ...bankAccounts];

  useEffect(() => {
    if (returnTargetPurchase) {
      if (Number(returnTargetPurchase.paid_amount) > 0) {
        setRefundMethod('CASH');
        const defaultCash = cashAccounts[0] || liquidAccounts[0];
        if (defaultCash) setSelectedAccountId(defaultCash.id);
      } else {
        setRefundMethod('PAYABLE_DEDUCTION');
        setSelectedAccountId(null);
      }
    }
  }, [returnTargetPurchase]);

  const handleRefundMethodChange = (method: PurchaseReturnRefundMethod) => {
    setRefundMethod(method);
    if (method === 'PAYABLE_DEDUCTION') {
      setSelectedAccountId(null);
    } else if (method === 'CASH') {
      const def = cashAccounts[0] || liquidAccounts[0];
      setSelectedAccountId(def ? def.id : null);
    } else if (method === 'BANK' || method === 'CHEQUE') {
      const def = bankAccounts[0] || liquidAccounts[0];
      setSelectedAccountId(def ? def.id : null);
    }
  };

  const handleQtyChange = (itemId: number, val: number) => {
    setReturnQuantities({
      ...returnQuantities,
      [itemId]: val,
    });
  };

  const calculateReturnTotal = () => {
    if (!returnTargetPurchase) return 0;
    return returnTargetPurchase.items.reduce((sum, item) => {
      const qty = returnQuantities[item.id] || 0;
      return sum + qty * item.purchase_rate;
    }, 0);
  };

  const handleProcessReturn = async () => {
    if (!returnTargetPurchase) return;

    const itemsToSubmit = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        purchase_item_id: parseInt(itemId),
        quantity: qty,
      }));

    if (itemsToSubmit.length === 0) {
      setError('Please specify a return quantity greater than 0 for at least one item.');
      return;
    }

    if (refundMethod !== 'PAYABLE_DEDUCTION' && !selectedAccountId && liquidAccounts.length > 0) {
      setError('Please select the receiving Cash or Bank account for this refund.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await purchaseService.createPurchaseReturn({
        purchase_id: returnTargetPurchase.id,
        refund_method: refundMethod,
        payment_account: selectedAccountId || undefined,
        notes: returnNotes,
        items: itemsToSubmit,
      });
      setReturnQuantities({});
      setReturnNotes('');
      onCloseReturnModal();
      onRefresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to process purchase return.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Return Logs Table */}
      <Card
        title="Purchase Returns & Restocking Credits"
        icon={<RotateCcw size={18} />}
      >
        {returns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No purchase returns recorded yet. To initiate a return, navigate to the Purchases tab and click "Return" on any submitted order.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Return #</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Original Order</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Supplier</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Settlement</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Credit Amount</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: 'var(--warning)',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.25rem',
                      }}>
                        {r.return_number}
                      </code>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', fontSize: '0.75rem' }}>
                        {r.original_purchase_number}
                      </code>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {r.date}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                        {r.supplier_company || r.supplier_name}
                      </div>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      {r.refund_method === 'PAYABLE_DEDUCTION' ? (
                        <Badge variant="warning">Payable Deduction (AP)</Badge>
                      ) : r.refund_method === 'BANK' ? (
                        <div>
                          <Badge variant="info">Bank Transfer</Badge>
                          {r.payment_account_name && (
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                              {r.payment_account_name}
                            </div>
                          )}
                        </div>
                      ) : r.refund_method === 'CHEQUE' ? (
                        <div>
                          <Badge variant="phase">Cheque Refund</Badge>
                          {r.payment_account_name && (
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                              {r.payment_account_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <Badge variant="success">Cash Refund</Badge>
                          {r.payment_account_name && (
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                              {r.payment_account_name}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                      Rs. {formatMoney(r.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Return Initiation Modal */}
      {returnTargetPurchase && (
        <Modal
          isOpen={!!returnTargetPurchase}
          onClose={onCloseReturnModal}
          title={`Process Return for ${returnTargetPurchase.purchase_number}`}
        >
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: '0.5rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Specify the quantities you wish to return to <strong>{returnTargetPurchase.supplier_name}</strong>.
              Inventory stock will be deducted and the appropriate accounts credited.
            </div>

            {/* Item Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-medium)', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-medium)' }}>
                    <th style={{ padding: '0.5rem' }}>Item</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Purchased</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Already Returned</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Max Returnable</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '110px' }}>Return Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {returnTargetPurchase.items.map((item: PurchaseItem) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--primary-400)' }}>{item.product_sku}</code>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{item.quantity}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{item.returned_quantity}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                        {item.remaining_returnable_quantity}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          type="number"
                          min="0"
                          max={item.remaining_returnable_quantity}
                          step="any"
                          value={returnQuantities[item.id] || 0}
                          onChange={(e) => handleQtyChange(item.id, parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '0.375rem',
                            padding: '0.375rem 0.5rem',
                            color: 'var(--text-main)',
                            fontFamily: 'var(--font-mono)',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: refundMethod === 'PAYABLE_DEDUCTION' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  Refund / Settlement Method
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => handleRefundMethodChange(e.target.value as PurchaseReturnRefundMethod)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    padding: '0.55rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontSize: '0.8125rem',
                  }}
                >
                  <option value="PAYABLE_DEDUCTION">Deduct from Supplier Payable (AP - 2010)</option>
                  <option value="CASH">Cash Refund (Cash in Hand)</option>
                  <option value="BANK">Bank Transfer Refund (Online / Wire)</option>
                  <option value="CHEQUE">Cheque Refund</option>
                </select>
              </div>

              {refundMethod !== 'PAYABLE_DEDUCTION' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                    Receiving Cash/Bank Account (Debit) *
                  </label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(Number(e.target.value) || null)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '0.5rem',
                      padding: '0.55rem',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontSize: '0.8125rem',
                    }}
                    required
                  >
                    <option value="">-- Select Receiving Account --</option>
                    {(refundMethod === 'CASH' ? cashAccounts : bankAccounts).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        [{acc.code}] {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Return Reason / Remarks"
                placeholder="e.g. Expired batch / Damaged goods"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-app)',
              borderRadius: '0.5rem',
            }}>
              <span style={{ fontWeight: 600 }}>Total Return Credit Value:</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(calculateReturnTotal())}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" onClick={onCloseReturnModal}>
                Cancel
              </Button>
              <Button variant="primary" loading={submitting} onClick={handleProcessReturn} icon={<CheckCircle2 size={16} />}>
                Submit Return & Adjust Stock
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
