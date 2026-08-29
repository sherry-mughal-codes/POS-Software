import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Package } from 'lucide-react';
import { Product } from '../../types/product';

interface SearchableProductSelectProps {
  products: Product[];
  value: number | string | null | undefined;
  onChange: (productId: string, product?: Product) => void;
  placeholder?: string;
  allowClear?: boolean;
  allOptionLabel?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  value,
  onChange,
  placeholder = 'Search & select product...',
  allowClear = false,
  allOptionLabel,
  disabled = false,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(
    (p) => p.id.toString() === (value?.toString() || '')
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      (p.category_name && p.category_name.toLowerCase().includes(query))
    );
  });

  const handleSelect = (p?: Product) => {
    if (!p) {
      onChange('');
    } else {
      onChange(p.id.toString(), p);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        zIndex: isOpen ? 9999 : 1,
        ...style,
      }}
    >
      {/* Clickable Display Trigger */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-input)',
          border: isOpen ? '1px solid var(--primary-400)' : '1px solid var(--border-medium)',
          borderRadius: '0.375rem',
          padding: '0.35rem 0.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--text-main)',
          fontSize: '0.78125rem',
          minHeight: '34px',
          boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
          <Package size={14} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
          {selectedProduct ? (
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              [{selectedProduct.sku}] {selectedProduct.name}
            </span>
          ) : allOptionLabel && (!value || value === '') ? (
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{allOptionLabel}</span>
          ) : (
            <span style={{ color: 'var(--text-subtle)' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          {allowClear && (selectedProduct || (value && value !== '')) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-subtle)',
                cursor: 'pointer',
                padding: '0.1rem',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear selection"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown size={14} style={{ color: 'var(--text-subtle)' }} />
        </div>
      </div>

      {/* Popover Search and Results Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 99999,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.375rem',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
            overflow: 'hidden',
            maxHeight: '220px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box Header */}
          <div
            style={{
              padding: '0.4rem',
              borderBottom: '1px solid var(--border-subtle)',
              position: 'relative',
              backgroundColor: 'var(--bg-app)',
            }}
          >
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search product name, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '0.3rem 0.5rem 0.3rem 1.75rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.25rem',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Results List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
            {allOptionLabel && (
              <div
                onClick={() => handleSelect(undefined)}
                style={{
                  padding: '0.45rem 0.65rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: !value || value === '' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  color: !value || value === '' ? 'var(--primary-400)' : 'var(--text-main)',
                  fontWeight: !value || value === '' ? 700 : 500,
                  fontSize: '0.78125rem',
                }}
              >
                {allOptionLabel}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                No products match "{searchQuery}"
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.id.toString() === (value?.toString() || '');
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    style={{
                      padding: '0.45rem 0.65rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.78125rem', fontWeight: 600, color: isSelected ? 'var(--primary-400)' : 'var(--text-main)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        SKU: <code style={{ color: 'var(--primary-400)' }}>{p.sku}</code>
                        {p.barcode && ` • Barcode: ${p.barcode}`}
                        {p.category_name && ` • ${p.category_name}`}
                      </div>
                    </div>

                    {typeof p.current_stock !== 'undefined' && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '0.25rem',
                          backgroundColor: (p.current_stock ?? 0) > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: (p.current_stock ?? 0) > 0 ? 'var(--success)' : 'var(--danger)',
                          flexShrink: 0,
                          marginLeft: '0.5rem',
                        }}
                      >
                        {p.current_stock} {p.unit_code || ''}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
