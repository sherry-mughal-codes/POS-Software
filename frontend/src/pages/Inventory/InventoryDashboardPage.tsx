import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  SlidersHorizontal,
  History,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Badge variant="success" pulse>Inventory & Stock Control</Badge>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Inventory Management & Stock Control
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Single source of truth for stock balances maintained exclusively via immutable transaction movements with atomic race-condition safety.
          </p>
        </div>

        <Button
          variant="outline"
          icon={<RefreshCw size={14} />}
          onClick={fetchInventoryData}
        >
          Refresh Stock
        </Button>
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
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'catalog' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'catalog' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Scale size={16} />
          <span>Live Stock Catalog ({inventoryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'adjustments' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'adjustments' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={16} />
          <span>Stock Adjustments ({adjustments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'movements' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'movements' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <History size={16} />
          <span>Stock Movement Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('stock-card')}
          style={{
            padding: '0.625rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'stock-card' ? '2px solid var(--primary-400)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'stock-card' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <FileSpreadsheet size={16} />
          <span>Product Stock Card</span>
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
          <span>Inventory Report</span>
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
