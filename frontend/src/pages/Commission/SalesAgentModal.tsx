import React, { useState, useEffect } from 'react';
import { AlertCircle, User, Percent, Phone, Mail, Calendar } from 'lucide-react';
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
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.875rem' }}>
          {/* Agent Name */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.35rem',
              }}
            >
              Agent Full Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Tariq Mahmood"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isViewOnly || saving}
              icon={<User size={14} />}
              required
            />
          </div>

          {/* Agent Code */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.35rem',
              }}
            >
              Agent Code {isEdit || isViewOnly ? '' : '(Auto-generated if empty)'}
            </label>
            <Input
              type="text"
              placeholder="e.g. AGT-0001"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isViewOnly || saving}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.35rem',
              }}
            >
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="e.g. +92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isViewOnly || saving}
              icon={<Phone size={14} />}
            />
          </div>

          {/* Email Address */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.35rem',
              }}
            >
              Email Address
            </label>
            <Input
              type="email"
              placeholder="e.g. agent@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isViewOnly || saving}
              icon={<Mail size={14} />}
            />
          </div>

          {/* Commission Percentage */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.35rem',
              }}
            >
              Commission Rate (%) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="5.00"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(e.target.value)}
              disabled={isViewOnly || saving}
              icon={<Percent size={14} />}
              required
            />
          </div>

          {/* Joining Date */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78125rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.35rem',
              }}
            >
              Joining Date
            </label>
            <Input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              disabled={isViewOnly || saving}
              icon={<Calendar size={14} />}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78125rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              marginBottom: '0.35rem',
            }}
          >
            Physical Address
          </label>
          <textarea
            placeholder="Agent commercial or residential address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isViewOnly || saving}
            rows={2}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-main)',
              fontSize: '0.8125rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Notes */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78125rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              marginBottom: '0.35rem',
            }}
          >
            Notes & Remarks
          </label>
          <textarea
            placeholder="Additional notes, territory, or business remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isViewOnly || saving}
            rows={2}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-main)',
              fontSize: '0.8125rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Active Status Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingTop: '0.25rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: isViewOnly ? 'default' : 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isViewOnly || saving}
              style={{ width: '1rem', height: '1rem', cursor: isViewOnly ? 'default' : 'pointer' }}
            />
            <span>Active Status (Available for new transactions)</span>
          </label>
        </div>

        {/* Modal Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            marginTop: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={saving} style={{ padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}>
            {isViewOnly ? 'Close' : 'Cancel'}
          </Button>

          {!isViewOnly && (
            <Button
              variant="primary"
              type="submit"
              loading={saving}
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}
            >
              {isEdit ? 'Save Changes' : 'Register Sales Agent'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
