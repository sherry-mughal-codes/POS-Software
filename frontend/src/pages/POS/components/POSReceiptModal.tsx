import React, { useEffect, useState } from 'react';
import {
  Printer,
  Sliders,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Sale } from '../../../types/sales';
import { useSettings } from '../../../context/SettingsContext';
import { printThermalElement } from '../../../utils/printReceipt';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const {
    companyName,
    companyLogo,
    companyAddress,
    companyPhone,
    taxId,
    receiptHeader,
    receiptFooter,
    currencySymbol,
    autoPrintReceipt,
  } = useSettings();

  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  useEffect(() => {
    if (isOpen && sale && autoPrintReceipt) {
      const timer = setTimeout(() => {
        printThermalElement('pos-thermal-receipt', {
          paperWidth,
          title: `Receipt_${sale.invoice_number}`,
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sale, autoPrintReceipt, paperWidth]);

  if (!sale) return null;

  const handlePrint = () => {
    printThermalElement('pos-thermal-receipt', {
      paperWidth,
      title: `Receipt_${sale.invoice_number}`,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receipt: ${sale.invoice_number}`}
      maxWidth="460px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Paper Size Preset Switcher */}
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
              80mm (Standard POS)
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

        {/* Printable Receipt Paper Container */}
        <div
          id="pos-thermal-receipt"
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
            {receiptHeader && (
              <div style={{ fontSize: '0.8125rem', color: '#000000', marginTop: '0.25rem', fontWeight: 800 }}>
                {receiptHeader}
              </div>
            )}
          </div>

          {/* Meta details */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.75rem', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Invoice: <strong style={{ fontWeight: 900, fontSize: '0.875rem' }}>{sale.invoice_number}</strong></span>
              <span>{new Date(sale.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span>Cashier: <strong style={{ fontWeight: 800 }}>{sale.cashier_name}</strong></span>
              <span>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ marginTop: '0.2rem' }}>
              <span>Customer: <strong style={{ fontWeight: 800 }}>{sale.customer_name} {sale.customer_is_walkin ? '' : `(${sale.customer_code})`}</strong></span>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem', fontSize: '0.8125rem', fontWeight: 700, color: '#000000' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #000000', textAlign: 'left' }}>
                <th style={{ padding: '0.35rem 0', fontWeight: 900, color: '#000000' }}>Item</th>
                <th style={{ padding: '0.35rem 0', textAlign: 'center', fontWeight: 900, color: '#000000' }}>Qty</th>
                <th style={{ padding: '0.35rem 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>Price</th>
                <th style={{ padding: '0.35rem 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px dotted #000000' }}>
                  <td style={{ padding: '0.4rem 0' }}>
                    <div style={{ fontWeight: 800, color: '#000000' }}>{item.product_name}</div>
                  </td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                    {formatMoney(item.unit_price)}
                  </td>
                  <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>
                    {formatMoney(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Calculation */}
          <div style={{ borderTop: '1.5px dashed #000000', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8125rem', fontWeight: 700, color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 800 }}>{currencySymbol} {formatMoney(sale.subtotal)}</span>
            </div>

            {sale.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000' }}>
                <span>Discount:</span>
                <span style={{ fontWeight: 800 }}>- {currencySymbol} {formatMoney(sale.discount_amount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.0625rem', marginTop: '0.25rem', borderTop: '2px solid #000000', paddingTop: '0.4rem', color: '#000000' }}>
              <span>TOTAL:</span>
              <span>{currencySymbol} {formatMoney(sale.grand_total)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span>
                Payment ({sale.payment_method === 'CREDIT' ? (sale.due_amount <= 0 ? 'Credit - Settled' : 'Credit') : sale.payment_method === 'CHEQUE' ? 'Cheque' : sale.payment_method === 'CARD' ? 'Bank / Card' : (sale.payment_method_display || sale.payment_method)}):
              </span>
              <span style={{ fontWeight: 800 }}>{currencySymbol} {formatMoney(sale.paid_amount)}</span>
            </div>

            {sale.cheque_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#000000', fontWeight: 700 }}>
                <span>Cheque #:</span>
                <span>{sale.cheque_number} {sale.cheque_bank ? `(${sale.cheque_bank})` : ''}</span>
              </div>
            )}

            {sale.change_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Change Returned:</span>
                <span style={{ fontWeight: 800 }}>{currencySymbol} {formatMoney(sale.change_amount)}</span>
              </div>
            )}

            {sale.due_amount > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000', fontWeight: 900, fontSize: '0.875rem' }}>
                <span>Receivable Due:</span>
                <span>{currencySymbol} {formatMoney(sale.due_amount)}</span>
              </div>
            ) : sale.payment_method === 'CREDIT' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000', fontWeight: 900, fontSize: '0.8125rem' }}>
                <span>Payment Status:</span>
                <span>PAID IN FULL (SETTLED)</span>
              </div>
            ) : null}
          </div>

          {/* Footer Barcode / Slogan */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', borderTop: '1.5px dashed #000000', paddingTop: '0.75rem', color: '#000000' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 900 }}>*** THANK YOU FOR SHOPPING! ***</div>
            <div style={{ fontSize: '0.75rem', color: '#000000', marginTop: '0.25rem', fontWeight: 700 }}>
              {receiptFooter || 'Items returnable within 7 days with original receipt.'}
            </div>
            <div style={{ letterSpacing: '0.2em', fontSize: '1rem', marginTop: '0.5rem', fontWeight: 900, color: '#000000' }}>
              *||| | |||| | |||*
            </div>
          </div>
        </div>

        {/* Modal Print & Close Buttons */}
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
            Print Slip ({paperWidth})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
