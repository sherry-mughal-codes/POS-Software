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

  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!customer || !statement) return null;

  const handlePrint = () => {
    printThermalElement('customer-statement-thermal-slip', {
      paperWidth,
      title: `Statement_${customer.customer_id}`,
    });
  };

  const is58 = paperWidth === '58mm';
  const closingBal = statement.summary.closing_balance;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Print Customer Statement — ${customer.name}`}
      maxWidth="560px"
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
              58mm (Compact Mini)
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
          maxHeight: '440px',
          overflowY: 'auto',
          border: '1px solid var(--border-medium)',
        }}>
          <div
            id="customer-statement-thermal-slip"
            style={{
              width: paperWidth === '58mm' ? '220px' : '300px',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: is58 ? '8px 6px' : '14px 10px',
              fontFamily: "'Courier New', Courier, monospace, system-ui",
              fontSize: is58 ? '10px' : '11.5px',
              lineHeight: 1.3,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              borderRadius: '2px',
            }}
          >
            {/* Store Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: is58 ? '13px' : '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {companyName || 'APEXPOS STORE'}
              </div>
              {companyAddress && (
                <div style={{ fontSize: is58 ? '9px' : '10px', color: '#444', marginTop: '2px' }}>
                  {companyAddress}
                </div>
              )}
              {companyPhone && (
                <div style={{ fontSize: is58 ? '9px' : '10px', color: '#444' }}>
                  Tel: {companyPhone}
                </div>
              )}
              {taxId && (
                <div style={{ fontSize: is58 ? '9px' : '10px', color: '#444' }}>
                  NTN: {taxId}
                </div>
              )}
              <div style={{ margin: '6px 0 4px 0', borderBottom: '1px dashed #000' }} />
              <div style={{ fontSize: is58 ? '11px' : '12.5px', fontWeight: 'bold', letterSpacing: '1px' }}>
                STATEMENT OF ACCOUNT
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {startDate && endDate ? `${startDate} to ${endDate}` : `As of ${new Date().toISOString().split('T')[0]}`}
              </div>
              <div style={{ margin: '4px 0 6px 0', borderBottom: '1px dashed #000' }} />
            </div>

            {/* Customer Details */}
            <div style={{ marginBottom: '8px', fontSize: is58 ? '9.5px' : '11px' }}>
              <div><strong>Customer:</strong> {customer.name}</div>
              <div><strong>Account ID:</strong> {customer.customer_id}</div>
              {customer.phone && <div><strong>Phone:</strong> {customer.phone}</div>}
              {customer.address && <div><strong>Address:</strong> {customer.address}</div>}
            </div>

            {/* Summary Box */}
            <div style={{
              border: '1px solid #000',
              padding: '6px',
              marginBottom: '8px',
              backgroundColor: '#fafafa',
              fontSize: is58 ? '9.5px' : '11px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Opening Balance:</span>
                <span style={{ fontWeight: 'bold' }}>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.opening_balance || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Total Invoiced (+):</span>
                <span>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_debit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Total Payments (-):</span>
                <span>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_payments ?? statement.summary.total_credit)}</span>
              </div>
              {(statement.summary.total_returns ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Sales Returns:</span>
                  <span>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_returns || 0)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px dashed #000', margin: '4px 0', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: is58 ? '10.5px' : '12px' }}>
                <span>NET DUE BALANCE:</span>
                <span>{currencySymbol || 'Rs.'} {formatMoney(closingBal)}</span>
              </div>
            </div>

            {/* Itemized Transactions Table */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: is58 ? '9px' : '10px', textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                Transaction History
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: is58 ? '8.5px' : '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px dashed #666', textAlign: 'left' }}>
                    <th style={{ width: '38%', padding: '2px 0' }}>Date/Ref</th>
                    <th style={{ width: '20%', padding: '2px 0', textAlign: 'right' }}>Dr(+)</th>
                    <th style={{ width: '20%', padding: '2px 0', textAlign: 'right' }}>Cr(-)</th>
                    <th style={{ width: '22%', padding: '2px 0', textAlign: 'right' }}>Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '6px 0', color: '#666' }}>
                        No transactions recorded
                      </td>
                    </tr>
                  ) : (
                    statement.rows.map((r, i) => (
                      <React.Fragment key={i}>
                        <tr style={{ verticalAlign: 'top' }}>
                          <td style={{ width: '38%', padding: '2px 0', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            <div style={{ fontWeight: 'bold' }}>{r.date}</div>
                            <div style={{ color: '#444' }}>{r.reference}</div>
                          </td>
                          <td style={{ padding: '2px 0', textAlign: 'right' }}>
                            {r.debit > 0 ? formatMoney(r.debit) : '-'}
                          </td>
                          <td style={{ padding: '2px 0', textAlign: 'right' }}>
                            {r.credit > 0 ? formatMoney(r.credit) : '-'}
                          </td>
                          <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 'bold' }}>
                            {formatMoney(r.running_balance)}
                          </td>
                        </tr>
                        {r.description && (
                          <tr style={{ borderBottom: '1px dotted #ccc' }}>
                            <td colSpan={4} style={{ padding: '0 0 3px 0', fontSize: is58 ? '7.5px' : '9px', color: '#555' }}>
                              {r.description}
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
            <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '6px', borderTop: '1px dashed #000', fontSize: is58 ? '8.5px' : '9.5px', color: '#333' }}>
              <div>This is a computer generated statement.</div>
              <div style={{ marginTop: '2px', fontWeight: 'bold' }}>Thank you for your business!</div>
              <div style={{ fontSize: '8px', color: '#888', marginTop: '3px' }}>
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
