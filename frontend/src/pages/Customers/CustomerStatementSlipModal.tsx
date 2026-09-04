import React, { useState } from 'react';
import {
  Printer,
  Sliders,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Customer, CustomerStatement } from '../../types/contact';
import { useSettings } from '../../context/SettingsContext';
import { printThermalElement } from '../../utils/printReceipt';

interface CustomerStatementSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  statement: CustomerStatement | null;
  startDate?: string;
  endDate?: string;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const CustomerStatementSlipModal: React.FC<CustomerStatementSlipModalProps> = ({
  isOpen,
  onClose,
  customer,
  statement,
  startDate,
  endDate,
}) => {
  const {
    companyName,
    companyAddress,
    companyPhone,
    taxId,
    currencySymbol,
  } = useSettings();

  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm' | 'A4'>('80mm');

  if (!customer || !statement) return null;

  const handlePrint = () => {
    printThermalElement('customer-statement-thermal-slip', {
      paperWidth,
      title: `Statement_${customer.customer_id}`,
    });
  };

  const is58 = paperWidth === '58mm';
  const isA4 = paperWidth === 'A4';
  const closingBal = statement.summary.closing_balance;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Print Customer Statement — ${customer.name}`}
      maxWidth={isA4 ? '780px' : '560px'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Controls Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-app)',
          padding: '0.625rem 0.875rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Sliders size={14} /> Paper Format:
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
              80mm (Thermal POS)
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
              58mm (Mini)
            </button>
            <button
              onClick={() => setPaperWidth('A4')}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '0.375rem',
                border: '1px solid',
                borderColor: paperWidth === 'A4' ? 'var(--primary-400)' : 'var(--border-subtle)',
                backgroundColor: paperWidth === 'A4' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: paperWidth === 'A4' ? 'var(--primary-400)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              A4 (Full Page)
            </button>
          </div>
        </div>

        {/* Printable Thermal Slip Preview */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '1rem',
          borderRadius: '0.5rem',
          display: 'flex',
          justifyContent: 'center',
          maxHeight: '75vh',
          minHeight: '260px',
          overflowY: 'auto',
          border: '1px solid var(--border-medium)',
        }}>
          <div
            id="customer-statement-thermal-slip"
            className="pos-thermal-receipt"
            style={{
              width: '100%',
              maxWidth: paperWidth === '58mm' ? '220px' : paperWidth === 'A4' ? '700px' : '300px',
              height: 'auto',
              minHeight: 'auto',
              maxHeight: 'none',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: is58 ? '10px 6px' : isA4 ? '24px 20px' : '14px 10px',
              fontFamily: "'Courier New', Courier, monospace, system-ui, sans-serif",
              fontSize: is58 ? '11px' : isA4 ? '14px' : '12.5px',
              fontWeight: 700,
              lineHeight: 1.35,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              borderRadius: '2px',
              boxSizing: 'border-box',
              overflow: 'visible',
            }}
          >
            {/* Store Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px', color: '#000000' }}>
              <div style={{ fontSize: is58 ? '14px' : '16px', fontWeight: 900, textTransform: 'uppercase', color: '#000000' }}>
                {companyName || 'APEXPOS STORE'}
              </div>
              {companyAddress && (
                <div style={{ fontSize: is58 ? '10.5px' : '12px', color: '#000000', fontWeight: 700, marginTop: '2px' }}>
                  {companyAddress}
                </div>
              )}
              {companyPhone && (
                <div style={{ fontSize: is58 ? '10.5px' : '12px', color: '#000000', fontWeight: 700 }}>
                  Tel: {companyPhone}
                </div>
              )}
              {taxId && (
                <div style={{ fontSize: is58 ? '10.5px' : '12px', color: '#000000', fontWeight: 700 }}>
                  NTN: {taxId}
                </div>
              )}
              <div style={{ margin: '6px 0 4px 0', borderBottom: '1.5px dashed #000000' }} />
              <div style={{ fontSize: is58 ? '12px' : '14px', fontWeight: 900, letterSpacing: '1px', color: '#000000' }}>
                STATEMENT OF ACCOUNT
              </div>
              <div style={{ fontSize: is58 ? '10px' : '11.5px', color: '#000000', fontWeight: 700 }}>
                {startDate && endDate ? `${startDate} to ${endDate}` : `As of ${new Date().toISOString().split('T')[0]}`}
              </div>
              <div style={{ margin: '4px 0 6px 0', borderBottom: '1.5px dashed #000000' }} />
            </div>

            {/* Customer Details */}
            <div style={{ marginBottom: '8px', fontSize: is58 ? '11px' : '12.5px', color: '#000000', fontWeight: 700 }}>
              <div><strong style={{ fontWeight: 900 }}>Customer:</strong> {customer.name}</div>
              <div><strong style={{ fontWeight: 900 }}>Account ID:</strong> {customer.customer_id}</div>
              {customer.phone && <div><strong style={{ fontWeight: 900 }}>Phone:</strong> {customer.phone}</div>}
              {customer.address && <div><strong style={{ fontWeight: 900 }}>Address:</strong> {customer.address}</div>}
            </div>

            {/* Summary Box */}
            <div style={{
              border: '1.5px solid #000000',
              padding: '6px',
              marginBottom: '8px',
              backgroundColor: '#ffffff',
              fontSize: is58 ? '11px' : '12px',
              fontWeight: 700,
              color: '#000000',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Opening Balance:</span>
                <span style={{ fontWeight: 900 }}>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.opening_balance || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Total Invoiced (+):</span>
                <span style={{ fontWeight: 800 }}>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_debit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Total Payments (-):</span>
                <span style={{ fontWeight: 800 }}>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_payments ?? statement.summary.total_credit)}</span>
              </div>
              {(statement.summary.total_returns ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Sales Returns:</span>
                  <span style={{ fontWeight: 800 }}>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_returns || 0)}</span>
                </div>
              )}
              <div style={{ borderTop: '1.5px dashed #000000', margin: '4px 0', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: is58 ? '12px' : '13px', color: '#000000' }}>
                <span>NET DUE BALANCE:</span>
                <span>{currencySymbol || 'Rs.'} {formatMoney(closingBal)}</span>
              </div>
            </div>

            {/* Itemized Transactions Table */}
            <div style={{ marginBottom: '8px', color: '#000000' }}>
              <div style={{ fontWeight: 900, fontSize: is58 ? '11px' : '12px', textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1.5px solid #000000', paddingBottom: '2px', color: '#000000' }}>
                Transaction History
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: is58 ? '9.5px' : '11px', color: '#000000', fontWeight: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #000000', textAlign: 'left' }}>
                    <th style={{ width: '36%', padding: '3px 0', fontWeight: 900, color: '#000000' }}>Date/Ref</th>
                    <th style={{ width: '21%', padding: '3px 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>Dr(+)</th>
                    <th style={{ width: '21%', padding: '3px 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>Cr(-)</th>
                    <th style={{ width: '22%', padding: '3px 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '6px 0', color: '#000000', fontWeight: 700 }}>
                        No transactions recorded
                      </td>
                    </tr>
                  ) : (
                    statement.rows.map((r, i) => (
                      <React.Fragment key={i}>
                        <tr style={{ verticalAlign: 'top', borderTop: i > 0 ? '1px dotted #ccc' : 'none' }}>
                          <td style={{ width: '36%', padding: '3px 0', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            <div style={{ fontWeight: 900 }}>{r.date}</div>
                            <div style={{ color: '#000000', fontWeight: 800 }}>{r.reference}</div>
                            <div style={{ fontSize: is58 ? '8.5px' : '9.5px', color: '#000000', fontWeight: 700 }}>
                              {r.type_display || (r.type === 'SALE' ? 'Credit Sale' : r.type === 'PAYMENT' ? 'Payment' : 'Sales Return')}
                            </div>
                          </td>
                          <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 700 }}>
                            {Math.abs(r.debit) > 0 ? formatMoney(Math.abs(r.debit)) : '-'}
                          </td>
                          <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 700 }}>
                            {Math.abs(r.credit) > 0
                              ? formatMoney(Math.abs(r.credit))
                              : (r.type === 'RETURN' && ((r as any).returned_amount || (r as any).refund_amount))
                                ? formatMoney((r as any).returned_amount || (r as any).refund_amount)
                                : '-'}
                          </td>
                          <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 900 }}>
                            {formatMoney(Math.max(0, r.running_balance))}
                          </td>
                        </tr>
                        {r.description && (
                          <tr style={{ borderBottom: '1px solid #000000' }}>
                            <td colSpan={4} style={{ padding: '0 0 3px 0', fontSize: is58 ? '9px' : '10px', color: '#000000', fontWeight: 600, wordBreak: 'break-word' }}>
                              ↳ {r.description}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Slip Footer */}
            <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '6px', borderTop: '1.5px dashed #000000', fontSize: is58 ? '10px' : '11px', color: '#000000', fontWeight: 800 }}>
              <div>This is a computer generated statement.</div>
              <div style={{ marginTop: '2px', fontWeight: 900 }}>Thank you for your business!</div>
              <div style={{ fontSize: '9px', color: '#000000', marginTop: '3px', fontWeight: 700 }}>
                Printed: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={<Printer size={15} />} onClick={handlePrint}>
            Print Statement ({paperWidth})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
