import React, { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle,
  AlertCircle,
  Package,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import {
  SupplierWarrantyClaim,
  AvailableSupplierClaimItem,
  SupplierWarrantyClaimPayload,
} from '../../types/warranty';
import { Supplier } from '../../types/contact';
import { warrantyService } from '../../services/warrantyService';
import { contactService } from '../../services/contactService';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Card } from '../../components/common/Card';
import { SupplierClaimSlipModal } from './SupplierClaimSlipModal';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SupplierWarrantyClaimTab: React.FC = () => {
  // Master Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');

  // Available Held Defective Items for Selected Supplier
  const [availableItems, setAvailableItems] = useState<AvailableSupplierClaimItem[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [dispatchQuantities, setDispatchQuantities] = useState<Record<number, number>>({});

  // Dispatch Modal State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);
  const [dispatchModalError, setDispatchModalError] = useState<string | null>(null);


  // Slip Modal State
  const [activeSlipClaim, setActiveSlipClaim] = useState<SupplierWarrantyClaim | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Global Feedback Message
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Supplier Claims History State
  const [supplierClaims, setSupplierClaims] = useState<SupplierWarrantyClaim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');

  // Receive Replacement Modal State
  const [completingClaimId, setCompletingClaimId] = useState<number | null>(null);
  const [isCompletingReceipt, setIsCompletingReceipt] = useState(false);

  useEffect(() => {
    loadSuppliers();
    loadSupplierClaims();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      loadAvailableItems(Number(selectedSupplierId));
    } else {
      setAvailableItems([]);
      setSelectedItemIds([]);
      setDispatchQuantities({});
    }
  }, [selectedSupplierId]);

  const loadSuppliers = async () => {
    try {
      const data = await contactService.getSuppliers({ is_active: true });
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadAvailableItems = async (supplierId: number) => {
    setIsLoadingAvailable(true);
    try {
      const data = await warrantyService.getAvailableSupplierItems(supplierId);
      setAvailableItems(data);
      const ids: number[] = [];
      const qtyMap: Record<number, number> = {};
      data.forEach((item) => {
        ids.push(item.customer_warranty_claim_id);
        qtyMap[item.customer_warranty_claim_id] = item.available_quantity;
      });
      setSelectedItemIds(ids);
      setDispatchQuantities(qtyMap);
    } catch (error) {
      console.error('Failed to fetch available supplier claim items:', error);
    } finally {
      setIsLoadingAvailable(false);
    }
  };


  const loadSupplierClaims = async () => {
    setIsLoadingClaims(true);
    try {
      const data = await warrantyService.getSupplierClaims();
      setSupplierClaims(data);
    } catch (err) {
      console.error('Failed to load supplier claims:', err);
    } finally {
      setIsLoadingClaims(false);
    }
  };

  const handleCompleteReceipt = async (claimId: number) => {
    setIsCompletingReceipt(true);
    try {
      const result = await warrantyService.completeSupplierReceipt(claimId);
      setFeedbackMessage({
        type: 'success',
        text: `Claim ${result.claim_number} completed — replacement stock restocked to inventory.`,
      });
      setCompletingClaimId(null);
      loadSupplierClaims();
      if (selectedSupplierId) loadAvailableItems(Number(selectedSupplierId));
    } catch (error: any) {
      setFeedbackMessage({ type: 'danger', text: error.response?.data?.error || 'Failed to complete replacement receipt.' });
    } finally {
      setIsCompletingReceipt(false);
    }
  };

  const toggleItemSelection = (id: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === availableItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(availableItems.map((i) => i.customer_warranty_claim_id));
    }
  };

  const handleOpenDispatchModal = () => {
    if (!selectedSupplierId) {
      setFeedbackMessage({ type: 'danger', text: 'Please select a supplier first' });
      return;
    }
    if (selectedItemIds.length === 0) {
      setFeedbackMessage({ type: 'danger', text: 'Please select at least one defective item to dispatch' });
      return;
    }
    setDispatchNotes('');
    setDispatchModalError(null);
    setIsDispatchModalOpen(true);
  };

  const handleProcessDispatch = async () => {
    if (!selectedSupplierId) return;

    const payloadItems = selectedItemIds.map((claimId) => {
      const avail = availableItems.find((i) => i.customer_warranty_claim_id === claimId);
      const qty = dispatchQuantities[claimId] || avail?.available_quantity || 1;
      return {
        customer_warranty_claim_id: claimId,
        quantity: qty,
      };
    });

    setIsSubmittingDispatch(true);
    setDispatchModalError(null);
    try {
      const payload: SupplierWarrantyClaimPayload = {
        supplier_id: Number(selectedSupplierId),
        items: payloadItems,
        notes: dispatchNotes.trim() || undefined,
      };

      const result = await warrantyService.processSupplierDispatch(payload);
      setFeedbackMessage({
        type: 'success',
        text: `Supplier Claim Batch ${result.claim_number} dispatched successfully!`,
      });

      setIsDispatchModalOpen(false);
      loadSupplierClaims();
      if (selectedSupplierId) {
        loadAvailableItems(Number(selectedSupplierId));
      }

      setActiveSlipClaim(result);
      setIsSlipModalOpen(true);
    } catch (error: any) {
      console.error('Error processing supplier dispatch:', error);
      const errMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to dispatch to supplier';
      setDispatchModalError(errMsg);
    } finally {
      setIsSubmittingDispatch(false);
    }
  };
  const selectedItemsList = availableItems.filter((i) =>
    selectedItemIds.includes(i.customer_warranty_claim_id)
  );
  const totalSelectedUnits = selectedItemsList.reduce(
    (sum, item) => sum + (dispatchQuantities[item.customer_warranty_claim_id] || item.available_quantity),
    0
  );
  const totalSelectedValuation = selectedItemsList.reduce(
    (sum, item) => {
      const qty = dispatchQuantities[item.customer_warranty_claim_id] || item.available_quantity;
      const unitCost = Number(item.unit_cost) || 0;
      return sum + qty * unitCost;
    },
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: feedbackMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${feedbackMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
            borderRadius: '0.5rem',
            color: feedbackMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {feedbackMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* 1. SUPPLIER RMA DISPATCH CREATION */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Truck size={15} color="var(--primary-500)" />
              Dispatch Defective Items to Supplier (RMA)
            </h3>
          </div>

          <div style={{ minWidth: '260px' }}>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : '')}
              style={{
                width: '100%',
                padding: '0.35rem 0.6rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.78125rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="">-- Choose Supplier to Process RMA --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name ? `${s.company_name} (${s.name})` : s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Held Items for Selected Supplier */}
        {selectedSupplierId ? (
          <div>
            {isLoadingAvailable ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading held defective stock for supplier...
              </div>
            ) : availableItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-app)', borderRadius: '0.5rem', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)' }}>
                <Package size={28} style={{ margin: '0 auto 0.5rem', color: 'var(--text-muted)' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No Defective Items Held for this Supplier</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>All customer returned units have already been dispatched or none exist.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <span>Held Items Available: <strong style={{ color: 'var(--text-main)' }}>{availableItems.length}</strong></span>
                    <span style={{ margin: '0 0.5rem' }}>|</span>
                    <span>Selected: <strong style={{ color: 'var(--primary-400)' }}>{selectedItemIds.length}</strong> ({totalSelectedUnits} units, Rs. {formatMoney(totalSelectedValuation)})</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" onClick={toggleSelectAll}>
                      {selectedItemIds.length === availableItems.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      variant="primary"
                      disabled={selectedItemIds.length === 0}
                      onClick={handleOpenDispatchModal}
                      icon={<Truck size={14} />}
                    >
                      Dispatch Selected ({totalSelectedUnits} Units)
                    </Button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-medium)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.625rem 0.75rem', width: '40px' }}>Select</th>
                        <th style={{ padding: '0.625rem 0.75rem' }}>Claim #</th>
                        <th style={{ padding: '0.625rem 0.75rem' }}>Invoice #</th>
                        <th style={{ padding: '0.625rem 0.75rem' }}>Defective Item</th>
                        <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>Available Qty</th>
                        <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Unit Cost</th>
                        <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Total Valuation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableItems.map((item) => {
                        const isSelected = selectedItemIds.includes(item.customer_warranty_claim_id);
                        return (
                          <tr
                            key={item.customer_warranty_claim_id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '0.625rem 0.75rem' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(item.customer_warranty_claim_id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-400)' }}>
                              {item.claim_number}
                            </td>
                            <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{item.invoice_number}</td>
                            <td style={{ padding: '0.625rem 0.75rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.product_name}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.product_sku}</div>
                            </td>
                            <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>{item.available_quantity}</td>
                            <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Rs. {formatMoney(item.unit_cost)}</td>
                            <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                              Rs. {formatMoney((Number(item.unit_cost) || 0) * item.available_quantity)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-app)', borderRadius: '0.5rem', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)' }}>
            Select a supplier from the dropdown above to view held warranty items and prepare an RMA dispatch.
          </div>
        )}
      </Card>

      {/* 2. SUPPLIER RMA DISPATCH HISTORY */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>RMA Dispatch History</h3>
          <Button variant="secondary" onClick={loadSupplierClaims} loading={isLoadingClaims} icon={<RefreshCw size={13} />} style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search batch #, supplier..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            style={{ flex: 1, minWidth: '180px', maxWidth: '300px', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
          />
          <select
            value={historyStatusFilter}
            onChange={(e) => setHistoryStatusFilter(e.target.value)}
            style={{ padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WARRANTY_COMPLETED">Completed</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Batch #</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Dispatch Date</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Supplier</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Items</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Valuation</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingClaims ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading batches...</td></tr>
              ) : supplierClaims
                  .filter((c) => {
                    const q = historySearch.toLowerCase();
                    const matchSearch = !q || c.claim_number.toLowerCase().includes(q) || c.supplier_name.toLowerCase().includes(q) || (c.supplier_company || '').toLowerCase().includes(q);
                    const matchStatus = !historyStatusFilter || c.status === historyStatusFilter;
                    return matchSearch && matchStatus;
                  }).length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No supplier RMA batches recorded.</td></tr>
              ) : (
                supplierClaims
                  .filter((c) => {
                    const q = historySearch.toLowerCase();
                    const matchSearch = !q || c.claim_number.toLowerCase().includes(q) || c.supplier_name.toLowerCase().includes(q) || (c.supplier_company || '').toLowerCase().includes(q);
                    const matchStatus = !historyStatusFilter || c.status === historyStatusFilter;
                    return matchSearch && matchStatus;
                  })
                  .map((claim) => (
                    <tr key={claim.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)' }}>{claim.claim_number}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{claim.date}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{claim.supplier_company || claim.supplier_name}</div>
                        {claim.supplier_company && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{claim.supplier_name}</div>}
                      </td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>{claim.total_quantity}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>Rs. {formatMoney(claim.total_valuation)}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                        {claim.status === 'IN_PROGRESS' ? <Badge variant="warning">In Progress</Badge> : claim.status === 'WARRANTY_COMPLETED' ? <Badge variant="success">Completed</Badge> : <Badge variant="danger">Cancelled</Badge>}
                      </td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <Button
                            variant="secondary"
                            onClick={() => { setActiveSlipClaim(claim); setIsSlipModalOpen(true); }}
                            icon={<Printer size={13} />}
                            title="Print RMA Dispatch Slip"
                            style={{ padding: '0.25rem 0.45rem' }}
                          />
                          {claim.status === 'IN_PROGRESS' && (
                            <Button
                              variant="primary"
                              onClick={() => setCompletingClaimId(claim.id)}
                              icon={<CheckCircle size={13} />}
                              title="Mark Replacement Received"
                              style={{ padding: '0.25rem 0.45rem' }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. DISPATCH CONFIRMATION MODAL */}


      {isDispatchModalOpen && (
        <Modal
          isOpen={isDispatchModalOpen}
          onClose={() => setIsDispatchModalOpen(false)}
          title="Confirm Supplier RMA Dispatch"
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Batch Summary for Supplier</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <strong>Total Items:</strong> {selectedItemIds.length} | <strong>Total Units:</strong> {totalSelectedUnits} | <strong>Total Valuation:</strong> Rs. {formatMoney(totalSelectedValuation)}
              </div>
            </div>

            {dispatchModalError && (
              <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '0.375rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={15} />
                <span>{dispatchModalError}</span>
              </div>
            )}

            {/* Quantity breakdown */}
            <div style={{ border: '1px solid var(--border-medium)', borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <tr>
                    <th style={{ padding: '0.5rem' }}>Product</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Available</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>Dispatch Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItemsList.map((item) => (
                    <tr key={item.customer_warranty_claim_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.product_name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{item.claim_number}</div>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{item.available_quantity}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <input
                          type="number"
                          min={1}
                          max={item.available_quantity}
                          value={dispatchQuantities[item.customer_warranty_claim_id] || item.available_quantity}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(item.available_quantity, Number(e.target.value)));
                            setDispatchQuantities((prev) => ({
                              ...prev,
                              [item.customer_warranty_claim_id]: val,
                            }));
                          }}
                          style={{
                            width: '70px',
                            padding: '0.25rem 0.5rem',
                            textAlign: 'center',
                            fontWeight: 700,
                            backgroundColor: 'var(--bg-app)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '0.25rem',
                            color: 'var(--text-main)',
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Dispatch Notes / RMA Courier Tracking
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Dispatched via courier / vendor rep handed over..."
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setIsDispatchModalOpen(false)} disabled={isSubmittingDispatch}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleProcessDispatch} loading={isSubmittingDispatch} icon={<Truck size={14} />}>
                Confirm Dispatch (IN_PROGRESS)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. MARK REPLACEMENT RECEIVED MODAL */}
      {completingClaimId && (
        <Modal
          isOpen={Boolean(completingClaimId)}
          onClose={() => setCompletingClaimId(null)}
          title="Confirm Supplier Replacement Receipt"
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
              <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Confirm Replacement Stock Received from Supplier</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This action will automatically:<br />
                • Restock replacement units into active inventory.<br />
                • Create GL Journal Entry: <strong>DR 1040 Inventory Asset / CR 1070 Supplier Claim Asset</strong>.<br />
                • Mark this RMA batch as <strong>WARRANTY_COMPLETED</strong>.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setCompletingClaimId(null)} disabled={isCompletingReceipt}>Cancel</Button>
              <Button variant="primary" onClick={() => handleCompleteReceipt(completingClaimId)} loading={isCompletingReceipt} icon={<CheckCircle size={14} />}>
                Confirm Replacement Received
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. PRINT SLIP MODAL */}
      <SupplierClaimSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        claim={activeSlipClaim}
      />
    </div>
  );
};
