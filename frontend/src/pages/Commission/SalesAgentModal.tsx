import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { SalesAgent, CreateSalesAgentData, UpdateSalesAgentData } from '../../types/commission';
import { commissionService } from '../../services/commissionService';
import { formatErrorMessage } from '../../utils/formatError';

interface SalesAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentToEdit?: SalesAgent | null;
  mode?: 'create' | 'edit' | 'view';
  onSaved: (savedAgent?: SalesAgent) => void;
}

export const SalesAgentModal: React.FC<SalesAgentModalProps> = ({
  isOpen,
  onClose,
  agentToEdit,
  mode = 'create',
  onSaved,
}) => {
  const isViewOnly = mode === 'view';
  const isEdit = mode === 'edit';

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState<string>('5.00');
  const [joiningDate, setJoiningDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (agentToEdit) {
        setName(agentToEdit.name || '');
        setCode(agentToEdit.code || '');
        setPhone(agentToEdit.phone || '');
        setEmail(agentToEdit.email || '');
        setCommissionPercentage(String(agentToEdit.commission_percentage ?? '0.00'));
        setJoiningDate(agentToEdit.joining_date || new Date().toISOString().split('T')[0]);
        setIsActive(agentToEdit.is_active);
        setAddress(agentToEdit.address || '');
        setNotes(agentToEdit.notes || '');
      } else {
        setName('');
        setCode('');
        setPhone('');
        setEmail('');
        setCommissionPercentage('5.00');
        setJoiningDate(new Date().toISOString().split('T')[0]);
        setIsActive(true);
        setAddress('');
        setNotes('');
      }
    }
  }, [isOpen, agentToEdit, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) {
      onClose();
      return;
    }

    if (!name.trim()) {
      setError('Sales agent name is required.');
      return;
    }

    const commNum = parseFloat(commissionPercentage);
    if (isNaN(commNum) || commNum < 0 || commNum > 100) {
      setError('Commission percentage must be a valid number between 0.00% and 100.00%.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEdit && agentToEdit) {
        const updatePayload: UpdateSalesAgentData = {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          commission_percentage: commNum.toFixed(2),
          joining_date: joiningDate,
          is_active: isActive,
          address: address.trim(),
          notes: notes.trim(),
        };
        if (code.trim()) {
          updatePayload.code = code.trim().toUpperCase();
        }
        const saved = await commissionService.updateAgent(agentToEdit.id, updatePayload);
        onSaved(saved);
      } else {
        const createPayload: CreateSalesAgentData = {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          commission_percentage: commNum.toFixed(2),
          joining_date: joiningDate,
          is_active: isActive,
          address: address.trim(),
          notes: notes.trim(),
        };
        if (code.trim()) {
          createPayload.code = code.trim().toUpperCase();
        }
        const saved = await commissionService.createAgent(createPayload);
        onSaved(saved);
      }
      onClose();
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const modalTitle = isViewOnly
    ? `Sales Agent Profile: ${agentToEdit?.name || ''}`
    : isEdit
    ? `Edit Sales Agent: ${agentToEdit?.name || ''}`
    : 'Register New Sales Agent';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="650px">
      {error && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Financial Summary Card for Existing Agent */}
        {agentToEdit && (
          <div
            style={{
              padding: '0.625rem 0.85rem',
              backgroundColor: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.5rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Earned
              </span>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                Rs. {Number(agentToEdit.total_commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Paid
              </span>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                Rs. {Number(agentToEdit.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {Number(agentToEdit.advance_credit_balance || agentToEdit.total_adjusted || 0) > 0 && (
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--warning)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Return Deductions / Credit
                </span>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                  Rs. {Number(agentToEdit.advance_credit_balance || agentToEdit.total_adjusted || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
                Net Balance Due
              </span>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: Number(agentToEdit.outstanding_balance || 0) > 0 ? 'var(--danger)' : 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                Rs. {Number(agentToEdit.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Row 1: Code (1fr) and Name (2fr) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
          <Input
            label="Agent Code"
            placeholder="Auto-generated"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isViewOnly || saving}
          />
          <Input
            label="Agent Full Name *"
            placeholder="e.g. Tariq Mahmood"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isViewOnly || saving}
            required
          />
        </div>

        {/* Row 2: Phone and Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input
            label="Phone Number"
            type="tel"
            placeholder="e.g. +92 300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isViewOnly || saving}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. agent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isViewOnly || saving}
          />
        </div>

        {/* Row 3: Commission Percentage and Joining Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input
            label="Commission Rate (%) *"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="5.00"
            value={commissionPercentage}
            onChange={(e) => setCommissionPercentage(e.target.value)}
            disabled={isViewOnly || saving}
            required
          />
          <Input
            label="Joining Date"
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            disabled={isViewOnly || saving}
          />
        </div>

        {/* Row 4: Address and Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Input
            label="Physical Address"
            placeholder="Shop #, Street, Commercial Area..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isViewOnly || saving}
          />
          <Input
            label="Internal Notes"
            placeholder="Special terms, assigned territory, remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isViewOnly || saving}
          />
        </div>

        {/* Active Status Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.1rem' }}>
          <input
            type="checkbox"
            id="is_active_agent_modal"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isViewOnly || saving}
            style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-500)', cursor: isViewOnly ? 'default' : 'pointer' }}
          />
          <label
            htmlFor="is_active_agent_modal"
            style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: isViewOnly ? 'default' : 'pointer', userSelect: 'none' }}
          >
            Sales Agent is Active (Available for commission sales)
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} style={{ padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}>
            {isViewOnly ? 'Close' : 'Cancel'}
          </Button>

          {!isViewOnly && (
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.8125rem',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                fontWeight: 700,
              }}
            >
              {isEdit ? 'Save Changes' : 'Register Sales Agent'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
