import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Calendar,
  User,
  AlertCircle,
  Eye,
  Send,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  StockAdjustment,
  InventorySummaryItem,
  AdjustmentType,
  AdjustmentReason,
} from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';

interface StockAdjustmentsTabProps {
  adjustments: StockAdjustment[];
  inventoryItems: InventorySummaryItem[];
  loading: boolean;
  onRefresh: () => void;
  targetProductForAdjustment: InventorySummaryItem | null;
  onCloseTargetProduct: () => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const StockAdjustmentsTab: React.FC<StockAdjustmentsTabProps> = ({
  adjustments,
  inventoryItems,
  loading: _loading,
  onRefresh,
  targetProductForAdjustment,
  onCloseTargetProduct,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(!!targetProductForAdjustment);
  const [selectedAdjustmentDetail, setSelectedAdjustmentDetail] = useState<StockAdjustment | null>(null);

  // Form State
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('OUT');
  const [reason, setReason] = useState<AdjustmentReason>('DAMAGED');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    targetProductForAdjustment ? targetProductForAdjustment.product_id.toString() : ''
  );
  const [inputMode, setInputMode] = useState<'diff' | 'actual'>('diff');
  const [diffQuantity, setDiffQuantity] = useState<number>(1);
  const [actualStockCount, setActualStockCount] = useState<number>(
    targetProductForAdjustment ? targetProductForAdjustment.current_stock : 0
  );
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update selection if targetProduct changes
  React.useEffect(() => {
    if (targetProductForAdjustment) {
      setSelectedProductId(targetProductForAdjustment.product_id.toString());
      setActualStockCount(targetProductForAdjustment.current_stock);
      setIsCreateModalOpen(true);
    }
  }, [targetProductForAdjustment]);

  const selectedProduct = inventoryItems.find((p) => p.product_id.toString() === selectedProductId);

  // Calculated values
  const currentStock = selectedProduct ? selectedProduct.current_stock : 0;
  const calculatedDiff = inputMode === 'diff'
    ? diffQuantity
    : Math.abs(actualStockCount - currentStock);

  const handleOpenCreateModal = () => {
    if (inventoryItems.length > 0 && !selectedProductId) {
      setSelectedProductId(inventoryItems[0].product_id.toString());
      setActualStockCount(inventoryItems[0].current_stock);
    }
    setErrorMsg(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    onCloseTargetProduct();
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setErrorMsg('Please select a valid product.');
      return;
    }

    if (calculatedDiff <= 0) {
      setErrorMsg('Adjustment quantity must be greater than zero.');
      return;
    }

    if (adjustmentType === 'OUT' && currentStock < calculatedDiff) {
      setErrorMsg(`Insufficient stock! Current stock is ${currentStock}, cannot reduce by ${calculatedDiff}.`);
      return;
    }

    if (reason === 'OTHER' && !notes.trim()) {
      setErrorMsg("Notes are mandatory when 'Other' reason is selected.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await inventoryService.createAdjustment({
        adjustment_type: adjustmentType,
        reason,
        notes,
        items: [
          {
            product: selectedProduct.product_id,
            difference_quantity: calculatedDiff,
          },
        ],
      });

      handleCloseCreateModal();
      setNotes('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to post stock adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header with New Adjustment CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Stock Adjustments Audit Log</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
            Permanent audit trail of manual adjustments, shrinkage, discovered stock, and physical count corrections.
          </p>
        </div>

        <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenCreateModal}>
          Record Stock Adjustment
        </Button>
      </div>

      {/* Adjustments Table */}
      <Card title="Posted Stock Adjustments" subtitle="Immutable adjustment records with mandatory reasons and cost impact" icon={<SlidersHorizontal size={20} />}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Adj. Number</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Reason</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Affected Product</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Cost Impact</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Auditor</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    No stock adjustment vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr
                    key={adj.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <code style={{ fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.75rem' }}>{adj.adjustment_number}</code>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={11} />
                        <span>{adj.date}</span>
                      </div>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      {adj.adjustment_type === 'IN' ? (
                        <Badge variant="success">Increase (+)</Badge>
                      ) : (
                        <Badge variant="danger">Decrease (-)</Badge>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                        {adj.reason_display || adj.reason}
                      </span>
                      {adj.notes && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {adj.notes}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      {adj.items && adj.items.length > 0 ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>{adj.items[0].product_name}</div>
                          {adj.items.length > 1 && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              +{adj.items.length - 1} more items
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {adj.adjustment_type === 'IN' ? `+${adj.total_quantity}` : `-${adj.total_quantity}`}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.78125rem' }}>
                      Rs. {formatMoney(adj.total_cost_impact)}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <User size={11} />
                        <span>{adj.created_by_name}</span>
                      </div>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      <Button
                        variant="outline"
                        icon={<Eye size={11} />}
                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem' }}
                        onClick={() => setSelectedAdjustmentDetail(adj)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Adjustment Details Modal */}
      {selectedAdjustmentDetail && (
        <Modal
          isOpen={!!selectedAdjustmentDetail}
          onClose={() => setSelectedAdjustmentDetail(null)}
          title={`Adjustment Document: ${selectedAdjustmentDetail.adjustment_number}`}
          subtitle={`Reason: ${selectedAdjustmentDetail.reason_display} | Posted by: ${selectedAdjustmentDetail.created_by_name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adjustment Type</span>
                <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>
                  {selectedAdjustmentDetail.adjustment_type === 'IN' ? 'Stock Increase (+)' : 'Stock Decrease (-)'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Posting Date</span>
                <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{selectedAdjustmentDetail.date}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost Impact</span>
                <div style={{ fontWeight: 700, marginTop: '0.25rem', color: 'var(--primary-400)' }}>
                  Rs. {formatMoney(selectedAdjustmentDetail.total_cost_impact)}
                </div>
              </div>
            </div>

            {selectedAdjustmentDetail.notes && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Notes / Remarks: </span>
                <span>{selectedAdjustmentDetail.notes}</span>
              </div>
            )}

            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginTop: '0.5rem' }}>Adjusted Line Items</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Before</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Difference</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>After</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedAdjustmentDetail.items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.625rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{it.product_sku}</code>
                    </td>
                    <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {it.system_stock}
                    </td>
                    <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: it.difference_quantity > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {it.difference_quantity > 0 ? `+${it.difference_quantity}` : it.difference_quantity}
                    </td>
                    <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {it.actual_stock}
                    </td>
                    <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      Rs. {formatMoney(it.unit_cost)}
                    </td>
                    <td style={{ padding: '0.625rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      Rs. {formatMoney(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setSelectedAdjustmentDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Stock Adjustment Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          title="Record Stock Adjustment"
          subtitle="Generate verifiable stock movement with mandatory justification reason"
        >
          {errorMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: '0.5rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Adjustment Type & Reason */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  Adjustment Type *
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
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
                  <option value="OUT">Decrease Stock (-) [Loss / Damage / Spoiled]</option>
                  <option value="IN">Increase Stock (+) [Found / Audit Correction]</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  Reason Category *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as AdjustmentReason)}
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
                  <option value="DAMAGED">Damaged Goods</option>
                  <option value="LOST">Lost / Missing</option>
                  <option value="COUNTING_ERROR">Counting / Physical Audit Mistake</option>
                  <option value="FOUND">Found / Discovered Stock</option>
                  <option value="EXPIRED">Expired / Spoiled</option>
                  <option value="OPENING_STOCK">Opening Stock Entry</option>
                  <option value="OTHER">Other (Notes Required)</option>
                </select>
              </div>
            </div>

            {/* Product Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                Select Product *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const prod = inventoryItems.find((p) => p.product_id.toString() === e.target.value);
                  if (prod) setActualStockCount(prod.current_stock);
                }}
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
                {inventoryItems.map((p) => (
                  <option key={p.product_id} value={p.product_id.toString()}>
                    {p.product_name} ({p.sku}) — Current Stock: {p.current_stock} {p.unit_abbr}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Stock Comparison Card */}
            {selectedProduct && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                textAlign: 'center',
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>System Stock</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                    {currentStock} {selectedProduct.unit_abbr}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adjustment Delta</span>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    marginTop: '0.25rem',
                    color: adjustmentType === 'IN' ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {adjustmentType === 'IN' ? `+${calculatedDiff}` : `-${calculatedDiff}`}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>New Stock After</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: 'var(--primary-400)' }}>
                    {adjustmentType === 'IN' ? currentStock + calculatedDiff : currentStock - calculatedDiff} {selectedProduct.unit_abbr}
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Input Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Adjustment Quantity *"
                type="number"
                min="1"
                step="1"
                value={diffQuantity}
                onChange={(e) => {
                  setInputMode('diff');
                  setDiffQuantity(parseFloat(e.target.value) || 0);
                }}
                required
              />

              <Input
                label="Or Counted Physical Stock"
                type="number"
                min="0"
                step="1"
                value={actualStockCount}
                onChange={(e) => {
                  setInputMode('actual');
                  const actual = parseFloat(e.target.value) || 0;
                  setActualStockCount(actual);
                  if (actual >= currentStock) {
                    setAdjustmentType('IN');
                    setDiffQuantity(actual - currentStock);
                  } else {
                    setAdjustmentType('OUT');
                    setDiffQuantity(currentStock - actual);
                  }
                }}
              />
            </div>

            {/* Notes Field */}
            <Input
              label={`Audit Remarks / Notes ${reason === 'OTHER' ? '*' : '(Optional)'}`}
              placeholder="e.g. Broken packaging found during shelf inspection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={reason === 'OTHER'}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="outline" onClick={handleCloseCreateModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting} icon={<Send size={16} />}>
                Post Adjustment & Update Stock
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
