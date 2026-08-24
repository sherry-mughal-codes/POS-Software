import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Filter, DollarSign, ShoppingBag, RotateCcw } from 'lucide-react';
import { Button } from '../../components/common/Button';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Filters Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="Date From"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.375rem',
            padding: '0.35rem 0.5rem',
            color: 'var(--text-main)',
            fontSize: '0.75rem',
            outline: 'none',
          }}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="Date To"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.375rem',
            padding: '0.35rem 0.5rem',
            color: 'var(--text-main)',
            fontSize: '0.75rem',
            outline: 'none',
          }}
        />

        <select
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.375rem',
            padding: '0.35rem 0.5rem',
            color: 'var(--text-main)',
            outline: 'none',
            fontSize: '0.75rem',
            minWidth: '150px',
          }}
        >
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.company_name || s.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.375rem',
            padding: '0.35rem 0.5rem',
            color: 'var(--text-main)',
            outline: 'none',
            fontSize: '0.75rem',
          }}
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="DRAFT">Draft</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <Button variant="primary" icon={<Filter size={12} />} onClick={fetchReport} style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
          Apply
        </Button>
        <Button
          variant="outline"
          icon={<RotateCcw size={12} />}
          style={{ padding: '0.25rem 0.45rem' }}
          title="Reset Filters"
          onClick={() => {
            setStartDate('');
            setEndDate('');
            setSelectedSupplierId('');
            setStatusFilter('');
          }}
        />
      </div>

      {/* Standardized Metrics Cards */}
      {loading ? (
        <LoadingSpinner label="Generating Purchase Analytics..." />
      ) : summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
          <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Purchase Orders</span>
              <ShoppingBag size={14} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {summary.total_orders}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Transactions in period</div>
          </div>

          <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Gross Purchases</span>
              <DollarSign size={14} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.total_purchases)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Total inventory billed</div>
          </div>

          <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Paid Amount</span>
              <DollarSign size={14} style={{ color: 'var(--success)' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.total_paid)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Cash / Bank paid</div>
          </div>

          <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Payables</span>
              <DollarSign size={14} style={{ color: 'var(--warning)' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.total_payable)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Unpaid supplier credit</div>
          </div>

          <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Returns</span>
              <RotateCcw size={14} style={{ color: '#a5b4fc' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.total_returned)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Restocking deductions</div>
          </div>

          <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Net Purchases</span>
              <BarChart3 size={14} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
              Rs. {formatMoney(summary.net_purchases)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Gross minus returns</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
