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
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ProductModal } from './ProductModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { UnitManagerModal } from './UnitManagerModal';
import { Product, Category, Unit } from '../../types/product';
import { productService } from '../../services/productService';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toFixed(1);
};

export const ProductCatalogPage: React.FC = () => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Badge variant="phase">Phase 3 Active</Badge>
            <Badge variant="success" pulse>Master Catalog</Badge>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Products, Categories & Units
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Single source of truth for items across Purchasing, Inventory, POS Sales, and Financial Reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={<FolderTree size={16} />} onClick={() => setIsCategoryModalOpen(true)}>
            Categories ({categories.length})
          </Button>
          <Button variant="secondary" icon={<Scale size={16} />} onClick={() => setIsUnitModalOpen(true)}>
            Units ({units.length})
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenAddModal}>
            Add Product
          </Button>
        </div>
      </div>

      {/* Barcode Quick Scanner Simulator Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
        <form onSubmit={handleBarcodeLookup} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-400)', fontWeight: 600, fontSize: '0.875rem' }}>
            <Scan size={18} />
            <span>Barcode Scanner Lookup:</span>
          </div>
          <div style={{ flex: 1, minWidth: '240px', maxWidth: '400px' }}>
            <Input
              placeholder="Scan or type barcode (e.g. 5449000000996)..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" icon={<Search size={14} />}>
            Lookup
          </Button>
          {scannedProduct && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: 'var(--success-bg)',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--success-border)',
              fontSize: '0.8125rem',
            }}>
              <strong style={{ color: 'var(--success)' }}>Scanned:</strong>
              <span>[{scannedProduct.sku}] {scannedProduct.name}</span>
              <strong style={{ color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(scannedProduct.selling_price)}</strong>
            </div>
          )}
          {scanError && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--danger)' }}>{scanError}</span>
          )}
        </form>
      </div>

      {/* Filter & View Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Category Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', flex: 1 }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '0.5rem 0.875rem',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
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
                padding: '0.5rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ width: '220px' }}>
            <Input
              placeholder="Search product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={14} />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="glass-card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: p.is_active ? 1 : 0.6,
                border: p.is_active ? '1px solid var(--border-subtle)' : '1px dashed var(--danger-border)',
              }}
            >
              <div>
                {/* Image & Header */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '0.5rem',
                        objectFit: 'cover',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-medium)',
                      }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '0.5rem',
                      backgroundColor: 'var(--bg-app)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <Package size={24} />
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--primary-400)',
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem',
                      }}>
                        {p.sku}
                      </code>
                      <Badge variant={p.is_active ? 'success' : 'danger'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <h4 style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      marginTop: '0.375rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.25,
                    }}>
                      {p.name}
                    </h4>
                  </div>
                </div>

                {/* Category & Unit Info */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <Badge variant="phase">{p.category_name || 'Unassigned'}</Badge>
                  <Badge variant="info">{p.unit_name || 'Unit'} ({p.unit_code || 'pcs'})</Badge>
                </div>

                {/* Barcode */}
                {p.barcode && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Scan size={13} style={{ color: 'var(--primary-400)' }} />
                    <code>{p.barcode}</code>
                  </div>
                )}
              </div>

              {/* Pricing & Actions */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Cost: Rs. {formatMoney(p.purchase_price)}</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      Rs. {formatMoney(p.selling_price)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Sparkles size={12} />
                      {formatPercent(p.profit_margin_percentage)}%
                    </span>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
                      +Rs. {formatMoney(p.profit_margin_amount)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <Button
                    variant="outline"
                    icon={<Edit2 size={13} />}
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                    onClick={() => handleOpenEditModal(p)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    icon={<Power size={13} />}
                    title={p.is_active ? 'Deactivate item' : 'Activate item'}
                    style={{
                      padding: '0.4rem 0.625rem',
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
          subtitle={`${filteredProducts.length} items defined`}
          icon={<Package size={20} />}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Product Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Unit</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Barcode</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Cost Price</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Selling Price</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Gross Margin</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
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
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)' }}>
                        {p.sku}
                      </code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant="phase">{p.category_name || 'Unassigned'}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                      {p.unit_name} ({p.unit_code})
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{p.barcode || '—'}</code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      Rs. {formatMoney(p.purchase_price)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      Rs. {formatMoney(p.selling_price)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                      {formatPercent(p.profit_margin_percentage)}%
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <Badge variant={p.is_active ? 'success' : 'danger'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <Button
                          variant="outline"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleOpenEditModal(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleToggleStatus(p)}
                        >
                          {p.is_active ? 'Disable' : 'Enable'}
                        </Button>
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
    </div>
  );
};
