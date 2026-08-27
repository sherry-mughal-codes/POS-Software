import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Zap,
  Unlock,
  AlertTriangle,
  DollarSign,
  ArrowLeft,
  Menu,
  Search,
  Scan,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { POSProductGrid } from './components/POSProductGrid';
import { POSCart } from './components/POSCart';
import { POSCheckoutModal } from './components/POSCheckoutModal';
import { POSReceiptModal } from './components/POSReceiptModal';
import { CustomerModal } from '../Customers/CustomerModal';
import { CartItem, Sale, PaymentMethodType } from '../../types/sales';
import { InventorySummaryItem } from '../../types/inventory';
import { Category } from '../../types/product';
import { Customer } from '../../types/contact';
import { POSDaySession } from '../../types/daySession';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';
import { contactService } from '../../services/contactService';
import { salesService } from '../../services/salesService';
import { daySessionService } from '../../services/daySessionService';
import { useSettings } from '../../context/SettingsContext';

interface POSTerminalPageProps {
  isSidebarCollapsed?: boolean;
  isSidebarVisible?: boolean;
  onToggleSidebar?: () => void;
}

export const POSTerminalPage: React.FC<POSTerminalPageProps> = ({
  isSidebarCollapsed = false,
  isSidebarVisible = false,
  onToggleSidebar,
}) => {
  const { currencySymbol } = useSettings();
  
  // Data state
  const [products, setProducts] = useState<InventorySummaryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeSession, setActiveSession] = useState<POSDaySession | null>(null);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [overallDiscountType, setOverallDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Open Day Modal State
  const [isOpenDayModalOpen, setIsOpenDayModalOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('0');
  const [openingNotesInput, setOpeningNotesInput] = useState('');
  const [openDaySubmitting, setOpenDaySubmitting] = useState(false);
  const [openDayError, setOpenDayError] = useState<string | null>(null);

  // Auto-focus search input on load and keyboard shortcut 'F2' or '/'
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleSearchShortcut = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    try {
      const [invList, catList, custList, sessionRes] = await Promise.all([
        inventoryService.getSummary(),
        productService.getCategories(),
        contactService.getCustomers({ is_active: true }),
        daySessionService.getCurrentSession().catch(() => ({ active: false })),
      ]);
      const activeCustomers = (custList || []).filter((c) => c.is_active || c.is_walkin);
      setProducts(invList || []);
      setCategories(catList || []);
      setCustomers(activeCustomers);
      setActiveSession((sessionRes as any)?.active ? (sessionRes as any).session : null);

      // Default to walk-in customer
      const walkin = activeCustomers.find((c) => c.is_walkin) || activeCustomers[0];
      if (walkin && (selectedCustomerId === 0 || !activeCustomers.some((c) => c.id === selectedCustomerId))) {
        setSelectedCustomerId(walkin.id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    fetchCatalogData();
  }, [fetchCatalogData]);

  // Open Day Handler
  const handleOpenDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpenDaySubmitting(true);
    setOpenDayError(null);
    try {
      const res = await daySessionService.openDay({
        opening_cash: parseFloat(openingCashInput) || 0,
        opening_notes: openingNotesInput,
      });
      setActiveSession(res);
      setIsOpenDayModalOpen(false);
      setOpeningCashInput('0');
      setOpeningNotesInput('');
    } catch (err: any) {
      setOpenDayError(err?.response?.data?.detail || err?.message || 'Failed to open day session.');
    } finally {
      setOpenDaySubmitting(false);
    }
  };

  // Handle barcode scanner Enter press in header
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      // Match exact barcode or SKU first
      const exactMatch = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === term) ||
          p.sku.toLowerCase() === term
      );
      if (exactMatch) {
        handleAddToCart(exactMatch);
        setSearchTerm('');
      } else {
        // Match first product starting with search term
        const partialMatch = products.find(
          (p) =>
            p.product_name.toLowerCase().includes(term) ||
            p.sku.toLowerCase().includes(term) ||
            (p.barcode && p.barcode.toLowerCase().includes(term))
        );
        if (partialMatch) {
          handleAddToCart(partialMatch);
          setSearchTerm('');
        }
      }
    }
  };

  // Global F9 & Ctrl+Enter keyboard shortcut to trigger checkout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isF9 = e.key === 'F9' || e.code === 'F9' || e.keyCode === 120;
      const isCtrlEnter = (e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'Enter');

      if (isF9 || isCtrlEnter) {
        e.preventDefault();
        e.stopPropagation();

        if (isReceiptOpen) return;

        if (!activeSession) {
          setOpenDayError('Please open the business day session before processing sales.');
          setIsOpenDayModalOpen(true);
          return;
        }

        if (cart.length === 0) {
          searchInputRef.current?.focus();
          return;
        }

        if (!isCheckoutOpen) {
          setIsCheckoutOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [cart.length, isCheckoutOpen, isReceiptOpen, activeSession]);

  // Cart handlers
  const handleAddToCart = (prod: InventorySummaryItem) => {
    if (!activeSession) {
      setOpenDayError('Please open the business day session before adding products and processing sales.');
      setIsOpenDayModalOpen(true);
      return;
    }

    const isStockFree = prod.maintain_stock === false || prod.stock_status === 'STOCK_FREE';
    const isService = isStockFree || (prod.category_name && prod.category_name.toLowerCase().includes('service'));
    if (!isStockFree && prod.current_stock <= 0) return;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product_id === prod.product_id);
      if (existingIndex > -1) {
        const existing = prevCart[existingIndex];
        const newQty = isStockFree ? existing.quantity + 1 : Math.min(existing.quantity + 1, prod.current_stock);
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: (newQty * existing.unit_price) - existing.discount,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          product_id: prod.product_id,
          name: prod.product_name,
          sku: prod.sku,
          barcode: prod.barcode,
          unit_name: prod.unit_name,
          unit_abbr: prod.unit_abbr,
          unit_price: prod.selling_price,
          available_stock: isStockFree ? 999999 : prod.current_stock,
          quantity: 1,
          discount: 0,
          subtotal: prod.selling_price,
          maintain_stock: prod.maintain_stock,
          is_service: Boolean(isService),
        };
        return [...prevCart, newItem];
      }
    });
  };

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product_id === productId) {
          const clampedQty = Math.min(newQty, item.available_stock);
          return {
            ...item,
            quantity: clampedQty,
            subtotal: (clampedQty * item.unit_price) - item.discount,
          };
        }
        return item;
      })
    );
  };

  const handleUpdateUnitPrice = (productId: number, newUnitPrice: number) => {
    const price = Math.max(0, newUnitPrice);
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product_id === productId) {
          return {
            ...item,
            unit_price: price,
            subtotal: Math.max(0, (item.quantity * price) - item.discount),
          };
        }
        return item;
      })
    );
  };

  const handleUpdateLineDiscount = (productId: number, discount: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product_id === productId) {
          const d = Math.max(0, discount);
          return {
            ...item,
            discount: d,
            subtotal: Math.max(0, (item.quantity * item.unit_price) - d),
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product_id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setOverallDiscountValue(0);
  };

  const handleCustomerCreated = async (newCustomer?: Customer) => {
    try {
      const custList = await contactService.getCustomers({ is_active: true });
      const activeCustomers = (custList || []).filter((c) => c.is_active || c.is_walkin);
      setCustomers(activeCustomers);
      if (newCustomer) {
        setSelectedCustomerId(newCustomer.id);
      } else if (activeCustomers && activeCustomers.length > 0) {
        const latest = activeCustomers[activeCustomers.length - 1];
        if (latest) setSelectedCustomerId(latest.id);
      }
    } catch {
      // ignore
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const overallDiscountAmount = overallDiscountType === 'PERCENT'
    ? Math.round((subtotal * (overallDiscountValue / 100)) * 100) / 100
    : Math.min(subtotal, Math.max(0, overallDiscountValue));
  const grandTotal = Math.max(0, subtotal - overallDiscountAmount);

  // Complete checkout
  const handleConfirmCheckout = async (
    payload: {
      payment_method: PaymentMethodType;
      payment_account?: number;
      paid_amount: number;
      payments_breakdown?: { payment_method: PaymentMethodType; payment_account?: number; amount: number }[];
      notes?: string;
    },
    autoPrint: boolean = true
  ) => {
    setCheckoutLoading(true);
    try {
      const sale = await salesService.checkout({
        customer: selectedCustomerId,
        items: cart.map((c) => ({
          product: c.product_id,
          quantity: c.quantity,
          unit_price: c.unit_price,
          discount: c.discount,
        })),
        payment_method: payload.payment_method,
        payment_account: payload.payment_account,
        discount_amount: overallDiscountAmount,
        paid_amount: payload.paid_amount,
        payments_breakdown: payload.payments_breakdown,
        notes: payload.notes,
      });

      setCompletedSale(sale);
      setIsCheckoutOpen(false);
      handleClearCart();
      if (autoPrint) {
        setIsReceiptOpen(true);
      }
      // Refresh inventory stocks
      fetchCatalogData();
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.4rem', overflow: 'hidden' }}>
      {/* Top POS Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', flex: 1 }}>
          {onToggleSidebar && (
            <Button
              variant="outline"
              icon={isSidebarVisible ? <ArrowLeft size={13} /> : <Menu size={13} />}
              onClick={onToggleSidebar}
              style={{
                padding: '0.2rem 0.55rem',
                fontSize: '0.71875rem',
                fontWeight: 700,
                backgroundColor: isSidebarVisible ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                border: isSidebarVisible ? '1px solid var(--primary-400)' : '1px solid var(--border-medium)',
                color: isSidebarVisible ? 'var(--primary-400)' : 'var(--text-main)',
              }}
              title={isSidebarVisible ? 'Hide Sidebar (Full-Screen Register Mode)' : 'Show Navigation Sidebar'}
            >
              {isSidebarVisible ? 'Hide' : 'Menu'}
            </Button>
          )}
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0, whiteSpace: 'nowrap' }}>
            POS Register
          </h2>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Connecting...</span>
            </div>
          ) : activeSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
              <span style={{ width: '0.4rem', height: '0.4rem', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>Day Open:</span>
              <code style={{ color: 'var(--text-main)', fontWeight: 800 }}>{activeSession.session_number}</code>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem' }}>
                <span style={{ width: '0.4rem', height: '0.4rem', borderRadius: '50%', backgroundColor: 'var(--danger)', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>Day Closed</span>
              </div>
              <Button
                variant="primary"
                icon={<Unlock size={12} />}
                onClick={() => {
                  setOpenDayError(null);
                  setIsOpenDayModalOpen(true);
                }}
                style={{
                  backgroundColor: '#ef4444',
                  borderColor: '#dc2626',
                  fontSize: '0.6875rem',
                  padding: '0.2rem 0.45rem',
                }}
              >
                Open Day
              </Button>
            </div>
          )}

          {/* Barcode Scanner & Search Bar placed in Top Navbar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '420px', marginLeft: '0.25rem' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode or search product / SKU... (F2)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: '100%',
                padding: '0.3rem 1.8rem 0.3rem 2rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.45rem',
                color: 'var(--text-main)',
                fontSize: '0.78125rem',
                fontWeight: 500,
                outline: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '0.45rem',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                color: 'var(--text-subtle)',
                fontSize: '0.625rem',
              }}
            >
              <Scan size={12} />
              <kbd style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '0.05rem 0.2rem', borderRadius: '0.2rem', border: '1px solid var(--border-subtle)', fontSize: '0.6rem' }}>F2</kbd>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            <Zap size={12} style={{ color: 'var(--warning)' }} />
            <span>Fast Pay (F9)</span>
          </div>
          <Button variant="outline" icon={<RefreshCw size={11} />} onClick={fetchCatalogData} style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem' }}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Split Screen: Products Grid (Left) | Cart (Right 340px) */}
      {loading && products.length === 0 ? (
        <LoadingSpinner label="Loading POS Product Catalog..." />
      ) : (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '0.625rem',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {/* Left Side: Product Catalog Grid */}
          <div style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <POSProductGrid
              products={products}
              categories={categories}
              onAddToCart={handleAddToCart}
              searchTerm={searchTerm}
              isSidebarCollapsed={isSidebarCollapsed}
            />
          </div>

          {/* Right Side: Cart */}
          <div style={{ overflow: 'hidden', height: '100%' }}>
            <POSCart
              cart={cart}
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={setSelectedCustomerId}
              onOpenNewCustomerModal={() => setIsCustomerModalOpen(true)}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateUnitPrice={handleUpdateUnitPrice}
              onUpdateLineDiscount={handleUpdateLineDiscount}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              overallDiscountType={overallDiscountType}
              overallDiscountValue={overallDiscountValue}
              overallDiscountAmount={overallDiscountAmount}
              onUpdateOverallDiscountType={setOverallDiscountType}
              onUpdateOverallDiscountValue={setOverallDiscountValue}
              onOpenCheckout={() => setIsCheckoutOpen(true)}
              isDayOpen={!!activeSession}
              onOpenDay={() => {
                setOpenDayError(null);
                setIsOpenDayModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Open Day Modal */}
      <Modal
        isOpen={isOpenDayModalOpen}
        onClose={() => setIsOpenDayModalOpen(false)}
        title="Open Business Day / POS Session"
        maxWidth="500px"
      >
        <form onSubmit={handleOpenDaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {openDayError && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--danger)',
              borderRadius: '0.5rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertTriangle size={16} />
              <span>{openDayError}</span>
            </div>
          )}

          <Input
            label={`Opening Drawer Cash (${currencySymbol || 'Rs.'}) *`}
            type="number"
            step="0.01"
            min="0"
            value={openingCashInput}
            onChange={(e) => setOpeningCashInput(e.target.value)}
            placeholder="0.00"
            required
            helperText="Starting physical cash float in the cash drawer at day opening."
            icon={<DollarSign size={14} />}
          />

          <Input
            label="Opening Notes / Shift Details (Optional)"
            placeholder="e.g. Morning Shift - Cash float verified"
            value={openingNotesInput}
            onChange={(e) => setOpeningNotesInput(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsOpenDayModalOpen(false)} disabled={openDaySubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Unlock size={16} />} loading={openDaySubmitting}>
              Open Day Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSaved={handleCustomerCreated}
      />

      {/* Checkout Modal */}
      {selectedCustomer && (
        <POSCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          grandTotal={grandTotal}
          customer={selectedCustomer}
          onConfirmCheckout={handleConfirmCheckout}
          loading={checkoutLoading}
        />
      )}

      {/* Receipt Modal */}
      <POSReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
      />
    </div>
  );
};
