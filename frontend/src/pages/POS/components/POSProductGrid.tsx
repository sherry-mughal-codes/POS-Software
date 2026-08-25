import React, { useState } from 'react';
import {
  Package,
  Layers,
} from 'lucide-react';
import { InventorySummaryItem } from '../../../types/inventory';
import { Category } from '../../../types/product';
import { getProductImageUrl } from '../../../utils/imageUrl';

interface POSProductGridProps {
  products: InventorySummaryItem[];
  categories: Category[];
  onAddToCart: (product: InventorySummaryItem) => void;
  searchTerm?: string;
  isSidebarCollapsed?: boolean;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const POSProductGrid: React.FC<POSProductGridProps> = ({
  products,
  categories,
  onAddToCart,
  searchTerm = '',
  isSidebarCollapsed: _isSidebarCollapsed = false,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  const filteredProducts = products.filter((p) => {
    // Category filter
    if (selectedCategoryId !== 'all' && p.category_id?.toString() !== selectedCategoryId) {
      return false;
    }
    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.product_name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.45rem', overflow: 'hidden' }}>
      {/* Category Pills Slider */}
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          overflowX: 'auto',
          paddingBottom: '0.125rem',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setSelectedCategoryId('all')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '2rem',
            border: selectedCategoryId === 'all' ? '1px solid var(--primary-400)' : '1px solid var(--border-subtle)',
            backgroundColor: selectedCategoryId === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
            color: selectedCategoryId === 'all' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Layers size={12} />
          <span>All ({products.length})</span>
        </button>

        {categories.map((c) => {
          const isSelected = selectedCategoryId === c.id.toString();
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryId(c.id.toString())}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '2rem',
                border: isSelected ? '1px solid var(--primary-400)' : '1px solid var(--border-subtle)',
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-card)',
                color: isSelected ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Product Cards Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '0.5rem',
          paddingRight: '0.25rem',
          alignContent: 'start',
        }}
      >
        {filteredProducts.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '3rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Package size={36} style={{ margin: '0 auto 0.5rem', color: 'var(--text-subtle)' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>No products found</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Try searching with another keyword or SKU
            </div>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isStockFree = p.maintain_stock === false || p.stock_status === 'STOCK_FREE';
            const isOutOfStock = !isStockFree && p.current_stock <= 0;
            const isLowStock = !isStockFree && !isOutOfStock && p.current_stock <= p.min_stock_level;
            const sellingPrice = p.selling_price !== undefined && p.selling_price !== null ? p.selling_price : ((p as any).price ?? (p as any).unit_price ?? 0);
            const productName = p.product_name || (p as any).name || 'Product';

            return (
              <div
                key={p.product_id}
                onClick={() => !isOutOfStock && onAddToCart(p)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  opacity: isOutOfStock ? 0.55 : 1,
                  transition: 'all 0.15s ease',
                  backgroundColor: 'var(--bg-card)',
                  border: isOutOfStock ? '1px dashed var(--danger)' : isStockFree ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid var(--border-subtle)',
                  position: 'relative',
                  padding: '0.45rem',
                  gap: '0.3rem',
                  minWidth: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isOutOfStock) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--primary-400)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOutOfStock) {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = isStockFree ? 'rgba(56, 189, 248, 0.35)' : 'var(--border-subtle)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                  }
                }}
              >
                {/* Product Top Box: Image / Icon & Stock Pill */}
                <div
                  style={{
                    height: '52px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {(() => {
                    const resolvedUrl = getProductImageUrl(p.image || p.image_url);
                    if (resolvedUrl) {
                      return (
                        <img
                          src={resolvedUrl}
                          alt={productName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      );
                    }
                    return (
                      <Package size={22} style={{ color: isStockFree ? 'var(--primary-400)' : 'var(--text-subtle)' }} />
                    );
                  })()}

                  {/* Stock Pill Badge */}
                  <div style={{ position: 'absolute', top: '0.2rem', right: '0.2rem', zIndex: 1 }}>
                    {isStockFree ? (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(56, 189, 248, 0.9)',
                          color: '#000',
                          padding: '0.05rem 0.25rem',
                          borderRadius: '0.2rem',
                        }}
                      >
                        Service
                      </span>
                    ) : isOutOfStock ? (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          padding: '0.05rem 0.25rem',
                          borderRadius: '0.2rem',
                        }}
                      >
                        Out
                      </span>
                    ) : isLowStock ? (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(245, 158, 11, 0.9)',
                          color: '#000',
                          padding: '0.05rem 0.25rem',
                          borderRadius: '0.2rem',
                        }}
                      >
                        Low ({p.current_stock})
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.9)',
                          color: '#fff',
                          padding: '0.05rem 0.25rem',
                          borderRadius: '0.2rem',
                        }}
                      >
                        {p.current_stock}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Container */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  {/* Product Title */}
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '1.8rem',
                      wordBreak: 'break-word',
                    }}
                    title={productName}
                  >
                    {productName}
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.2rem' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '0.8125rem',
                        color: 'var(--primary-400)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Rs. {formatMoney(sellingPrice)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
