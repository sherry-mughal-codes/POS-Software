import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StockMovement } from '../../types/inventory';
import { Product } from '../../types/product';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { SearchableProductSelect } from '../../components/common/SearchableProductSelect';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface StockMovementLedgerTabProps {
  refreshTrigger?: number;
}

export const StockMovementLedgerTab: React.FC<StockMovementLedgerTabProps> = ({ refreshTrigger }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMovements({
        product: selectedProductId || undefined,
        movement_type: selectedType || undefined,
      });
      setMovements(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedProductId, selectedType]);

  useEffect(() => {
    productService.getProducts().then((pList) => setProducts(pList || []));
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements, refreshTrigger]);

  const filteredMovements = movements.filter((m) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.product_name.toLowerCase().includes(term) ||
      m.product_sku.toLowerCase().includes(term) ||
      (m.reference_id && m.reference_id.toLowerCase().includes(term)) ||
      (m.notes && m.notes.toLowerCase().includes(term))
    );
  });

  const renderMovementTypeBadge = (type: string, name: string) => {
    switch (type) {
      case 'PURCHASE':
        return <Badge variant="success"><ArrowDownLeft size={12} style={{ marginRight: '0.25rem' }} />Purchase (+)</Badge>;
      case 'PURCHASE_RETURN':
        return <Badge variant="danger"><ArrowUpRight size={12} style={{ marginRight: '0.25rem' }} />Purchase Return (-)</Badge>;
      case 'SALE':
        return <Badge variant="danger"><ArrowUpRight size={12} style={{ marginRight: '0.25rem' }} />Sale (-)</Badge>;
      case 'SALE_RETURN':
        return <Badge variant="success"><ArrowDownLeft size={12} style={{ marginRight: '0.25rem' }} />Sale Return (+)</Badge>;
      case 'ADJUSTMENT_IN':
        return <Badge variant="info"><ArrowDownLeft size={12} style={{ marginRight: '0.25rem' }} />Adjustment In (+)</Badge>;
      case 'ADJUSTMENT_OUT':
        return <Badge variant="warning"><ArrowUpRight size={12} style={{ marginRight: '0.25rem' }} />Adjustment Out (-)</Badge>;
      case 'OPENING_STOCK':
        return <Badge variant="phase">Opening Stock</Badge>;
      default:
        return <Badge variant="phase">{name || type}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Filters Card */}
      <Card title="Stock Ledger Audit Filters" icon={<Filter size={16} />} style={{ overflow: 'visible', position: 'relative', zIndex: 30 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem', alignItems: 'flex-end', overflow: 'visible' }}>
          {/* Search Box */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-subtle)',
                }}
              />
              <input
                type="text"
                placeholder="SKU, Name, Reference #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.35rem 0.65rem 0.35rem 1.9rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.78125rem',
                }}
              />
            </div>
          </div>

          {/* Product Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Product Filter
            </label>
            <SearchableProductSelect
              products={products}
              value={selectedProductId}
              onChange={(id) => setSelectedProductId(id)}
              allOptionLabel="All Products"
              allowClear
              placeholder="Search product filter..."
            />
          </div>

          {/* Movement Type Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Movement Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.35rem 0.6rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.78125rem',
              }}
            >
              <option value="">All Movement Types</option>
              <option value="PURCHASE">Purchase Stock In (+)</option>
              <option value="PURCHASE_RETURN">Purchase Return Stock Out (-)</option>
              <option value="SALE">Sale Stock Out (-)</option>
              <option value="SALE_RETURN">Sale Return Stock In (+)</option>
              <option value="ADJUSTMENT_IN">Stock Adjustment In (+)</option>
              <option value="ADJUSTMENT_OUT">Stock Adjustment Out (-)</option>
              <option value="OPENING_STOCK">Opening Stock</option>
            </select>
          </div>

          <div>
            <Button variant="primary" icon={<Filter size={13} />} onClick={fetchMovements} style={{ width: '100%', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
              Apply
            </Button>
          </div>
        </div>
      </Card>

      {/* Movements Table */}
      <Card
        title={`Stock Movements (${filteredMovements.length})`}
        icon={<History size={16} />}
      >
        {loading ? (
          <LoadingSpinner label="Loading stock movement transactions..." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Product / SKU</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Movement Type</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Cost Value</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Balance After</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Operator</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      No stock movements recorded matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr
                      key={m.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={11} />
                          <span>{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8125rem' }}>{m.product_name}</div>
                        <code style={{ fontSize: '0.71875rem', color: 'var(--primary-400)' }}>{m.product_sku}</code>
                      </td>

                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        {renderMovementTypeBadge(m.movement_type, m.movement_type_display)}
                      </td>

                      <td style={{
                        padding: '0.4rem 0.6rem',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: m.quantity > 0 ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit_abbr}
                      </td>

                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.78125rem' }}>
                        Rs. {formatMoney(m.unit_cost)}
                      </td>

                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78125rem' }}>
                        Rs. {formatMoney(m.total_cost)}
                      </td>

                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.85rem' }}>
                        {m.balance_after} {m.unit_abbr}
                      </td>

                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        {m.reference_id ? (
                          <div>
                            <code style={{ fontSize: '0.75rem', fontWeight: 600 }}>{m.reference_id}</code>
                            {m.notes && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                {m.notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={11} />
                          <span>{m.created_by_name || 'System'}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
