import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Scan,
  Grid,
  List,
  FolderTree,
  Scale,
  Edit2,
  Power,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ProductModal } from './ProductModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { UnitManagerModal } from './UnitManagerModal';
import { BulkImportModal } from './BulkImportModal';
import { Product, Category, Unit } from '../../types/product';
import { productService } from '../../services/productService';
import { useSettings } from '../../context/SettingsContext';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toFixed(1);
};

export const ProductCatalogPage: React.FC = () => {
  const { currencySymbol } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Barcode Scanner input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, cats, uList] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
        productService.getUnits(),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setUnits(uList || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load product catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogData();
  }, [fetchCatalogData]);

  // Barcode Instant Lookup
  const handleBarcodeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setScanError(null);
    setScannedProduct(null);
    try {
      const found = await productService.lookupBarcode(barcodeInput.trim());
      setScannedProduct(found);
    } catch (err: any) {
      setScanError(`No product found for barcode '${barcodeInput}'.`);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (product: Product) => {
    try {
      await productService.toggleProductStatus(product.id);
      fetchCatalogData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update product status.');
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  // Filtered list
  const filteredProducts = (products || []).filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q));

    const matchesCat = selectedCategory === 'ALL' || (p.category && p.category.toString() === selectedCategory);

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = !!p.is_active;
    if (statusFilter === 'INACTIVE') matchesStatus = !p.is_active;

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Product Catalog
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={<FolderTree size={14} />} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setIsCategoryModalOpen(true)}>
            Categories ({categories.length})
          </Button>
          <Button variant="secondary" icon={<Scale size={14} />} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setIsUnitModalOpen(true)}>
            Units ({units.length})
          </Button>
          <Button variant="secondary" icon={<FileSpreadsheet size={14} />} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setIsBulkImportModalOpen(true)}>
            Import Bulk
          </Button>
          <Button variant="primary" icon={<Plus size={14} />} style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} onClick={handleOpenAddModal}>
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter & View Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Category Chips */}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem', flex: 1 }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '0.3rem 0.65rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: selectedCategory === 'ALL' ? 'var(--primary-400)' : 'var(--border-subtle)',
              backgroundColor: selectedCategory === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-elevated)',
              color: selectedCategory === 'ALL' ? 'var(--primary-400)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            All Categories ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id.toString())}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: selectedCategory === c.id.toString() ? 'var(--primary-400)' : 'var(--border-subtle)',
                backgroundColor: selectedCategory === c.id.toString() ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-elevated)',
                color: selectedCategory === c.id.toString() ? 'var(--primary-400)' : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.name} ({c.product_count || 0})
            </button>
          ))}
        </div>

        {/* Search, Status & View Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ width: '200px' }}>
            <Input
              placeholder="Search product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={13} />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.6rem',
              color: 'var(--text-main)',
              outline: 'none',
              fontSize: '0.78125rem',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          <div style={{ display: 'flex', backgroundColor: 'var(--bg-elevated)', borderRadius: '0.5rem', padding: '0.25rem', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('GRID')}
              style={{
                padding: '0.375rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: viewMode === 'GRID' ? 'var(--primary-500)' : 'transparent',
                color: viewMode === 'GRID' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              style={{
                padding: '0.375rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: viewMode === 'TABLE' ? 'var(--primary-500)' : 'transparent',
                color: viewMode === 'TABLE' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <List size={16} />
            </button>
          </div>

          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={fetchCatalogData} />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner label="Loading Product Master Catalog..." />
      ) : error ? (
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '0.5rem' }}>
          {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.4 }} />
          <h3>No Products Found</h3>
          <p style={{ marginTop: '0.5rem' }}>No items match your search or filter parameters.</p>
        </div>
      ) : viewMode === 'GRID' ? (
        /* ================= GRID VIEW ================= */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '0.625rem',
        }}>
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="glass-card"
              style={{
                padding: '0.625rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: p.is_active ? 1 : 0.6,
                border: p.is_active ? '1px solid var(--border-subtle)' : '1px dashed var(--danger-border)',
              }}
            >
              <div>
                {/* Image & Header */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '0.375rem',
                        objectFit: 'cover',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-medium)',
                        flexShrink: 0,
                      }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '0.375rem',
                      backgroundColor: 'var(--bg-app)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-subtle)',
                      border: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}>
                      <Package size={16} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--primary-400)',
                        fontSize: '0.6875rem',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.1rem 0.25rem',
                        borderRadius: '0.2rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {p.sku}
                      </code>
                      <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        color: p.is_active ? 'var(--success)' : 'var(--danger)',
                        backgroundColor: p.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        padding: '0.05rem 0.3rem',
                        borderRadius: '0.2rem',
                      }}>
                        {p.is_active ? 'Active' : 'Off'}
                      </span>
                    </div>

                    <h4 style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      marginTop: '0.2rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }} title={p.name}>
                      {p.name}
                    </h4>
                  </div>
                </div>

                {/* Category & Unit Info */}
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', padding: '0.05rem 0.3rem', borderRadius: '0.2rem', border: '1px solid var(--border-subtle)' }}>
                    {p.category_name || 'General'}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', padding: '0.05rem 0.3rem', borderRadius: '0.2rem', border: '1px solid var(--border-subtle)' }}>
                    {p.unit_code || p.unit_name || 'pcs'}
                  </span>
                  {p.maintain_stock === false && (
                    <span style={{ fontSize: '0.625rem', color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.05rem 0.3rem', borderRadius: '0.2rem' }}>
                      Service
                    </span>
                  )}
                </div>

                {/* Barcode */}
                {p.barcode && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Scan size={10} style={{ color: 'var(--primary-400)' }} />
                    <code style={{ fontSize: '0.65rem' }}>{p.barcode}</code>
                  </div>
                )}
              </div>

              {/* Pricing & Actions */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                  <div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-subtle)' }}>Cost: {currencySymbol || 'Rs.'} {formatMoney(p.purchase_price)}</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                      {currencySymbol || 'Rs.'} {formatMoney(p.selling_price)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.15rem', justifyContent: 'flex-end' }}>
                      <Sparkles size={10} />
                      {formatPercent(p.profit_margin_percentage !== undefined ? p.profit_margin_percentage : (p.selling_price > 0 ? ((p.selling_price - p.purchase_price) / p.selling_price) * 100 : 0))}%
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                  <Button
                    variant="outline"
                    icon={<Edit2 size={12} />}
                    title="Edit Product"
                    style={{ flex: 1, padding: '0.25rem 0.4rem' }}
                    onClick={() => handleOpenEditModal(p)}
                  />
                  <Button
                    variant="outline"
                    icon={<Power size={12} />}
                    title={p.is_active ? 'Deactivate Product' : 'Activate Product'}
                    style={{
                      padding: '0.25rem 0.45rem',
                      color: p.is_active ? 'var(--warning)' : 'var(--success)',
                      borderColor: p.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                    }}
                    onClick={() => handleToggleStatus(p)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <Card
          title="Product Master Catalog"
          icon={<Package size={16} />}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Product Name</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Unit</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Barcode</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Cost Price</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Selling Price</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Gross Margin</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', opacity: p.is_active ? 1 : 0.55 }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.75rem' }}>
                        {p.sku}
                      </code>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{p.name}</span>
                        {p.maintain_stock === false && (
                          <Badge variant="warning">Stock-Free</Badge>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <Badge variant="phase">{p.category_name || 'Unassigned'}</Badge>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {p.unit_name} ({p.unit_code})
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <code style={{ fontSize: '0.71875rem', color: 'var(--text-subtle)' }}>{p.barcode || '—'}</code>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                      {currencySymbol || 'Rs.'} {formatMoney(p.purchase_price)}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                      {currencySymbol || 'Rs.'} {formatMoney(p.selling_price)}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontSize: '0.78125rem' }}>
                      {formatPercent(p.profit_margin_percentage !== undefined ? p.profit_margin_percentage : (p.selling_price > 0 ? ((p.selling_price - p.purchase_price) / p.selling_price) * 100 : 0))}%
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      <Badge variant={p.is_active ? 'success' : 'danger'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                        <Button
                          variant="outline"
                          icon={<Edit2 size={13} />}
                          title="Edit Product"
                          style={{ padding: '0.25rem 0.45rem' }}
                          onClick={() => handleOpenEditModal(p)}
                        />
                        <Button
                          variant="outline"
                          icon={<Power size={13} />}
                          title={p.is_active ? 'Deactivate Product' : 'Activate Product'}
                          style={{
                            padding: '0.25rem 0.45rem',
                            color: p.is_active ? 'var(--warning)' : 'var(--success)',
                            borderColor: p.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                          }}
                          onClick={() => handleToggleStatus(p)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Product Create / Edit Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={editingProduct}
        categories={categories}
        units={units}
        onSaved={fetchCatalogData}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onRefresh={fetchCatalogData}
      />

      {/* Unit Manager Modal */}
      <UnitManagerModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        units={units}
        onRefresh={fetchCatalogData}
      />

      {/* Bulk Product Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={fetchCatalogData}
      />
    </div>
  );
};
