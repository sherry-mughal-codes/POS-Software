import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  Package,
  Upload,
  X,
  Link,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Product, Category, Unit } from '../../types/product';
import { productService } from '../../services/productService';
import { useSettings } from '../../context/SettingsContext';

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
  const { currencySymbol, settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultLowStock = (settings as any)?.low_stock_default_threshold || '10';

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [unitId, setUnitId] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [openingStock, setOpeningStock] = useState('0');
  const [minStockLevel, setMinStockLevel] = useState('10');
  const [warrantyDuration, setWarrantyDuration] = useState<string>('');
  const [warrantyUnit, setWarrantyUnit] = useState<'DAYS' | 'MONTHS' | 'YEARS'>('DAYS');
  const [doNotMaintainStock, setDoNotMaintainStock] = useState(false);

  // Image Upload / URL states
  const [imageMode, setImageMode] = useState<'UPLOAD' | 'URL'>('UPLOAD');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

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
        setOpeningStock(productToEdit.current_stock ? productToEdit.current_stock.toString() : '0');
        setMinStockLevel(productToEdit.min_stock_level ? productToEdit.min_stock_level.toString() : defaultLowStock);
        if (productToEdit.warranty_period_days) {
          const days = productToEdit.warranty_period_days;
          if (days % 365 === 0 && days >= 365) {
            setWarrantyDuration((days / 365).toString());
            setWarrantyUnit('YEARS');
          } else if (days % 30 === 0 && days >= 30) {
            setWarrantyDuration((days / 30).toString());
            setWarrantyUnit('MONTHS');
          } else {
            setWarrantyDuration(days.toString());
            setWarrantyUnit('DAYS');
          }
        } else {
          setWarrantyDuration('');
          setWarrantyUnit('DAYS');
        }
        setDoNotMaintainStock(productToEdit.maintain_stock === false);

        if (productToEdit.image) {
          setImageMode('UPLOAD');
          setImagePreview(productToEdit.image);
          setImageFile(null);
          setImageUrl('');
        } else {
          setImageMode('UPLOAD');
          setImagePreview(null);
          setImageFile(null);
          setImageUrl('');
        }

        setDescription(productToEdit.description || '');
        setIsActive(productToEdit.is_active);
      } else {
        setName('');
        setBarcode('');
        setCategoryId(categories.length > 0 ? categories[0].id.toString() : '');
        setUnitId(units.length > 0 ? units[0].id.toString() : '');
        setPurchasePrice('0');
        setSellingPrice('0');
        setOpeningStock('0');
        setMinStockLevel(defaultLowStock);
        setWarrantyDuration('');
        setWarrantyUnit('DAYS');
        setDoNotMaintainStock(false);
        setImageMode('UPLOAD');
        setImagePreview(null);
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
  }, [isOpen, productToEdit, categories, units, defaultLowStock]);

  // Live Gross Margin Calculation
  const pPrice = parseFloat(purchasePrice) || 0;
  const sPrice = parseFloat(sellingPrice) || 0;
  const marginAmount = sPrice - pPrice;
  const marginPercent = sPrice > 0 ? ((marginAmount / sPrice) * 100).toFixed(1) : '0.0';

  const computeWarrantyDays = (): number | null => {
    const num = parseFloat(warrantyDuration);
    if (isNaN(num) || num <= 0) return null;
    if (warrantyUnit === 'YEARS') return Math.round(num * 365);
    if (warrantyUnit === 'MONTHS') return Math.round(num * 30);
    return Math.round(num);
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP, GIF, SVG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size exceeds maximum limit of 10MB.');
      return;
    }

    setError(null);
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name || !categoryId || !unitId) {
      setError('SKU, Product Name, Category, and Unit are required fields.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (imageFile) {
        // Send multipart FormData when an image file is uploaded from computer
        const formData = new FormData();
        formData.append('sku', sku.trim());
        formData.append('name', name.trim());
        if (barcode.trim()) formData.append('barcode', barcode.trim());
        formData.append('category', categoryId);
        formData.append('unit', unitId);
        formData.append('purchase_price', pPrice.toString());
        formData.append('selling_price', sPrice.toString());
        formData.append('min_stock_level', (doNotMaintainStock ? 0 : (parseFloat(minStockLevel) || 10)).toString());
        formData.append('maintain_stock', (!doNotMaintainStock).toString());
        formData.append('image', imageFile);
        if (imageUrl.trim()) formData.append('image_url', imageUrl.trim());
        if (description.trim()) formData.append('description', description.trim());
        formData.append('is_active', isActive.toString());
        const calcDays = computeWarrantyDays();
        if (calcDays !== null) {
          formData.append('warranty_period_days', calcDays.toString());
        } else {
          formData.append('warranty_period_days', '');
        }

        if (!productToEdit && !doNotMaintainStock) {
          formData.append('opening_stock', (parseFloat(openingStock) || 0).toString());
        }

        if (productToEdit) {
          await productService.updateProduct(productToEdit.id, formData);
        } else {
          await productService.createProduct(formData);
        }
      } else {
        // Send JSON payload
        const payload: any = {
          sku: sku.trim(),
          name: name.trim(),
          barcode: barcode.trim() || null,
          category: parseInt(categoryId, 10),
          unit: parseInt(unitId, 10),
          purchase_price: pPrice,
          selling_price: sPrice,
          min_stock_level: doNotMaintainStock ? 0 : (parseFloat(minStockLevel) || 10),
          maintain_stock: !doNotMaintainStock,
          image_url: imageMode === 'URL' && imageUrl.trim() ? imageUrl.trim() : null,
          description: description.trim() || null,
          is_active: isActive,
          warranty_period_days: computeWarrantyDays(),
        };

        if (!imagePreview && productToEdit?.image) {
          payload.image = null;
        }

        if (!productToEdit && !doNotMaintainStock) {
          payload.opening_stock = parseFloat(openingStock) || 0;
        }

        if (productToEdit) {
          await productService.updateProduct(productToEdit.id, payload);
        } else {
          await productService.createProduct(payload);
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? `Edit Product: ${productToEdit.name}` : 'Add New Product Master'}
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
                fontSize: '0.8125rem',
              }}
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Unit of Measure *</label>
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
                fontSize: '0.8125rem',
              }}
            >
              <option value="">-- Select Unit --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.short_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Pricing & Margin Panel */}
        <div style={{
          backgroundColor: 'var(--bg-app)',
          padding: '1rem',
          borderRadius: '0.625rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={15} color="var(--primary-400)" />
            <span>Pricing & Profit Margin</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label={`Purchase Rate (${currencySymbol || 'Rs.'})`}
              type="number"
              step="any"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              helperText="Cost basis for COGS valuation."
            />
            <Input
              label={`Retail Selling Price (${currencySymbol || 'Rs.'}) *`}
              type="number"
              step="any"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
              helperText="Default checkout unit price at POS."
            />
          </div>

          <div style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: '0.375rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8125rem',
            border: '1px solid var(--border-subtle)',
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Estimated Margin:</span>
            <div style={{ display: 'flex', gap: '0.75rem', fontWeight: 700 }}>
              <span style={{ color: marginAmount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {marginAmount >= 0 ? '+' : ''}{currencySymbol || 'Rs.'} {marginAmount.toFixed(2)}
              </span>
              <span style={{ color: parseFloat(marginPercent) >= 0 ? 'var(--primary-400)' : 'var(--danger)' }}>
                ({marginPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Row 5: Inventory & Opening Stock */}
        <div style={{
          backgroundColor: 'var(--bg-app)',
          padding: '1rem',
          borderRadius: '0.625rem',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={15} color="var(--primary-400)" />
            <span>Inventory Balance & Stock Controls</span>
          </div>

          {/* Do not maintain stock checkbox */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: doNotMaintainStock ? '0' : '0.875rem',
            padding: '0.625rem 0.875rem',
            backgroundColor: doNotMaintainStock ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-elevated)',
            border: '1px solid',
            borderColor: doNotMaintainStock ? 'var(--info-border)' : 'var(--border-subtle)',
            borderRadius: '0.5rem',
          }}>
            <input
              type="checkbox"
              id="do_not_maintain_stock"
              checked={doNotMaintainStock}
              onChange={(e) => setDoNotMaintainStock(e.target.checked)}
              style={{ width: '1.125rem', height: '1.125rem', accentColor: 'var(--primary-500)', cursor: 'pointer' }}
            />
            <div>
              <label htmlFor="do_not_maintain_stock" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                Do not maintain stock (Stock-free / Service Product)
              </label>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {doNotMaintainStock
                  ? '✓ Stock tracking is disabled. Unlimited sales allowed at POS. Revenue, receivables, and accounting ledgers update 100% on every sale.'
                  : 'Check this if this product is a service, repair, digital, or untracked product where on-hand quantity is not restricted.'}
              </div>
            </div>
          </div>

          {!doNotMaintainStock && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
              <Input
                label="Opening Quantity / Initial Stock"
                type="number"
                step="any"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                disabled={!!productToEdit}
                helperText={
                  productToEdit
                    ? `Current on-hand: ${openingStock} units (adjust via Stock Adjustments).`
                    : 'Auto-initializes inventory balance & valuation report.'
                }
              />
              <Input
                label="Low Stock Alert Threshold"
                type="number"
                step="any"
                min="0"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                helperText="Alerts manager when stock drops below this level."
              />
            </div>
          )}

          {/* Warranty Configuration with Days / Months / Years */}
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Customer Warranty Coverage
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 1, 6, 12, 365"
                  value={warrantyDuration}
                  onChange={(e) => setWarrantyDuration(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    padding: '0.45rem 0.65rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ width: '130px' }}>
                <select
                  value={warrantyUnit}
                  onChange={(e) => setWarrantyUnit(e.target.value as 'DAYS' | 'MONTHS' | 'YEARS')}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    padding: '0.45rem 0.65rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  <option value="DAYS">Days</option>
                  <option value="MONTHS">Months</option>
                  <option value="YEARS">Years</option>
                </select>
              </div>
            </div>
            {computeWarrantyDays() !== null && (
              <div style={{ fontSize: '0.7rem', color: 'var(--primary-400)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                = {computeWarrantyDays()} days warranty expiry from sale date
              </div>
            )}
          </div>
        </div>

        {/* Row 6: Product Image (Upload from Computer / Gallery or HTTPS URL) */}
        <div style={{
          backgroundColor: 'var(--bg-app)',
          padding: '1rem',
          borderRadius: '0.625rem',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ImageIcon size={15} color="var(--primary-400)" />
              <span>Product Image</span>
            </label>

            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-elevated)', padding: '0.2rem', borderRadius: '0.375rem', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setImageMode('UPLOAD')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: imageMode === 'UPLOAD' ? 'var(--primary-500)' : 'transparent',
                  color: imageMode === 'UPLOAD' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                <Upload size={12} />
                <span>Upload from Computer</span>
              </button>
              <button
                type="button"
                onClick={() => setImageMode('URL')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: imageMode === 'URL' ? 'var(--primary-500)' : 'transparent',
                  color: imageMode === 'URL' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                <Link size={12} />
                <span>Web URL</span>
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />

          {imageMode === 'UPLOAD' ? (
            <div>
              {imagePreview ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-medium)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <img
                      src={imagePreview}
                      alt="Product Preview"
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '0.375rem',
                        objectFit: 'cover',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        flexShrink: 0,
                      }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {imageFile ? imageFile.name : (productToEdit?.name || 'Selected Image')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={13} />
                        <span>Ready to display on POS & Catalog</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <Button
                      type="button"
                      variant="outline"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                      onClick={handleClearImage}
                      icon={<X size={13} />}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileChange(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: isDragging ? '2px dashed var(--primary-400)' : '2px dashed var(--border-medium)',
                    backgroundColor: isDragging ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-elevated)',
                    borderRadius: '0.5rem',
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(6, 182, 212, 0.12)',
                    color: 'var(--primary-400)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.5rem',
                  }}>
                    <Upload size={20} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Click to browse or drag & drop picture from computer
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    PNG, JPG, WebP, GIF, or SVG (Up to 10MB)
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Input
                label="Image Web URL (HTTPS)"
                placeholder="https://images.unsplash.com/photo-..."
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImagePreview(e.target.value.trim() || null);
                }}
                icon={<Link size={14} />}
                helperText="Paste any direct online image URL."
              />
              {imageUrl && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    style={{ width: '48px', height: '48px', borderRadius: '0.375rem', objectFit: 'cover', border: '1px solid var(--border-medium)' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online Web Preview</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 7: Description */}
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
