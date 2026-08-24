import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Supplier } from '../../types/contact';
import { contactService } from '../../services/contactService';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  onSaved: () => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSaved,
}) => {
  const [supplierId, setSupplierId] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (supplierToEdit) {
        setSupplierId(supplierToEdit.supplier_id);
        setName(supplierToEdit.name);
        setCompanyName(supplierToEdit.company_name || '');
        setPhone(supplierToEdit.phone || '');
        setEmail(supplierToEdit.email || '');
        setAddress(supplierToEdit.address || '');
        setTaxId(supplierToEdit.tax_id || '');
        setOpeningBalance(supplierToEdit.opening_balance ? Number(supplierToEdit.opening_balance) : 0);
        setIsActive(supplierToEdit.is_active);
        setNotes(supplierToEdit.notes || '');
      } else {
        setName('');
        setCompanyName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setTaxId('');
        setOpeningBalance(0);
        setIsActive(true);
        setNotes('');

        contactService.getNextSupplierId().then((res) => {
          setSupplierId(res.next_id);
        }).catch(() => {
          setSupplierId('SUP-000001');
        });
      }
    }
  }, [isOpen, supplierToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !name) {
      setError('Supplier ID and Representative Name are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<Supplier> = {
      supplier_id: supplierId.trim().toUpperCase(),
      name: name.trim(),
      company_name: companyName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      tax_id: taxId.trim() || null,
      opening_balance: Number(openingBalance) || 0,
      is_active: isActive,
      notes: notes.trim() || null,
    };

    try {
      if (supplierToEdit) {
        await contactService.updateSupplier(supplierToEdit.id, payload);
      } else {
        await contactService.createSupplier(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplierToEdit ? `Edit Supplier (${supplierToEdit.supplier_id})` : 'Register New Supplier'}
      maxWidth="650px"
    >
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
          borderRadius: '0.5rem',
          color: 'var(--danger)',
          fontSize: '0.8125rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <Input
            label="Supplier ID *"
            placeholder="e.g. SUP-000001"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
          />
          <Input
            label="Distributor / Company Name"
            placeholder="e.g. Coca-Cola Beverages / Unilever"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Contact Person / Representative *"
            placeholder="e.g. Tariq Mahmood"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            placeholder="+92 300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Email Address"
            type="email"
            placeholder="orders@distributor.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Tax / NTN / STRN Number"
            placeholder="e.g. NTN-0891234-7"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <Input
            label="Warehouse / Business Address"
            placeholder="Plot #, Industrial Area / City..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            label="Opening Payable (Rs.)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={openingBalance || ''}
            onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
            helperText="Prior balance owed for initial setup."
          />
        </div>

        <Input
          label="Payment Terms & Notes"
          placeholder="Credit terms (Net 30), delivery schedules, bank details..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="is_active_supp"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-500)', cursor: 'pointer' }}
          />
          <label htmlFor="is_active_supp" style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
            Supplier is Active for Purchasing
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {supplierToEdit ? 'Update Supplier' : 'Register Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
