import React, { useState } from 'react';
import {
  Printer,
  Sliders,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Supplier } from '../../types/contact';
import { SupplierStatement } from '../../types/purchase';
import { useSettings } from '../../context/SettingsContext';
import { printThermalElement } from '../../utils/printReceipt';

interface SupplierStatementSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  statement: SupplierStatement | null;
  startDate?: string;
  endDate?: string;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SupplierStatementSlipModal: React.FC<SupplierStatementSlipModalProps> = ({
  isOpen,
  onClose,
  supplier,
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

  if (!supplier || !statement) return null;

  const handlePrint = () => {
    printThermalElement('supplier-statement-thermal-slip', {
      paperWidth,
      title: `Supplier_Statement_${supplier.supplier_id || supplier.id}`,
    });
  };

  const is58 = paperWidth === '58mm';
  const isA4 = paperWidth === 'A4';
  const closingPayable = statement.summary.closing_payable;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Print Supplier Statement — ${supplier.company_name || supplier.name}`}
      maxWidth={isA4 ? '780px' : '560px'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Format Bar */}
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

        {/* Printable Slip Preview */}
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
            id="supplier-statement-thermal-slip"
            style={{
              width: paperWidth === '58mm' ? '220px' : paperWidth === 'A4' ? '680px' : '320px',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: is58 ? '8px 6px' : isA4 ? '24px 20px' : '14px 10px',
              fontFamily: "'Courier New', Courier, monospace, system-ui",
              fontSize: is58 ? '10px' : isA4 ? '13px' : '11.5px',
              lineHeight: 1.35,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              borderRadius: '2px',
            }}
          >
            {/* Header */}
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
                SUPPLIER STATEMENT OF ACCOUNT
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {startDate && endDate ? `${startDate} to ${endDate}` : `As of ${new Date().toISOString().split('T')[0]}`}
              </div>
              <div style={{ margin: '4px 0 6px 0', borderBottom: '1px dashed #000' }} />
            </div>

            {/* Supplier Details */}
            <div style={{ marginBottom: '8px', fontSize: is58 ? '9.5px' : '11px' }}>
              <div><strong>Supplier:</strong> {supplier.company_name || supplier.name}</div>
              {supplier.supplier_id && <div><strong>Vendor ID:</strong> {supplier.supplier_id}</div>}
              {supplier.phone && <div><strong>Phone:</strong> {supplier.phone}</div>}
              {supplier.email && <div><strong>Email:</strong> {supplier.email}</div>}
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
                <span style={{ fontWeight: 'bold' }}>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.opening_balance)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Total Purchases (Cr):</span>
                <span>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_purchases)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Total Payments (Dr):</span>
                <span>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_payments)}</span>
              </div>
              {statement.summary.total_returns > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Debit Notes / Returns:</span>
                  <span>{currencySymbol || 'Rs.'} {formatMoney(statement.summary.total_returns)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px dashed #000', margin: '4px 0', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: is58 ? '10.5px' : '12px' }}>
                <span>NET OUTSTANDING PAYABLE:</span>
                <span>{currencySymbol || 'Rs.'} {formatMoney(closingPayable)}</span>
              </div>
            </div>

            {/* Transactions */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: is58 ? '9px' : '10px', textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                Ledger Breakdown
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: is58 ? '8.5px' : '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px dashed #666', textAlign: 'left' }}>
                    <th style={{ width: '38%', padding: '2px 0' }}>Date/Ref</th>
                    <th style={{ width: '20%', padding: '2px 0', textAlign: 'right' }}>Dr(-)</th>
                    <th style={{ width: '20%', padding: '2px 0', textAlign: 'right' }}>Cr(+)</th>
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

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '6px', borderTop: '1px dashed #000', fontSize: is58 ? '8.5px' : '9.5px', color: '#333' }}>
              <div>Official Vendor Statement of Account</div>
              <div style={{ fontSize: '8px', color: '#888', marginTop: '3px' }}>
                Generated: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
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
