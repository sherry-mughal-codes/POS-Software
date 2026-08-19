import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  SlidersHorizontal,
  History,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LiveStockCatalogTab } from './LiveStockCatalogTab';
import { StockAdjustmentsTab } from './StockAdjustmentsTab';
import { StockMovementLedgerTab } from './StockMovementLedgerTab';
import { ProductStockCardTab } from './ProductStockCardTab';
import { InventoryReportTab } from './InventoryReportTab';
import { InventorySummaryItem, StockAdjustment } from '../../types/inventory';
import { Category } from '../../types/product';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';

type InventoryTabKey = 'catalog' | 'adjustments' | 'movements' | 'stock-card' | 'reports';

export const InventoryDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InventoryTabKey>('catalog');
  const [inventoryItems, setInventoryItems] = useState<InventorySummaryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  // Cross-tab interaction targets
  const [stockCardProductId, setStockCardProductId] = useState<number | null>(null);
  const [targetProductForAdjustment, setTargetProductForAdjustment] = useState<InventorySummaryItem | null>(null);

  const fetchInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryList, catList, adjList] = await Promise.all([
        inventoryService.getSummary(),
        productService.getCategories(),
        inventoryService.getAdjustments(),
      ]);
      setInventoryItems(summaryList || []);
      setCategories(catList || []);
      setAdjustments(adjList || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const handleOpenStockCard = (productId: number) => {
    setStockCardProductId(productId);
    setActiveTab('stock-card');
  };

  const handleOpenAdjustmentModal = (prod?: InventorySummaryItem) => {
    if (prod) {
      setTargetProductForAdjustment(prod);
    } else {
      setTargetProductForAdjustment(null);
    }
    setActiveTab('adjustments');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Inventory & Stock Control
          </h2>
        </div>

        <Button
          variant="outline"
          icon={<RefreshCw size={13} />}
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
          onClick={fetchInventoryData}
        >
          Refresh Stock
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
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'catalog' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'catalog' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <Scale size={14} />
          <span>Live Stock ({inventoryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'adjustments' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'adjustments' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={14} />
          <span>Adjustments ({adjustments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'movements' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'movements' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <History size={14} />
          <span>Movement Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('stock-card')}
          style={{
            padding: '0.35rem 0.75rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: activeTab === 'stock-card' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'stock-card' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
          }}
        >
          <FileSpreadsheet size={14} />
          <span>Stock Card</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
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
          <span>Valuation & Reports</span>
        </button>
      </div>

      {/* Tab Contents */}
      {loading && activeTab === 'catalog' && inventoryItems.length === 0 ? (
        <LoadingSpinner label="Loading live inventory stock..." />
      ) : (
        <>
          {activeTab === 'catalog' && (
            <LiveStockCatalogTab
              items={inventoryItems}
              categories={categories}
              loading={loading}
              onOpenStockCard={handleOpenStockCard}
              onOpenAdjustmentModal={handleOpenAdjustmentModal}
            />
          )}

          {activeTab === 'adjustments' && (
            <StockAdjustmentsTab
              adjustments={adjustments}
              inventoryItems={inventoryItems}
              loading={loading}
              onRefresh={fetchInventoryData}
              targetProductForAdjustment={targetProductForAdjustment}
              onCloseTargetProduct={() => setTargetProductForAdjustment(null)}
            />
          )}

          {activeTab === 'movements' && (
            <StockMovementLedgerTab />
          )}

          {activeTab === 'stock-card' && (
            <ProductStockCardTab initialProductId={stockCardProductId} />
          )}

          {activeTab === 'reports' && (
            <InventoryReportTab />
          )}
        </>
      )}
    </div>
  );
};
