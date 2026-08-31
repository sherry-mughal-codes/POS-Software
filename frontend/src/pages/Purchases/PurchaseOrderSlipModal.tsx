import React, { useState } from 'react';
import {
  Printer,
  Sliders,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Purchase, PurchaseItem } from '../../types/purchase';
import { useSettings } from '../../context/SettingsContext';
import { printThermalElement } from '../../utils/printReceipt';

interface PurchaseOrderSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  if (num % 1 === 0) {
    return num.toLocaleString();
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const PurchaseOrderSlipModal: React.FC<PurchaseOrderSlipModalProps> = ({
  isOpen,
  onClose,
  purchase,
}) => {
  const {
    companyName,
    companyLogo,
    companyAddress,
    companyPhone,
    taxId,
    currencySymbol,
  } = useSettings();

  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!purchase) return null;

  const handlePrint = () => {
    printThermalElement('po-thermal-slip', {
      paperWidth,
      title: `PO_${purchase.purchase_number}`,
    });
  };

  const isDraft = purchase.status === 'DRAFT';
  const isSubmitted = purchase.status === 'SUBMITTED';
  const isCancelled = purchase.status === 'CANCELLED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Order Voucher: ${purchase.purchase_number}`}
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Width Switcher */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-app)',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Sliders size={14} /> Slip Width:
          </span>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={() => setPaperWidth('80mm')}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '0.375rem',
                border: '1px solid',
                borderColor: paperWidth === '80mm' ? 'var(--primary-400)' : 'var(--border-subtle)',
                backgroundColor: paperWidth === '80mm' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: paperWidth === '80mm' ? 'var(--primary-400)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              80mm (Standard)
            </button>
            <button
              onClick={() => setPaperWidth('58mm')}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '0.375rem',
                border: '1px solid',
                borderColor: paperWidth === '58mm' ? 'var(--primary-400)' : 'var(--border-subtle)',
                backgroundColor: paperWidth === '58mm' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: paperWidth === '58mm' ? 'var(--primary-400)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              58mm (Small)
            </button>
          </div>
        </div>

        {/* Printable Slip Paper Container */}
        <div
          id="po-thermal-slip"
          className="pos-thermal-receipt"
          style={{
            backgroundColor: '#ffffff',
            color: '#111827',
            padding: '1.25rem 1rem',
            borderRadius: '0.5rem',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: paperWidth === '58mm' ? '0.72rem' : '0.8125rem',
            lineHeight: 1.35,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: paperWidth === '58mm' ? '320px' : '400px',
            margin: '0 auto',
          }}
        >
          {/* Header & Logo */}
          <div style={{ textAlign: 'center', marginBottom: '0.875rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.75rem' }}>
            {companyLogo && (
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={companyLogo}
                  alt="Store Logo"
                  style={{ maxHeight: '45px', maxWidth: '140px', objectFit: 'contain' }}
                />
              </div>
            )}
            <h3 style={{ fontSize: '1.125rem', fontWeight: 900, margin: '0 0 0.25rem 0', letterSpacing: '0.05em' }}>
              {companyName}
            </h3>
            {companyAddress && <div style={{ fontSize: '0.6875rem', color: '#4b5563' }}>{companyAddress}</div>}
            <div style={{ fontSize: '0.6875rem', color: '#4b5563' }}>
              {companyPhone && `Tel: ${companyPhone}`} {taxId && ` | NTN: ${taxId}`}
            </div>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 900,
              letterSpacing: '0.1em',
              marginTop: '0.35rem',
              textTransform: 'uppercase',
              color: '#0f172a',
            }}>
              === PURCHASE ORDER ===
            </div>
            {isDraft && (
              <div style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.1rem 0.5rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                color: '#b45309',
                borderRadius: '0.25rem',
                fontSize: '0.6875rem',
                fontWeight: 800,
              }}>
                [ DRAFT ORDER - PENDING APPROVAL ]
              </div>
            )}
            {isSubmitted && (
              <div style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.1rem 0.5rem',
                backgroundColor: '#dcfce7',
                border: '1px solid #22c55e',
                color: '#15803d',
                borderRadius: '0.25rem',
                fontSize: '0.6875rem',
                fontWeight: 800,
              }}>
                [ SUBMITTED & RESTOCKED ]
              </div>
            )}
            {isCancelled && (
              <div style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.1rem 0.5rem',
                backgroundColor: '#fee2e2',
                border: '1px solid #ef4444',
                color: '#b91c1c',
                borderRadius: '0.25rem',
                fontSize: '0.6875rem',
                fontWeight: 800,
              }}>
                [ ORDER CANCELLED ]
              </div>
            )}
            {(purchase.returned_amount ?? 0) > 0 && (
              <div style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                marginLeft: '0.35rem',
                padding: '0.1rem 0.5rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                color: '#b45309',
                borderRadius: '0.25rem',
                fontSize: '0.6875rem',
                fontWeight: 800,
              }}>
                [ RETURNED: {currencySymbol} {formatMoney(purchase.returned_amount)} ]
              </div>
            )}
          </div>

          {/* Meta details */}
          <div style={{ fontSize: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>PO #: <strong>{purchase.purchase_number}</strong></span>
              <span>Date: <strong>{purchase.date}</strong></span>
            </div>
            <div style={{ marginTop: '0.2rem' }}>
              <span>Supplier: <strong>{purchase.supplier_company || purchase.supplier_name}</strong></span>
              {purchase.supplier_company && purchase.supplier_name && (
                <div style={{ fontSize: '0.6875rem', color: '#4b5563' }}>Attn: {purchase.supplier_name}</div>
              )}
            </div>
            {purchase.supplier_invoice_number && (
              <div style={{ marginTop: '0.15rem' }}>
                <span>Supplier Inv Ref: <strong>{purchase.supplier_invoice_number}</strong></span>
              </div>
            )}
            <div style={{ marginTop: '0.15rem' }}>
              <span>Payment Mode: <strong>{purchase.payment_method_name || 'Cash / Credit'}</strong></span>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111827', textAlign: 'left' }}>
                <th style={{ padding: '0.25rem 0' }}>Item</th>
                <th style={{ padding: '0.25rem 0', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '0.25rem 0', textAlign: 'right' }}>Rate</th>
                <th style={{ padding: '0.25rem 0', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item: PurchaseItem) => (
                <tr key={item.id} style={{ borderBottom: '1px dotted #e5e7eb' }}>
                  <td style={{ padding: '0.35rem 0' }}>
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                    <code style={{ fontSize: '0.65rem', color: '#6b7280' }}>{item.product_sku}</code>
                  </td>
                  <td style={{ padding: '0.35rem 0', textAlign: 'center', fontFamily: 'monospace' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '0.35rem 0', textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatMoney(item.purchase_rate)}
                  </td>
                  <td style={{ padding: '0.35rem 0', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatMoney(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Breakdown */}
          <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span style={{ fontFamily: 'monospace' }}>{currencySymbol} {formatMoney(purchase.subtotal)}</span>
            </div>

            {purchase.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                <span>Discount:</span>
                <span style={{ fontFamily: 'monospace' }}>- {currencySymbol} {formatMoney(purchase.discount_amount)}</span>
              </div>
            )}

            {purchase.tax_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax / Freight:</span>
                <span style={{ fontFamily: 'monospace' }}>+ {currencySymbol} {formatMoney(purchase.tax_amount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.9375rem', marginTop: '0.25rem', borderTop: '1px solid #111827', paddingTop: '0.35rem' }}>
              <span>GRAND TOTAL:</span>
              <span style={{ fontFamily: 'monospace' }}>{currencySymbol} {formatMoney(purchase.grand_total)}</span>
            </div>

            {(purchase.returned_amount ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 700, marginTop: '0.15rem' }}>
                <span>Returned Merchandise:</span>
                <span style={{ fontFamily: 'monospace' }}>- {currencySymbol} {formatMoney(purchase.returned_amount)}</span>
              </div>
            )}

            {isDraft ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', color: '#4b5563' }}>
                  <span>Paid Amount:</span>
                  <span style={{ fontFamily: 'monospace' }}>{currencySymbol} 0.00 <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>(Draft - Unpaid)</span></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#b45309' }}>
                  <span>Estimated Payable:</span>
                  <span style={{ fontFamily: 'monospace' }}>{currencySymbol} {formatMoney(purchase.grand_total)}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span>Paid Amount:</span>
                  <span style={{ fontFamily: 'monospace' }}>{currencySymbol} {formatMoney(purchase.paid_amount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: purchase.payable_amount > 0 ? '#b45309' : '#15803d' }}>
                  <span>Balance Payable:</span>
                  <span style={{ fontFamily: 'monospace' }}>{currencySymbol} {formatMoney(purchase.payable_amount)}</span>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div style={{ fontSize: '0.6875rem', marginTop: '0.75rem', borderTop: '1px dashed #9ca3af', paddingTop: '0.5rem', color: '#4b5563' }}>
              <strong>Notes / Terms:</strong> {purchase.notes}
            </div>
          )}

          {/* Dual Signature Blocks */}
          <div style={{ marginTop: '1.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #9ca3af' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#374151' }}>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.25rem', height: '1.25rem' }}></div>
                <strong>Prepared By</strong>
              </div>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.25rem', height: '1.25rem' }}></div>
                <strong>Authorized Receiver</strong>
              </div>
            </div>
          </div>

          {/* Slip Footer */}
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.6875rem', color: '#6b7280' }}>
            <div>System Generated Purchase Order • ApexPOS</div>
            <div style={{ fontSize: '0.625rem', marginTop: '0.15rem' }}>Printed on: {new Date().toLocaleString()}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          <Button
            variant="primary"
            icon={<Printer size={16} />}
            onClick={handlePrint}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              fontWeight: 700,
            }}
          >
            Print Purchase Slip ({paperWidth})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
