import React, { useState } from 'react';
import { Plus, Trash2, Scale, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Unit } from '../../types/product';
import { productService } from '../../services/productService';

interface UnitManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  onRefresh: () => void;
}

export const UnitManagerModal: React.FC<UnitManagerModalProps> = ({
  isOpen,
  onClose,
  units,
  onRefresh,
}) => {
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [allowDecimal, setAllowDecimal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !shortCode) {
      setError('Unit name and abbreviation are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await productService.createUnit({
        name: name.trim(),
        short_code: shortCode.toLowerCase().trim(),
        allow_decimal: allowDecimal,
        is_active: true,
      });
      setName('');
      setShortCode('');
      setAllowDecimal(false);
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.data?.detail || err?.message || 'Failed to create unit.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteUnit = async () => {
    if (!deletingUnit) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      await productService.deleteUnit(deletingUnit.id);
      setDeletingUnit(null);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.data?.detail || err?.detail || err?.message || `Cannot delete unit '${deletingUnit.name}'. It may be assigned to active products.`;
      setDeleteError(msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Units of Measurement"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: '0.5rem',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Create Unit Form */}
        <form onSubmit={handleCreateUnit} style={{
          backgroundColor: 'var(--bg-app)',
          padding: '1.25rem',
          borderRadius: '0.625rem',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            <span>Add New Unit of Measure</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <Input
              label="Unit Name *"
              placeholder="e.g. Carton / Dozen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Abbreviation *"
              placeholder="e.g. ctn / dz"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="allow_decimal"
              checked={allowDecimal}
              onChange={(e) => setAllowDecimal(e.target.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-500)', cursor: 'pointer' }}
            />
            <label htmlFor="allow_decimal" style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              Allow Fractional/Decimal Quantities (e.g. 2.5 kg, 0.75 L)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" loading={saving} icon={<Plus size={15} />}>
              Save Unit
            </Button>
          </div>
        </form>

        {/* Existing Units List */}
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Active Units ({units.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {units.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Scale size={16} style={{ color: 'var(--primary-400)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                    <code style={{ fontSize: '0.75rem', color: 'var(--primary-400)' }}>{u.short_code}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Badge variant="phase">{u.product_count} items</Badge>
                  <button
                    onClick={() => {
                      setError(null);
                      setDeletingUnit(u);
                    }}
                    title="Delete unit"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-subtle)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-subtle)'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standard Delete Confirmation Modal */}
        {deletingUnit && (
          <Modal
            isOpen={!!deletingUnit}
            onClose={() => {
              setDeletingUnit(null);
              setDeleteError(null);
            }}
            title="Confirm Unit Deletion"
            maxWidth="440px"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deleteError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: '0.5rem',
                  color: 'var(--danger)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  lineHeight: 1.4,
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{deleteError}</span>
                </div>
              )}

              <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                Are you sure you want to delete unit <strong>{deletingUnit.name} ({deletingUnit.short_code})</strong>?
                {deletingUnit.product_count > 0 && !deleteError && (
                  <div style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    ⚠️ This unit of measure is currently assigned to {deletingUnit.product_count} product(s).
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button variant="outline" onClick={() => { setDeletingUnit(null); setDeleteError(null); }} disabled={deleteSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  loading={deleteSubmitting}
                  icon={<Trash2 size={14} />}
                  style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={handleConfirmDeleteUnit}
                >
                  Delete Unit
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
};
