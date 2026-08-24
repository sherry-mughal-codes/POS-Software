import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  RotateCcw,
  CreditCard,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
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

  // Draft editing state
  const [editingDraftPurchase, setEditingDraftPurchase] = useState<Purchase | null>(null);

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

  const handleEditDraft = (p: Purchase) => {
    setEditingDraftPurchase(p);
    setActiveTab('create');
  };

  const handleCreateSuccess = () => {
    setEditingDraftPurchase(null);
    fetchPurchasesData();
    setActiveTab('orders');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
            Purchasing & Payables
          </h2>
        </div>

        <Button
          variant="outline"
          icon={<RefreshCw size={13} />}
          loading={loading}
          onClick={fetchPurchasesData}
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
          title="Refresh Purchasing & Payables Data"
        >
          Refresh
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        borderBottom: '1px solid var(--border-subtle)',
        overflowX: 'auto',
        paddingBottom: '0.35rem',
      }}>
        <button
          onClick={() => {
            setEditingDraftPurchase(null);
            setActiveTab('orders');
          }}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'orders' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'orders' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <ShoppingBag size={14} />
          <span>Orders ({purchases.length})</span>
        </button>

        <button
          onClick={() => {
            setEditingDraftPurchase(null);
            setActiveTab('create');
          }}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'create' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'create' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          <span>{editingDraftPurchase ? `Edit Draft (${editingDraftPurchase.purchase_number})` : 'Create Purchase'}</span>
        </button>

        <button
          onClick={() => {
            setEditingDraftPurchase(null);
            setActiveTab('returns');
          }}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'returns' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'returns' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} />
          <span>Returns ({returns.length})</span>
        </button>

        <button
          onClick={() => {
            setEditingDraftPurchase(null);
            setActiveTab('payables');
          }}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'payables' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'payables' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <CreditCard size={14} />
          <span>Supplier Payables</span>
        </button>

        <button
          onClick={() => {
            setEditingDraftPurchase(null);
            setActiveTab('reports');
          }}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'reports' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'reports' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <BarChart3 size={14} />
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
              onEditDraft={handleEditDraft}
            />
          )}

          {activeTab === 'create' && (
            <CreatePurchaseTab
              onSuccess={handleCreateSuccess}
              editingPurchase={editingDraftPurchase}
              onCancelEdit={() => {
                setEditingDraftPurchase(null);
                setActiveTab('orders');
              }}
            />
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
