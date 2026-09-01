import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  DollarSign,
  Package,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { CustomerWarrantyClaimTab } from './CustomerWarrantyClaimTab';
import { SupplierWarrantyClaimTab } from './SupplierWarrantyClaimTab';
import { warrantyService } from '../../services/warrantyService';
import { WarrantyMetrics } from '../../types/warranty';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const WarrantyDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [metrics, setMetrics] = useState<WarrantyMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const data = await warrantyService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching warranty metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar — matches Expenses / Purchases pattern */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={18} color="#6366f1" />
            Warranty Claims
          </h2>
        </div>
        <Button
          variant="secondary"
          onClick={loadMetrics}
          loading={isLoadingMetrics}
          icon={<RefreshCw size={13} />}
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Cards — compact, 2-column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Held Defective Units
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '0.15rem' }}>
                {metrics ? metrics.warranty_claim_units : '—'}
              </div>
            </div>
            <div style={{ padding: '0.375rem', backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: '0.4rem', color: '#f59e0b' }}>
              <Package size={16} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Held Valuation
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#6366f1', marginTop: '0.15rem' }}>
                Rs. {metrics ? formatMoney(metrics.warranty_claim_valuation) : '—'}
              </div>
            </div>
            <div style={{ padding: '0.375rem', backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: '0.4rem', color: '#6366f1' }}>
              <DollarSign size={16} />
            </div>
          </div>
        </Card>
      </div>

      {/* Sub-Tabs — matches Expenses tab pattern */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('customer')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'customer' ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: activeTab === 'customer' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <ShieldCheck size={14} />
          Customer Warranty Claim
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supplier')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'supplier' ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: activeTab === 'supplier' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Truck size={14} />
          Supplier Warranty Claim (RMA)
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'customer' ? (
          <CustomerWarrantyClaimTab />
        ) : (
          <SupplierWarrantyClaimTab />
        )}
      </div>
    </div>
  );
};

export default WarrantyDashboardPage;
