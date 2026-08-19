import React, { useState } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  UserCheck,
  Percent,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { CartItem } from '../../../types/sales';
import { Customer } from '../../../types/contact';

interface POSCartProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomerId: number;
  onSelectCustomer: (customerId: number) => void;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onUpdateLineDiscount: (productId: number, discount: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  overallDiscount: number;
  onUpdateOverallDiscount: (discount: number) => void;
  onOpenCheckout: () => void;
  isDayOpen?: boolean;
  onOpenDay?: () => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const POSCart: React.FC<POSCartProps> = ({
  cart,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onUpdateQuantity,
  onUpdateLineDiscount,
  onRemoveItem,
  onClearCart,
  overallDiscount,
  onUpdateOverallDiscount,
  onOpenCheckout,
  isDayOpen = true,
  onOpenDay,
}) => {
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const grandTotal = Math.max(0, subtotal - overallDiscount);

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
          gap: '0.25rem',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <UserCheck size={11} />
            Customer
          </label>
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

        <select
          value={selectedCustomerId}
          onChange={(e) => onSelectCustomer(parseInt(e.target.value))}
          style={{
            width: '100%',
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
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.is_walkin ? '(Walk-in)' : `(${c.customer_id})`}
            </option>
          ))}
        </select>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const d = prompt(`Enter discount for ${item.name} (Rs.):`, item.discount.toString());
                        if (d !== null) {
                          onUpdateLineDiscount(item.product_id, parseFloat(d) || 0);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '0.2rem',
                        color: item.discount > 0 ? 'var(--warning)' : 'var(--text-muted)',
                        padding: '0.05rem 0.25rem',
                        fontSize: '0.6rem',
                        cursor: 'pointer',
                      }}
                    >
                      Disc
                    </button>

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
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subtle)')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Stepper & Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      max={item.available_stock}
                      onChange={(e) => onUpdateQuantity(item.product_id, parseFloat(e.target.value) || 1)}
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

                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Rs. {formatMoney(item.unit_price)}
                    {item.discount > 0 && <span style={{ color: 'var(--warning)', marginLeft: '0.2rem' }}>(-Rs. {formatMoney(item.discount)})</span>}
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
                color: overallDiscount > 0 ? 'var(--warning)' : 'var(--primary-400)',
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
              <span>{showDiscountInput ? 'Hide' : 'Add Overall Disc.'}</span>
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)', fontWeight: 600, fontSize: '0.71875rem' }}>
              {overallDiscount > 0 ? `- Rs. ${formatMoney(overallDiscount)}` : 'Rs. 0.00'}
            </span>
          </div>

          {showDiscountInput && (
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.1rem' }}>
              <input
                type="number"
                placeholder="Discount (Rs.)"
                value={overallDiscount || ''}
                onChange={(e) => onUpdateOverallDiscount(parseFloat(e.target.value) || 0)}
                style={{
                  flex: 1,
                  padding: '0.2rem 0.4rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.2rem',
                  color: 'var(--text-main)',
                  fontSize: '0.71875rem',
                  outline: 'none',
                }}
              />
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

        {/* Day Session Closed Warning */}
        {!isDayOpen && (
          <div
            style={{
              padding: '0.35rem 0.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--danger)',
              borderRadius: '0.3rem',
              fontSize: '0.6875rem',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>Day Session Closed</span>
            </div>
            {onOpenDay && (
              <button
                type="button"
                onClick={onOpenDay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  padding: 0,
                }}
              >
                Open Day Now
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <Button
            variant="outline"
            onClick={onClearCart}
            disabled={cart.length === 0}
            icon={<Trash2 size={12} />}
            title="Clear Cart"
            style={{ padding: '0.45rem 0.6rem' }}
          />

          {!isDayOpen ? (
            <Button
              variant="secondary"
              onClick={onOpenDay || (() => {})}
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.78125rem',
                fontWeight: 800,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
              }}
            >
              🔒 Open Day to Sale
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={onOpenCheckout}
              disabled={cart.length === 0}
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.875rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                boxShadow: cart.length > 0 ? '0 4px 14px rgba(6, 182, 212, 0.4)' : 'none',
              }}
            >
              Pay Rs. {formatMoney(grandTotal)} (F9)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
