import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Calendar,
  User,
  AlertCircle,
  Eye,
  Send,
  Search,
  Package,
  X,
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
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
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

  const filteredProducts = inventoryItems.filter((p) => {
    if (!productSearchQuery.trim()) return true;
    const query = productSearchQuery.toLowerCase();
    return (
      p.product_name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      (p.category_name && p.category_name.toLowerCase().includes(query))
    );
  });

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
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    setErrorMsg(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Stock Adjustments & Audit Log
        </div>

        <Button
          variant="primary"
          icon={<Plus size={14} />}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
          onClick={handleOpenCreateModal}
        >
          Record Stock Adjustment
        </Button>
      </div>

      {/* Adjustments Table */}
      <Card title="Posted Stock Adjustments" icon={<SlidersHorizontal size={16} />}>
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
                        icon={<Eye size={13} />}
                        style={{ padding: '0.25rem 0.45rem' }}
                        onClick={() => setSelectedAdjustmentDetail(adj)}
                        title="View Adjustment Voucher Details"
                      />
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
          title={`Adjustment Voucher: ${selectedAdjustmentDetail.adjustment_number}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.625rem', padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: '0.375rem' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Adjustment Type</span>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginTop: '0.15rem' }}>
                  {selectedAdjustmentDetail.adjustment_type === 'IN' ? 'Stock Increase (+)' : 'Stock Decrease (-)'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Posting Date</span>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginTop: '0.15rem' }}>{selectedAdjustmentDetail.date}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Cost Impact</span>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginTop: '0.15rem', color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                  Rs. {formatMoney(selectedAdjustmentDetail.total_cost_impact)}
                </div>
              </div>
            </div>

            {selectedAdjustmentDetail.notes && (
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.375rem', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Notes: </span>
                <span>{selectedAdjustmentDetail.notes}</span>
              </div>
            )}

            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, marginTop: '0.25rem' }}>Adjusted Line Items</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.4rem', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '0.4rem', textAlign: 'right' }}>Before</th>
                  <th style={{ padding: '0.4rem', textAlign: 'right' }}>Difference</th>
                  <th style={{ padding: '0.4rem', textAlign: 'right' }}>After</th>
                  <th style={{ padding: '0.4rem', textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ padding: '0.4rem', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedAdjustmentDetail.items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.45rem 0.4rem' }}>
                      <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                      <code style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{it.product_sku}</code>
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {it.system_stock}
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: it.difference_quantity > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {it.difference_quantity > 0 ? `+${it.difference_quantity}` : it.difference_quantity}
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {it.actual_stock}
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      Rs. {formatMoney(it.unit_cost)}
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      Rs. {formatMoney(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="outline" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} onClick={() => setSelectedAdjustmentDetail(null)}>
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
        >
          {errorMsg && (
            <div style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: '0.375rem',
              color: 'var(--danger)',
              fontSize: '0.75rem',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Adjustment Type & Reason */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Adjustment Type *
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    padding: '0.35rem 0.6rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontSize: '0.78125rem',
                  }}
                >
                  <option value="OUT">Decrease Stock (-) [Loss / Damage / Spoiled]</option>
                  <option value="IN">Increase Stock (+) [Found / Audit Correction]</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Reason Category *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as AdjustmentReason)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    padding: '0.35rem 0.6rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontSize: '0.78125rem',
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

            {/* Product Selector with Live Search */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Select Product (Search by Name, SKU, Barcode, or Category) *
              </label>

              {/* Search Bar Input */}
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
                  type="text"
                  placeholder="Type to search product by name, SKU, or category..."
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setIsProductDropdownOpen(true);
                  }}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    padding: '0.45rem 2rem 0.45rem 2rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                />
                {productSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchQuery('');
                    }}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Selected Product Pill/Card */}
              {selectedProduct ? (
                <div style={{
                  marginTop: '0.35rem',
                  padding: '0.45rem 0.65rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={15} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {selectedProduct.product_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        SKU: <code style={{ color: 'var(--primary-400)' }}>{selectedProduct.sku}</code>
                        {selectedProduct.category_name && ` | ${selectedProduct.category_name}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.71875rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '0.25rem',
                      backgroundColor: selectedProduct.current_stock > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: selectedProduct.current_stock > 0 ? 'var(--success)' : 'var(--danger)',
                    }}>
                      Stock: {selectedProduct.current_stock} {selectedProduct.unit_abbr}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.71875rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                  Please search and select a product.
                </div>
              )}

              {/* Dropdown Results List */}
              {isProductDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  marginTop: '2px',
                }}>
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '0.625rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      No matching products found.
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = p.product_id.toString() === selectedProductId;
                      return (
                        <div
                          key={p.product_id}
                          onClick={() => {
                            setSelectedProductId(p.product_id.toString());
                            setActualStockCount(p.current_stock);
                            setIsProductDropdownOpen(false);
                            setProductSearchQuery('');
                          }}
                          style={{
                            padding: '0.45rem 0.65rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {p.product_name}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
                              SKU: {p.sku} {p.category_name ? `• ${p.category_name}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: '0.71875rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: p.current_stock > 0 ? 'var(--text-main)' : 'var(--danger)',
                            }}>
                              {p.current_stock} {p.unit_abbr}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
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
