import React, { useState } from 'react';
import { CustomerWarrantyClaim } from '../../types/warranty';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Printer, X, ShieldCheck, Sliders } from 'lucide-react';
import { printThermalElement } from '../../utils/printReceipt';
import { useSettings } from '../../context/SettingsContext';

interface CustomerClaimSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: CustomerWarrantyClaim | null;
}

export const CustomerClaimSlipModal: React.FC<CustomerClaimSlipModalProps> = ({
  isOpen,
  onClose,
  claim,
}) => {
  const { companyName, companyAddress, companyPhone, taxId } = useSettings();
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!claim) return null;

  const handlePrint = () => {
    printThermalElement('customer-warranty-slip', {
      paperWidth,
      title: `WarrantySlip_${claim.claim_number}`,
    });
  };

  const is58 = paperWidth === '58mm';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Warranty Replacement Slip" maxWidth="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Paper Size Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Sliders size={14} /> Slip Width:
          </span>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {(['80mm', '58mm'] as const).map((w) => (
              <button key={w} onClick={() => setPaperWidth(w)} style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.375rem', border: '1px solid', borderColor: paperWidth === w ? 'var(--primary-400)' : 'var(--border-subtle)', backgroundColor: paperWidth === w ? 'rgba(56,189,248,0.15)' : 'transparent', color: paperWidth === w ? 'var(--primary-400)' : 'var(--text-muted)', cursor: 'pointer' }}>
                {w === '80mm' ? '80mm (Standard)' : '58mm (Small)'}
              </button>
            ))}
          </div>
        </div>

        {/* Thermal Slip Preview */}
        <div
          id="customer-warranty-slip"
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            width: '100%',
            maxWidth: is58 ? '330px' : '400px',
            margin: '0 auto',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '0.875rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.35rem' }}>
              <ShieldCheck size={is58 ? 20 : 24} color="#000000" />
            </div>
            <div style={{ fontSize: is58 ? '1.125rem' : '1.25rem', fontWeight: 900, letterSpacing: '0.05em', color: '#000000' }}>{companyName}</div>
            {companyAddress && <div style={{ fontSize: '0.8125rem', color: '#000000', fontWeight: 700, marginTop: '0.125rem' }}>{companyAddress}</div>}
            {(companyPhone || taxId) && (
              <div style={{ fontSize: '0.8125rem', color: '#000000', fontWeight: 700 }}>
                {companyPhone && `Tel: ${companyPhone}`}
                {companyPhone && taxId && ' | '}
                {taxId && `NTN: ${taxId}`}
              </div>
            )}
            <div style={{ fontWeight: 900, fontSize: '0.875rem', marginTop: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000000' }}>
              *** WARRANTY REPLACEMENT SLIP ***
            </div>
          </div>

          {/* Claim Meta */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.625rem', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Claim #:</span>
              <strong style={{ fontWeight: 900, fontSize: '0.875rem' }}>{claim.claim_number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span>Date:</span>
              <span style={{ fontWeight: 800 }}>{claim.claim_date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span>Invoice #:</span>
              <span style={{ fontWeight: 800 }}>{claim.sale_invoice_number}</span>
            </div>
          </div>

          {/* Customer */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.625rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.625rem', color: '#000000' }}>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.75rem', color: '#000000', marginBottom: '0.2rem' }}>Customer</div>
            <div style={{ fontWeight: 900, fontSize: '0.875rem' }}>{claim.customer_name}</div>
            {claim.customer_phone && <div style={{ color: '#000000', fontWeight: 700 }}>{claim.customer_phone}</div>}
          </div>

          {/* Items */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.625rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.625rem', color: '#000000' }}>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.75rem', color: '#000000', marginBottom: '0.35rem' }}>Replacement Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.125rem' }}>
              <span style={{ color: '#000000', fontSize: '0.75rem', fontWeight: 800 }}>DEFECTIVE RETURNED:</span>
            </div>
            <div style={{ fontWeight: 900, color: '#000000', fontSize: '0.875rem' }}>{claim.claimed_product_name}</div>
            <div style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 700 }}>SKU: {claim.claimed_product_sku} | Qty: {claim.quantity}</div>

            <div style={{ borderTop: '1px solid #000000', margin: '0.4rem 0' }} />

            <div style={{ color: '#000000', fontSize: '0.75rem', fontWeight: 800 }}>REPLACEMENT ISSUED:</div>
            <div style={{ fontWeight: 900, color: '#000000', fontSize: '0.875rem' }}>{claim.replacement_product_name}</div>
            <div style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 700 }}>SKU: {claim.replacement_product_sku} | Qty: {claim.quantity}</div>
          </div>

          {/* Supplier & Warranty */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.625rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.625rem', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#000000' }}>Supplier:</span>
              <span style={{ fontWeight: 800 }}>{claim.supplier_company || claim.supplier_name}</span>
            </div>
            {claim.warranty_expiry_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span style={{ color: '#000000' }}>Warranty Expiry:</span>
                <span style={{ fontWeight: 800 }}>{claim.warranty_expiry_date}</span>
              </div>
            )}
            {claim.notes && (
              <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: '#000000', fontWeight: 700, border: '1px solid #000000', padding: '0.35rem', borderRadius: '0.25rem' }}>
                Note: {claim.notes}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#000000', fontWeight: 800 }}>
            <div style={{ borderTop: '1.5px solid #000000', paddingTop: '0.375rem' }}>Customer Signature</div>
            <div style={{ borderTop: '1.5px solid #000000', paddingTop: '0.375rem' }}>Store Authorized</div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '0.875rem', borderTop: '1.5px dashed #000000', paddingTop: '0.625rem', fontSize: '0.75rem', color: '#000000', fontWeight: 800 }}>
            Processed per standard warranty terms. Thank you.
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="secondary" onClick={onClose} icon={<X size={14} />}>Close</Button>
          <Button variant="primary" onClick={handlePrint} icon={<Printer size={14} />}
            style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', fontWeight: 700 }}>
            Print Slip ({paperWidth})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
