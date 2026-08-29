import React, { useState } from 'react';
import { Plus, Trash2, FolderTree, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Category } from '../../types/product';
import { productService } from '../../services/productService';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRefresh: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRefresh,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) {
      setError('Category code and name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await productService.createCategory({
        code: code.toUpperCase().trim(),
        name: name.trim(),
        parent: parent ? parseInt(parent, 10) : null,
        description: description.trim(),
        is_active: true,
      });
      setCode('');
      setName('');
      setParent('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.data?.detail || err?.message || 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      await productService.deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.data?.detail || err?.detail || err?.message || `Cannot delete category '${deletingCategory.name}'. It may contain active products.`;
      setDeleteError(msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Categories Management"
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

        {/* Create Form */}
        <form onSubmit={handleCreateCategory} style={{
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
            <span>Add New Category</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <Input
              label="Code *"
              placeholder="e.g. BAK"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Input
              label="Category Name *"
              placeholder="e.g. Bakery & Breads"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Parent Category (Optional)</label>
              <select
                value={parent}
                onChange={(e) => setParent(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                  padding: '0.625rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              >
                <option value="">None (Top-Level Category)</option>
                {categories.filter((c) => !c.parent).map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Description"
              placeholder="Short category description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button type="submit" variant="primary" loading={saving} icon={<Plus size={15} />}>
              Save Category
            </Button>
          </div>
        </form>

        {/* Existing Categories List */}
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Existing Categories ({categories.length})
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FolderTree size={16} style={{ color: 'var(--primary-400)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      <code style={{ color: 'var(--primary-400)', marginRight: '0.5rem' }}>[{cat.code}]</code>
                      {cat.parent_name ? `${cat.parent_name} > ` : ''}{cat.name}
                    </div>
                    {cat.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat.description}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Badge variant="info">{cat.product_count} products</Badge>
                  <button
                    onClick={() => {
                      setError(null);
                      setDeletingCategory(cat);
                    }}
                    title="Delete category"
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
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standard Delete Confirmation Modal */}
        {deletingCategory && (
          <Modal
            isOpen={!!deletingCategory}
            onClose={() => {
              setDeletingCategory(null);
              setDeleteError(null);
            }}
            title="Confirm Category Deletion"
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
                Are you sure you want to delete category <strong>[{deletingCategory.code}] {deletingCategory.name}</strong>?
                {deletingCategory.product_count > 0 && !deleteError && (
                  <div style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    ⚠️ This category currently has {deletingCategory.product_count} product(s) linked to it.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button variant="outline" onClick={() => { setDeletingCategory(null); setDeleteError(null); }} disabled={deleteSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  loading={deleteSubmitting}
                  icon={<Trash2 size={14} />}
                  style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={handleConfirmDeleteCategory}
                >
                  Delete Category
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
};
