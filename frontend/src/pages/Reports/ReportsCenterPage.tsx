import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Package,
  DollarSign,
  Users,
  Truck,
  Download,
  Printer,
  RefreshCw,
  ArrowRight,
  Receipt,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { dashboardService } from '../../services/dashboardService';
import { ExecutiveDashboardData, DashboardPeriod } from '../../types/dashboard';

type ReportTab =
  | 'financial_pnl'
  | 'sales_master'
  | 'inventory_valuation'
  | 'expense_audit'
  | 'customer_receivables'
  | 'supplier_payables'
  | 'pos_sessions_zreport';

export const ReportsCenterPage: React.FC<{ onNavigate: (tabId: string) => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('financial_pnl');
  const [period, setPeriod] = useState<DashboardPeriod>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData | null>(null);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getDashboardData(period, startDate, endDate);
      setDashboardData(res);
    } catch (err) {
      console.error('Failed to load report dataset:', err);
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    if (period !== 'custom' || (startDate && endDate)) {
      fetchReportData();
    }
  }, [period, fetchReportData, startDate, endDate]);

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '0.00';
    return Number(amount).toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!dashboardData) return;

    if (activeTab === 'financial_pnl') {
      const headers = ['Financial Statement Line Item', 'Amount (PKR)', '% of Net Revenue'];
      const p = dashboardData.profit_overview;
      const rows = [
        ['Gross Billed Sales', formatMoney(dashboardData.sales_summary.gross_sales), '—'],
        ['Discounts Allowed (-)', formatMoney(dashboardData.sales_summary.discounts), '—'],
        ['Sales Returns & Refunds (-)', formatMoney(dashboardData.sales_summary.sales_returns), '—'],
        ['Net Sales Revenue', formatMoney(p.net_sales), '100.0%'],
        ['Cost of Goods Sold (COGS) (-)', formatMoney(p.cogs), `${((p.cogs / (p.net_sales || 1)) * 100).toFixed(1)}%`],
        ['Gross Profit', formatMoney(p.gross_profit), `${p.gross_margin_percentage}%`],
        ['Operating Expenses (-)', formatMoney(p.operating_expenses), `${((p.operating_expenses / (p.net_sales || 1)) * 100).toFixed(1)}%`],
        ['Net Profit (EBIT)', formatMoney(p.net_profit), `${p.net_margin_percentage}%`],
        ['Cash in Hand (1010)', formatMoney(dashboardData.cash_position.cash_in_hand), '—'],
        ['Bank Balance (1020)', formatMoney(dashboardData.cash_position.bank_balance), '—'],
        ['Total Customer Receivables (AR)', formatMoney(dashboardData.receivables_summary.total_receivables), '—'],
        ['Total Supplier Payables (AP)', formatMoney(dashboardData.payables_summary.total_payables), '—'],
      ];
      dashboardService.exportToCSV(`Financial_Profit_and_Loss_${dashboardData.period}`, headers, rows);
    } else if (activeTab === 'customer_receivables') {
      const headers = ['Customer Code', 'Customer Name', 'Phone', 'Outstanding AR (PKR)'];
      const rows = dashboardData.receivables_summary.top_debtors.map((d) => [
        d.customer_id,
        d.name,
        d.phone,
        formatMoney(d.outstanding_balance),
      ]);
      dashboardService.exportToCSV(`Customer_Receivables_Report_${dashboardData.period}`, headers, rows);
    } else if (activeTab === 'supplier_payables') {
      const headers = ['Supplier Code', 'Company Name', 'Representative', 'Phone', 'Outstanding AP (PKR)'];
      const rows = dashboardData.payables_summary.top_creditors.map((c) => [
        c.supplier_id,
        c.company_name,
        c.name,
        c.phone,
        formatMoney(c.outstanding_payable),
      ]);
      dashboardService.exportToCSV(`Supplier_Payables_Report_${dashboardData.period}`, headers, rows);
    } else if (activeTab === 'expense_audit') {
      const headers = ['Expense Account / Category', 'Voucher Count', 'Total Disbursed (PKR)', 'Percentage %'];
      const rows = dashboardData.expense_categories.map((e) => [
        e.category_name,
        e.count,
        formatMoney(e.amount),
        `${e.percentage}%`,
      ]);
      dashboardService.exportToCSV(`Expense_Audit_Report_${dashboardData.period}`, headers, rows);
    } else {
      const headers = ['Report Period', 'Gross Sales', 'Returns', 'Net Sales', 'Net Profit'];
      const rows = [
        [
          dashboardData.period_label,
          formatMoney(dashboardData.sales_summary.gross_sales),
          formatMoney(dashboardData.sales_summary.sales_returns),
          formatMoney(dashboardData.sales_summary.net_sales),
          formatMoney(dashboardData.profit_overview.net_profit),
        ],
      ];
      dashboardService.exportToCSV(`ApexPOS_Master_Report_${dashboardData.period}`, headers, rows);
    }
  };

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'financial_pnl', label: 'Financial Profit & Loss', icon: <DollarSign size={16} /> },
    { id: 'sales_master', label: 'Sales & Revenue Master', icon: <BarChart3 size={16} /> },
    { id: 'inventory_valuation', label: 'Inventory & Stock Valuation', icon: <Package size={16} /> },
    { id: 'customer_receivables', label: 'Customer Receivables (AR)', icon: <Users size={16} /> },
    { id: 'supplier_payables', label: 'Supplier Payables (AP)', icon: <Truck size={16} /> },
    { id: 'expense_audit', label: 'Operating Expenses Analysis', icon: <Receipt size={16} /> },
    { id: 'pos_sessions_zreport', label: 'POS Sessions & Z-Reports', icon: <Layers size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header & Controls */}
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
              Central Business Reports Hub
            </span>
            <Badge variant="phase">Phase 13</Badge>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
            Official management reports with real-time SQL aggregations for{' '}
            <strong style={{ color: 'var(--primary-400)' }}>{dashboardData?.period_label || 'Selected Period'}</strong>
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.8125rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              color: 'var(--text-main)',
            }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)' }}
              />
              <Button variant="primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={fetchReportData}>
                Apply
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            icon={<RefreshCw size={13} />}
            loading={loading}
            onClick={fetchReportData}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            icon={<Download size={13} />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            icon={<Printer size={13} />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          borderBottom: '1px solid var(--border-medium)',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === t.id ? 'var(--primary-500)' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* 3. Report Views */}

      {/* TAB 1: Financial Profit & Loss Statement */}
      {activeTab === 'financial_pnl' && dashboardData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Sales Revenue</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(dashboardData.profit_overview.net_sales)}
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost of Goods Sold (COGS)</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--warning)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(dashboardData.profit_overview.cogs)}
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gross Profit (Margin: {dashboardData.profit_overview.gross_margin_percentage}%)</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(dashboardData.profit_overview.gross_profit)}
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Business Profit (Margin: {dashboardData.profit_overview.net_margin_percentage}%)</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: dashboardData.profit_overview.net_profit >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>
                Rs. {formatMoney(dashboardData.profit_overview.net_profit)}
              </div>
            </Card>
          </div>

          <Card title="Official Statement of Profit and Loss (P&L)" subtitle={`Accrual accounting statement for ${dashboardData.period_label}`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Line Item / Description</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount (PKR)</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>% of Net Sales</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>Gross Billed Sales</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(dashboardData.sales_summary.gross_sales)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>—</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Less: Sales Discounts</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>-Rs. {formatMoney(dashboardData.sales_summary.discounts)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>—</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Less: Sales Returns & Customer Refunds</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>-Rs. {formatMoney(dashboardData.sales_summary.sales_returns)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>—</td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid var(--border-medium)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--primary-400)' }}>NET SALES REVENUE</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)' }}>Rs. {formatMoney(dashboardData.profit_overview.net_sales)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>100.0%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Less: Cost of Goods Sold (COGS recognized)</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>-Rs. {formatMoney(dashboardData.profit_overview.cogs)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{((dashboardData.profit_overview.cogs / (dashboardData.profit_overview.net_sales || 1)) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid var(--border-medium)', backgroundColor: 'rgba(16, 185, 129, 0.04)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>GROSS PROFIT</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>Rs. {formatMoney(dashboardData.profit_overview.gross_profit)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{dashboardData.profit_overview.gross_margin_percentage}%</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Less: Operating & Administrative Expenses</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>-Rs. {formatMoney(dashboardData.profit_overview.operating_expenses)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{((dashboardData.profit_overview.operating_expenses / (dashboardData.profit_overview.net_sales || 1)) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr style={{ borderBottom: '3px double var(--border-medium)', backgroundColor: dashboardData.profit_overview.net_profit >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)' }}>
                    <td style={{ padding: '0.875rem', fontWeight: 800, fontSize: '1rem', color: dashboardData.profit_overview.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      NET BUSINESS PROFIT / (LOSS)
                    </td>
                    <td style={{ padding: '0.875rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: dashboardData.profit_overview.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      Rs. {formatMoney(dashboardData.profit_overview.net_profit)}
                    </td>
                    <td style={{ padding: '0.875rem', textAlign: 'right', fontWeight: 800, color: dashboardData.profit_overview.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {dashboardData.profit_overview.net_margin_percentage}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Sales & Revenue Master */}
      {activeTab === 'sales_master' && (
        <Card title="Sales Directory & Revenue Audit" subtitle="Click to navigate directly to detailed order lines and receipts">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {dashboardData?.sales_summary?.orders_count || 0} Orders Completed in {dashboardData?.period_label}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                Net Sales: Rs. {formatMoney(dashboardData?.sales_summary?.net_sales)} • Avg Ticket: Rs. {formatMoney(dashboardData?.sales_summary?.avg_order_value)}
              </div>
            </div>
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => onNavigate('sales')}>
              Open Full Sales & Return Ledger
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 3: Inventory Valuation */}
      {activeTab === 'inventory_valuation' && (
        <Card title="Inventory Valuation & Stock Card Hub" subtitle="Real-time on-hand inventory valuation and movement tracking">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Total Active SKUs: {dashboardData?.inventory_health?.total_skus || 0}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                Current Valuation: <strong style={{ color: 'var(--primary-400)' }}>Rs. {formatMoney(dashboardData?.inventory_health?.total_inventory_valuation)}</strong> • {dashboardData?.inventory_health?.low_stock_count || 0} Low Stock Items
              </div>
            </div>
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => onNavigate('inventory')}>
              Open Full Inventory Valuation Report
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 4: Customer Receivables */}
      {activeTab === 'customer_receivables' && dashboardData && (
        <Card title="Customer Credit Receivables (AR) Ledger" subtitle="Outstanding customer credit balances and debtor lists">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.625rem' }}>Customer Code</th>
                  <th style={{ padding: '0.625rem' }}>Customer Name</th>
                  <th style={{ padding: '0.625rem' }}>Phone</th>
                  <th style={{ padding: '0.625rem', textAlign: 'right' }}>Outstanding AR (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.receivables_summary.top_debtors.map((d, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.625rem' }}>
                      <code style={{ color: 'var(--primary-400)' }}>{d.customer_id}</code>
                    </td>
                    <td style={{ padding: '0.625rem', fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: '0.625rem', color: 'var(--text-muted)' }}>{d.phone || 'No phone'}</td>
                    <td style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--warning)' }}>
                      Rs. {formatMoney(d.outstanding_balance)}
                    </td>
                  </tr>
                ))}
                {dashboardData.receivables_summary.top_debtors.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--success)' }}>
                      No outstanding customer credit balances!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outline" icon={<ArrowRight size={14} />} onClick={() => onNavigate('customers')}>
              View All Customer Accounts & Statements
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 5: Supplier Payables */}
      {activeTab === 'supplier_payables' && dashboardData && (
        <Card title="Supplier Accounts Payable (AP) Audit" subtitle="Outstanding supplier debt and distributor balances">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.625rem' }}>Supplier Code</th>
                  <th style={{ padding: '0.625rem' }}>Company / Vendor</th>
                  <th style={{ padding: '0.625rem' }}>Representative</th>
                  <th style={{ padding: '0.625rem' }}>Phone</th>
                  <th style={{ padding: '0.625rem', textAlign: 'right' }}>Outstanding AP (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.payables_summary.top_creditors.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.625rem' }}>
                      <code style={{ color: 'var(--primary-400)' }}>{c.supplier_id}</code>
                    </td>
                    <td style={{ padding: '0.625rem', fontWeight: 600 }}>{c.company_name}</td>
                    <td style={{ padding: '0.625rem', color: 'var(--text-muted)' }}>{c.name}</td>
                    <td style={{ padding: '0.625rem', color: 'var(--text-muted)' }}>{c.phone || 'No phone'}</td>
                    <td style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>
                      Rs. {formatMoney(c.outstanding_payable)}
                    </td>
                  </tr>
                ))}
                {dashboardData.payables_summary.top_creditors.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--success)' }}>
                      No outstanding supplier payables!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outline" icon={<ArrowRight size={14} />} onClick={() => onNavigate('purchases')}>
              View Supplier Payables & Payments Hub
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 6: Operating Expenses */}
      {activeTab === 'expense_audit' && dashboardData && (
        <Card title="Operating Expenses Breakdown" subtitle={`Categorized expenses for ${dashboardData.period_label}`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.625rem' }}>Expense Account</th>
                  <th style={{ padding: '0.625rem', textAlign: 'center' }}>Vouchers</th>
                  <th style={{ padding: '0.625rem', textAlign: 'right' }}>Total Amount (PKR)</th>
                  <th style={{ padding: '0.625rem', textAlign: 'right' }}>% of Total Expenses</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.expense_categories.map((e, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.625rem', fontWeight: 600 }}>{e.category_name}</td>
                    <td style={{ padding: '0.625rem', textAlign: 'center' }}>{e.count}</td>
                    <td style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      Rs. {formatMoney(e.amount)}
                    </td>
                    <td style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {e.percentage}%
                    </td>
                  </tr>
                ))}
                {dashboardData.expense_categories.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No expenses recorded in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outline" icon={<ArrowRight size={14} />} onClick={() => onNavigate('expenses')}>
              Open Expenses & Voucher Register
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 7: POS Sessions & Z-Reports */}
      {activeTab === 'pos_sessions_zreport' && (
        <Card title="POS Sessions, Day Closing & Z-Reports Audit" subtitle="Daily cash reconciliation and register closing archives">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                POS Day Opening & Closing Lifecycle
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                View complete X-Reports (live shift preview) and Z-Reports (finalized daily audit with physical cash counts)
              </div>
            </div>
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => onNavigate('pos')}>
              Open POS Sessions Hub
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
