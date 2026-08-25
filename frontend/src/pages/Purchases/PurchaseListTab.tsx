import React, { useState } from 'react';
import {
  ShoppingBag,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Edit2,
  Building,
  FileText,
  Download,
  Printer,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Purchase, PurchaseItem } from '../../types/purchase';
import { purchaseService } from '../../services/purchaseService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PurchaseOrderSlipModal } from './PurchaseOrderSlipModal';

interface PurchaseListTabProps {
  purchases: Purchase[];
  loading: boolean;
  onRefresh: () => void;
  onOpenReturn: (purchase: Purchase) => void;
  onEditDraft?: (purchase: Purchase) => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const COMMON_CANCEL_REASONS = [
  'Supplier out of stock / unable to fulfill',
  'Found better price / alternate supplier',
  'Customer order cancelled / demand reduced',
  'Duplicate order created by mistake',
  'Delivery delay / deadline passed',
];

export const PurchaseListTab: React.FC<PurchaseListTabProps> = ({
  purchases,
  loading,
  onRefresh,
  onOpenReturn,
  onEditDraft,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'DRAFT' | 'CANCELLED'>('ALL');

  // Detail Modal
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Print Slip Modal
  const [slipTarget, setSlipTarget] = useState<Purchase | null>(null);

  // Cancellation Modal
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleSubmittingDraft = async (p: Purchase) => {
    try {
      await purchaseService.submitDraftPurchase(p.id);
      onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to submit purchase order.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await purchaseService.cancelPurchase(cancelTarget.id, cancelReason.trim() || 'Order cancelled by user');
      setCancelTarget(null);
      setCancelReason('');
      onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to cancel purchase order.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.purchase_number.toLowerCase().includes(q) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) ||
      (p.supplier_company && p.supplier_company.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter !== 'ALL') matchesStatus = p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Standardized Search & Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: '220px', maxWidth: '380px' }}>
          <input
            type="text"
            placeholder="Search purchase #, supplier..."
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.375rem',
            padding: '0.35rem 0.5rem',
            color: 'var(--text-main)',
            outline: 'none',
            fontSize: '0.75rem',
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted (Restocked)</option>
          <option value="DRAFT">Draft Orders</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Purchases Table Card */}
      <Card
        title="Purchase Orders Log"
        icon={<ShoppingBag size={18} />}
      >
        {loading ? (
          <LoadingSpinner label="Loading purchase orders..." />
        ) : filteredPurchases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No purchase orders match the filter criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Purchase #</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Supplier</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Grand Total</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Payable</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', opacity: p.status === 'CANCELLED' ? 0.6 : 1 }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: 'var(--primary-400)',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.25rem',
                      }}>
                        {p.purchase_number}
                      </code>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {p.date}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                        <Building size={13} style={{ color: 'var(--primary-400)' }} />
                        <span>{p.supplier_company || p.supplier_name}</span>
                      </div>
                      {p.supplier_company && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{p.supplier_name}</div>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      <Badge variant={p.status === 'SUBMITTED' ? 'success' : p.status === 'DRAFT' ? 'warning' : 'danger'}>
                        {p.status}
                      </Badge>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      Rs. {formatMoney(p.grand_total)}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                      Rs. {formatMoney(p.paid_amount)}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: p.payable_amount > 0 ? 700 : 400, color: p.payable_amount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      Rs. {formatMoney(p.payable_amount)}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                        <Button
                          variant="outline"
                          icon={<Eye size={12} />}
                          style={{ padding: '0.25rem 0.45rem' }}
                          title="View Order Details"
                          onClick={() => setSelectedPurchase(p)}
                        />

                        <Button
                          variant="outline"
                          icon={<Printer size={12} />}
                          style={{ padding: '0.25rem 0.45rem', color: 'var(--primary-400)', borderColor: 'var(--primary-400)' }}
                          title="Print Purchase Order Slip"
                          onClick={() => setSlipTarget(p)}
                        />

                        {p.status === 'DRAFT' && (
                          <>
                            {onEditDraft && (
                              <Button
                                variant="outline"
                                icon={<Edit2 size={12} />}
                                style={{ padding: '0.25rem 0.45rem', color: 'var(--primary-400)', borderColor: 'var(--primary-400)' }}
                                title="Edit Draft Purchase Order"
                                onClick={() => onEditDraft(p)}
                              />
                            )}
                            <Button
                              variant="primary"
                              icon={<CheckCircle2 size={12} />}
                              style={{ padding: '0.25rem 0.45rem' }}
                              title="Submit & Restock Inventory"
                              onClick={() => handleSubmittingDraft(p)}
                            />
                          </>
                        )}

                        {p.status === 'SUBMITTED' && (
                          <>
                            <Button
                              variant="outline"
                              icon={<RotateCcw size={12} />}
                              style={{ padding: '0.25rem 0.45rem', color: 'var(--primary-400)', borderColor: 'var(--primary-400)' }}
                              title="Return Items"
                              onClick={() => onOpenReturn(p)}
                            />
                            <Button
                              variant="outline"
                              icon={<XCircle size={12} />}
                              style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                              title="Cancel Order & Reverse Stock"
                              onClick={() => {
                                setCancelTarget(p);
                                setCancelReason('');
                              }}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <Modal
          isOpen={!!selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          title={`Purchase Order: ${selectedPurchase.purchase_number}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge variant={selectedPurchase.status === 'SUBMITTED' ? 'success' : selectedPurchase.status === 'DRAFT' ? 'warning' : 'danger'}>
                Status: {selectedPurchase.status}
              </Badge>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Payment Method: <strong>{selectedPurchase.payment_method_name || 'Cash / Bank'}</strong>
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.45rem 0.5rem' }}>SKU</th>
                    <th style={{ padding: '0.45rem 0.5rem' }}>Product</th>
                    <th style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>Returned</th>
                    <th style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchase.items.map((item: PurchaseItem) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.45rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>{item.product_sku}</td>
                      <td style={{ padding: '0.45rem 0.5rem', fontWeight: 600 }}>{item.product_name}</td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{item.quantity}</td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(item.purchase_rate)}</td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: item.returned_quantity > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {item.returned_quantity}
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        Rs. {formatMoney(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div style={{
              backgroundColor: 'var(--bg-app)',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              fontSize: '0.8125rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(selectedPurchase.subtotal)}</span>
              </div>
              {selectedPurchase.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Discount:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>- Rs. {formatMoney(selectedPurchase.discount_amount)}</span>
                </div>
              )}
              {selectedPurchase.tax_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Tax / Shipping:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>+ Rs. {formatMoney(selectedPurchase.tax_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', fontWeight: 800 }}>
                <span>Grand Total:</span>
                <span style={{ color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(selectedPurchase.grand_total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                <span>Paid Amount:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(selectedPurchase.paid_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: selectedPurchase.payable_amount > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 700 }}>
                <span>Outstanding Payable:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(selectedPurchase.payable_amount)}</span>
              </div>
            </div>

            {/* Supplier Invoice Reference & Attachment */}
            {(selectedPurchase.supplier_invoice_number || selectedPurchase.supplier_invoice_file) && (
              <div style={{
                padding: '0.625rem 0.875rem',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78125rem' }}>
                  <FileText size={15} color="var(--primary-400)" />
                  <span>
                    Supplier Invoice Ref: <strong>{selectedPurchase.supplier_invoice_number || 'N/A'}</strong>
                  </span>
                </div>
                {selectedPurchase.supplier_invoice_file && (
                  <a
                    href={selectedPurchase.supplier_invoice_file}
                    target="_blank"
                    rel="noreferrer"
                    download={`Supplier_Invoice_${selectedPurchase.purchase_number}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.6rem',
                      backgroundColor: 'var(--primary-600)',
                      color: '#fff',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={12} />
                    <span>View / Download Invoice</span>
                  </a>
                )}
              </div>
            )}

            {selectedPurchase.notes && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Notes: {selectedPurchase.notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <Button
                variant="primary"
                icon={<Printer size={14} />}
                onClick={() => setSlipTarget(selectedPurchase)}
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                }}
              >
                Print Purchase Slip
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Purchase Order Slip Modal */}
      <PurchaseOrderSlipModal
        isOpen={!!slipTarget}
        onClose={() => setSlipTarget(null)}
        purchase={slipTarget}
      />

      {/* Cancel Confirmation Modal with Optional Dropdown + Custom Field */}
      {cancelTarget && (
        <Modal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title={`Cancel Purchase Order: ${cancelTarget.purchase_number}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Select Cancellation Reason (Optional)
              </label>
              <select
                value={COMMON_CANCEL_REASONS.includes(cancelReason) ? cancelReason : (cancelReason ? 'OTHER' : '')}
                onChange={(e) => {
                  if (e.target.value === 'OTHER') {
                    setCancelReason('');
                  } else {
                    setCancelReason(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              >
                <option value="">-- Select reason (or type below) --</option>
                {COMMON_CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="OTHER">Other / Custom reason</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Custom Notes / Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Wrong items shipped / Delivery damaged"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <Button variant="outline" onClick={() => setCancelTarget(null)} style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                Abort
              </Button>
              <Button
                variant="primary"
                loading={cancelling}
                onClick={handleConfirmCancel}
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
