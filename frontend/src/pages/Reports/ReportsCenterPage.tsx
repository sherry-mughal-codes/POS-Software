import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Package,
  DollarSign,
  Users,
  Truck,
  Printer,
  RefreshCw,
  ArrowRight,
  Receipt,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { dashboardService } from '../../services/dashboardService';
import { useSettings } from '../../context/SettingsContext';
import { printReportElement } from '../../utils/printReport';
import { ExecutiveDashboardData, DashboardPeriod } from '../../types/dashboard';

type ReportTab =
  | 'financial_pnl'
  | 'sales_master'
  | 'inventory_valuation'
  | 'customer_receivables'
  | 'supplier_payables'
  | 'expense_audit'
  | 'pos_sessions_zreport';

export const ReportsCenterPage: React.FC<{ onNavigate: (tabId: string) => void }> = ({ onNavigate }) => {
  const { companyName, companyAddress, companyPhone } = useSettings();

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

  const getReportTitle = (): string => {
    switch (activeTab) {
      case 'financial_pnl':
        return 'Statement of Profit and Loss (P&L)';
      case 'sales_master':
        return 'Sales & Receipts Revenue Master Audit';
      case 'inventory_valuation':
        return 'Inventory & Stock Valuation Summary Report';
      case 'customer_receivables':
        return 'Customer Credit Receivables (AR) Ledger';
      case 'supplier_payables':
        return 'Supplier Accounts Payable (AP) Debt Report';
      case 'expense_audit':
        return 'Operating & Administrative Expenses Analysis';
      case 'pos_sessions_zreport':
        return 'POS Sessions, Cash Reconciliation & Day Closing Audit';
      default:
        return 'Executive Business Intelligence Report';
    }
  };

  const handlePrint = () => {
    printReportElement('active-printable-report', {
      companyName: companyName || 'Apex POS',
      companyAddress: companyAddress || 'Main Commercial Branch',
      companyPhone: companyPhone || '',
      reportTitle: getReportTitle(),
      periodLabel: dashboardData?.period_label || 'Current Period',
    });
  };

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'financial_pnl', label: 'Financial Profit & Loss', icon: <DollarSign size={16} /> },
    { id: 'sales_master', label: 'Sales & Receipts Master', icon: <BarChart3 size={16} /> },
    { id: 'inventory_valuation', label: 'Inventory & Stock Valuation', icon: <Package size={16} /> },
    { id: 'customer_receivables', label: 'Customer Receivables (AR)', icon: <Users size={16} /> },
    { id: 'supplier_payables', label: 'Supplier Payables (AP)', icon: <Truck size={16} /> },
    { id: 'expense_audit', label: 'Operating Expenses Analysis', icon: <Receipt size={16} /> },
    { id: 'pos_sessions_zreport', label: 'POS Sessions & Z-Reports', icon: <Layers size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* 1. Header Toolbar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
            Reports Center
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Period: <strong style={{ color: 'var(--primary-400)' }}>{dashboardData?.period_label || 'Loading...'}</strong>
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              color: 'var(--text-main)',
              outline: 'none',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.71875rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.25rem',
                  color: 'var(--text-main)',
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.71875rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.25rem',
                  color: 'var(--text-main)',
                }}
              />
              <Button variant="primary" style={{ padding: '0.2rem 0.45rem', fontSize: '0.71875rem' }} onClick={fetchReportData}>
                Apply
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            icon={<RefreshCw size={12} />}
            loading={loading}
            onClick={fetchReportData}
            title="Refresh Report Data"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
            icon={<Printer size={13} />}
            onClick={handlePrint}
            title="Print Selected Official Report"
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.35rem',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: isSelected ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.78125rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Printable Report Content Container */}
      <div id="active-printable-report">
        {/* TAB 1: Financial Profit & Loss Statement */}
        {activeTab === 'financial_pnl' && dashboardData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem' }}>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Net Sales Revenue</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.profit_overview.net_sales)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>COGS</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--warning)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.profit_overview.cogs)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Gross Profit ({dashboardData.profit_overview.gross_margin_percentage}%)</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.profit_overview.gross_profit)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Net Profit ({dashboardData.profit_overview.net_margin_percentage}%)</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: dashboardData.profit_overview.net_profit >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.profit_overview.net_profit)}
                </div>
              </div>
            </div>

            <Card title="Official Statement of Profit and Loss (P&L)" subtitle={`Accrual accounting statement for ${dashboardData.period_label}`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Line Item / Description</th>
                      <th className="text-right" style={{ padding: '0.75rem', textAlign: 'right' }}>Amount (PKR)</th>
                      <th className="text-right" style={{ padding: '0.75rem', textAlign: 'right' }}>% of Net Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>Gross Billed Sales</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(dashboardData.sales_summary.gross_sales)}</td>
                      <td className="text-right" style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>—</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Less: Sales Discounts</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>-Rs. {formatMoney(dashboardData.sales_summary.discounts)}</td>
                      <td className="text-right" style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>—</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Less: Sales Returns & Customer Refunds</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>-Rs. {formatMoney(dashboardData.sales_summary.sales_returns)}</td>
                      <td className="text-right" style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>—</td>
                    </tr>
                    <tr style={{ borderBottom: '2px solid var(--border-medium)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--primary-400)' }}>NET SALES REVENUE</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)' }}>Rs. {formatMoney(dashboardData.profit_overview.net_sales)}</td>
                      <td className="text-right" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>100.0%</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Less: Cost of Goods Sold (COGS recognized)</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>-Rs. {formatMoney(dashboardData.profit_overview.cogs)}</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{((dashboardData.profit_overview.cogs / (dashboardData.profit_overview.net_sales || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr style={{ borderBottom: '2px solid var(--border-medium)', backgroundColor: 'rgba(16, 185, 129, 0.04)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>GROSS PROFIT</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>Rs. {formatMoney(dashboardData.profit_overview.gross_profit)}</td>
                      <td className="text-right" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{dashboardData.profit_overview.gross_margin_percentage}%</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Less: Operating & Administrative Expenses</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>-Rs. {formatMoney(dashboardData.profit_overview.operating_expenses)}</td>
                      <td className="text-right font-mono" style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{((dashboardData.profit_overview.operating_expenses / (dashboardData.profit_overview.net_sales || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr style={{ borderBottom: '3px double var(--border-medium)', backgroundColor: dashboardData.profit_overview.net_profit >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)' }}>
                      <td style={{ padding: '0.875rem', fontWeight: 800, fontSize: '1rem', color: dashboardData.profit_overview.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        NET BUSINESS PROFIT / (LOSS)
                      </td>
                      <td className="text-right font-mono" style={{ padding: '0.875rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: dashboardData.profit_overview.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        Rs. {formatMoney(dashboardData.profit_overview.net_profit)}
                      </td>
                      <td className="text-right" style={{ padding: '0.875rem', textAlign: 'right', fontWeight: 800, color: dashboardData.profit_overview.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
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
        {activeTab === 'sales_master' && dashboardData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top Symmetrical Action Header */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Sales & Receipts Audit
              </span>
              <Button
                variant="outline"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                icon={<ArrowRight size={13} />}
                onClick={() => onNavigate('sales')}
              >
                Open Full Sales Ledger
              </Button>
            </div>

            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem' }}>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Orders Count</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {dashboardData.sales_summary.orders_count}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Gross Sales</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.sales_summary.gross_sales)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Discounts & Returns</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginTop: '0.15rem' }}>
                  -Rs. {formatMoney(dashboardData.sales_summary.discounts + dashboardData.sales_summary.sales_returns)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Net Realized Revenue</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.sales_summary.net_sales)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Ticket Size</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.sales_summary.avg_order_value)}
                </div>
              </div>
            </div>

            <Card title="Daily Sales & Receipts Breakdown" subtitle={`Historical daily receipts in ${dashboardData.period_label}`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem' }}>Timeline / Date</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>Orders</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>Gross Sales (PKR)</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>Refunds (PKR)</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>Net Sales (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.sales_trend || []).map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.625rem', fontWeight: 600 }}>{t.label}</td>
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.orders_count}</td>
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(t.gross_sales)}</td>
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                          -Rs. {formatMoney(t.returns)}
                        </td>
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                          Rs. {formatMoney(t.net_sales)}
                        </td>
                      </tr>
                    ))}
                    {(!dashboardData.sales_trend || dashboardData.sales_trend.length === 0) && (
                      <tr>
                        <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No sales recorded for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.875rem' }}>
              <Card title="Payment Method Settlements" subtitle="Cash vs Card vs Credit split">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Method</th>
                      <th className="text-right" style={{ padding: '0.5rem', textAlign: 'right' }}>Total (PKR)</th>
                      <th className="text-right" style={{ padding: '0.5rem', textAlign: 'right' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.payment_distribution || []).map((pm, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{pm.method_name}</td>
                        <td className="text-right font-mono" style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(pm.amount)}</td>
                        <td className="text-right font-mono" style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>{pm.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card title="Cashier Performance Audit" subtitle="Revenue generated per terminal staff">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Cashier</th>
                      <th className="text-right" style={{ padding: '0.5rem', textAlign: 'right' }}>Orders</th>
                      <th className="text-right" style={{ padding: '0.5rem', textAlign: 'right' }}>Net Sales (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.cashier_performance || []).map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{c.cashier_name}</td>
                        <td className="text-right font-mono" style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{c.orders_count}</td>
                        <td className="text-right font-mono" style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 600 }}>
                          Rs. {formatMoney(c.net_sales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: Inventory Valuation & Stock Health */}
        {activeTab === 'inventory_valuation' && dashboardData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top Symmetrical Action Header */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Inventory Valuation Audit
              </span>
              <Button
                variant="outline"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                icon={<ArrowRight size={13} />}
                onClick={() => onNavigate('inventory')}
              >
                Open Inventory Control
              </Button>
            </div>

            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem' }}>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Active Catalog SKUs</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {dashboardData.inventory_health.total_skus}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Stock Valuation</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.inventory_health.total_inventory_valuation)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Low Stock SKUs</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--warning)', marginTop: '0.15rem' }}>
                  {dashboardData.inventory_health.low_stock_count}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Out of Stock SKUs</div>
                <div className="kpi-value" style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginTop: '0.15rem' }}>
                  {dashboardData.inventory_health.out_of_stock_count}
                </div>
              </div>
            </div>

            <Card title="Inventory Valuation & Critical Threshold Audit" subtitle={`Stock status report as of ${dashboardData.period_label}`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem' }}>Item Code (SKU)</th>
                      <th style={{ padding: '0.625rem' }}>Product Name</th>
                      <th className="text-center" style={{ padding: '0.625rem', textAlign: 'center' }}>Stock Status</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>On-Hand Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.inventory_health.low_stock_alerts || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.625rem' }}>
                          <code>{item.sku}</code>
                        </td>
                        <td style={{ padding: '0.625rem', fontWeight: 600 }}>{item.name}</td>
                        <td className="text-center" style={{ padding: '0.625rem', textAlign: 'center' }}>
                          <span className="badge" style={{
                            backgroundColor: item.status === 'OUT_OF_STOCK' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: item.status === 'OUT_OF_STOCK' ? 'var(--danger)' : 'var(--warning)',
                          }}>
                            {item.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock Alert'}
                          </span>
                        </td>
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.current_stock <= 0 ? 'var(--danger)' : 'var(--warning)' }}>
                          {item.current_stock}
                        </td>
                      </tr>
                    ))}
                    {(!dashboardData.inventory_health.low_stock_alerts || dashboardData.inventory_health.low_stock_alerts.length === 0) && (
                      <tr>
                        <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--success)' }}>
                          <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} />
                          All inventory stock levels are healthy and within safe operating thresholds!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: Customer Receivables */}
        {activeTab === 'customer_receivables' && dashboardData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top Symmetrical Action Header */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Customer Credit Receivables (AR)
              </span>
              <Button
                variant="outline"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                icon={<ArrowRight size={13} />}
                onClick={() => onNavigate('customers')}
              >
                Open Customer Accounts
              </Button>
            </div>

            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Customer Receivables (AR)</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--warning)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.receivables_summary.total_receivables)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Active Debtors Count</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {dashboardData.receivables_summary.top_debtors.length}
                </div>
              </div>
            </div>

            <Card title="Customer Credit Receivables (AR) Ledger" subtitle="Outstanding customer credit balances and debtor lists">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem' }}>Customer Code</th>
                      <th style={{ padding: '0.625rem' }}>Customer Name</th>
                      <th style={{ padding: '0.625rem' }}>Phone</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>Outstanding AR (PKR)</th>
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
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--warning)' }}>
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
            </Card>
          </div>
        )}

        {/* TAB 5: Supplier Payables */}
        {activeTab === 'supplier_payables' && dashboardData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top Symmetrical Action Header */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Supplier Accounts Payable (AP)
              </span>
              <Button
                variant="outline"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                icon={<ArrowRight size={13} />}
                onClick={() => onNavigate('purchases')}
              >
                Open Supplier Hub
              </Button>
            </div>

            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Supplier Payables (AP)</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.payables_summary.total_payables)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Active Creditor Vendors</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {dashboardData.payables_summary.top_creditors.length}
                </div>
              </div>
            </div>

            <Card title="Supplier Accounts Payable (AP) Audit" subtitle="Outstanding supplier debt and distributor balances">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem' }}>Supplier Code</th>
                      <th style={{ padding: '0.625rem' }}>Company / Vendor</th>
                      <th style={{ padding: '0.625rem' }}>Representative</th>
                      <th style={{ padding: '0.625rem' }}>Phone</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>Outstanding AP (PKR)</th>
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
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>
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
            </Card>
          </div>
        )}

        {/* TAB 6: Operating Expenses */}
        {activeTab === 'expense_audit' && dashboardData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top Symmetrical Action Header */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Operating Expenses Breakdown
              </span>
              <Button
                variant="outline"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                icon={<ArrowRight size={13} />}
                onClick={() => onNavigate('expenses')}
              >
                Open Expense Register
              </Button>
            </div>

            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Operating Expenses</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.profit_overview.operating_expenses)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Categorized Accounts</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {dashboardData.expense_categories.length}
                </div>
              </div>
            </div>

            <Card title="Operating Expenses Breakdown" subtitle={`Categorized expenses for ${dashboardData.period_label}`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem' }}>Expense Account</th>
                      <th className="text-center" style={{ padding: '0.625rem', textAlign: 'center' }}>Vouchers</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>Total Amount (PKR)</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>% of Total Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.expense_categories.map((e, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.625rem', fontWeight: 600 }}>{e.category_name}</td>
                        <td className="text-center font-mono" style={{ padding: '0.625rem', textAlign: 'center' }}>{e.count}</td>
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          Rs. {formatMoney(e.amount)}
                        </td>
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
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
            </Card>
          </div>
        )}

        {/* TAB 7: POS Sessions & Z-Reports */}
        {activeTab === 'pos_sessions_zreport' && dashboardData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top Symmetrical Action Header */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                POS Shift Sessions & Day Closing
              </span>
              <Button
                variant="outline"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                icon={<ArrowRight size={13} />}
                onClick={() => onNavigate('day-sessions')}
              >
                Open Day Sessions Hub
              </Button>
            </div>

            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Active Register Status</div>
                <div className="kpi-value" style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>
                  {dashboardData.active_pos_session ? (
                    <Badge variant="success" pulse>
                      Session {dashboardData.active_pos_session.session_number} (Open)
                    </Badge>
                  ) : (
                    <Badge variant="warning">No Active Day Session</Badge>
                  )}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Cash in Drawer (1010)</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.cash_position.cash_in_hand)}
                </div>
              </div>
              <div className="kpi-box glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                <div className="kpi-title" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Bank Account Balance (1020)</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--info)', marginTop: '0.15rem' }}>
                  Rs. {formatMoney(dashboardData.cash_position.bank_balance)}
                </div>
              </div>
            </div>

            <Card title="POS Sessions, Day Closing & Cash Audit" subtitle={`Cash register sessions for ${dashboardData.period_label}`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem' }}>Session #</th>
                      <th style={{ padding: '0.625rem' }}>Cashier / Operator</th>
                      <th style={{ padding: '0.625rem' }}>Opening Time</th>
                      <th className="text-right" style={{ padding: '0.625rem', textAlign: 'right' }}>Opening Cash (PKR)</th>
                      <th className="text-center" style={{ padding: '0.625rem', textAlign: 'center' }}>Session State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.active_pos_session ? (
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.625rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                          {dashboardData.active_pos_session.session_number}
                        </td>
                        <td style={{ padding: '0.625rem', fontWeight: 600 }}>{dashboardData.active_pos_session.opened_by}</td>
                        <td style={{ padding: '0.625rem', color: 'var(--text-muted)' }}>
                          {new Date(dashboardData.active_pos_session.opened_at).toLocaleString('en-GB')}
                        </td>
                        <td className="text-right font-mono" style={{ padding: '0.625rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          Rs. {formatMoney(dashboardData.active_pos_session.opening_cash)}
                        </td>
                        <td className="text-center" style={{ padding: '0.625rem', textAlign: 'center' }}>
                          <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                            Active (Open)
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No day session currently open. All previous sessions archived in Z-Reports.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
