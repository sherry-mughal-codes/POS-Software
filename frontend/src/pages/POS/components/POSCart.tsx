import React, { useState } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  UserCheck,
  UserPlus,
  Percent,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { CartItem } from '../../../types/sales';
import { Customer } from '../../../types/contact';
import { InventorySummaryItem } from '../../../types/inventory';

interface POSCartProps {
  products?: InventorySummaryItem[];
  cart: CartItem[];
  customers: Customer[];
  selectedCustomerId: number;
  onSelectCustomer: (customerId: number) => void;
  onOpenNewCustomerModal?: () => void;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onUpdateUnitPrice: (productId: number, newUnitPrice: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  overallDiscountType: 'PERCENT' | 'FIXED';
  overallDiscountValue: number;
  overallDiscountAmount: number;
  onUpdateOverallDiscountType: (type: 'PERCENT' | 'FIXED') => void;
  onUpdateOverallDiscountValue: (val: number) => void;
  onOpenCheckout: () => void;
  isDayOpen?: boolean;
  onOpenDay?: () => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CartPriceInput: React.FC<{
  initialValue: number;
  onUpdate: (val: number) => void;
}> = ({ initialValue, onUpdate }) => {
  const [valStr, setValStr] = React.useState<string>(String(initialValue));

  React.useEffect(() => {
    setValStr(String(initialValue));
  }, [initialValue]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={valStr}
      onChange={(e) => {
        const text = e.target.value;
        if (text === '' || /^\d*\.?\d*$/.test(text)) {
          setValStr(text);
          if (text !== '' && !isNaN(Number(text))) {
            onUpdate(parseFloat(text) || 0);
          }
        }
      }}
      onBlur={() => {
        if (valStr === '' || isNaN(Number(valStr))) {
          setValStr('0');
          onUpdate(0);
        } else {
          onUpdate(parseFloat(valStr));
        }
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--primary-400)';
        e.target.select();
      }}
      style={{
        width: '4.2rem',
        padding: '0.1rem 0.25rem',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0.25rem',
        color: 'var(--text-main)',
        fontSize: '0.71875rem',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        textAlign: 'right',
        outline: 'none',
      }}
      title="Click to edit unit price"
    />
  );
};

const CartQtyInput: React.FC<{
  quantity: number;
  availableStock: number;
  onUpdate: (qty: number) => void;
}> = ({ quantity, availableStock, onUpdate }) => {
  const [qtyStr, setQtyStr] = React.useState<string>(String(quantity));

  React.useEffect(() => {
    setQtyStr(String(quantity));
  }, [quantity]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={qtyStr}
      onChange={(e) => {
        const text = e.target.value;
        if (text === '' || /^\d+$/.test(text)) {
          setQtyStr(text);
          if (text !== '') {
            const num = parseInt(text, 10);
            if (num > 0) {
              onUpdate(Math.min(num, availableStock));
            }
          }
        }
      }}
      onBlur={() => {
        if (qtyStr === '' || parseInt(qtyStr, 10) < 1) {
          setQtyStr('1');
          onUpdate(1);
        } else {
          const num = parseInt(qtyStr, 10);
          onUpdate(Math.min(num, availableStock));
        }
      }}
      onFocus={(e) => e.target.select()}
      style={{
        width: '1.75rem',
        textAlign: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        color: 'var(--text-main)',
        fontWeight: 700,
        fontSize: '0.71875rem',
        outline: 'none',
      }}
    />
  );
};

export const POSCart: React.FC<POSCartProps> = ({
  products,
  cart,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenNewCustomerModal,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onRemoveItem,
  onClearCart,
  overallDiscountType,
  overallDiscountValue,
  overallDiscountAmount,
  onUpdateOverallDiscountType,
  onUpdateOverallDiscountValue,
  onOpenCheckout,
  isDayOpen = true,
  onOpenDay,
}) => {
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const grandTotal = Math.max(0, subtotal - overallDiscountAmount);

  // Helper to reliably resolve cost/purchasing price for an item
  const getItemCost = (item: CartItem): number => {
    if (item.purchase_price !== undefined && item.purchase_price !== null && Number(item.purchase_price) > 0) {
      return Number(item.purchase_price);
    }
    if (item.weighted_average_cost !== undefined && item.weighted_average_cost !== null && Number(item.weighted_average_cost) > 0) {
      return Number(item.weighted_average_cost);
    }
    const match = products?.find((p) => p.product_id === item.product_id);
    if (match) {
      if (match.purchase_price !== undefined && match.purchase_price !== null && Number(match.purchase_price) > 0) {
        return Number(match.purchase_price);
      }
      if (match.weighted_average_cost !== undefined && match.weighted_average_cost !== null && Number(match.weighted_average_cost) > 0) {
        return Number(match.weighted_average_cost);
      }
    }
    return 0;
  };

  // Real-time Profit Calculation: Sum of ((Selling Price - Purchasing Price) * Quantity) - Overall Discount
  const totalCost = cart.reduce((acc, item) => {
    const cost = getItemCost(item);
    return acc + (cost * item.quantity);
  }, 0);

  const totalItemsProfit = cart.reduce((acc, item) => {
    const cost = getItemCost(item);
    return acc + ((item.unit_price - cost) * item.quantity);
  }, 0);

  const overallProfit = cart.length > 0 ? (totalItemsProfit - overallDiscountAmount) : 0;
  const profitMarginPercent = grandTotal > 0 ? (overallProfit / grandTotal) * 100 : 0;

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: '0.625rem',
        overflow: 'hidden',
        border: '1px solid var(--border-medium)',
        padding: 0,
      }}
    >
      {/* Customer Header Bar */}
      <div
        style={{
          padding: '0.4rem 0.6rem',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <UserCheck size={11} />
            Customer
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {selectedCustomer && (
              <div>
                {selectedCustomer.is_walkin ? (
                  <span style={{ fontSize: '0.625rem', color: 'var(--primary-400)', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '0.05rem 0.3rem', borderRadius: '0.2rem' }}>Walk-in</span>
                ) : selectedCustomer.credit_enabled ? (
                  <span style={{ fontSize: '0.625rem', color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '0.05rem 0.3rem', borderRadius: '0.2rem' }}>Credit OK</span>
                ) : (
                  <span style={{ fontSize: '0.625rem', color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '0.05rem 0.3rem', borderRadius: '0.2rem' }}>No Credit</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <select
            value={selectedCustomerId}
            onChange={(e) => onSelectCustomer(parseInt(e.target.value))}
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.3rem',
              padding: '0.25rem 0.45rem',
              color: 'var(--text-main)',
              fontSize: '0.78125rem',
              fontWeight: 600,
              outline: 'none',
            }}
          >
            {customers
              .filter((c) => c.is_active || c.is_walkin)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_walkin ? '(Walk-in)' : `(${c.customer_id})`}
                </option>
              ))}
          </select>
          {onOpenNewCustomerModal && (
            <button
              type="button"
              onClick={onOpenNewCustomerModal}
              title="Add New Customer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.75rem',
                height: '1.75rem',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.3rem',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <UserPlus size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.35rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          minHeight: 0,
        }}
      >
        {cart.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '0.25rem',
              textAlign: 'center',
              padding: '1rem 0.5rem',
            }}
          >
            <ShoppingCart size={28} style={{ color: 'var(--text-subtle)' }} />
            <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Cart is empty</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)' }}>
              Scan barcode or click product to add
            </div>
          </div>
        ) : (
          cart.map((item) => {
            const isAtMaxStock = item.quantity >= item.available_stock;

            return (
              <div
                key={item.product_id}
                style={{
                  padding: '0.35rem 0.5rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '0.35rem',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}
              >
                {/* Top Row: Title & Remove */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.3rem' }}>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: 700,
                      fontSize: '0.78125rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.15,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.product_id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-subtle)',
                      cursor: 'pointer',
                      padding: '0.1rem',
                      borderRadius: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subtle)')}
                    title="Remove item from cart"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Bottom Row: Stepper & Inline Unit Price & Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem' }}>
                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', backgroundColor: 'var(--bg-input)', padding: '0.05rem', borderRadius: '0.2rem', border: '1px solid var(--border-medium)' }}>
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                      style={{
                        width: '1.125rem',
                        height: '1.125rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Minus size={9} />
                    </button>

                    <CartQtyInput
                      quantity={item.quantity}
                      availableStock={item.available_stock}
                      onUpdate={(qty) => onUpdateQuantity(item.product_id, qty)}
                    />

                    <button
                      onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                      disabled={isAtMaxStock}
                      style={{
                        width: '1.125rem',
                        height: '1.125rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: isAtMaxStock ? 'var(--text-subtle)' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isAtMaxStock ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Plus size={9} />
                    </button>
                  </div>

                  {/* Inline Direct Editable Unit Price */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rs.</span>
                    <CartPriceInput
                      initialValue={item.unit_price}
                      onUpdate={(newPrice) => onUpdateUnitPrice(item.product_id, newPrice)}
                    />
                  </div>

                  {/* Subtotal */}
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      color: 'var(--primary-400)',
                    }}
                  >
                    Rs. {formatMoney(item.subtotal)}
                  </div>
                </div>

                {isAtMaxStock && (
                  <div style={{ fontSize: '0.59375rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <AlertCircle size={8} />
                    Max stock ({item.available_stock} avail)
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cart Footer Summary & Pay Button */}
      <div
        style={{
          padding: '0.45rem 0.6rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          flexShrink: 0,
        }}
      >
        {/* Breakdown lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.71875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Subtotal ({totalItemsCount} items)</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
              Rs. {formatMoney(subtotal)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <button
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              style={{
                background: 'none',
                border: 'none',
                color: overallDiscountAmount > 0 ? 'var(--warning)' : 'var(--primary-400)',
                fontSize: '0.65rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <Percent size={9} />
              <span>
                {showDiscountInput
                  ? 'Hide'
                  : overallDiscountValue > 0
                  ? `Overall Disc. (${overallDiscountType === 'PERCENT' ? `${overallDiscountValue}%` : `Rs. ${overallDiscountValue}`})`
                  : 'Add Overall Disc.'}
              </span>
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)', fontWeight: 600, fontSize: '0.71875rem' }}>
              {overallDiscountAmount > 0 ? `- Rs. ${formatMoney(overallDiscountAmount)}` : 'Rs. 0.00'}
            </span>
          </div>

          {showDiscountInput && (
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.15rem', alignItems: 'center' }}>
              {/* Mode Selector Toggle: % vs Rs */}
              <div style={{ display: 'flex', backgroundColor: 'var(--bg-input)', borderRadius: '0.25rem', border: '1px solid var(--border-medium)', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => onUpdateOverallDiscountType('PERCENT')}
                  style={{
                    padding: '0.2rem 0.45rem',
                    border: 'none',
                    backgroundColor: overallDiscountType === 'PERCENT' ? 'var(--primary-500)' : 'transparent',
                    color: overallDiscountType === 'PERCENT' ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Percentage Discount"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateOverallDiscountType('FIXED')}
                  style={{
                    padding: '0.2rem 0.45rem',
                    border: 'none',
                    backgroundColor: overallDiscountType === 'FIXED' ? 'var(--primary-500)' : 'transparent',
                    color: overallDiscountType === 'FIXED' ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Fixed Rupee Discount"
                >
                  Rs
                </button>
              </div>

              <input
                type="number"
                step="any"
                min="0"
                max={overallDiscountType === 'PERCENT' ? 100 : subtotal}
                placeholder={overallDiscountType === 'PERCENT' ? 'Disc % (e.g. 1 for 1%)' : 'Discount in Rs.'}
                value={overallDiscountValue || ''}
                onChange={(e) => onUpdateOverallDiscountValue(parseFloat(e.target.value) || 0)}
                style={{
                  flex: 1,
                  padding: '0.2rem 0.4rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.25rem',
                  color: 'var(--text-main)',
                  fontSize: '0.71875rem',
                  outline: 'none',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              />

              {overallDiscountType === 'PERCENT' && overallDiscountValue > 0 && (
                <span style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  ({overallDiscountValue}% = Rs. {formatMoney(overallDiscountAmount)})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Grand Total Banner */}
        <div
          style={{
            padding: '0.35rem 0.55rem',
            borderRadius: '0.35rem',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-main)' }}>Grand Total</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
            Rs. {formatMoney(grandTotal)}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <Button
            variant="outline"
            onClick={onClearCart}
            disabled={cart.length === 0}
            icon={<Trash2 size={12} />}
            title="Clear Cart"
            style={{ padding: '0.45rem 0.55rem', flexShrink: 0 }}
          />

          {/* Real-time Profit Button in between Delete and Pay */}
          <button
            type="button"
            onClick={() => setIsProfitModalOpen(true)}
            disabled={cart.length === 0}
            title={
              cart.length > 0
                ? `Real-Time Profit Summary:\n• Total Selling Value: Rs. ${formatMoney(grandTotal)}\n• Total Purchasing Cost: Rs. ${formatMoney(totalCost)}\n• Net Profit Margin: Rs. ${formatMoney(overallProfit)} (${profitMarginPercent >= 0 ? '+' : ''}${profitMarginPercent.toFixed(1)}%)\n\nClick to view item-by-item profit breakdown.`
                : 'Add products to cart to calculate real-time profit margin'
            }
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              padding: '0.45rem 0.5rem',
              borderRadius: '0.375rem',
              backgroundColor: cart.length === 0
                ? 'rgba(255, 255, 255, 0.03)'
                : overallProfit >= 0
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${
                cart.length === 0
                  ? 'var(--border-subtle)'
                  : overallProfit >= 0
                  ? 'rgba(16, 185, 129, 0.4)'
                  : 'rgba(239, 68, 68, 0.4)'
              }`,
              color: cart.length === 0
                ? 'var(--text-subtle)'
                : overallProfit >= 0
                ? 'var(--success)'
                : 'var(--danger)',
              fontSize: '0.78125rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (cart.length > 0) {
                e.currentTarget.style.filter = 'brightness(1.2)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <TrendingUp size={13} style={{ flexShrink: 0 }} />
            <span>Profit</span>
          </button>

          {!isDayOpen ? (
            <Button
              variant="secondary"
              onClick={onOpenDay || (() => {})}
              style={{
                flex: 1.3,
                padding: '0.45rem',
                fontSize: '0.78125rem',
                fontWeight: 800,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                whiteSpace: 'nowrap',
              }}
            >
              🔒 Open Day
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={onOpenCheckout}
              disabled={cart.length === 0}
              style={{
                flex: 1.3,
                padding: '0.45rem',
                fontSize: '0.8125rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                boxShadow: cart.length > 0 ? '0 4px 14px rgba(6, 182, 212, 0.4)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Pay Rs. {formatMoney(grandTotal)} (F9)
            </Button>
          )}
        </div>
      </div>

      {/* Real-time Profit & Margin Breakdown Modal */}
      {isProfitModalOpen && (
        <Modal
          isOpen={isProfitModalOpen}
          onClose={() => setIsProfitModalOpen(false)}
          title="Real-Time Cart Profit & Margin Breakdown"
          maxWidth="720px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* KPI Summary Banner Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              <div style={{ padding: '0.625rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Revenue</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  Rs. {formatMoney(grandTotal)}
                </div>
              </div>

              <div style={{ padding: '0.625rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Cost</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Rs. {formatMoney(totalCost)}
                </div>
              </div>

              <div style={{ padding: '0.625rem', backgroundColor: overallProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${overallProfit >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.6875rem', color: overallProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>Net Profit</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: overallProfit >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '0.2rem' }}>
                  Rs. {formatMoney(overallProfit)}
                </div>
              </div>

              <div style={{ padding: '0.625rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Profit Margin</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: profitMarginPercent >= 0 ? 'var(--primary-400)' : 'var(--danger)', marginTop: '0.2rem' }}>
                  {profitMarginPercent >= 0 ? '+' : ''}{profitMarginPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Items Breakdown Table */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border-medium)', borderRadius: '0.375rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', fontSize: '0.71875rem' }}>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Product</th>
                    <th style={{ padding: '0.45rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.45rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Cost Price</th>
                    <th style={{ padding: '0.45rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Selling Price</th>
                    <th style={{ padding: '0.45rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Unit Profit</th>
                    <th style={{ padding: '0.45rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Total Cost</th>
                    <th style={{ padding: '0.45rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Total Sale</th>
                    <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Total Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const cost = getItemCost(item);
                    const lineCost = cost * item.quantity;
                    const lineRevenue = item.unit_price * item.quantity;
                    const lineProfit = lineRevenue - lineCost;
                    const unitProfit = item.unit_price - cost;
                    const marginPct = item.unit_price > 0 ? (unitProfit / item.unit_price) * 100 : 0;

                    return (
                      <tr key={item.product_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.45rem 0.6rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                          <code style={{ fontSize: '0.65625rem', color: 'var(--text-muted)' }}>{item.sku}</code>
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          Rs. {formatMoney(cost)}
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 600 }}>
                          Rs. {formatMoney(item.unit_price)}
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: unitProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                          Rs. {formatMoney(unitProfit)}
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          Rs. {formatMoney(lineCost)}
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                          Rs. {formatMoney(lineRevenue)}
                        </td>
                        <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: lineProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          Rs. {formatMoney(lineProfit)}
                          <div style={{ fontSize: '0.625rem', fontWeight: 600, opacity: 0.85 }}>
                            ({marginPct >= 0 ? '+' : ''}{marginPct.toFixed(0)}%)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Overall Discount Deduction Line (if applicable) */}
            {overallDiscountAmount > 0 && (
              <div
                style={{
                  padding: '0.45rem 0.75rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78125rem',
                }}
              >
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                  Overall Cart Discount Deduction ({overallDiscountType === 'PERCENT' ? `${overallDiscountValue}%` : 'Fixed'})
                </span>
                <span style={{ color: 'var(--warning)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  - Rs. {formatMoney(overallDiscountAmount)}
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <Button variant="outline" onClick={() => setIsProfitModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
