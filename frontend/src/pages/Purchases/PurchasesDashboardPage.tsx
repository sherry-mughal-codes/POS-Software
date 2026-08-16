import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  RotateCcw,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PurchaseListTab } from './PurchaseListTab';
import { CreatePurchaseTab } from './CreatePurchaseTab';
import { PurchaseReturnsTab } from './PurchaseReturnsTab';
import { SupplierPayablesTab } from './SupplierPayablesTab';
import { PurchaseReportTab } from './PurchaseReportTab';
import { Purchase, PurchaseReturn } from '../../types/purchase';
import { purchaseService } from '../../services/purchaseService';

type TabKey = 'orders' | 'create' | 'returns' | 'payables' | 'reports';

export const PurchasesDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('orders');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Return modal trigger state
  const [returnTargetPurchase, setReturnTargetPurchase] = useState<Purchase | null>(null);

  const fetchPurchasesData = useCallback(async () => {
    setLoading(true);
    try {
      const [pList, rList] = await Promise.all([
        purchaseService.getPurchases(),
        purchaseService.getPurchaseReturns(),
      ]);
      setPurchases(pList || []);
      setReturns(rList || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchasesData();
  }, [fetchPurchasesData]);

  const handleOpenReturnModal = (p: Purchase) => {
    setReturnTargetPurchase(p);
    setActiveTab('returns');
  };

  const handleCreateSuccess = () => {
    fetchPurchasesData();
    setActiveTab('orders');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Badge variant="phase">Phase 5 Active</Badge>
            <Badge variant="success" pulse>Purchasing & Payables</Badge>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Purchasing, Supplier Payables & Returns
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Atomic purchase orders with automatic stock-in ledger movements, double-entry accounting, and supplier payable settlement.
          </p>
        </div>

        {activeTab !== 'create' && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setActiveTab('create')}>
            New Purchase Order
          </Button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-medium)',
        overflowX: 'auto',
        paddingBottom: '0.25rem',
      }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'orders' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <ShoppingBag size={16} />
          <span>Purchase Orders ({purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'create' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'create' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>Create Purchase</span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'returns' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'returns' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={16} />
          <span>Purchase Returns ({returns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payables')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'payables' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'payables' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <CreditCard size={16} />
          <span>Supplier Payables & Payments</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'reports' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <BarChart3 size={16} />
          <span>Purchase Analytics</span>
        </button>
      </div>

      {/* Tab Contents */}
      {loading && activeTab === 'orders' ? (
        <LoadingSpinner label="Loading purchase transactions..." />
      ) : (
        <>
          {activeTab === 'orders' && (
            <PurchaseListTab
              purchases={purchases}
              loading={loading}
              onRefresh={fetchPurchasesData}
              onOpenReturn={handleOpenReturnModal}
            />
          )}

          {activeTab === 'create' && (
            <CreatePurchaseTab onSuccess={handleCreateSuccess} />
          )}

          {activeTab === 'returns' && (
            <PurchaseReturnsTab
              returns={returns}
              onRefresh={fetchPurchasesData}
              returnTargetPurchase={returnTargetPurchase}
              onCloseReturnModal={() => setReturnTargetPurchase(null)}
            />
          )}

          {activeTab === 'payables' && (
            <SupplierPayablesTab onRefreshAll={fetchPurchasesData} />
          )}

          {activeTab === 'reports' && (
            <PurchaseReportTab />
          )}
        </>
      )}
    </div>
  );
};
