import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Layers,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  DollarSign,
  History,
  Scale,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { InventorySummaryItem, StockStatus } from '../../types/inventory';
import { Category } from '../../types/product';

interface LiveStockCatalogTabProps {
  items: InventorySummaryItem[];
  categories: Category[];
  loading: boolean;
  onOpenStockCard: (productId: number) => void;
  onOpenAdjustmentModal: (product?: InventorySummaryItem) => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const LiveStockCatalogTab: React.FC<LiveStockCatalogTabProps> = ({
  items,
  categories,
  loading: _loading,
  onOpenStockCard,
  onOpenAdjustmentModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat =
        selectedCategory === 'ALL' || item.category_id?.toString() === selectedCategory;

      const matchStatus =
        selectedStatus === 'ALL' || item.stock_status === selectedStatus;

      return matchSearch && matchCat && matchStatus;
    });
  }, [items, searchTerm, selectedCategory, selectedStatus]);

  // Metric aggregates
  const totalStockUnits = useMemo(() => items.reduce((acc, i) => acc + i.current_stock, 0), [items]);
  const totalValuation = useMemo(() => items.reduce((acc, i) => acc + i.inventory_valuation, 0), [items]);
  const lowStockCount = useMemo(() => items.filter((i) => i.stock_status === 'LOW_STOCK').length, [items]);
  const outOfStockCount = useMemo(() => items.filter((i) => i.stock_status === 'OUT_OF_STOCK').length, [items]);

  const renderStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return (
          <Badge variant="success">
            <CheckCircle2 size={12} style={{ marginRight: '0.25rem' }} />
            In Stock
          </Badge>
        );
      case 'LOW_STOCK':
        return (
          <Badge variant="warning">
            <AlertTriangle size={12} style={{ marginRight: '0.25rem' }} />
            Low Stock
          </Badge>
        );
      case 'OUT_OF_STOCK':
        return (
          <Badge variant="danger">
            <XCircle size={12} style={{ marginRight: '0.25rem' }} />
            Out of Stock
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
        <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Active Products</span>
            <Layers size={15} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {items.length}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Master catalog items</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>On-Hand Stock</span>
            <Scale size={15} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            {totalStockUnits.toLocaleString()} units
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Across all categories</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Inventory Value</span>
            <DollarSign size={15} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalValuation)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>WAC basis</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Low Stock Alert</span>
            <AlertTriangle size={15} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
            {lowStockCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Below threshold level</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Out of Stock</span>
            <XCircle size={15} style={{ color: 'var(--danger)' }} />
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
            {outOfStockCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Zero stock available</div>
        </div>
      </div>

      {/* Main Stock Table Card */}
      <Card
        title="Live Stock Catalog & Valuation"
        icon={<Scale size={16} />}
      >
        {/* Filter Toolbar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', flex: 1, minWidth: '260px' }}>
            {/* Search Input */}
            <div style={{
              position: 'relative',
              flex: 1,
              minWidth: '200px',
              maxWidth: '320px',
            }}>
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
                placeholder="Search by name, SKU, barcode..."
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

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
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
              <option value="ALL">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Product / SKU</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Current Stock</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Min Level</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Avg Cost (WAC)</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Valuation</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    No products found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.product_id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8125rem' }}>{item.product_name}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.1rem' }}>
                        <code style={{ fontSize: '0.71875rem', color: 'var(--primary-400)' }}>{item.sku}</code>
                        {item.barcode && (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {item.barcode}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {item.category_name}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        fontSize: '0.875rem',
                        color:
                          item.current_stock <= 0
                            ? 'var(--danger)'
                            : item.current_stock <= item.min_stock_level
                            ? 'var(--warning)'
                            : 'var(--text-main)',
                      }}>
                        {item.current_stock}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.2rem' }}>
                        {item.unit_abbr || item.unit_name}
                      </span>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {item.min_stock_level}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.78125rem' }}>
                      Rs. {formatMoney(item.weighted_average_cost)}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.85rem' }}>
                      Rs. {formatMoney(item.inventory_valuation)}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      {renderStatusBadge(item.stock_status)}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <Button
                          variant="outline"
                          icon={<History size={13} />}
                          style={{ padding: '0.25rem 0.45rem' }}
                          onClick={() => onOpenStockCard(item.product_id)}
                          title="View Stock Card History"
                        />
                        <Button
                          variant="secondary"
                          icon={<SlidersHorizontal size={13} />}
                          style={{ padding: '0.25rem 0.45rem' }}
                          onClick={() => onOpenAdjustmentModal(item)}
                          title="Record Stock Adjustment"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
