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
            color: '#000000',
            padding: '1.25rem 1rem',
            borderRadius: '0.5rem',
            fontFamily: "'Courier New', Courier, monospace, system-ui, sans-serif",
            fontSize: paperWidth === '58mm' ? '0.8125rem' : '0.875rem',
            fontWeight: 700,
            lineHeight: 1.4,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: paperWidth === '58mm' ? '330px' : '400px',
            margin: '0 auto',
          }}
        >
          {/* Header & Logo */}
          <div style={{ textAlign: 'center', marginBottom: '0.875rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.75rem' }}>
            {companyLogo && (
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={companyLogo}
                  alt="Store Logo"
                  style={{ maxHeight: '50px', maxWidth: '150px', objectFit: 'contain' }}
                />
              </div>
            )}
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.25rem 0', letterSpacing: '0.05em', color: '#000000' }}>
              {companyName}
            </h3>
            {companyAddress && <div style={{ fontSize: '0.8125rem', color: '#000000', fontWeight: 700 }}>{companyAddress}</div>}
            <div style={{ fontSize: '0.8125rem', color: '#000000', fontWeight: 700 }}>
              {companyPhone && `Tel: ${companyPhone}`} {taxId && ` | NTN: ${taxId}`}
            </div>
            <div style={{
              fontSize: '0.9375rem',
              fontWeight: 900,
              letterSpacing: '0.1em',
              marginTop: '0.35rem',
              textTransform: 'uppercase',
              color: '#000000',
            }}>
              === PURCHASE ORDER ===
            </div>
            {isDraft && (
              <div style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.15rem 0.5rem',
                border: '1.5px solid #000000',
                color: '#000000',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 900,
              }}>
                [ DRAFT ORDER - PENDING APPROVAL ]
              </div>
            )}
            {isSubmitted && (
              <div style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.15rem 0.5rem',
                border: '1.5px solid #000000',
                color: '#000000',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 900,
              }}>
                [ SUBMITTED & RESTOCKED ]
              </div>
            )}
            {isCancelled && (
              <div style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.15rem 0.5rem',
                border: '1.5px solid #000000',
                color: '#000000',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 900,
              }}>
                [ ORDER CANCELLED ]
              </div>
            )}
            {(purchase.returned_amount ?? 0) > 0 && (
              <div style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                marginLeft: '0.35rem',
                padding: '0.15rem 0.5rem',
                border: '1.5px solid #000000',
                color: '#000000',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 900,
              }}>
                [ RETURNED: {currencySymbol} {formatMoney(purchase.returned_amount)} ]
              </div>
            )}
          </div>

          {/* Meta details */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.75rem', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>PO #: <strong style={{ fontWeight: 900, fontSize: '0.875rem' }}>{purchase.purchase_number}</strong></span>
              <span>Date: <strong style={{ fontWeight: 800 }}>{purchase.date}</strong></span>
            </div>
            <div style={{ marginTop: '0.2rem' }}>
              <span>Supplier: <strong style={{ fontWeight: 900 }}>{purchase.supplier_company || purchase.supplier_name}</strong></span>
              {purchase.supplier_company && purchase.supplier_name && (
                <div style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 700 }}>Attn: {purchase.supplier_name}</div>
              )}
            </div>
            {purchase.supplier_invoice_number && (
              <div style={{ marginTop: '0.2rem' }}>
                <span>Supplier Inv Ref: <strong style={{ fontWeight: 800 }}>{purchase.supplier_invoice_number}</strong></span>
              </div>
            )}
            <div style={{ marginTop: '0.2rem' }}>
              <span>Payment Mode: <strong style={{ fontWeight: 800 }}>{purchase.payment_method_name || 'Cash / Credit'}</strong></span>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem', fontSize: '0.8125rem', fontWeight: 700, color: '#000000' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #000000', textAlign: 'left' }}>
                <th style={{ padding: '0.35rem 0', fontWeight: 900, color: '#000000' }}>Item</th>
                <th style={{ padding: '0.35rem 0', textAlign: 'center', fontWeight: 900, color: '#000000' }}>Qty</th>
                <th style={{ padding: '0.35rem 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>Rate</th>
                <th style={{ padding: '0.35rem 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item: PurchaseItem) => (
                <tr key={item.id} style={{ borderBottom: '1px dotted #000000' }}>
                  <td style={{ padding: '0.4rem 0' }}>
                    <div style={{ fontWeight: 900, color: '#000000' }}>{item.product_name}</div>
                    <code style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 700 }}>{item.product_sku}</code>
                  </td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                    {formatMoney(item.purchase_rate)}
                  </td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 900, fontFamily: 'monospace' }}>
                    {formatMoney(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Breakdown */}
          <div style={{ borderTop: '1.5px dashed #000000', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8125rem', fontWeight: 700, color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{currencySymbol} {formatMoney(purchase.subtotal)}</span>
            </div>

            {purchase.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000' }}>
                <span>Discount:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>- {currencySymbol} {formatMoney(purchase.discount_amount)}</span>
              </div>
            )}

            {purchase.tax_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax / Freight:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>+ {currencySymbol} {formatMoney(purchase.tax_amount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.0625rem', marginTop: '0.25rem', borderTop: '2px solid #000000', paddingTop: '0.4rem', color: '#000000' }}>
              <span>GRAND TOTAL:</span>
              <span style={{ fontFamily: 'monospace' }}>{currencySymbol} {formatMoney(purchase.grand_total)}</span>
            </div>

            {(purchase.returned_amount ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000', fontWeight: 800, marginTop: '0.15rem' }}>
                <span>Returned Merchandise:</span>
                <span style={{ fontFamily: 'monospace' }}>- {currencySymbol} {formatMoney(purchase.returned_amount)}</span>
              </div>
            )}

            {isDraft ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', color: '#000000' }}>
                  <span>Paid Amount:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{currencySymbol} 0.00 <span style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 900 }}>(Draft - Unpaid)</span></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#000000', fontSize: '0.875rem' }}>
                  <span>Estimated Payable:</span>
                  <span style={{ fontFamily: 'monospace' }}>{currencySymbol} {formatMoney(purchase.grand_total)}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span>Paid Amount:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{currencySymbol} {formatMoney(purchase.paid_amount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#000000', fontSize: '0.875rem' }}>
                  <span>Balance Payable:</span>
                  <span style={{ fontFamily: 'monospace' }}>{currencySymbol} {formatMoney(purchase.payable_amount)}</span>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.75rem', borderTop: '1.5px dashed #000000', paddingTop: '0.5rem', color: '#000000', fontWeight: 700 }}>
              <strong>Notes / Terms:</strong> {purchase.notes}
            </div>
          )}

          {/* Dual Signature Blocks */}
          <div style={{ marginTop: '1.75rem', paddingTop: '0.75rem', borderTop: '1.5px dashed #000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#000000', fontWeight: 800 }}>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <div style={{ borderBottom: '1.5px solid #000000', marginBottom: '0.25rem', height: '1.25rem' }}></div>
                <strong>Prepared By</strong>
              </div>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <div style={{ borderBottom: '1.5px solid #000000', marginBottom: '0.25rem', height: '1.25rem' }}></div>
                <strong>Authorized Receiver</strong>
              </div>
            </div>
          </div>

          {/* Slip Footer */}
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#000000', fontWeight: 800 }}>
            <div>System Generated Purchase Order • ApexPOS</div>
            <div style={{ fontSize: '0.7rem', marginTop: '0.15rem' }}>Printed on: {new Date().toLocaleString()}</div>
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
