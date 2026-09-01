import React, { useState } from 'react';
import { SupplierWarrantyClaim } from '../../types/warranty';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Printer, X, Truck, Sliders } from 'lucide-react';
import { printThermalElement } from '../../utils/printReceipt';
import { useSettings } from '../../context/SettingsContext';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface SupplierClaimSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: SupplierWarrantyClaim | null;
}

export const SupplierClaimSlipModal: React.FC<SupplierClaimSlipModalProps> = ({
  isOpen,
  onClose,
  claim,
}) => {
  const { companyName, companyAddress, companyPhone, taxId } = useSettings();
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!claim) return null;

  const handlePrint = () => {
    printThermalElement('supplier-warranty-slip', {
      paperWidth,
      title: `RMA_Slip_${claim.claim_number}`,
    });
  };

  const is58 = paperWidth === '58mm';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supplier RMA Dispatch Slip" maxWidth="480px">
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
          id="supplier-warranty-slip"
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
              <Truck size={is58 ? 20 : 24} color="#000000" />
            </div>
            <div style={{ fontSize: is58 ? '1.125rem' : '1.25rem', fontWeight: 900, letterSpacing: '0.05em', color: '#000000' }}>{companyName}</div>
            {companyAddress && <div style={{ fontSize: '0.8125rem', color: '#000000', fontWeight: 700, marginTop: '0.125rem' }}>{companyAddress}</div>}
            <div style={{ fontSize: '0.8125rem', color: '#000000', fontWeight: 700 }}>
              {companyPhone && `Tel: ${companyPhone}`}{taxId && ` | NTN: ${taxId}`}
            </div>
            <div style={{ fontWeight: 900, fontSize: '0.875rem', marginTop: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000000' }}>
              *** RMA DISPATCH SLIP ***
            </div>
          </div>

          {/* Batch Meta */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.625rem', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Batch #:</span>
              <strong style={{ fontWeight: 900, fontSize: '0.875rem' }}>{claim.claim_number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span>Dispatch Date:</span>
              <span style={{ fontWeight: 800 }}>{claim.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span>Status:</span>
              <span style={{ fontWeight: 900, color: '#000000' }}>
                {claim.status === 'WARRANTY_COMPLETED' ? 'COMPLETED' : claim.status === 'IN_PROGRESS' ? 'IN PROGRESS' : claim.status}
              </span>
            </div>
          </div>

          {/* Supplier */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.625rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.625rem', color: '#000000' }}>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.75rem', color: '#000000', marginBottom: '0.2rem' }}>Vendor / Supplier</div>
            <div style={{ fontWeight: 900, fontSize: '0.875rem' }}>{claim.supplier_company || claim.supplier_name}</div>
            {claim.supplier_company && <div style={{ color: '#000000', fontSize: '0.75rem', fontWeight: 700 }}>Contact: {claim.supplier_name}</div>}
          </div>

          {/* Items Table */}
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.625rem', borderBottom: '1.5px dashed #000000', paddingBottom: '0.625rem', color: '#000000' }}>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.75rem', color: '#000000', marginBottom: '0.35rem' }}>Dispatched Items</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', fontWeight: 700, color: '#000000' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #000000', textAlign: 'left' }}>
                  <th style={{ padding: '0.25rem 0', fontWeight: 900, color: '#000000' }}>#</th>
                  <th style={{ padding: '0.25rem 0', fontWeight: 900, color: '#000000' }}>Item / Claim</th>
                  <th style={{ padding: '0.25rem 0', textAlign: 'center', fontWeight: 900, color: '#000000' }}>Qty</th>
                  <th style={{ padding: '0.25rem 0', textAlign: 'right', fontWeight: 900, color: '#000000' }}>Val.</th>
                </tr>
              </thead>
              <tbody>
                {claim.items?.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px dotted #000000' }}>
                    <td style={{ padding: '0.3rem 0', fontWeight: 800 }}>{idx + 1}</td>
                    <td style={{ padding: '0.3rem 0' }}>
                      <div style={{ fontWeight: 900, color: '#000000' }}>{item.product_name}</div>
                      <div style={{ color: '#000000', fontSize: '0.75rem', fontWeight: 700 }}>{item.customer_claim_number}</div>
                    </td>
                    <td style={{ padding: '0.3rem 0', textAlign: 'center', fontWeight: 900, color: '#000000' }}>{item.quantity}</td>
                    <td style={{ padding: '0.3rem 0', textAlign: 'right', fontWeight: 800, color: '#000000' }}>{formatMoney(item.valuation)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #000000', fontWeight: 900, fontSize: '0.875rem' }}>
                  <td colSpan={2} style={{ padding: '0.35rem 0', textAlign: 'right' }}>TOTAL:</td>
                  <td style={{ padding: '0.35rem 0', textAlign: 'center' }}>{claim.total_quantity}</td>
                  <td style={{ padding: '0.35rem 0', textAlign: 'right' }}>Rs.{formatMoney(claim.total_valuation)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {claim.notes && (
            <div style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 700, border: '1px solid #000000', padding: '0.35rem', borderRadius: '0.25rem', marginBottom: '0.625rem' }}>
              Notes: {claim.notes}
            </div>
          )}


          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#000000', fontWeight: 800 }}>
            <div style={{ borderTop: '1.5px solid #000000', paddingTop: '0.375rem' }}>Dispatched By</div>
            <div style={{ borderTop: '1.5px solid #000000', paddingTop: '0.375rem' }}>Courier</div>
            <div style={{ borderTop: '1.5px solid #000000', paddingTop: '0.375rem' }}>Vendor Stamp</div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '0.875rem', borderTop: '1.5px dashed #000000', paddingTop: '0.625rem', fontSize: '0.75rem', color: '#000000', fontWeight: 800 }}>
            Defective merchandise RMA — retain this slip.
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
