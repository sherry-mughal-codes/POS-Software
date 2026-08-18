import React, { useEffect } from 'react';
import {
  Printer,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Sale } from '../../../types/sales';
import { useSettings } from '../../../context/SettingsContext';

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

  useEffect(() => {
    if (isOpen && sale && autoPrintReceipt) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sale, autoPrintReceipt]);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receipt: ${sale.invoice_number}`}
      maxWidth="440px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Printable Receipt Paper Container */}
        <div
          id="pos-thermal-receipt"
          style={{
            backgroundColor: '#ffffff',
            color: '#111827',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '0.8125rem',
            lineHeight: 1.4,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Header & Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.75rem' }}>
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
            {receiptHeader && (
              <div style={{ fontSize: '0.6875rem', color: '#0369a1', marginTop: '0.25rem', fontWeight: 600 }}>
                {receiptHeader}
              </div>
            )}
          </div>

          {/* Meta details */}
          <div style={{ fontSize: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Invoice: <strong>{sale.invoice_number}</strong></span>
              <span>{new Date(sale.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.125rem' }}>
              <span>Cashier: {sale.cashier_name}</span>
              <span>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ marginTop: '0.125rem' }}>
              <span>Customer: {sale.customer_name} {sale.customer_is_walkin ? '' : `(${sale.customer_code})`}</span>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111827', textAlign: 'left' }}>
                <th style={{ padding: '0.25rem 0' }}>Item</th>
                <th style={{ padding: '0.25rem 0', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '0.25rem 0', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '0.25rem 0', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px dotted #e5e7eb' }}>
                  <td style={{ padding: '0.35rem 0' }}>
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                  </td>
                  <td style={{ padding: '0.35rem 0', textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '0.35rem 0', textAlign: 'right' }}>
                    {formatMoney(item.unit_price)}
                  </td>
                  <td style={{ padding: '0.35rem 0', textAlign: 'right', fontWeight: 700 }}>
                    {formatMoney(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Calculation */}
          <div style={{ borderTop: '1px dashed #9ca3af', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>{currencySymbol} {formatMoney(sale.subtotal)}</span>
            </div>

            {sale.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                <span>Discount:</span>
                <span>- {currencySymbol} {formatMoney(sale.discount_amount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.9375rem', marginTop: '0.25rem', borderTop: '1px solid #111827', paddingTop: '0.35rem' }}>
              <span>TOTAL:</span>
              <span>{currencySymbol} {formatMoney(sale.grand_total)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span>
                Payment ({sale.payment_method === 'CREDIT' ? (sale.due_amount <= 0 ? 'Credit - Settled' : 'Credit') : sale.payment_method_display}):
              </span>
              <span>{currencySymbol} {formatMoney(sale.paid_amount)}</span>
            </div>

            {sale.change_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Change Returned:</span>
                <span>{currencySymbol} {formatMoney(sale.change_amount)}</span>
              </div>
            )}

            {sale.due_amount > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', fontWeight: 700 }}>
                <span>Receivable Due:</span>
                <span>{currencySymbol} {formatMoney(sale.due_amount)}</span>
              </div>
            ) : sale.payment_method === 'CREDIT' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 700, fontSize: '0.75rem' }}>
                <span>Payment Status:</span>
                <span>PAID IN FULL (SETTLED)</span>
              </div>
            ) : null}
          </div>

          {/* Footer Barcode / Slogan */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', borderTop: '1px dashed #9ca3af', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>*** THANK YOU FOR SHOPPING! ***</div>
            <div style={{ fontSize: '0.6875rem', color: '#4b5563', marginTop: '0.25rem' }}>
              {receiptFooter || 'Items returnable within 7 days with original receipt.'}
            </div>
            <div style={{ letterSpacing: '0.2em', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 900 }}>
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
            Print Receipt (Ctrl+P)
          </Button>
        </div>
      </div>
    </Modal>
  );
};
