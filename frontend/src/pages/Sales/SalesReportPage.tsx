import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Filter,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Banknote,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ComprehensiveSalesReport } from '../../types/sales';
import { Customer } from '../../types/contact';
import { salesService } from '../../services/salesService';
import { contactService } from '../../services/contactService';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SalesReportPage: React.FC = () => {
  const [report, setReport] = useState<ComprehensiveSalesReport | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await salesService.getSalesReport({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        customer: selectedCustomerId ? parseInt(selectedCustomerId) : undefined,
        payment_method: selectedPaymentMethod || undefined,
      });
      setReport(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedCustomerId, selectedPaymentMethod]);

  useEffect(() => {
    contactService.getCustomers().then((cList) => setCustomers(cList || []));
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Badge variant="phase">Phase 7 & 8</Badge>
            <Badge variant="success" pulse>Financial Analytics</Badge>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Comprehensive Sales Analytics Report
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Consolidated matrix analyzing gross revenue, discounts, customer returns, net sales, and tender collections.
          </p>
        </div>

        <Button variant="outline" icon={<RefreshCw size={14} />} onClick={fetchReport}>
          Refresh Report
        </Button>
      </div>

      {/* Filter Card */}
      <Card title="Sales Report Filters" subtitle="Filter across date ranges, customer accounts, and payment tenders" icon={<Filter size={20} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Date From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.5rem', padding: '0.55rem 0.75rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Date To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.5rem', padding: '0.55rem 0.75rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Customer Filter
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.5rem', padding: '0.55rem 0.75rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_walkin ? '(Walk-in)' : `(${c.customer_id})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Payment Method
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.5rem', padding: '0.55rem 0.75rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="CREDIT">Customer Credit</option>
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
                setSelectedCustomerId('');
                setSelectedPaymentMethod('');
              }}
            />
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      {loading ? (
        <LoadingSpinner label="Generating comprehensive sales report..." />
      ) : report ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Gross Sales</span>
                <TrendingUp size={18} style={{ color: 'var(--primary-400)' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(report.summary.gross_sales)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {report.summary.total_invoices} Invoices Issued
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Discounts & Returns</span>
                <RotateCcw size={18} style={{ color: 'var(--danger)' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                -Rs. {formatMoney(report.summary.total_discounts + report.summary.total_returns)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Disc: Rs. {formatMoney(report.summary.total_discounts)} | Ret: Rs. {formatMoney(report.summary.total_returns)}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Net Realized Revenue</span>
                <DollarSign size={18} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(report.summary.net_sales)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Gross - Discounts - Returns
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Cash vs Card vs Credit</span>
                <Banknote size={18} style={{ color: 'var(--primary-400)' }} />
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div>Cash: <span style={{ color: 'var(--success)' }}>Rs. {formatMoney(report.summary.cash_sales)}</span></div>
                <div>Card: <span style={{ color: 'var(--primary-400)' }}>Rs. {formatMoney(report.summary.card_sales)}</span></div>
                <div>Credit: <span style={{ color: 'var(--warning)' }}>Rs. {formatMoney(report.summary.credit_sales)}</span></div>
              </div>
            </div>
          </div>

          {/* Master Table */}
          <Card title="Sales Transactions Breakdown" subtitle="Detailed transactional audit logs for selected period" icon={<BarChart3 size={20} />}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Invoice #</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Cashier</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Tender</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Subtotal</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Discount</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Returns</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Net Sales</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No transactions found for the specified filters.
                      </td>
                    </tr>
                  ) : (
                    report.rows.map((row) => (
                      <tr
                        key={row.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '0.75rem 0.75rem' }}>
                          <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{row.invoice_number}</code>
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text-muted)' }}>
                          {row.date}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>
                          {row.customer_name}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', color: 'var(--text-muted)' }}>
                          {row.cashier_name}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem' }}>
                          {row.payment_method === 'CASH' && <Badge variant="success">Cash</Badge>}
                          {row.payment_method === 'CARD' && <Badge variant="info">Card</Badge>}
                          {row.payment_method === 'CREDIT' && <Badge variant="warning">Credit</Badge>}
                          {row.payment_method === 'SPLIT' && <Badge variant="phase">Split</Badge>}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          Rs. {formatMoney(row.subtotal)}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.discount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {row.discount > 0 ? `-Rs. ${formatMoney(row.discount)}` : '-'}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.returned_amount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {row.returned_amount > 0 ? `-Rs. ${formatMoney(row.returned_amount)}` : '-'}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--success)' }}>
                          Rs. {formatMoney(row.net_amount)}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          Rs. {formatMoney(row.paid_amount)}
                        </td>

                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.due_amount > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: row.due_amount > 0 ? 800 : 400 }}>
                          {row.due_amount > 0 ? `Rs. ${formatMoney(row.due_amount)}` : '-'}
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
