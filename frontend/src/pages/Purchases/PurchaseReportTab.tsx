import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Filter, RefreshCw, DollarSign, ShoppingBag, RotateCcw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Supplier } from '../../types/contact';
import { PurchaseReportSummary } from '../../types/purchase';
import { contactService } from '../../services/contactService';
import { purchaseService } from '../../services/purchaseService';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const PurchaseReportTab: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [summary, setSummary] = useState<PurchaseReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchaseService.getPurchaseReport({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        supplier: selectedSupplierId || undefined,
        status: statusFilter || undefined,
      });
      setSummary(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedSupplierId, statusFilter]);

  useEffect(() => {
    contactService.getSuppliers().then((sList) => setSuppliers(sList || []));
    fetchReport();
  }, [fetchReport]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filter Bar */}
      <Card title="Report Filters" subtitle="Filter purchases and supplier liabilities by date range and distributor">
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
              Supplier Filter
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
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
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name || s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              <option value="SUBMITTED">Submitted</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
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
                setSelectedSupplierId('');
                setStatusFilter('');
              }}
            />
          </div>
        </div>
      </Card>

      {/* Metrics Cards */}
      {loading ? (
        <LoadingSpinner label="Generating Purchase Analytics..." />
      ) : summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Purchase Orders</span>
              <ShoppingBag size={18} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {summary.total_orders}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Transactions in period</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Gross Purchases</span>
              <DollarSign size={18} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.total_purchases)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total inventory purchased</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Paid Amount</span>
              <DollarSign size={18} style={{ color: 'var(--success)' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.total_paid)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Cash / Bank disbursements</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Outstanding Payables</span>
              <DollarSign size={18} style={{ color: 'var(--warning)' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.total_payable)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Unpaid supplier credit</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Purchase Returns</span>
              <RotateCcw size={18} style={{ color: '#a5b4fc' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.total_returned)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Restocking deductions</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Net Purchases</span>
              <BarChart3 size={18} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.net_purchases)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Gross - Returns</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
