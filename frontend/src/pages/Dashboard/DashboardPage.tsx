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
  Download,
  RefreshCw,
  ArrowRight,
  Store,
  CheckCircle2,
  AlertCircle,
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

  const handleExportSummaryCSV = () => {
    if (!data) return;
    const headers = ['Metric Category', 'Key Indicator', 'Value (PKR / Count)'];
    const rows = [
      ['Sales & Orders', 'Period Label', data.period_label],
      ['Sales & Orders', 'Orders Completed', data.sales_summary.orders_count],
      ['Sales & Orders', 'Gross Billed Sales', `Rs. ${formatMoney(data.sales_summary.gross_sales)}`],
      ['Sales & Orders', 'Discounts Given', `Rs. ${formatMoney(data.sales_summary.discounts)}`],
      ['Sales & Orders', 'Sales Returns (Refunded)', `Rs. ${formatMoney(data.sales_summary.sales_returns)}`],
      ['Sales & Orders', 'Net Revenue', `Rs. ${formatMoney(data.sales_summary.net_sales)}`],
      ['Sales & Orders', 'Average Order Value', `Rs. ${formatMoney(data.sales_summary.avg_order_value)}`],
      ['Profitability', 'Cost of Goods Sold (COGS)', `Rs. ${formatMoney(data.profit_overview.cogs)}`],
      ['Profitability', 'Gross Profit', `Rs. ${formatMoney(data.profit_overview.gross_profit)}`],
      ['Profitability', 'Gross Margin %', `${data.profit_overview.gross_margin_percentage}%`],
      ['Profitability', 'Operating Expenses', `Rs. ${formatMoney(data.profit_overview.operating_expenses)}`],
      ['Profitability', 'Net Profit', `Rs. ${formatMoney(data.profit_overview.net_profit)}`],
      ['Profitability', 'Net Margin %', `${data.profit_overview.net_margin_percentage}%`],
      ['Liquidity & Balance Sheet', 'Cash in Hand (1010)', `Rs. ${formatMoney(data.cash_position.cash_in_hand)}`],
      ['Liquidity & Balance Sheet', 'Bank Account (1020)', `Rs. ${formatMoney(data.cash_position.bank_balance)}`],
      ['Liquidity & Balance Sheet', 'Total Liquid Assets', `Rs. ${formatMoney(data.cash_position.total_liquid_cash)}`],
      ['Liquidity & Balance Sheet', 'Customer Receivables (AR)', `Rs. ${formatMoney(data.receivables_summary.total_receivables)}`],
      ['Liquidity & Balance Sheet', 'Supplier Payables (AP)', `Rs. ${formatMoney(data.payables_summary.total_payables)}`],
      ['Inventory Health', 'Total Active SKUs', data.inventory_health.total_skus],
      ['Inventory Health', 'Total Inventory Valuation', `Rs. ${formatMoney(data.inventory_health.total_inventory_valuation)}`],
      ['Inventory Health', 'Low Stock SKUs', data.inventory_health.low_stock_count],
      ['Inventory Health', 'Out of Stock SKUs', data.inventory_health.out_of_stock_count],
    ];
    dashboardService.exportToCSV(`ApexPOS_Executive_Dashboard_${data.period}`, headers, rows);
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
  const chartHeight = 160;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header & Date Range Control Bar */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '1.25rem 1.5rem',
          borderRadius: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Executive Business Dashboard
            </span>
            <Badge variant="phase">Phase 13 Live</Badge>
            {data?.active_pos_session ? (
              <Badge variant="success" pulse>
                Day Session: {data.active_pos_session.session_number} (Open)
              </Badge>
            ) : (
              <Badge variant="warning">No Active Day Session</Badge>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
            Real-time transactional intelligence & financial insights for{' '}
            <strong style={{ color: 'var(--primary-400)' }}>{data?.period_label || 'Loading...'}</strong>
          </p>
        </div>

        {/* Date Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '0.25rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-subtle)',
              gap: '0.25rem',
            }}
          >
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '0.375rem',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                }}
              />
              <Button variant="primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={fetchDashboard}>
                Apply
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            icon={<RefreshCw size={13} />}
            loading={loading}
            onClick={fetchDashboard}
            title="Refresh Dashboard"
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            icon={<Download size={13} />}
            onClick={handleExportSummaryCSV}
            title="Export CSV Summary"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            color: 'var(--danger)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Top Metric KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Today's Sales */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Today's Sales</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(data?.today_benchmark?.sales)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                {data?.today_benchmark?.orders_count || 0} orders today
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem', color: 'var(--primary-400)' }}>
              <Store size={20} />
            </div>
          </div>
        </Card>

        {/* Net Revenue (Selected Period) */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Net Sales ({data?.period_label || 'Period'})</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(data?.sales_summary?.net_sales)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                {data?.sales_summary?.orders_count || 0} orders • Avg Rs. {formatMoney(data?.sales_summary?.avg_order_value)}
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', color: 'var(--success)' }}>
              <ShoppingBag size={20} />
            </div>
          </div>
        </Card>

        {/* Gross Profit */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Gross Profit</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(data?.profit_overview?.gross_profit)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '0.125rem' }}>
                {data?.profit_overview?.gross_margin_percentage || 0}% Gross Margin
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', color: 'var(--success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
        </Card>

        {/* Net Profit */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Net Business Profit</div>
              <div
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: (data?.profit_overview?.net_profit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                  marginTop: '0.25rem',
                }}
              >
                Rs. {formatMoney(data?.profit_overview?.net_profit)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                After Rs. {formatMoney(data?.profit_overview?.operating_expenses)} expenses
              </div>
            </div>
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: (data?.profit_overview?.net_profit ?? 0) >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: '0.5rem',
                color: (data?.profit_overview?.net_profit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              <DollarSign size={20} />
            </div>
          </div>
        </Card>

        {/* Liquid Cash & Bank */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cash & Bank Liquidity</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--info)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(data?.cash_position?.total_liquid_cash)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                Drawer: Rs. {formatMoney(data?.cash_position?.cash_in_hand)} | Bank: Rs. {formatMoney(data?.cash_position?.bank_balance)}
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '0.5rem', color: 'var(--info)' }}>
              <CreditCard size={20} />
            </div>
          </div>
        </Card>

        {/* Customer Receivables (AR) */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Customer Receivables (AR)</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--warning)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(data?.receivables_summary?.total_receivables)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                {data?.receivables_summary?.customers_count || 0} customers with balance
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '0.5rem', color: 'var(--warning)' }}>
              <Users size={20} />
            </div>
          </div>
        </Card>

        {/* Supplier Payables (AP) */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Supplier Payables (AP)</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(data?.payables_summary?.total_payables)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.125rem' }}>
                {data?.payables_summary?.suppliers_count || 0} suppliers with balance
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', color: 'var(--danger)' }}>
              <Truck size={20} />
            </div>
          </div>
        </Card>

        {/* Inventory Valuation & Alerts */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Inventory Valuation</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-300)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(data?.inventory_health?.total_inventory_valuation)}
              </div>
              <div style={{ fontSize: '0.7rem', color: (data?.inventory_health?.low_stock_count ?? 0) > 0 ? 'var(--warning)' : 'var(--text-subtle)', marginTop: '0.125rem' }}>
                {data?.inventory_health?.low_stock_count || 0} Low Stock • {data?.inventory_health?.out_of_stock_count || 0} Out of Stock
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.5rem', color: 'var(--primary-300)' }}>
              <Package size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Middle Analytical Visuals: Sales Trend & Payment Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
        {/* Sales & Orders Trend Chart */}
        <Card
          title="Sales & Revenue Trend"
          subtitle={`Daily revenue and order volume for ${data?.period_label || 'Period'}`}
          icon={<BarChart3 size={18} />}
          action={
            hoveredTrendPoint && (
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-400)', fontWeight: 600 }}>
                {hoveredTrendPoint.label}: Rs. {formatMoney(hoveredTrendPoint.net_sales)} ({hoveredTrendPoint.orders_count} orders)
              </span>
            )
          }
        >
          <div style={{ position: 'relative', marginTop: '0.5rem', height: `${chartHeight + 40}px` }}>
            {trendData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No sales recorded in the selected period.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', height: `${chartHeight}px`, paddingTop: '1rem', borderBottom: '1px solid var(--border-medium)' }}>
                {trendData.map((d, idx) => {
                  const barHeight = Math.max(4, Math.round((d.net_sales / maxTrendVal) * (chartHeight - 20)));
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
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '24px',
                          height: `${barHeight}px`,
                          backgroundColor: isHovered ? 'var(--primary-400)' : d.net_sales > 0 ? 'rgba(99, 102, 241, 0.75)' : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '0.25rem 0.25rem 0 0',
                          transition: 'all 0.15s ease',
                          boxShadow: isHovered ? '0 0 12px rgba(99, 102, 241, 0.6)' : 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '0.375rem', whiteSpace: 'nowrap', transform: trendData.length > 15 ? 'rotate(-45deg)' : 'none' }}>
                        {trendData.length > 20 && idx % 3 !== 0 ? '' : d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Subtitle breakdown summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <span>Gross Billed: <strong style={{ color: 'var(--text-main)' }}>Rs. {formatMoney(data?.sales_summary?.gross_sales)}</strong></span>
                <span>Returns Deducted: <strong style={{ color: 'var(--danger)' }}>-Rs. {formatMoney(data?.sales_summary?.sales_returns)}</strong></span>
                <span>Net Realized: <strong style={{ color: 'var(--success)' }}>Rs. {formatMoney(data?.sales_summary?.net_sales)}</strong></span>
              </div>
              <Button variant="outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => onNavigate('sales')}>
                View Sales Directory <ArrowRight size={12} style={{ marginLeft: '0.25rem' }} />
              </Button>
            </div>
          </div>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card
          title="Payment Distribution"
          subtitle="How customers settled their invoices"
          icon={<PieChart size={18} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '0.5rem' }}>
            {(data?.payment_distribution || []).map((pm, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{pm.method_name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Rs. {formatMoney(pm.amount)} ({pm.percentage}%)
                  </span>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pm.percentage}%`,
                      backgroundColor:
                        pm.method_code === 'CASH'
                          ? 'var(--success)'
                          : pm.method_code === 'CARD'
                          ? 'var(--info)'
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
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Operating Expenses (Rs. {formatMoney(data?.profit_overview?.operating_expenses)})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '90px', overflowY: 'auto' }}>
                {(data?.expense_categories || []).map((exp, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{exp.category_name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {formatMoney(exp.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Bottom Matrices: Top Products, Low Stock Alerts, and Cashier Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Top Products Leaderboard */}
        <Card
          title="Product Performance"
          subtitle="Best selling inventory lines in selected period"
          icon={<Package size={18} />}
          action={
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '0.2rem', borderRadius: '0.375rem' }}>
              <button
                onClick={() => setTopProductsTab('revenue')}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: topProductsTab === 'revenue' ? 'var(--primary-500)' : 'transparent',
                  color: topProductsTab === 'revenue' ? '#fff' : 'var(--text-muted)',
                }}
              >
                By Revenue
              </button>
              <button
                onClick={() => setTopProductsTab('quantity')}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: topProductsTab === 'quantity' ? 'var(--primary-500)' : 'transparent',
                  color: topProductsTab === 'quantity' ? '#fff' : 'var(--text-muted)',
                }}
              >
                By Quantity
              </button>
            </div>
          }
        >
          <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>Product</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Qty Sold</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Gross Margin</th>
                </tr>
              </thead>
              <tbody>
                {(topProductsTab === 'revenue' ? data?.top_products_by_revenue : data?.top_products_by_quantity)?.map(
                  (prod, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{prod.name}</div>
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{prod.sku}</code>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {prod.quantity_sold}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        Rs. {formatMoney(prod.revenue)}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                        Rs. {formatMoney(prod.profit)}
                      </td>
                    </tr>
                  )
                )}
                {(!data?.top_products_by_revenue || data.top_products_by_revenue.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
          title="Inventory Alert Radar"
          subtitle="Products below safe minimum stock threshold"
          icon={<AlertTriangle size={18} />}
          action={
            <Button
              variant="outline"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              onClick={() => onNavigate('inventory')}
            >
              Inventory Hub <ArrowRight size={12} style={{ marginLeft: '0.25rem' }} />
            </Button>
          }
        >
          <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>Item</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>On Hand</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Min Req.</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.inventory_health?.low_stock_alerts || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                      <code style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{item.sku}</code>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <Badge variant={item.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                        {item.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock'}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.current_stock <= 0 ? 'var(--danger)' : 'var(--warning)' }}>
                      {item.current_stock}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {item.min_stock}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <Button
                        variant="primary"
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.65rem' }}
                        onClick={() => onNavigate('purchases')}
                      >
                        Re-Order
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!data?.inventory_health?.low_stock_alerts || data.inventory_health.low_stock_alerts.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--success)' }}>
                      <CheckCircle2 size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                      All inventory items are healthy and within safe threshold!
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
          subtitle="Sales volume and revenue breakdown by staff"
          icon={<Users size={18} />}
        >
          <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>Cashier</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Orders</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Net Sales</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Avg Ticket</th>
                </tr>
              </thead>
              <tbody>
                {(data?.cashier_performance || []).map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.cashier_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>@{c.username}</div>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {c.orders_count}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--success)' }}>
                      Rs. {formatMoney(c.net_sales)}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      Rs. {formatMoney(c.avg_ticket)}
                    </td>
                  </tr>
                ))}
                {(!data?.cashier_performance || data.cashier_performance.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No staff sales recorded in this period.
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
