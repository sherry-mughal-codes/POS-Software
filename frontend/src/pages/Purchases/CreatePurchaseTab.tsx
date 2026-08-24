import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Save, Send, AlertCircle, Upload, FileText, X, Search, ChevronDown } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Supplier } from '../../types/contact';
import { Product } from '../../types/product';
import { PaymentMethod, Account } from '../../types/accounting';
import { Purchase } from '../../types/purchase';
import { contactService } from '../../services/contactService';
import { productService } from '../../services/productService';
import { accountingService } from '../../services/accountingService';
import { purchaseService } from '../../services/purchaseService';

interface LineItemRow {
  productId: number;
  productName: string;
  sku: string;
  unitCode: string;
  quantity: number;
  purchaseRate: number;
  taxRate: number;
}

interface CreatePurchaseTabProps {
  onSuccess: () => void;
  editingPurchase?: Purchase | null;
  onCancelEdit?: () => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const CreatePurchaseTab: React.FC<CreatePurchaseTabProps> = ({
  onSuccess,
  editingPurchase,
  onCancelEdit,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierSearchText, setSupplierSearchText] = useState<string>('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Product Picker State
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [productSearchText, setProductSearchText] = useState<string>('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('');
  const [supplierInvoiceFile, setSupplierInvoiceFile] = useState<string | null>(null);
  const [supplierInvoiceFileName, setSupplierInvoiceFileName] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSupplierInvoiceFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSupplierInvoiceFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      contactService.getSuppliers({ is_active: true }),
      productService.getProducts({ is_active: true }),
      accountingService.getPaymentMethods(),
      accountingService.getAccounts(),
    ]).then(([supps, prods, pms, accs]) => {
      setSuppliers(supps || []);
      setProducts(prods || []);
      setPaymentMethods(pms || []);
      const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
      const leafCashBankAccounts = (accs || []).filter(
        (a: Account) => a.account_type === 'ASSET' && isLeaf(a) && (a.code.startsWith('101') || a.code.startsWith('102') || a.parent_code === '1010' || a.parent_code === '1020')
      );
      setAccounts(leafCashBankAccounts);
      if (!editingPurchase) {
        // Leave selectedSupplierId blank by default so user can search & pick
        const cashPm = (pms || []).find((p) => (p.code || '').toUpperCase() === 'CASH') || (pms || [])[0];
        if (cashPm) {
          setSelectedPaymentMethodId(cashPm.id.toString());
          const cashAccounts = leafCashBankAccounts.filter((a) => a.code.startsWith('101') || a.parent_code === '1010');
          if (cashAccounts.length > 0) {
            setSelectedAccountId(cashAccounts[0].id.toString());
          }
        }
      }
    }).catch((err) => {
      setError(err?.message || 'Failed to load suppliers and products.');
    });
  }, [editingPurchase]);

  // Pre-fill fields when editing a draft purchase order
  useEffect(() => {
    if (editingPurchase) {
      setSelectedSupplierId(editingPurchase.supplier.toString());
      setPurchaseDate(editingPurchase.date);
      setSupplierInvoiceNumber(editingPurchase.supplier_invoice_number || '');
      setSupplierInvoiceFile(editingPurchase.supplier_invoice_file || null);
      setDiscountAmount(Number(editingPurchase.discount_amount) || 0);
      setPaidAmount(Number(editingPurchase.paid_amount) || 0);
      setNotes(editingPurchase.notes || '');
      if (editingPurchase.supplier_name) {
        setSupplierSearchText(editingPurchase.supplier_name);
      }
      if (editingPurchase.payment_method) {
        setSelectedPaymentMethodId(editingPurchase.payment_method.toString());
      }
      if (editingPurchase.payment_account) {
        setSelectedAccountId(editingPurchase.payment_account.toString());
      }
      if (editingPurchase.items && editingPurchase.items.length > 0) {
        setLineItems(
          editingPurchase.items.map((item) => ({
            productId: item.product,
            productName: item.product_name,
            sku: item.product_sku,
            unitCode: 'pcs',
            quantity: item.quantity,
            purchaseRate: Number(item.purchase_rate) || 0,
            taxRate: 0,
          }))
        );
      }
    }
  }, [editingPurchase]);

  // Filtered suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchText.trim()) return suppliers;
    const q = supplierSearchText.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.company_name && s.company_name.toLowerCase().includes(q)) ||
        s.supplier_id.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearchText]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id.toString() === selectedSupplierId);
  }, [suppliers, selectedSupplierId]);

  // Filtered products based on search query
  const filteredProducts = useMemo(() => {
    if (!productSearchText.trim()) return products;
    const q = productSearchText.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  }, [products, productSearchText]);

  // Restrict payment methods to Cash and Card
  const purchasePaymentMethods = useMemo(() => {
    const cash = paymentMethods.find((pm) => (pm.code || '').toUpperCase() === 'CASH');
    const card = paymentMethods.find((pm) => {
      const c = (pm.code || '').toUpperCase();
      return c === 'CARD' || c === 'BANK';
    });

    const result: PaymentMethod[] = [];
    if (cash) result.push(cash);
    if (card) result.push(card);

    return result.length > 0 ? result : paymentMethods;
  }, [paymentMethods]);

  // Dynamic filter for accounts: Cash -> all cash accounts (1010s), Card -> all bank accounts (1020s)
  const filteredAccounts = useMemo(() => {
    const selectedPM = paymentMethods.find((pm) => pm.id.toString() === selectedPaymentMethodId);
    if (!selectedPM) {
      return accounts.filter((a) => a.code.startsWith('101') || a.parent_code === '1010');
    }

    const pmCode = (selectedPM.code || '').toUpperCase();
    const isCash = pmCode === 'CASH' || selectedPM.account_code?.startsWith('101');

    if (isCash) {
      return accounts.filter((a) => a.code.startsWith('101') || a.parent_code === '1010');
    } else {
      // Card / Bank -> All bank & card accounts (1020s)
      return accounts.filter((a) => a.code.startsWith('102') || a.parent_code === '1020');
    }
  }, [selectedPaymentMethodId, paymentMethods, accounts]);

  // When payment method changes, auto-select appropriate first account in that group
  const handlePaymentMethodChange = (newPmId: string) => {
    setSelectedPaymentMethodId(newPmId);
    const pm = paymentMethods.find((p) => p.id.toString() === newPmId);
    if (pm) {
      const pmCode = (pm.code || '').toUpperCase();
      const isCash = pmCode === 'CASH' || pm.account_code?.startsWith('101');

      const matching = isCash
        ? accounts.filter((a) => a.code.startsWith('101') || a.parent_code === '1010')
        : accounts.filter((a) => a.code.startsWith('102') || a.parent_code === '1020');

      if (matching.length > 0) {
        setSelectedAccountId(matching[0].id.toString());
      }
    }
  };

  const addProductDirectly = (prod: Product) => {
    const existingIdx = lineItems.findIndex((item) => item.productId === prod.id);
    if (existingIdx >= 0) {
      const updated = [...lineItems];
      updated[existingIdx].quantity += 1;
      setLineItems(updated);
    } else {
      setLineItems([
        ...lineItems,
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unitCode: prod.unit_code || 'pcs',
          quantity: 1,
          purchaseRate: Number(prod.purchase_price) || 0,
          taxRate: 0,
        },
      ]);
    }
    setProductSearchText('');
    setSelectedProductToAdd('');
    setIsProductDropdownOpen(false);
  };

  const handleAddProduct = () => {
    if (!selectedProductToAdd && filteredProducts.length > 0) {
      addProductDirectly(filteredProducts[0]);
      return;
    }
    const prod = products.find((p) => p.id.toString() === selectedProductToAdd);
    if (prod) {
      addProductDirectly(prod);
    }
  };

  const handleRemoveLine = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, field: keyof LineItemRow, value: any) => {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = value;
    setLineItems(updated);
  };

  // Calculations (Tax / Shipping removed per request)
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.purchaseRate, 0);
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const remainingPayable = Math.max(0, grandTotal - paidAmount);

  const handlePayInFull = () => {
    setPaidAmount(grandTotal);
  };

  const handleFullCredit = () => {
    setPaidAmount(0);
  };

  const handleSubmit = async (submitImmediately: boolean) => {
    if (!selectedSupplierId) {
      setError('Please select a supplier.');
      return;
    }
    if (lineItems.length === 0) {
      setError('Please add at least one product line item.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      supplier: parseInt(selectedSupplierId),
      date: purchaseDate,
      discount_amount: discountAmount,
      tax_amount: 0,
      paid_amount: paidAmount,
      payment_method: selectedPaymentMethodId ? parseInt(selectedPaymentMethodId) : null,
      payment_account: selectedAccountId ? parseInt(selectedAccountId) : undefined,
      supplier_invoice_number: supplierInvoiceNumber.trim() || undefined,
      supplier_invoice_file: supplierInvoiceFile || undefined,
      notes,
      submit_immediately: submitImmediately,
      items: lineItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        purchase_rate: item.purchaseRate,
        tax_rate: 0,
      })),
    };

    try {
      if (editingPurchase) {
        await purchaseService.updatePurchase(editingPurchase.id, payload);
      } else {
        await purchaseService.createPurchase(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to process purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {editingPurchase && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.625rem 0.875rem',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '0.5rem',
          color: 'var(--primary-300)',
          fontSize: '0.8125rem',
        }}>
          <span>
            Editing Draft Purchase Order: <strong>{editingPurchase.purchase_number}</strong>
          </span>
          {onCancelEdit && (
            <Button
              variant="outline"
              icon={<X size={13} />}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              onClick={onCancelEdit}
            >
              Cancel Edit
            </Button>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: '0.5rem',
          color: 'var(--danger)',
          fontSize: '0.8125rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Info Card */}
      <Card title="Supplier & Order Details" style={{ overflow: 'visible', position: 'relative', zIndex: isSupplierDropdownOpen ? 60 : 5 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.625rem' }}>
          <div ref={supplierDropdownRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Supplier / Distributor *
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-input)',
                border: isSupplierDropdownOpen ? '1px solid var(--primary-500)' : '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.2rem 0.5rem',
                position: 'relative',
              }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)', marginRight: '0.4rem', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="-- Search or Select Supplier --"
                value={selectedSupplier ? `${selectedSupplier.company_name ? selectedSupplier.company_name + ' - ' : ''}${selectedSupplier.name} (${selectedSupplier.supplier_id})` : supplierSearchText}
                onChange={(e) => {
                  setSelectedSupplierId('');
                  setSupplierSearchText(e.target.value);
                  setIsSupplierDropdownOpen(true);
                }}
                onFocus={() => setIsSupplierDropdownOpen(true)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0',
                }}
              />
              {selectedSupplierId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSupplierId('');
                    setSupplierSearchText('');
                    setIsSupplierDropdownOpen(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.1rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Clear Supplier"
                >
                  <X size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.1rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronDown size={13} />
                </button>
              )}
            </div>

            {/* Dropdown Options List */}
            {isSupplierDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  marginTop: '0.25rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                }}
              >
                {filteredSuppliers.length === 0 ? (
                  <div style={{ padding: '0.625rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No suppliers found matching "{supplierSearchText}"
                  </div>
                ) : (
                  filteredSuppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplierId(s.id.toString());
                        setSupplierSearchText('');
                        setIsSupplierDropdownOpen(false);
                      }}
                      style={{
                        padding: '0.45rem 0.625rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: selectedSupplierId === s.id.toString() ? 'var(--primary-500-10, rgba(56, 189, 248, 0.1))' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = selectedSupplierId === s.id.toString() ? 'rgba(56, 189, 248, 0.1)' : 'transparent';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {s.company_name ? `${s.company_name} - ` : ''}{s.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          [{s.supplier_id}] {s.phone ? `• ${s.phone}` : ''}
                        </div>
                      </div>
                      {typeof s.outstanding_payable === 'number' && s.outstanding_payable > 0 && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontWeight: 600 }}>
                          Rs. {formatMoney(s.outstanding_payable)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.35rem 0.5rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.75rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Supplier Invoice / Bill #
            </label>
            <input
              type="text"
              placeholder="e.g. INV-889102"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.35rem 0.5rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.75rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Upload Bill / Receipt
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <Upload size={12} />
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
              {supplierInvoiceFileName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--primary-400)' }}>
                  <FileText size={12} />
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={supplierInvoiceFileName}>
                    {supplierInvoiceFileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSupplierInvoiceFile(null); setSupplierInvoiceFileName(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Internal Notes / Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Delivery received at central warehouse"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.35rem 0.5rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.75rem',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Line Items Card */}
      <Card title="Purchase Order Items" style={{ overflow: 'visible', position: 'relative', zIndex: isProductDropdownOpen ? 60 : 4 }}>
        {/* Product Picker Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div ref={productDropdownRef} style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Search & Add Product *
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-input)',
                border: isProductDropdownOpen ? '1px solid var(--primary-500)' : '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.2rem 0.5rem',
                position: 'relative',
              }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)', marginRight: '0.4rem', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="-- Search product by Name, SKU, Barcode --"
                value={productSearchText}
                onChange={(e) => {
                  setProductSearchText(e.target.value);
                  setIsProductDropdownOpen(true);
                }}
                onFocus={() => setIsProductDropdownOpen(true)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0',
                }}
              />
              {productSearchText ? (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearchText('');
                    setIsProductDropdownOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.1rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.1rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronDown size={13} />
                </button>
              )}
            </div>

            {/* Product Dropdown Popover */}
            {isProductDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  marginTop: '0.25rem',
                  maxHeight: '230px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                }}
              >
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: '0.625rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No products found matching "{productSearchText}"
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addProductDirectly(p)}
                      style={{
                        padding: '0.45rem 0.625rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>[{p.sku}]</span>
                          {p.barcode ? ` • Barcode: ${p.barcode}` : ''}
                          {p.category_name ? ` • ${p.category_name}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          Rs. {formatMoney(p.purchase_price)}
                        </span>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Stock: {p.current_stock ?? 0} {p.unit_code || 'pcs'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Button variant="primary" icon={<Plus size={13} />} onClick={handleAddProduct} style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
            Add Item
          </Button>
        </div>

        {/* Table of Line Items */}
        {lineItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '0.375rem', fontSize: '0.8125rem' }}>
            No products added yet. Search and select a product above to add to this purchase order.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                  <th style={{ padding: '0.45rem 0.6rem' }}>SKU</th>
                  <th style={{ padding: '0.45rem 0.6rem' }}>Product Name</th>
                  <th style={{ padding: '0.45rem 0.6rem', width: '110px' }}>Quantity</th>
                  <th style={{ padding: '0.45rem 0.6rem', width: '130px' }}>Rate (Rs.)</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>Total (Rs.)</th>
                  <th style={{ padding: '0.45rem 0.6rem', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={item.productId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', fontSize: '0.75rem' }}>{item.sku}</code>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                      {item.productName}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleUpdateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: '0.375rem',
                          padding: '0.25rem 0.4rem',
                          color: 'var(--text-main)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.purchaseRate}
                        onChange={(e) => handleUpdateLine(idx, 'purchaseRate', parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: '0.375rem',
                          padding: '0.25rem 0.4rem',
                          color: 'var(--text-main)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      Rs. {formatMoney(item.quantity * item.purchaseRate)}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveLine(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          opacity: 0.8,
                          padding: 0,
                        }}
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Totals & Payment Summary Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.875rem' }}>
        {/* Payment Configuration */}
        <Card title="Payment & Settlement">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Payment Method (Cash / Card)
              </label>
              <select
                value={selectedPaymentMethodId}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  padding: '0.35rem 0.5rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.75rem',
                }}
              >
                {purchasePaymentMethods.map((pm) => {
                  const code = (pm.code || '').toUpperCase();
                  const isCash = code === 'CASH';
                  return (
                    <option key={pm.id} value={pm.id}>
                      {isCash ? 'Cash Payment (Cash Accounts)' : 'Card / Bank Payment (Bank Accounts)'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* List of Accounts linked to the selected payment method */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Payment Account ({filteredAccounts.length} available)
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  padding: '0.35rem 0.5rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.75rem',
                }}
              >
                {filteredAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Paid Amount (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    padding: '0.35rem 0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    outline: 'none',
                  }}
                />
              </div>
              <Button variant="outline" style={{ fontSize: '0.6875rem', padding: '0.35rem 0.5rem' }} onClick={handlePayInFull}>
                Pay Full
              </Button>
              <Button variant="outline" style={{ fontSize: '0.6875rem', padding: '0.35rem 0.5rem' }} onClick={handleFullCredit}>
                100% Credit
              </Button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Discount (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  padding: '0.35rem 0.5rem',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </Card>

        {/* Order Summary */}
        <Card title="Order Summary">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <span>Line Items Subtotal:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--success)' }}>
                <span>Discount:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>- Rs. {formatMoney(discountAmount)}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '0.5rem 0',
              margin: '0.2rem 0',
            }}>
              <strong style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>Grand Total:</strong>
              <strong style={{ fontSize: '1.25rem', color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(grandTotal)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--success)' }}>
              <span>Paid at Purchase:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {formatMoney(paidAmount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: remainingPayable > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
              <span>Supplier Accounts Payable:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Rs. {formatMoney(remainingPayable)}</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button
                variant="outline"
                icon={<Save size={14} />}
                loading={submitting}
                style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => handleSubmit(false)}
              >
                {editingPurchase ? 'Update Draft' : 'Save Draft'}
              </Button>
              <Button
                variant="primary"
                icon={<Send size={14} />}
                loading={submitting}
                style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => handleSubmit(true)}
              >
                Submit & Restock
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
