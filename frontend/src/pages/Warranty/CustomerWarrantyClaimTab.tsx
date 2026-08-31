import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Printer,
} from 'lucide-react';
import {
  CustomerWarrantyClaim,
  WarrantyEligibleSale,
  WarrantyEligibleSaleItem,
  CustomerWarrantyClaimPayload,
} from '../../types/warranty';
import { Product } from '../../types/product';
import { Supplier } from '../../types/contact';
import { warrantyService } from '../../services/warrantyService';
import { productService } from '../../services/productService';
import { contactService } from '../../services/contactService';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { CustomerClaimSlipModal } from './CustomerClaimSlipModal';


export const CustomerWarrantyClaimTab: React.FC = () => {
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedSales, setSearchedSales] = useState<WarrantyEligibleSale[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Suppliers & Products for claim processing
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<WarrantyEligibleSale | null>(null);
  const [selectedItem, setSelectedItem] = useState<WarrantyEligibleSaleItem | null>(null);
  const [claimQuantity, setClaimQuantity] = useState<number>(1);
  const [selectedReplacementProductId, setSelectedReplacementProductId] = useState<number | ''>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [claimNotes, setClaimNotes] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimModalError, setClaimModalError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Print Slip Modal State
  const [activeSlipClaim, setActiveSlipClaim] = useState<CustomerWarrantyClaim | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Claims History State
  const [customerClaims, setCustomerClaims] = useState<CustomerWarrantyClaim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');

  // Load Initial Data
  useEffect(() => {
    loadSuppliersAndProducts();
    loadCustomerClaims();
  }, []);

  // Real-time search with debounce (400ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchedSales([]);
      setHasSearched(false);
      setSearchError(null);
      return;
    }
    const timer = setTimeout(() => {
      handleSearchSales();
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadSuppliersAndProducts = async () => {
    try {
      const [suppData, prodData] = await Promise.all([
        contactService.getSuppliers({ is_active: true }),
        productService.getProducts({ is_active: true }),
      ]);
      setSuppliers(suppData);
      setAllProducts(prodData);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const loadCustomerClaims = async () => {
    setIsLoadingClaims(true);
    try {
      const data = await warrantyService.getCustomerClaims();
      setCustomerClaims(data);
    } catch (err) {
      console.error('Failed to load customer claims:', err);
    } finally {
      setIsLoadingClaims(false);
    }
  };

  const handleSearchSales = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchError('Please enter an Invoice Number or Customer Name/Phone');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSearchError(null);
    try {
      const results = await warrantyService.searchSales(searchQuery.trim());
      setSearchedSales(results);
      if (results.length === 0) {
        setSearchError('No matching sales invoices found with warranty eligibility');
      }
    } catch (error: any) {
      console.error('Error searching sales:', error);
      setSearchError('Error searching sales records');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenClaimModal = (sale: WarrantyEligibleSale, item: WarrantyEligibleSaleItem) => {
    setSelectedSale(sale);
    setSelectedItem(item);
    setClaimQuantity(1);
    setSelectedReplacementProductId(item.product_id);
    setSelectedSupplierId(item.suggested_supplier ? item.suggested_supplier.id : '');
    setClaimNotes('');
    setClaimModalError(null);
    setIsClaimModalOpen(true);
  };

  const handleProcessClaim = async () => {
    if (!selectedSale || !selectedItem) return;
    if (!selectedReplacementProductId) {
      setClaimModalError('Please select a replacement product');
      return;
    }
    if (!selectedSupplierId) {
      setClaimModalError('Please select an authoritative warranty supplier');
      return;
    }
    if (claimQuantity <= 0 || claimQuantity > selectedItem.remaining_claimable_quantity) {
      setClaimModalError(`Claim quantity must be between 1 and ${selectedItem.remaining_claimable_quantity}`);
      return;
    }

    const replacementProd = allProducts.find((p) => p.id === Number(selectedReplacementProductId));
    if (replacementProd && replacementProd.maintain_stock && (replacementProd.current_stock || 0) < claimQuantity) {
      setClaimModalError(`Insufficient on-hand stock for replacement product (${replacementProd.current_stock || 0} available)`);
      return;
    }

    setIsSubmittingClaim(true);
    setClaimModalError(null);
    try {
      const payload: CustomerWarrantyClaimPayload = {
        sale_id: selectedSale.id,
        sale_item_id: selectedItem.id,
        replacement_product_id: Number(selectedReplacementProductId),
        quantity: claimQuantity,
        supplier_id: Number(selectedSupplierId),
        notes: claimNotes.trim() || undefined,
      };

      const resultClaim = await warrantyService.createCustomerClaim(payload);
      setFeedbackMessage({
        type: 'success',
        text: `Warranty Replacement Claim ${resultClaim.claim_number} completed successfully!`,
      });

      setIsClaimModalOpen(false);
      loadSuppliersAndProducts();
      loadCustomerClaims();

      if (searchQuery) {
        handleSearchSales();
      }

      setActiveSlipClaim(resultClaim);
      setIsSlipModalOpen(true);
    } catch (error: any) {
      console.error('Claim processing failed:', error);
      setClaimModalError(error?.response?.data?.detail || error?.message || 'Failed to process warranty claim.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active Warranty</Badge>;
      case 'EXPIRED':
        return <Badge variant="danger">Expired</Badge>;
      case 'ALREADY_CLAIMED':
        return <Badge variant="info">Fully Claimed</Badge>;
      case 'NO_WARRANTY':
        return <Badge variant="warning">No Warranty</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const selectedReplacementProduct = allProducts.find(
    (p) => p.id === Number(selectedReplacementProductId)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Toast / Global Feedback Message */}
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
            {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
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

      {/* 1. SEARCH & LOOKUP SECTION */}
      <Card>
        <form onSubmit={handleSearchSales} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Invoice #, Customer Name, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2rem',
                paddingRight: '0.75rem',
                paddingTop: '0.35rem',
                paddingBottom: '0.35rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.78125rem',
              }}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={isSearching}
            icon={<Search size={13} />}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
          >
            Search
          </Button>
        </form>

        {searchError && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.78125rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={13} />
            <span>{searchError}</span>
          </div>
        )}

        {/* Search Results Display */}
        {hasSearched && searchedSales.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Eligible Invoices ({searchedSales.length} Found)
            </h3>

            {searchedSales.map((sale) => (
              <div
                key={sale.id}
                style={{
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.625rem',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-app)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', marginRight: '0.75rem' }}>
                      {sale.invoice_number}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Date: {new Date(sale.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                    Customer: <strong>{sale.customer_name}</strong> {sale.customer_phone ? `(${sale.customer_phone})` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {sale.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-elevated)',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-subtle)',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>{item.product_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          SKU: {item.product_sku} | Sold: {item.quantity_sold} {item.unit_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Warranty: {item.warranty_period_days ? `${item.warranty_period_days} Days (Expires: ${item.warranty_expiry_date || 'N/A'})` : 'None'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Remaining Claimable: <strong style={{ color: item.remaining_claimable_quantity > 0 ? 'var(--success)' : 'var(--danger)' }}>{item.remaining_claimable_quantity}</strong>
                          </div>
                          <div style={{ marginTop: '0.2rem' }}>{getStatusBadge(item.warranty_status)}</div>
                        </div>

                        <Button
                          variant={item.is_eligible ? 'primary' : 'secondary'}
                          disabled={!item.is_eligible}
                          onClick={() => handleOpenClaimModal(sale, item)}
                          icon={<ShieldCheck size={15} />}
                          title={item.is_eligible ? 'Process Warranty Claim' : 'Ineligible for warranty'}
                          style={{ padding: '0.35rem 0.5rem' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 2. CUSTOMER WARRANTY CLAIMS HISTORY */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>Claims History</h3>
          <Button variant="secondary" onClick={loadCustomerClaims} loading={isLoadingClaims} icon={<RefreshCw size={13} />} style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: '200px', maxWidth: '340px', position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search claim #, customer, product..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '1.75rem', paddingRight: '0.5rem', padding: '0.35rem 0.5rem 0.35rem 1.75rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
            />
          </div>
          <select
            value={historyStatusFilter}
            onChange={(e) => setHistoryStatusFilter(e.target.value)}
            style={{ padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Claim #</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Customer</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Invoice #</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Defective Item</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Replacement Item</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingClaims ? (
                <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading claims...</td></tr>
              ) : customerClaims
                  .filter((c) => {
                    const q = historySearch.toLowerCase();
                    const matchSearch = !q || c.claim_number.toLowerCase().includes(q) || c.customer_name.toLowerCase().includes(q) || c.claimed_product_name.toLowerCase().includes(q) || c.sale_invoice_number.toLowerCase().includes(q);
                    const matchStatus = !historyStatusFilter || c.status === historyStatusFilter;
                    return matchSearch && matchStatus;
                  })
                  .length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No warranty claims found.</td></tr>
              ) : (
                customerClaims
                  .filter((c) => {
                    const q = historySearch.toLowerCase();
                    const matchSearch = !q || c.claim_number.toLowerCase().includes(q) || c.customer_name.toLowerCase().includes(q) || c.claimed_product_name.toLowerCase().includes(q) || c.sale_invoice_number.toLowerCase().includes(q);
                    const matchStatus = !historyStatusFilter || c.status === historyStatusFilter;
                    return matchSearch && matchStatus;
                  })
                  .map((claim) => (
                    <tr key={claim.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)' }}>{claim.claim_number}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{claim.claim_date}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{claim.customer_name}</div>
                        {claim.customer_phone && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{claim.customer_phone}</div>}
                      </td>
                      <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{claim.sale_invoice_number}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '0.75rem' }}>{claim.claimed_product_name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{claim.claimed_product_sku}</div>
                      </td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.75rem' }}>{claim.replacement_product_name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{claim.replacement_product_sku}</div>
                      </td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>{claim.quantity}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>{getStatusBadge(claim.status)}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          onClick={() => { setActiveSlipClaim(claim); setIsSlipModalOpen(true); }}
                          icon={<Printer size={13} />}
                          title="Print Warranty Slip"
                          style={{ padding: '0.25rem 0.45rem' }}
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. PROCESS CLAIM MODAL */}
      {isClaimModalOpen && selectedSale && selectedItem && (
        <Modal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          title={`Process Customer Warranty Claim — ${selectedItem.product_name}`}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Summary Box */}
            <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-app)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Invoice Number:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedSale.invoice_number}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Customer:</span>
                <strong>{selectedSale.customer_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Defective Item:</span>
                <strong style={{ color: 'var(--danger)' }}>{selectedItem.product_name} ({selectedItem.product_sku})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Warranty Expiry:</span>
                <strong>{selectedItem.warranty_expiry_date || 'N/A'}</strong>
              </div>
            </div>

            {claimModalError && (
              <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '0.375rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={15} />
                <span>{claimModalError}</span>
              </div>
            )}

            {/* Input: Quantity */}
            <Input
              label={`Claim Quantity (Max: ${selectedItem.remaining_claimable_quantity}) *`}
              type="number"
              min="1"
              max={selectedItem.remaining_claimable_quantity}
              value={claimQuantity}
              onChange={(e) => setClaimQuantity(parseInt(e.target.value, 10) || 1)}
              required
            />

            {/* Select: Replacement Product */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Replacement Product To Issue *
              </label>
              <select
                value={selectedReplacementProductId}
                onChange={(e) => setSelectedReplacementProductId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              >
                <option value="">-- Select Replacement Product --</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Stock: {p.current_stock || 0}
                  </option>
                ))}
              </select>
              {selectedReplacementProduct && (
                <div style={{ fontSize: '0.75rem', color: (selectedReplacementProduct.current_stock || 0) < claimQuantity ? 'var(--danger)' : 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Available On-Hand Stock: {selectedReplacementProduct.current_stock || 0} units
                </div>
              )}
            </div>

            {/* Select: Supplier */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Authoritative Supplier for Defective Unit *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name ? `${s.company_name} (${s.name})` : s.name}
                  </option>
                ))}
              </select>
              {selectedItem.suggested_supplier && (
                <div style={{ fontSize: '0.75rem', color: 'var(--primary-400)', marginTop: '0.25rem' }}>
                  Suggested from purchase history: {selectedItem.suggested_supplier.name}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Defect Reason / Notes
              </label>
              <textarea
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                placeholder="Describe fault, customer issue, serial number, etc."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setIsClaimModalOpen(false)} disabled={isSubmittingClaim}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleProcessClaim} loading={isSubmittingClaim} icon={<ShieldCheck size={16} />}>
                Confirm & Issue Replacement
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. PRINT SLIP MODAL */}
      <CustomerClaimSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        claim={activeSlipClaim}
      />
    </div>
  );
};
