import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { POSProductGrid } from './components/POSProductGrid';
import { POSCart } from './components/POSCart';
import { POSCheckoutModal } from './components/POSCheckoutModal';
import { POSReceiptModal } from './components/POSReceiptModal';
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

interface POSTerminalPageProps {
  isSidebarCollapsed?: boolean;
}

export const POSTerminalPage: React.FC<POSTerminalPageProps> = ({ isSidebarCollapsed = false }) => {
  const [products, setProducts] = useState<InventorySummaryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeSession, setActiveSession] = useState<POSDaySession | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    try {
      const [invList, catList, custList, sessionRes] = await Promise.all([
        inventoryService.getSummary(),
        productService.getCategories(),
        contactService.getCustomers(),
        daySessionService.getCurrentSession().catch(() => ({ active: false })),
      ]);
      setProducts(invList || []);
      setCategories(catList || []);
      setCustomers(custList || []);
      setActiveSession((sessionRes as any)?.active ? (sessionRes as any).session : null);

      // Default to walk-in customer
      const walkin = custList?.find((c) => c.is_walkin) || custList?.[0];
      if (walkin && selectedCustomerId === 0) {
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

  // Global F9 keyboard shortcut to trigger checkout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9' && cart.length > 0 && !isCheckoutOpen && !isReceiptOpen) {
        e.preventDefault();
        setIsCheckoutOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, isCheckoutOpen, isReceiptOpen]);

  // Cart handlers
  const handleAddToCart = (prod: InventorySummaryItem) => {
    if (prod.current_stock <= 0) return;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product_id === prod.product_id);
      if (existingIndex > -1) {
        const existing = prevCart[existingIndex];
        const newQty = Math.min(existing.quantity + 1, prod.current_stock);
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
          available_stock: prod.current_stock,
          quantity: 1,
          discount: 0,
          subtotal: prod.selling_price,
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
    setOverallDiscount(0);
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const grandTotal = Math.max(0, subtotal - overallDiscount);

  // Complete checkout
  const handleConfirmCheckout = async (payload: {
    payment_method: PaymentMethodType;
    paid_amount: number;
    payments_breakdown?: { payment_method: PaymentMethodType; amount: number }[];
    notes?: string;
  }) => {
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
        discount_amount: overallDiscount,
        paid_amount: payload.paid_amount,
        payments_breakdown: payload.payments_breakdown,
        notes: payload.notes,
      });

      setCompletedSale(sale);
      setIsCheckoutOpen(false);
      handleClearCart();
      setIsReceiptOpen(true);
      // Refresh inventory stocks
      fetchCatalogData();
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem', overflow: 'hidden' }}>
      {/* Top POS Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
            <Badge variant="success" pulse>POS Counter Terminal</Badge>
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Point of Sale Counter Register
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {activeSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem' }}>
              <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>Day Open:</span>
              <code style={{ color: 'var(--text-main)', fontWeight: 800 }}>{activeSession.session_number}</code>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem' }}>
              <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--danger)', display: 'inline-block' }} />
              <span style={{ fontWeight: 700, color: 'var(--danger)' }}>Day Closed / Not Open</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Zap size={14} style={{ color: 'var(--warning)' }} />
            <span>Fast Checkout Active (F9 Pay)</span>
          </div>
          <Button variant="outline" icon={<RefreshCw size={13} />} onClick={fetchCatalogData}>
            Refresh Catalog
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
            gap: '1rem',
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
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateLineDiscount={handleUpdateLineDiscount}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              overallDiscount={overallDiscount}
              onUpdateOverallDiscount={setOverallDiscount}
              onOpenCheckout={() => setIsCheckoutOpen(true)}
            />
          </div>
        </div>
      )}

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
