import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  CreditCard,
  Users,
  Truck,
  BarChart3,
  PieChart,
  RefreshCw,
  ArrowRight,
  Store,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { dashboardService } from '../../services/dashboardService';
import {
  ExecutiveDashboardData,
  DashboardPeriod,
  SalesTrendPoint,
} from '../../types/dashboard';

interface DashboardPageProps {
  onNavigate: (tabId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [period, setPeriod] = useState<DashboardPeriod>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [topProductsTab, setTopProductsTab] = useState<'revenue' | 'quantity'>('revenue');
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<SalesTrendPoint | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getDashboardData(period, startDate, endDate);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load dashboard analytics:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    if (period !== 'custom' || (startDate && endDate)) {
      fetchDashboard();
    }
  }, [period, fetchDashboard, startDate, endDate]);

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '0.00';
    return Number(amount).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const periods: { key: DashboardPeriod; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'this_week', label: 'This Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'this_year', label: 'This Year' },
    { key: 'custom', label: 'Custom' },
  ];

  // SVG Chart Computations
  const trendData = data?.sales_trend || [];
  const maxTrendVal = Math.max(...trendData.map((d) => Math.max(d.gross_sales, d.net_sales)), 1000);
  const chartHeight = 190;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* 1. Top Filters Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.625rem',
          padding: '0.45rem 0.65rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '0.15rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-subtle)',
              gap: '0.15rem',
            }}
          >
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.71875rem',
                  fontWeight: 600,
                  borderRadius: '0.25rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: period === p.key ? 'var(--primary-500)' : 'transparent',
                  color: period === p.key ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              padding: '0.2rem 0.45rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}>
              <Calendar size={14} style={{ color: '#ffffff', flexShrink: 0 }} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '0.2rem 0.35rem',
                  fontSize: '0.71875rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.25rem',
                  color: '#ffffff',
                  colorScheme: 'dark',
                  outline: 'none',
                }}
              />
              <span style={{ color: '#ffffff', fontSize: '0.71875rem', fontWeight: 700 }}>→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '0.2rem 0.35rem',
                  fontSize: '0.71875rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.25rem',
                  color: '#ffffff',
                  colorScheme: 'dark',
                  outline: 'none',
                }}
              />
              <Button variant="primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.71875rem' }} onClick={fetchDashboard}>
                Apply
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.71875rem' }}
          icon={<RefreshCw size={12} />}
          loading={loading}
          onClick={fetchDashboard}
          title="Refresh Dashboard"
        >
          Refresh
        </Button>
      </div>

      {error && (
        <div
          style={{
            padding: '0.625rem 0.875rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.375rem',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Compact Top Metric KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.625rem',
        }}
      >
        {/* Today's Sales */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Today's Sales
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', marginTop: '0.15rem' }}>
                Rs. {formatMoney(data?.today_benchmark?.sales)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                {data?.today_benchmark?.orders_count || 0} orders today
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.375rem', color: 'var(--primary-400)', flexShrink: 0 }}>
              <Store size={16} />
            </div>
          </div>
        </Card>

        {/* Net Revenue (Selected Period) */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Net Sales
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                Rs. {formatMoney(data?.sales_summary?.net_sales)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                {data?.sales_summary?.orders_count || 0} orders • Avg {formatMoney(data?.sales_summary?.avg_order_value)}
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.375rem', color: 'var(--success)', flexShrink: 0 }}>
              <ShoppingBag size={16} />
            </div>
          </div>
        </Card>

        {/* Gross Profit */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Gross Profit
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '0.15rem' }}>
                Rs. {formatMoney(data?.profit_overview?.gross_profit)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--success)', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                {data?.profit_overview?.gross_margin_percentage || 0}% Margin
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.375rem', color: 'var(--success)', flexShrink: 0 }}>
              <TrendingUp size={16} />
            </div>
          </div>
        </Card>

        {/* Net Profit */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Net Profit
              </div>
              <div
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: (data?.profit_overview?.net_profit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                  marginTop: '0.15rem',
                }}
              >
                Rs. {formatMoney(data?.profit_overview?.net_profit)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                Expenses: Rs. {formatMoney(data?.profit_overview?.operating_expenses)}
              </div>
            </div>
            <div
              style={{
                padding: '0.35rem',
                backgroundColor: (data?.profit_overview?.net_profit ?? 0) >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: '0.375rem',
                color: (data?.profit_overview?.net_profit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                flexShrink: 0,
              }}
            >
              <DollarSign size={16} />
            </div>
          </div>
        </Card>

        {/* Liquid Cash & Bank */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Cash & Bank Liquidity
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--info)', marginTop: '0.15rem' }}>
                Rs. {formatMoney(data?.cash_position?.total_liquid_cash)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.2rem', fontSize: '0.6875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-subtle)' }}>
                  <span>Cash:</span>
                  <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(data?.cash_position?.cash_in_hand)}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-subtle)' }}>
                  <span>Bank:</span>
                  <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(data?.cash_position?.bank_balance)}
                  </strong>
                </div>
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '0.375rem', color: 'var(--info)', flexShrink: 0 }}>
              <CreditCard size={16} />
            </div>
          </div>
        </Card>

        {/* Customer Receivables (AR) */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Receivables (AR)
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--warning)', marginTop: '0.15rem' }}>
                Rs. {formatMoney(data?.receivables_summary?.total_receivables)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                {data?.receivables_summary?.customers_count || 0} debtors
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '0.375rem', color: 'var(--warning)', flexShrink: 0 }}>
              <Users size={16} />
            </div>
          </div>
        </Card>

        {/* Supplier Payables (AP) */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Payables (AP)
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginTop: '0.15rem' }}>
                Rs. {formatMoney(data?.payables_summary?.total_payables)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                {data?.payables_summary?.suppliers_count || 0} vendors
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.375rem', color: 'var(--danger)', flexShrink: 0 }}>
              <Truck size={16} />
            </div>
          </div>
        </Card>

        {/* Inventory Valuation & Alerts */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Inventory Value
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-300)', marginTop: '0.15rem' }}>
                Rs. {formatMoney(data?.inventory_health?.total_inventory_valuation)}
              </div>
              <div style={{ fontSize: '0.65rem', color: (data?.inventory_health?.low_stock_count ?? 0) > 0 ? 'var(--warning)' : 'var(--text-subtle)', marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                {data?.inventory_health?.low_stock_count || 0} Low • {data?.inventory_health?.out_of_stock_count || 0} Out
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.375rem', color: 'var(--primary-300)', flexShrink: 0 }}>
              <Package size={16} />
            </div>
          </div>
        </Card>

        {/* Warranty Claim Units (Asset 1060) */}
        <Card
          onClick={() => onNavigate('customer-warranty-claims')}
          className="cursor-pointer hover:border-indigo-400 transition-colors"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Warranty Claim Units
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#6366f1', marginTop: '0.15rem' }}>
                {data?.warranty_summary?.warranty_claim_units || 0} Units
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.375rem', color: '#6366f1', flexShrink: 0 }}>
              <ShieldCheck size={16} />
            </div>
          </div>
        </Card>

        {/* In Progress Supplier Claim Units */}
        <Card
          onClick={() => onNavigate('supplier-warranty-claims')}
          className="cursor-pointer hover:border-indigo-400 transition-colors"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                In Progress Supplier Claims
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#818cf8', marginTop: '0.15rem' }}>
                {data?.warranty_summary?.in_progress_supplier_claim_units || 0} Units
              </div>
            </div>
            <div style={{ padding: '0.35rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.375rem', color: '#818cf8', flexShrink: 0 }}>
              <Truck size={16} />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Analytical Visuals: Sales Trend & Payment Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.875rem', alignItems: 'stretch' }}>
        {/* Sales & Orders Trend Chart */}
        <Card
          title="Sales & Revenue Trend"
          icon={<BarChart3 size={16} />}
          action={
            hoveredTrendPoint && (
              <span style={{ fontSize: '0.71875rem', color: 'var(--primary-400)', fontWeight: 600 }}>
                {hoveredTrendPoint.label}: Rs. {formatMoney(hoveredTrendPoint.net_sales)} ({hoveredTrendPoint.orders_count} orders)
              </span>
            )
          }
        >
          <div style={{ position: 'relative', marginTop: '0.25rem' }}>
            {trendData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No sales recorded in the selected period.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', height: `${chartHeight}px`, paddingTop: '0.25rem', borderBottom: '1px solid var(--border-medium)', overflowX: 'hidden' }}>
                {trendData.map((d, idx) => {
                  const barHeight = Math.max(3, Math.round((d.net_sales / maxTrendVal) * (chartHeight - 14)));
                  const isHovered = hoveredTrendPoint?.date === d.date;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredTrendPoint(d)}
                      onMouseLeave={() => setHoveredTrendPoint(null)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%',
                        cursor: 'pointer',
                        position: 'relative',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '24px',
                          height: `${barHeight}px`,
                          backgroundColor: isHovered ? 'var(--primary-400)' : d.net_sales > 0 ? 'rgba(99, 102, 241, 0.75)' : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '0.2rem 0.2rem 0 0',
                          transition: 'all 0.15s ease',
                          boxShadow: isHovered ? '0 0 10px rgba(99, 102, 241, 0.6)' : 'none',
                        }}
                      />
                      <span style={{
                        fontSize: '0.59375rem',
                        color: isHovered ? 'var(--primary-400)' : 'var(--text-subtle)',
                        marginTop: '0.2rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}>
                        {trendData.length > 20 && idx % 2 !== 0 ? '' : d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Subtitle breakdown summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span>Gross: <strong style={{ color: 'var(--text-main)' }}>Rs. {formatMoney(data?.sales_summary?.gross_sales)}</strong></span>
                <span>Returns: <strong style={{ color: 'var(--danger)' }}>-Rs. {formatMoney(data?.sales_summary?.sales_returns)}</strong></span>
                <span>Net: <strong style={{ color: 'var(--success)' }}>Rs. {formatMoney(data?.sales_summary?.net_sales)}</strong></span>
              </div>
              <Button variant="outline" style={{ padding: '0.15rem 0.45rem', fontSize: '0.6875rem' }} onClick={() => onNavigate('sales')}>
                Sales <ArrowRight size={11} style={{ marginLeft: '0.2rem' }} />
              </Button>
            </div>
          </div>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card
          title="Payment Distribution"
          icon={<PieChart size={16} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.25rem' }}>
            {(data?.payment_distribution || []).map((pm, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{pm.method_name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Rs. {formatMoney(pm.amount)} ({pm.percentage}%)
                  </span>
                </div>
                <div style={{ height: '5px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pm.percentage}%`,
                      backgroundColor:
                        pm.method_code === 'CASH'
                          ? 'var(--success)'
                          : pm.method_code === 'CARD'
                          ? 'var(--info)'
                          : pm.method_code === 'CHEQUE'
                          ? '#a855f7'
                          : pm.method_code === 'CREDIT'
                          ? 'var(--warning)'
                          : 'var(--primary-400)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Operating Expenses Breakdown preview */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <div style={{ fontSize: '0.71875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Operating Expenses (Rs. {formatMoney(data?.profit_overview?.operating_expenses)})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '75px', overflowY: 'auto' }}>
                {(data?.expense_categories || []).map((exp, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.71875rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{exp.category_name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {formatMoney(exp.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Performance Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.875rem' }}>
        {/* Top Products Leaderboard */}
        <Card
          title="Product Performance"
          icon={<Package size={16} />}
          action={
            <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '0.15rem', borderRadius: '0.25rem' }}>
              <button
                onClick={() => setTopProductsTab('revenue')}
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '0.2rem',
                  cursor: 'pointer',
                  backgroundColor: topProductsTab === 'revenue' ? 'var(--primary-500)' : 'transparent',
                  color: topProductsTab === 'revenue' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Revenue
              </button>
              <button
                onClick={() => setTopProductsTab('quantity')}
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '0.2rem',
                  cursor: 'pointer',
                  backgroundColor: topProductsTab === 'quantity' ? 'var(--primary-500)' : 'transparent',
                  color: topProductsTab === 'quantity' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Qty
              </button>
            </div>
          }
        >
          <div style={{ overflowX: 'auto', maxHeight: '210px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.375rem 0.5rem' }}>Product</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {(topProductsTab === 'revenue' ? data?.top_products_by_revenue : data?.top_products_by_quantity)
                  ?.slice(0, 5)
                  ?.map((prod, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.375rem 0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{prod.name}</div>
                        <code style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>{prod.sku}</code>
                      </td>
                      <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {prod.quantity_sold}
                      </td>
                      <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        Rs. {formatMoney(prod.revenue)}
                      </td>
                      <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                        Rs. {formatMoney(prod.profit)}
                      </td>
                    </tr>
                  ))}
                {(!data?.top_products_by_revenue || data.top_products_by_revenue.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No product sales in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Low Stock & Out of Stock Alerts */}
        <Card
          title="Stock Alerts"
          icon={<AlertTriangle size={16} />}
          action={
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              {(data?.inventory_health?.low_stock_alerts && data.inventory_health.low_stock_alerts.length > 0) && (
                <Button
                  variant="primary"
                  style={{
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  }}
                  onClick={() => {
                    const lowStockItems = (data?.inventory_health?.low_stock_alerts || []).map((item) => ({
                      product_id: item.id,
                      product_name: item.name,
                      sku: item.sku,
                      unit_cost: item.purchase_price || 0,
                      quantity: 1,
                    }));
                    sessionStorage.setItem('apexpos_reorder_items', JSON.stringify(lowStockItems));
                    onNavigate('purchases');
                  }}
                >
                  Reorder All Low Stock
                </Button>
              )}
              <Button
                variant="outline"
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem' }}
                onClick={() => onNavigate('inventory')}
              >
                Inventory <ArrowRight size={11} style={{ marginLeft: '0.2rem' }} />
              </Button>
            </div>
          }
        >
          <div style={{ overflowX: 'auto', maxHeight: '210px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.375rem 0.5rem' }}>Item</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {(data?.inventory_health?.low_stock_alerts || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.375rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                      <code style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>{item.sku}</code>
                    </td>
                    <td style={{ padding: '0.375rem 0.5rem', textAlign: 'center' }}>
                      <Badge variant={item.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                        {item.status === 'OUT_OF_STOCK' ? 'Out' : 'Low'}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.current_stock <= 0 ? 'var(--danger)' : 'var(--warning)' }}>
                      {item.current_stock}
                    </td>
                  </tr>
                ))}
                {(!data?.inventory_health?.low_stock_alerts || data.inventory_health.low_stock_alerts.length === 0) && (
                  <tr>
                    <td colSpan={3} style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--success)' }}>
                      <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} />
                      All stock within safe threshold!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Cashier Performance Leaderboard */}
        <Card
          title="Cashier Performance"
          icon={<Users size={16} />}
        >
          <div style={{ overflowX: 'auto', maxHeight: '210px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.375rem 0.5rem' }}>Cashier</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Orders</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>Net Sales</th>
                </tr>
              </thead>
              <tbody>
                {(data?.cashier_performance || []).map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.375rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.cashier_name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>@{c.username}</div>
                    </td>
                    <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {c.orders_count}
                    </td>
                    <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--success)' }}>
                      Rs. {formatMoney(c.net_sales)}
                    </td>
                  </tr>
                ))}
                {(!data?.cashier_performance || data.cashier_performance.length === 0) && (
                  <tr>
                    <td colSpan={3} style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No staff sales in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
