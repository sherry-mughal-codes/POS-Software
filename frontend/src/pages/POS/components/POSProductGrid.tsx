import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Scan,
  Package,
  Layers,
} from 'lucide-react';
import { InventorySummaryItem } from '../../../types/inventory';
import { Category } from '../../../types/product';

interface POSProductGridProps {
  products: InventorySummaryItem[];
  categories: Category[];
  onAddToCart: (product: InventorySummaryItem) => void;
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
  isSidebarCollapsed = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search on load and keyboard shortcut 'F2' or '/'
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle barcode scanner Enter press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      // Match exact barcode or SKU first
      const exactMatch = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === term) ||
          p.sku.toLowerCase() === term
      );
      if (exactMatch) {
        onAddToCart(exactMatch);
        setSearchTerm('');
      }
    }
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.625rem', overflow: 'hidden' }}>
      {/* Search & Barcode Scan Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-subtle)',
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Scan barcode or search product / SKU... (Press F2 or Enter)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem 0.625rem 2.5rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.625rem',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              fontWeight: 500,
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: 'var(--text-subtle)',
              fontSize: '0.6875rem',
            }}
          >
            <Scan size={13} />
            <kbd style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem', border: '1px solid var(--border-subtle)' }}>F2</kbd>
          </div>
        </div>
      </div>

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

      {/* Product Cards Grid: Minimum 4 columns (6 columns when collapsed) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: isSidebarCollapsed
            ? 'repeat(6, minmax(0, 1fr))'
            : 'repeat(4, minmax(0, 1fr))',
          gap: '0.625rem',
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
            const isOutOfStock = p.current_stock <= 0;
            const isLowStock = !isOutOfStock && p.current_stock <= p.min_stock_level;

            return (
              <div
                key={p.product_id}
                onClick={() => !isOutOfStock && onAddToCart(p)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '0.625rem',
                  overflow: 'hidden',
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  opacity: isOutOfStock ? 0.55 : 1,
                  transition: 'all 0.15s ease',
                  backgroundColor: 'var(--bg-card)',
                  border: isOutOfStock ? '1px dashed var(--danger)' : '1px solid var(--border-subtle)',
                  position: 'relative',
                  padding: '0.5rem',
                  gap: '0.375rem',
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
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                  }
                }}
              >
                {/* Product Top Box: Icon & Stock Pill */}
                <div
                  style={{
                    height: '52px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <Package size={24} style={{ color: 'var(--text-subtle)' }} />

                  {/* Stock Pill Badge */}
                  <div style={{ position: 'absolute', top: '0.25rem', right: '0.25rem' }}>
                    {isOutOfStock ? (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(239, 68, 68, 0.25)',
                          color: 'var(--danger)',
                          border: '1px solid var(--danger)',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '0.25rem',
                        }}
                      >
                        Out
                      </span>
                    ) : isLowStock ? (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(245, 158, 11, 0.25)',
                          color: 'var(--warning)',
                          border: '1px solid var(--warning)',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '0.25rem',
                        }}
                      >
                        {p.current_stock}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: 'var(--success)',
                          border: '1px solid var(--success)',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '0.25rem',
                        }}
                      >
                        {p.current_stock}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Container */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Product Title */}
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.25,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '1.9rem',
                      wordBreak: 'break-word',
                    }}
                    title={p.product_name}
                  >
                    {p.product_name}
                  </div>

                  {/* Price & SKU */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    <code style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{p.sku}</code>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '0.8125rem',
                        color: 'var(--primary-400)',
                      }}
                    >
                      Rs. {formatMoney(p.selling_price)}
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
