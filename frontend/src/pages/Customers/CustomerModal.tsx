import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Customer } from '../../types/contact';
import { contactService } from '../../services/contactService';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onSaved: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSaved,
}) => {
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditEnabled, setCreditEnabled] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWalkin = !!customerToEdit?.is_walkin;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (customerToEdit) {
        setCustomerId(customerToEdit.customer_id);
        setName(customerToEdit.name);
        setPhone(customerToEdit.phone || '');
        setEmail(customerToEdit.email || '');
        setAddress(customerToEdit.address || '');
        setCreditEnabled(customerToEdit.credit_enabled);
        setIsActive(customerToEdit.is_active);
        setNotes(customerToEdit.notes || '');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setCreditEnabled(true);
        setIsActive(true);
        setNotes('');

        contactService.getNextCustomerId().then((res) => {
          setCustomerId(res.next_id);
        }).catch(() => {
          setCustomerId('CUS-0001');
        });
      }
    }
  }, [isOpen, customerToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !name) {
      setError('Customer ID and Full Name are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<Customer> = {
      customer_id: customerId.trim().toUpperCase(),
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      credit_enabled: isWalkin ? false : creditEnabled,
      is_active: isWalkin ? true : isActive,
      notes: notes.trim() || null,
    };

    try {
      if (customerToEdit) {
        await contactService.updateCustomer(customerToEdit.id, payload);
      } else {
        await contactService.createCustomer(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? `Edit Customer: ${customerToEdit.name}` : 'Register New Customer'}
      subtitle="Canonical customer master record for POS sales, credit tracking, and receivables."
    >
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
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

      {isWalkin && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid var(--primary-400)',
          borderRadius: '0.5rem',
          color: 'var(--primary-400)',
          fontSize: '0.8125rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <ShieldAlert size={16} />
          <span>This is the default system Walk-in Customer. Credit purchases are permanently disabled.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          <Input
            label="Customer ID *"
            placeholder="e.g. CUS-0001"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={isWalkin}
            required
          />
          <Input
            label="Customer Name *"
            placeholder="e.g. Ali Traders / Muhammad Bilal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isWalkin}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Phone Number (POS Searchable)"
            placeholder="e.g. +92 300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            helperText="Cashiers can quickly search customer by mobile number."
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="customer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Input
          label="Physical Address / Shop Location"
          placeholder="Shop #, Street, Commercial Area..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* Credit Eligibility Box */}
        <div style={{
          backgroundColor: 'var(--bg-app)',
          padding: '1rem',
          borderRadius: '0.625rem',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
            Credit & Account Policy
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              id="credit_enabled_checkbox"
              checked={creditEnabled && !isWalkin}
              disabled={isWalkin}
              onChange={(e) => setCreditEnabled(e.target.checked)}
              style={{ width: '1.125rem', height: '1.125rem', accentColor: 'var(--primary-500)', cursor: isWalkin ? 'not-allowed' : 'pointer' }}
            />
            <label
              htmlFor="credit_enabled_checkbox"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', cursor: isWalkin ? 'not-allowed' : 'pointer' }}
            >
              Allow Customer to Purchase on Credit (Accounts Receivable)
            </label>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            When enabled, cashier can choose "On Account / Credit" payment method for this customer during checkout.
          </p>
        </div>

        <Input
          label="Internal Notes"
          placeholder="Credit terms, special discounts or preferences..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {!isWalkin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="is_active_cust"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-500)', cursor: 'pointer' }}
            />
            <label htmlFor="is_active_cust" style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              Customer is Active
            </label>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {customerToEdit ? 'Update Customer' : 'Register Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
