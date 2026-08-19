import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Package,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ProductStockCard } from '../../types/inventory';
import { Product } from '../../types/product';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';

interface ProductStockCardTabProps {
  initialProductId?: number | null;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const ProductStockCardTab: React.FC<ProductStockCardTabProps> = ({ initialProductId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(initialProductId || null);
  const [stockCard, setStockCard] = useState<ProductStockCard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productService.getProducts().then((pList) => {
      setProducts(pList || []);
      if (!selectedProductId && pList && pList.length > 0) {
        setSelectedProductId(pList[0].id);
      }
    });
  }, [selectedProductId]);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId]);

  useEffect(() => {
    if (!selectedProductId) return;
    setLoading(true);
    inventoryService.getStockCard(selectedProductId)
      .then((data) => setStockCard(data))
      .catch(() => setStockCard(null))
      .finally(() => setLoading(false));
  }, [selectedProductId]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Product Selector Bar */}
      <Card title="Product Stock Card Audit" subtitle="Answers authoritatively: 'Why is this product's current stock X?'" icon={<History size={20} />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Select Product to Inspect Lifecycle
            </label>
            <select
              value={selectedProductId || ''}
              onChange={(e) => setSelectedProductId(parseInt(e.target.value))}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem 0.875rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Stock Card Content */}
      {loading ? (
        <LoadingSpinner label="Loading product stock card history..." />
      ) : stockCard ? (
        <>
          {/* Header Summary Banner */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <Package size={20} style={{ color: 'var(--primary-400)' }} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stockCard.product_name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={{ fontSize: '0.875rem', color: 'var(--primary-400)' }}>SKU: {stockCard.sku}</code>
                  {stockCard.barcode && (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Barcode: {stockCard.barcode}
                    </span>
                  )}
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Category: {stockCard.category || 'Uncategorized'}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Unit: {stockCard.unit || '-'}
                  </span>
                </div>
              </div>

              <div>
                {stockCard.stock_status === 'IN_STOCK' && <Badge variant="success">In Stock</Badge>}
                {stockCard.stock_status === 'LOW_STOCK' && <Badge variant="warning">Low Stock Alert</Badge>}
                {stockCard.stock_status === 'OUT_OF_STOCK' && <Badge variant="danger">Out of Stock</Badge>}
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="glass-card" style={{ padding: '0.5rem 0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>On-Hand Stock</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  {stockCard.current_stock} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stockCard.unit}</span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.5rem 0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Cost (WAC)</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  Rs. {formatMoney(stockCard.weighted_average_cost)}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.5rem 0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Valuation</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', marginTop: '0.1rem' }}>
                  Rs. {formatMoney(stockCard.total_valuation)}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.5rem 0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Lifetime Inward</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '0.1rem' }}>
                  +{stockCard.total_stock_in} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stockCard.unit}</span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.5rem 0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Lifetime Outward</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginTop: '0.1rem' }}>
                  -{stockCard.total_stock_out} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stockCard.unit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Timeline Ledger */}
          <Card
            title={`Stock Card History (${stockCard.timeline.length} movements)`}
            icon={<History size={16} />}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Timestamp</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Movement Type</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Inward (+)</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Outward (-)</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Unit Cost Rate</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Running Balance</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Reference Doc</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {stockCard.timeline.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        No movements recorded for this product yet.
                      </td>
                    </tr>
                  ) : (
                    stockCard.timeline.map((row) => (
                      <tr
                        key={row.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={11} />
                            <span>{new Date(row.created_at).toLocaleString()}</span>
                          </div>
                        </td>

                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          {renderMovementTypeBadge(row.movement_type, row.movement_type_display)}
                        </td>

                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                          {row.quantity > 0 ? `+${row.quantity}` : '-'}
                        </td>

                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>
                          {row.quantity < 0 ? `${row.quantity}` : '-'}
                        </td>

                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.78125rem' }}>
                          Rs. {formatMoney(row.unit_cost)}
                        </td>

                        <td style={{
                          padding: '0.4rem 0.6rem',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          color: 'var(--primary-400)',
                        }}>
                          {row.balance_after} {stockCard.unit}
                        </td>

                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          {row.reference_id ? (
                            <div>
                              <code style={{ fontSize: '0.75rem', fontWeight: 600 }}>{row.reference_id}</code>
                              {row.notes && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                  {row.notes}
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
                            <span>{row.created_by}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
};
