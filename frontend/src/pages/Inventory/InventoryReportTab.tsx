import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Filter,
  RefreshCw,
  DollarSign,
  Package,
  Layers,
  Scale,
  ArrowDownLeft,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ComprehensiveInventoryReport, StockStatus } from '../../types/inventory';
import { Category, Product } from '../../types/product';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const InventoryReportTab: React.FC = () => {
  const [report, setReport] = useState<ComprehensiveInventoryReport | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getComprehensiveReport({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        category: selectedCategoryId || undefined,
        product: selectedProductId || undefined,
        stock_status: selectedStatus || undefined,
        movement_type: selectedMovementType || undefined,
      });
      setReport(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedCategoryId, selectedProductId, selectedStatus, selectedMovementType]);

  useEffect(() => {
    productService.getCategories().then((cList) => setCategories(cList || []));
    productService.getProducts().then((pList) => setProducts(pList || []));
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const renderStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return <Badge variant="success">In Stock</Badge>;
      case 'LOW_STOCK':
        return <Badge variant="warning">Low Stock</Badge>;
      case 'OUT_OF_STOCK':
        return <Badge variant="danger">Out of Stock</Badge>;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filter Card */}
      <Card title="Inventory Report Filters" subtitle="Comprehensive multi-dimensional filtering across dates, categories, and movements" icon={<Filter size={20} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <Input
            label="Date From"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Date To"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.8125rem',
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.8125rem',
              }}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id.toString()}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Stock Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.8125rem',
              }}
            >
              <option value="">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="primary" icon={<Filter size={14} />} onClick={fetchReport} style={{ flex: 1 }}>
              Apply
            </Button>
            <Button
              variant="outline"
              icon={<RefreshCw size={14} />}
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedCategoryId('');
                setSelectedProductId('');
                setSelectedStatus('');
                setSelectedMovementType('');
              }}
            />
          </div>
        </div>
      </Card>

      {/* Report Summary Cards */}
      {loading ? (
        <LoadingSpinner label="Generating Inventory Master Report..." />
      ) : report ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem' }}>
            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Products</span>
                <Layers size={15} style={{ color: 'var(--primary-400)' }} />
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {report.summary.total_products}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>In report scope</div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Opening Stock</span>
                <Package size={15} style={{ color: '#38bdf8' }} />
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                +{report.summary.total_opening_stock.toLocaleString()} units
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Initial & brought forward</div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Purchased (+IN)</span>
                <ArrowDownLeft size={15} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                +{report.summary.total_purchased.toLocaleString()} units
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Purchases in period</div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Adjusted Net</span>
                <Scale size={15} style={{ color: '#a5b4fc' }} />
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
                {report.summary.total_adjusted_in - report.summary.total_adjusted_out >= 0 ? '+' : ''}
                {report.summary.total_adjusted_in - report.summary.total_adjusted_out} units
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                +{report.summary.total_adjusted_in} / -{report.summary.total_adjusted_out}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Closing Stock</span>
                <Package size={15} style={{ color: 'var(--primary-400)' }} />
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                {report.summary.total_closing_stock.toLocaleString()} units
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Total on-hand inventory</div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Valuation</span>
                <DollarSign size={15} style={{ color: 'var(--primary-400)' }} />
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(report.summary.total_inventory_valuation)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>WAC valuation</div>
            </div>
          </div>

          {/* Master Table */}
          <Card
            title="Product Stock Breakdown"
            icon={<BarChart3 size={16} />}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>Product / SKU</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Opening</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Purchased</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>P. Return</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Sold</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>S. Return</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Adj In</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Adj Out</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Closing</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Unit Cost</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Valuation</th>
                    <th style={{ padding: '0.4rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        No inventory data matching filters.
                      </td>
                    </tr>
                  ) : (
                    report.rows.map((r) => (
                      <tr
                        key={r.product_id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '0.35rem 0.5rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.78125rem' }}>{r.product_name}</div>
                          <code style={{ fontSize: '0.6875rem', color: 'var(--primary-400)' }}>{r.sku}</code>
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.71875rem' }}>
                          {r.category || '-'}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {r.opening_stock}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                          {r.purchased > 0 ? `+${r.purchased}` : '-'}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                          {r.purchase_returned > 0 ? `-${r.purchase_returned}` : '-'}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                          {r.sold > 0 ? `-${r.sold}` : '-'}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                          {r.sales_returned > 0 ? `+${r.sales_returned}` : '-'}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--info)' }}>
                          {r.adjusted_in > 0 ? `+${r.adjusted_in}` : '-'}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                          {r.adjusted_out > 0 ? `-${r.adjusted_out}` : '-'}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)' }}>
                          {r.closing_stock} {r.unit}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          Rs. {formatMoney(r.unit_cost)}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.8125rem' }}>
                          Rs. {formatMoney(r.valuation)}
                        </td>

                        <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }}>
                          {renderStatusBadge(r.stock_status)}
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
