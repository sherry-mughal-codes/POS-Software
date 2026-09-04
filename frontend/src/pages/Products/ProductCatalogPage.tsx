import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Grid,
  List,
  FolderTree,
  Scale,
  Edit2,
  Power,
  Trash2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { ProductModal } from './ProductModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { UnitManagerModal } from './UnitManagerModal';
import { BulkImportModal } from './BulkImportModal';
import { getProductImageUrl } from '../../utils/imageUrl';
import { Product, Category, Unit } from '../../types/product';
import { productService } from '../../services/productService';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toFixed(1);
};

export const ProductCatalogPage: React.FC = () => {
  const { showError, showSuccess } = useToast();
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  // Toggle active status
  const handleToggleStatus = async (product: Product) => {
    try {
      await productService.toggleProductStatus(product.id);
      showSuccess(`Product ${product.name} status updated.`, 'Product Status');
      fetchCatalogData();
    } catch (err: any) {
      showError(err?.message || 'Failed to update product status.', 'Product Error');
    }
  };

  // Delete product
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await productService.deleteProduct(productToDelete.id);
      showSuccess(`Product "${productToDelete.name}" (${productToDelete.sku}) has been permanently deleted.`, 'Product Deleted');
      setProductToDelete(null);
      fetchCatalogData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to delete product.';
      setDeleteError(msg);
      showError(msg, 'Cannot Delete Product');
    } finally {
      setIsDeleting(false);
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

  const paginatedProducts = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

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
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.625rem',
          }}>
            {paginatedProducts.map((p) => (
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
                    {p.image || p.image_url ? (
                      <img
                        src={getProductImageUrl(p.image || p.image_url)}
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
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: 'var(--primary-400)',
                        }}>
                          {p.sku}
                        </code>
                        <Badge variant={p.is_active ? 'success' : 'danger'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <h4 style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        margin: '0.15rem 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }} title={p.name}>
                        {p.name}
                      </h4>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    <Badge variant="phase">{p.category_name || 'Uncategorized'}</Badge>
                    <Badge variant="info">{p.unit_name || 'Unit'}</Badge>
                    {p.maintain_stock === false && (
                      <Badge variant="warning">Stock-Free</Badge>
                    )}
                  </div>

                  {/* Pricing Matrix */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.35rem',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: '0.375rem',
                    marginBottom: '0.4rem',
                    fontSize: '0.6875rem',
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.625rem' }}>Cost</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {currencySymbol || 'Rs.'} {formatMoney(p.purchase_price)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.625rem' }}>Sell</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 800 }}>
                        {currencySymbol || 'Rs.'} {formatMoney(p.selling_price)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Stock & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem' }}>
                  <div style={{ fontSize: '0.6875rem' }}>
                    <span style={{ color: 'var(--text-subtle)' }}>Stock: </span>
                    <strong style={{
                      fontFamily: 'var(--font-mono)',
                      color: (p.current_stock ?? 0) <= (p.min_stock_level ?? 0) ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {p.current_stock ?? 0}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <Button
                      variant="outline"
                      icon={<Edit2 size={11} />}
                      title="Edit Product"
                      style={{ padding: '0.2rem 0.35rem' }}
                      onClick={() => handleOpenEditModal(p)}
                    />
                    <Button
                      variant="outline"
                      icon={<Power size={11} />}
                      title={p.is_active ? 'Deactivate Product' : 'Activate Product'}
                      style={{
                        padding: '0.2rem 0.35rem',
                        color: p.is_active ? 'var(--warning)' : 'var(--success)',
                        borderColor: p.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                      }}
                      onClick={() => handleToggleStatus(p)}
                    />
                    <Button
                      variant="outline"
                      icon={<Trash2 size={11} />}
                      title="Delete Product"
                      style={{
                        padding: '0.2rem 0.35rem',
                        color: 'var(--danger)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                      }}
                      onClick={() => {
                        setDeleteError(null);
                        setProductToDelete(p);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length > 0 && (
            <div style={{ marginTop: '0.875rem' }}>
              <Pagination
                currentPage={page}
                totalItems={filteredProducts.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                pageSizeOptions={[25, 50, 100, 200]}
              />
            </div>
          )}
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
                {paginatedProducts.map((p) => (
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
                        <Button
                          variant="outline"
                          icon={<Trash2 size={13} />}
                          title="Delete Product"
                          style={{
                            padding: '0.25rem 0.45rem',
                            color: 'var(--danger)',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                          }}
                          onClick={() => {
                            setDeleteError(null);
                            setProductToDelete(p);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <Pagination
                currentPage={page}
                totalItems={filteredProducts.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                pageSizeOptions={[25, 50, 100, 200]}
              />
            </div>
          )}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => {
          if (!isDeleting) {
            setProductToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Confirm Product Deletion"
        maxWidth="480px"
      >
        {productToDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '0.5rem',
                padding: '0.875rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.625rem',
              }}
            >
              <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Permanently delete this product?
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                  This will permanently delete this product from the catalog. Products that have existing stock on hand, purchase history, sales, or warranty records cannot be deleted.
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Product Name:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{productToDelete.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>SKU:</span>
                <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)' }}>{productToDelete.sku}</code>
              </div>
              {productToDelete.barcode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Barcode:</span>
                  <code style={{ fontFamily: 'var(--font-mono)' }}>{productToDelete.barcode}</code>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selling Price:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {currencySymbol || 'Rs.'} {formatMoney(productToDelete.selling_price)}
                </span>
              </div>
            </div>

            {deleteError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid var(--danger)',
                  borderRadius: '0.375rem',
                  padding: '0.625rem 0.75rem',
                  fontSize: '0.78125rem',
                  color: 'var(--text-main)',
                  lineHeight: 1.4,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '0.2rem' }}>Cannot Delete Product</div>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setProductToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 size={14} />}
                onClick={handleConfirmDelete}
                loading={isDeleting}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
