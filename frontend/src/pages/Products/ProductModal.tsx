import React, { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Product, Category, Unit } from '../../types/product';
import { productService } from '../../services/productService';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  categories: Category[];
  units: Unit[];
  onSaved: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  categories,
  units,
  onSaved,
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [unitId, setUnitId] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (productToEdit) {
        setSku(productToEdit.sku);
        setName(productToEdit.name);
        setBarcode(productToEdit.barcode || '');
        setCategoryId(productToEdit.category.toString());
        setUnitId(productToEdit.unit.toString());
        setPurchasePrice(productToEdit.purchase_price.toString());
        setSellingPrice(productToEdit.selling_price.toString());
        setImageUrl(productToEdit.image_url || '');
        setDescription(productToEdit.description || '');
        setIsActive(productToEdit.is_active);
      } else {
        setName('');
        setBarcode('');
        setCategoryId(categories.length > 0 ? categories[0].id.toString() : '');
        setUnitId(units.length > 0 ? units[0].id.toString() : '');
        setPurchasePrice('0');
        setSellingPrice('0');
        setImageUrl('');
        setDescription('');
        setIsActive(true);

        // Fetch sequential SKU
        productService.getNextSku().then((res) => {
          setSku(res.next_sku);
        }).catch(() => {
          setSku(`PRD-${Math.floor(10000 + Math.random() * 90000)}`);
        });
      }
    }
  }, [isOpen, productToEdit, categories, units]);

  // Live Gross Margin Calculation
  const pPrice = parseFloat(purchasePrice) || 0;
  const sPrice = parseFloat(sellingPrice) || 0;
  const marginAmount = sPrice - pPrice;
  const marginPercent = sPrice > 0 ? ((marginAmount / sPrice) * 100).toFixed(1) : '0.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name || !categoryId || !unitId) {
      setError('SKU, Product Name, Category, and Unit are required fields.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<Product> = {
      sku: sku.trim(),
      name: name.trim(),
      barcode: barcode.trim() || null,
      category: parseInt(categoryId, 10),
      unit: parseInt(unitId, 10),
      purchase_price: pPrice,
      selling_price: sPrice,
      image_url: imageUrl.trim() || null,
      description: description.trim() || null,
      is_active: isActive,
    };

    try {
      if (productToEdit) {
        await productService.updateProduct(productToEdit.id, payload);
      } else {
        await productService.createProduct(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? `Edit Product: ${productToEdit.name}` : 'Add New Product Master'}
      subtitle="Canonical product definition for inventory, purchasing, and POS checkout."
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Row 1: SKU & Barcode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="SKU Identifier *"
            placeholder="e.g. PRD-00015"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
            helperText="Unique internal stock code."
          />
          <Input
            label="Barcode / EAN (Optional)"
            placeholder="e.g. 5449000000996"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            helperText="For physical laser scanner barcode lookup."
          />
        </div>

        {/* Row 2: Product Name */}
        <Input
          label="Product Full Name *"
          placeholder="e.g. Coca-Cola 500ml Pet Bottle"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Row 3: Category & Unit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.parent_name ? `${c.parent_name} > ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Stock Unit *</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              required
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.short_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Pricing & Margin Calculator */}
        <div style={{
          backgroundColor: 'var(--bg-app)',
          padding: '1rem',
          borderRadius: '0.625rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Default Reference Pricing & Margin
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Purchase Reference Cost (Rs.)"
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
            <Input
              label="Default Selling Price (Rs.) *"
              type="number"
              step="0.01"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
            />
          </div>

          {/* Live Margin Indicator */}
          <div style={{
            marginTop: '0.75rem',
            padding: '0.625rem 0.875rem',
            backgroundColor: marginAmount >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${marginAmount >= 0 ? 'var(--success-border)' : 'var(--danger-border)'}`,
            borderRadius: '0.375rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8125rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: marginAmount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              <Sparkles size={14} />
              <span>Gross Profit Margin: <strong>Rs. {marginAmount.toFixed(2)}</strong></span>
            </div>
            <strong style={{ color: marginAmount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {marginPercent}% Markup
            </strong>
          </div>
        </div>

        {/* Row 5: Image URL & Preview */}
        <div>
          <Input
            label="Product Image URL"
            placeholder="https://images.unsplash.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            icon={<ImageIcon size={14} />}
          />
          {imageUrl && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src={imageUrl}
                alt="Preview"
                style={{ width: '48px', height: '48px', borderRadius: '0.375rem', objectFit: 'cover', border: '1px solid var(--border-medium)' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Image Preview</span>
            </div>
          )}
        </div>

        {/* Row 6: Description */}
        <Input
          label="Product Description"
          placeholder="Detailed specs or notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Status Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="is_active_prod"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-500)', cursor: 'pointer' }}
          />
          <label htmlFor="is_active_prod" style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
            Product is Active & Available for POS Sales
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {productToEdit ? 'Update Product' : 'Save Product Master'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
