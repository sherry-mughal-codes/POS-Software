import React, { useRef, useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { CommissionRecord, CommissionPayment } from '../../types/commission';
import { commissionService } from '../../services/commissionService';
import { useSettings } from '../../context/SettingsContext';

interface CommissionSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: CommissionRecord | null;
  paymentId?: number;
}

export const CommissionSlipModal: React.FC<CommissionSlipModalProps> = ({
  isOpen,
  onClose,
  payable,
  paymentId,
}) => {
  const { companyName, companyPhone, companyAddress, companyEmail } = useSettings();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [slipData, setSlipData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && payable) {
      const fetchSlip = async () => {
        try {
          setLoading(true);
          const data = await commissionService.getCommissionSlip(payable.id, paymentId);
          setSlipData(data);
        } catch (err) {
          console.error('Failed to fetch slip data:', err);
          // Fallback to locally available payable data
          setSlipData({
            company: {
              name: companyName || 'ApexPOS Enterprise Store',
              phone: companyPhone || '',
              email: companyEmail || '',
              address: companyAddress || '',
            },
            payable,
            payment: payable.payments?.[0] || null,
            print_timestamp: new Date().toLocaleString(),
          });
        } finally {
          setLoading(false);
        }
      };

      fetchSlip();
    }
  }, [isOpen, payable, paymentId, companyName, companyPhone, companyAddress, companyEmail]);

  if (!payable) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=700,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Commission Slip - ${payable.record_number}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
            }
            .slip-container {
              max-width: 80mm;
              margin: 0 auto;
              padding: 6px;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .title { font-size: 14px; font-weight: 800; text-transform: uppercase; }
            .subtitle { font-size: 10px; color: #444; }
            .total-row { font-size: 12px; font-weight: 800; }
            .signatures { margin-top: 25px; display: flex; justify-content: space-between; }
            .sign-line { border-top: 1px solid #000; width: 45%; text-align: center; font-size: 9px; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="slip-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const rec = slipData?.payable || payable;
  const company = slipData?.company || {
    name: companyName || 'ApexPOS Enterprise Store',
    phone: companyPhone || '',
    address: companyAddress || '',
  };
  const activePayment: CommissionPayment | undefined = slipData?.payment || rec.payments?.[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sales Agent Commission Slip" maxWidth="450px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Printable Thermal Receipt Box */}
        <div
          ref={printAreaRef}
          style={{
            backgroundColor: '#ffffff',
            color: '#111827',
            padding: '1.25rem 1rem',
            borderRadius: '0.375rem',
            fontFamily: 'monospace, -apple-system, sans-serif',
            fontSize: '0.8125rem',
            lineHeight: 1.4,
            border: '1px solid #d1d5db',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {company.name}
            </div>
            {company.address && <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>{company.address}</div>}
            {company.phone && <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>Ph: {company.phone}</div>}
            <div style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0.4rem 0 0.2rem', textTransform: 'uppercase' }}>
              COMMISSION SETTLEMENT SLIP
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #4b5563', margin: '0.4rem 0' }} />

          {/* Record Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Voucher #:</span>
            <span style={{ fontWeight: 700 }}>{rec.record_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Linked Invoice:</span>
            <span style={{ fontWeight: 700 }}>{rec.sale_invoice_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date:</span>
            <span>{rec.date || rec.sale_date}</span>
          </div>

          <div style={{ borderTop: '1px dashed #4b5563', margin: '0.4rem 0' }} />

          {/* Sales Agent Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sales Agent:</span>
            <span style={{ fontWeight: 700 }}>{rec.sales_agent_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Agent Code:</span>
            <span>{rec.sales_agent_code}</span>
          </div>
          {rec.sales_agent_phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Contact:</span>
              <span>{rec.sales_agent_phone}</span>
            </div>
          )}

          <div style={{ borderTop: '1px dashed #4b5563', margin: '0.4rem 0' }} />

          {/* Financial Breakdown */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Commission Base (Net):</span>
            <span>Rs. {Number(rec.commission_base_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Commission Rate:</span>
            <span>{rec.commission_rate_percentage}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total Accrued:</span>
            <span>Rs. {Number(rec.commission_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {Number(rec.adjusted_amount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
              <span>Return Deductions:</span>
              <span>- Rs. {Number(rec.adjusted_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          <div style={{ borderTop: '1px solid #111827', margin: '0.4rem 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Paid To Date:</span>
            <span style={{ fontWeight: 700 }}>Rs. {Number(rec.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {activePayment && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 700 }}>
              <span>Current Payment ({activePayment.payment_number}):</span>
              <span>Rs. {Number(activePayment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, marginTop: '0.2rem' }}>
            <span>Remaining Due:</span>
            <span>Rs. {Number(rec.balance_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {Number(rec.advance_credit || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontSize: '0.75rem' }}>
              <span>Advance Credit:</span>
              <span>Rs. {Number(rec.advance_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          <div style={{ borderTop: '1px dashed #4b5563', margin: '0.6rem 0' }} />

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.75rem' }}>
            <div style={{ borderTop: '1px solid #111827', width: '42%', textAlign: 'center', fontSize: '0.7rem', paddingTop: '0.2rem' }}>
              Agent Signature
            </div>
            <div style={{ borderTop: '1px solid #111827', width: '42%', textAlign: 'center', fontSize: '0.7rem', paddingTop: '0.2rem' }}>
              Cashier Signature
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#6b7280', marginTop: '0.75rem' }}>
            Printed: {slipData?.print_timestamp || new Date().toLocaleString()}
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={<Printer size={16} />} onClick={handlePrint} loading={loading}>
            Print Thermal Slip
          </Button>
        </div>
      </div>
    </Modal>
  );
};
