import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Send, AlertCircle } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Supplier } from '../../types/contact';
import { Product } from '../../types/product';
import { PaymentMethod } from '../../types/accounting';
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

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const CreatePurchaseTab: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      contactService.getSuppliers({ is_active: true }),
      productService.getProducts({ is_active: true }),
      accountingService.getPaymentMethods(),
    ]).then(([supps, prods, pms]) => {
      setSuppliers(supps || []);
      setProducts(prods || []);
      setPaymentMethods(pms || []);
      if (supps && supps.length > 0) setSelectedSupplierId(supps[0].id.toString());
      if (pms && pms.length > 0) setSelectedPaymentMethodId(pms[0].id.toString());
    }).catch((err) => {
      setError(err?.message || 'Failed to load suppliers and products.');
    });
  }, []);

  const handleAddProduct = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find((p) => p.id.toString() === selectedProductToAdd);
    if (!prod) return;

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
          quantity: 10,
          purchaseRate: Number(prod.purchase_price) || 0,
          taxRate: 0,
        },
      ]);
    }
    setSelectedProductToAdd('');
  };

  const handleRemoveLine = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, field: keyof LineItemRow, value: any) => {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = value;
    setLineItems(updated);
  };

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.purchaseRate, 0);
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);
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
      tax_amount: taxAmount,
      paid_amount: paidAmount,
      payment_method: selectedPaymentMethodId ? parseInt(selectedPaymentMethodId) : null,
      notes,
      submit_immediately: submitImmediately,
      items: lineItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        purchase_rate: item.purchaseRate,
        tax_rate: item.taxRate,
      })),
    };

    try {
      await purchaseService.createPurchase(payload);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to process purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
      <Card title="Supplier & Order Details" subtitle="Transaction metadata and distributor attribution">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Supplier / Distributor *
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.875rem',
              }}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.supplier_id}] {s.company_name || s.name} ({s.name})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Purchase Date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />

          <Input
            label="Order Notes / Invoice #"
            placeholder="e.g. Inv #CC-9823 Delivery Slip"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Card>

      {/* Line Items Card */}
      <Card title="Purchase Order Items" subtitle="Enter quantities and transaction cost rate (snapshot historical pricing)">
        {/* Product Picker Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Select Product to Add
            </label>
            <select
              value={selectedProductToAdd}
              onChange={(e) => setSelectedProductToAdd(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.875rem',
              }}
            >
              <option value="">-- Choose a product from catalog --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name} (Default Cost: Rs. {formatMoney(p.purchase_price)})
                </option>
              ))}
            </select>
          </div>

          <Button variant="primary" icon={<Plus size={16} />} onClick={handleAddProduct}>
            Add Item
          </Button>
        </div>

        {/* Table of Line Items */}
        {lineItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '0.5rem' }}>
            No products added yet. Select a product above to add to this purchase order.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.625rem 0.75rem' }}>SKU</th>
                  <th style={{ padding: '0.625rem 0.75rem' }}>Product Name</th>
                  <th style={{ padding: '0.625rem 0.75rem', width: '110px' }}>Quantity</th>
                  <th style={{ padding: '0.625rem 0.75rem', width: '130px' }}>Rate (Rs.)</th>
                  <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Total (Rs.)</th>
                  <th style={{ padding: '0.625rem 0.75rem', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={item.productId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>{item.sku}</code>
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.productName}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
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
                          padding: '0.375rem 0.5rem',
                          color: 'var(--text-main)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
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
                          padding: '0.375rem 0.5rem',
                          color: 'var(--text-main)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      Rs. {formatMoney(item.quantity * item.purchaseRate)}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveLine(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          opacity: 0.8,
                        }}
                      >
                        <Trash2 size={16} />
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Payment Configuration */}
        <Card title="Payment & Settlement" subtitle="Specify cash paid now vs supplier payable">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                Payment Method
              </label>
              <select
                value={selectedPaymentMethodId}
                onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                  padding: '0.625rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.875rem',
                }}
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name} ({pm.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Paid Amount (Rs.)"
                  type="number"
                  min="0"
                  max={grandTotal}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <Button variant="outline" style={{ fontSize: '0.75rem', padding: '0.625rem' }} onClick={handlePayInFull}>
                Pay Full
              </Button>
              <Button variant="outline" style={{ fontSize: '0.75rem', padding: '0.625rem' }} onClick={handleFullCredit}>
                100% Credit
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Input
                label="Discount (Rs.)"
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Tax / Shipping (Rs.)"
                type="number"
                min="0"
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </Card>

        {/* Invoice Summary */}
        <Card title="Grand Total & Ledger Impact" subtitle="Automatic double-entry and stock-in preview">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <span>Line Items Subtotal:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--success)' }}>
                <span>Discount:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>- Rs. {formatMoney(discountAmount)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <span>Tax / Shipping:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>+ Rs. {formatMoney(taxAmount)}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '0.75rem 0',
              margin: '0.25rem 0',
            }}>
              <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Grand Total:</strong>
              <strong style={{ fontSize: '1.375rem', color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                Rs. {formatMoney(grandTotal)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--success)' }}>
              <span>Paid at Purchase:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Rs. {formatMoney(paidAmount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: remainingPayable > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
              <span>Supplier Accounts Payable:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Rs. {formatMoney(remainingPayable)}</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Button
                variant="outline"
                icon={<Save size={16} />}
                loading={submitting}
                style={{ flex: 1 }}
                onClick={() => handleSubmit(false)}
              >
                Save Draft
              </Button>
              <Button
                variant="primary"
                icon={<Send size={16} />}
                loading={submitting}
                style={{ flex: 1 }}
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
