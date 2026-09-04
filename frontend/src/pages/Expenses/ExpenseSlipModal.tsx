import React, { useState } from 'react';
import { Printer, Receipt, Sliders } from 'lucide-react';
import { Expense } from '../../types/expense';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useSettings } from '../../context/SettingsContext';
import { printThermalElement } from '../../utils/printReceipt';

interface ExpenseSlipModalProps {
  isOpen?: boolean;
  onClose: () => void;
  expense: Expense | null;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const ExpenseSlipModal: React.FC<ExpenseSlipModalProps> = ({
  isOpen = true,
  onClose,
  expense,
}) => {
  const {
    companyName,
    companyAddress,
    companyPhone,
    taxId,
    currencySymbol,
  } = useSettings();

  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!expense) return null;

  const handlePrint = () => {
    printThermalElement('expense-thermal-slip', {
      paperWidth,
      title: `Expense_${expense.expense_number}`,
    });
  };

  const is58 = paperWidth === '58mm';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Expense Voucher: ${expense.expense_number}`}
      maxWidth="480px"
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

        {/* Printable Thermal Slip Area */}
        <div
          id="expense-thermal-slip"
          className="pos-thermal-receipt"
          style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '1.25rem 1rem',
            borderRadius: '0.5rem',
            fontFamily: "'Courier New', Courier, monospace, system-ui, sans-serif",
            fontSize: is58 ? '0.8125rem' : '0.875rem',
            fontWeight: 700,
            lineHeight: 1.4,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: is58 ? '330px' : '400px',
            margin: '0 auto',
          }}
        >
          {/* Header Branding */}
          <div style={{ textAlign: 'center', marginBottom: '0.875rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.35rem' }}>
              <Receipt size={is58 ? 20 : 24} color="#000000" />
            </div>
            <div style={{ fontSize: is58 ? '1.125rem' : '1.25rem', fontWeight: 900, letterSpacing: '0.05em', color: '#000000' }}>
              {companyName}
            </div>
            {companyAddress && (
              <div style={{ fontSize: '0.8125rem', color: '#000000', fontWeight: 700, marginTop: '0.125rem' }}>
                {companyAddress}
              </div>
            )}
            {(companyPhone || taxId) && (
              <div style={{ fontSize: '0.8125rem', color: '#000000', fontWeight: 700 }}>
                {companyPhone && `Tel: ${companyPhone}`}
                {companyPhone && taxId && ' | '}
                {taxId && `NTN: ${taxId}`}
              </div>
            )}
            <div style={{ fontWeight: 900, fontSize: '0.875rem', marginTop: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000000' }}>
              *** EXPENSE PAYMENT VOUCHER ***
            </div>
          </div>

          {/* Meta Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.625rem', marginBottom: '0.625rem', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Voucher No:</span>
              <span style={{ fontWeight: 900 }}>{expense.expense_number}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Date & Time:</span>
              <span>{expense.date}</span>
            </div>
            {expense.created_by_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Disbursed By:</span>
                <span>{expense.created_by_name}</span>
              </div>
            )}
            {expense.journal_entry_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GL Ref:</span>
                <span>{expense.journal_entry_number}</span>
              </div>
            )}
          </div>

          {/* Expense & Payment Particulars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.75rem', marginBottom: '0.75rem', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Expense Account:</span>
              <span style={{ fontWeight: 900 }}>[{expense.expense_account_code}] {expense.expense_account_name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payment Mode:</span>
              <span style={{ fontWeight: 900 }}>{expense.payment_method || 'CASH'}</span>
            </div>

            {expense.payment_account_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Disbursed Account:</span>
                <span>[{expense.payment_account_code}] {expense.payment_account_name}</span>
              </div>
            )}

            {expense.reference_no && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cheque/Reference:</span>
                <span>{expense.reference_no}</span>
              </div>
            )}

            {expense.description && (
              <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dotted #000000' }}>
                <span style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 900 }}>Description/Notes:</span>
                <div style={{ fontSize: '0.8125rem', marginTop: '0.1rem', wordBreak: 'break-word', color: '#000000' }}>
                  {expense.description}
                </div>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div style={{
            border: '2px solid #000000',
            padding: '0.5rem',
            margin: '0.75rem 0',
            textAlign: 'center',
            backgroundColor: '#ffffff',
          }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 900, color: '#000000' }}>
              Total Disbursed Amount
            </div>
            <div style={{ fontSize: is58 ? '1.15rem' : '1.35rem', fontWeight: 900, color: '#000000', marginTop: '0.2rem' }}>
              {currencySymbol} {formatMoney(expense.amount)}
            </div>
          </div>

          {/* Dual Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '0.5rem', borderTop: '1px dotted #000000', color: '#000000', fontSize: '0.75rem' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderBottom: '1px solid #000000', marginBottom: '0.25rem', height: '1.25rem' }}></div>
              <span style={{ fontWeight: 900 }}>Authorized Sign</span>
            </div>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderBottom: '1px solid #000000', marginBottom: '0.25rem', height: '1.25rem' }}></div>
              <span style={{ fontWeight: 900 }}>Receiver Sign</span>
            </div>
          </div>

          {/* Slogan */}
          <div style={{ textAlign: 'center', marginTop: '1rem', borderTop: '1.5px dashed #000000', paddingTop: '0.5rem', color: '#000000' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 900 }}>*** SYSTEM GENERATED EXPENSE VOUCHER ***</div>
            <div style={{ letterSpacing: '0.2em', fontSize: '0.875rem', marginTop: '0.35rem', fontWeight: 900, color: '#000000' }}>
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
