import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Eye,
  RotateCcw,
  Calendar,
  User,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { POSReceiptModal } from '../POS/components/POSReceiptModal';
import { Sale, PaymentMethodType } from '../../types/sales';
import { Account } from '../../types/accounting';
import { salesService } from '../../services/salesService';
import { accountingService } from '../../services/accountingService';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SalesHistoryPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals state
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [returnTargetSale, setReturnTargetSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<PaymentMethodType>('CASH');
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState<number | undefined>();
  const [returnChequeNumber, setReturnChequeNumber] = useState('');
  const [returnChequeDate, setReturnChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnChequeBank, setReturnChequeBank] = useState('');
  const [returnReason, setReturnReason] = useState<string>('Customer changed mind');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const getFilteredRefundAccounts = (method: PaymentMethodType) => {
    if (method === 'CASH') {
      return paymentAccounts.filter(
        (a) =>
          (a.code.startsWith('101') || a.parent_code === '1010' || (a.name.toLowerCase().includes('cash') && !a.code.startsWith('102'))) &&
          !a.name.toLowerCase().includes('jazz') &&
          !a.name.toLowerCase().includes('easy') &&
          !a.code.startsWith('102')
      );
    }
    return paymentAccounts.filter(
      (a) =>
        a.code.startsWith('102') ||
        a.parent_code === '1020' ||
        a.name.toLowerCase().includes('bank') ||
        a.name.toLowerCase().includes('card') ||
        a.name.toLowerCase().includes('jazz') ||
        a.name.toLowerCase().includes('easy')
    );
  };

  useEffect(() => {
    accountingService.getAccounts({ is_active: true, leaf_only: true })
      .then((accs) => {
        const cashBank = accs.filter(
          (a) => a.parent_code === '1010' || a.parent_code === '1020' || a.code.startsWith('101') || a.code.startsWith('102')
        );
        setPaymentAccounts(cashBank);
        const defaultCash = cashBank.find((a) => a.code === '1011') || cashBank[0];
        if (defaultCash) setSelectedPaymentAccountId(defaultCash.id);
      })
      .catch(() => {});
  }, []);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const data = await salesService.getSales({
        search: searchTerm || undefined,
        payment_method: selectedPaymentMethod || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setSales(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedPaymentMethod, dateFrom, dateTo]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleOpenReturnModal = (sale: Sale) => {
    setReturnTargetSale(sale);
    setReturnReason('Customer Return / Defective Item');
    setReturnNotes('');
    setReturnPaymentMethod('CASH');
    setReturnChequeNumber('');
    setReturnChequeDate(new Date().toISOString().split('T')[0]);
    setReturnChequeBank('');
    setReturnError(null);
    const validAccs = getFilteredRefundAccounts('CASH');
    setSelectedPaymentAccountId(validAccs[0]?.id || paymentAccounts[0]?.id);
    // Initialize return quantities with 0
    const initialQty: Record<number, number> = {};
    sale.items.forEach((item) => {
      initialQty[item.id] = 0;
    });
    setReturnQuantities(initialQty);
  };

  const handlePaymentMethodChange = (newMethod: PaymentMethodType) => {
    setReturnPaymentMethod(newMethod);
    const validAccs = getFilteredRefundAccounts(newMethod);
    if (validAccs.length > 0) {
      setSelectedPaymentAccountId(validAccs[0].id);
    }
  };

  const handleReturnQuantityChange = (itemId: number, qty: number, maxReturnable: number) => {
    const clamped = Math.max(0, Math.min(qty, maxReturnable));
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: clamped,
    }));
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTargetSale) return;
    setReturnError(null);

    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        sale_item_id: parseInt(itemId),
        quantity: qty,
      }));

    if (itemsToReturn.length === 0) {
      setReturnError('Please specify at least 1 item quantity to return.');
      return;
    }

    if (returnPaymentMethod === 'CHEQUE' && !returnChequeNumber.trim()) {
      setReturnError('Cheque Number is required.');
      return;
    }

    setReturnSubmitting(true);
    try {
      await salesService.processReturn({
        sale_id: returnTargetSale.id,
        items: itemsToReturn,
        reason: returnReason,
        refund_method: returnPaymentMethod,
        payment_account: selectedPaymentAccountId,
        cheque_number: returnPaymentMethod === 'CHEQUE' ? returnChequeNumber.trim() : undefined,
        cheque_date: returnPaymentMethod === 'CHEQUE' ? returnChequeDate : undefined,
        cheque_bank: returnPaymentMethod === 'CHEQUE' ? returnChequeBank.trim() : undefined,
        notes: returnNotes,
      });
      setReturnTargetSale(null);
      fetchSales();
    } catch (err: any) {
      setReturnError(err?.response?.data?.detail || err?.message || 'Failed to process sales return.');
    } finally {
      setReturnSubmitting(false);
    }
  };

  const totalRefundAmount = returnTargetSale
    ? returnTargetSale.items.reduce((acc, item) => {
        const qty = returnQuantities[item.id] || 0;
        return acc + qty * item.unit_price;
      }, 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
          Sales & Receipts
        </h2>
        <Button
          variant="outline"
          icon={<RefreshCw size={13} />}
          loading={loading}
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          onClick={fetchSales}
          title="Refresh Sales Invoices"
        >
          Refresh
        </Button>
      </div>

      {/* Compact Sales Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.45rem 0.65rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-subtle)',
            }}
          />
          <input
            type="text"
            placeholder="Search invoice or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.3rem 0.6rem 0.3rem 1.85rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={selectedPaymentMethod}
          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.375rem',
            padding: '0.3rem 0.6rem',
            color: 'var(--text-main)',
            fontSize: '0.75rem',
            outline: 'none',
            minWidth: '120px',
          }}
        >
          <option value="">All Payments</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="CREDIT">Customer Credit</option>
          <option value="SPLIT">Split Payment</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From Date"
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              padding: '0.25rem 0.45rem',
              color: 'var(--text-main)',
              fontSize: '0.71875rem',
              outline: 'none',
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To Date"
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              padding: '0.25rem 0.45rem',
              color: 'var(--text-main)',
              fontSize: '0.71875rem',
              outline: 'none',
            }}
          />
        </div>

        <Button
          variant="primary"
          icon={<Filter size={12} />}
          onClick={fetchSales}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
        >
          Filter
        </Button>

        {(searchTerm || selectedPaymentMethod || dateFrom || dateTo) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSelectedPaymentMethod('');
              setDateFrom('');
              setDateTo('');
            }}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.71875rem' }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Sales Invoices Table */}
      <Card title={`Sales Invoices (${sales.length})`} icon={<Receipt size={20} />}>
        {loading ? (
          <LoadingSpinner label="Loading sales history..." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Invoice #</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Payment Mode</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Due</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Cashier</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No sales found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr
                      key={sale.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <code style={{ fontWeight: 800, color: 'var(--primary-400)', fontSize: '0.875rem' }}>
                          {sale.invoice_number}
                        </code>
                        {sale.returns.length > 0 && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <Badge variant="warning">Returned (Rs. {formatMoney(sale.returned_amount)})</Badge>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Calendar size={13} />
                          <span>{new Date(sale.created_at).toLocaleString()}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sale.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {sale.customer_is_walkin ? 'Walk-in Customer' : `ID: ${sale.customer_code}`}
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        {sale.payment_method === 'CASH' && <Badge variant="success">Cash</Badge>}
                        {sale.payment_method === 'CARD' && <Badge variant="info">Card</Badge>}
                        {sale.payment_method === 'CREDIT' && (
                          sale.due_amount <= 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                              <Badge variant="success">Credit (Paid)</Badge>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--success)', fontWeight: 600 }}>Settled</span>
                            </div>
                          ) : sale.paid_amount > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                              <Badge variant="warning">Credit (Partial)</Badge>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontWeight: 600 }}>Due: Rs. {formatMoney(sale.due_amount)}</span>
                            </div>
                          ) : (
                            <Badge variant="warning">Credit (Unpaid)</Badge>
                          )
                        )}
                        {sale.payment_method === 'SPLIT' && (
                          sale.due_amount <= 0 ? (
                            <Badge variant="success">Split (Paid)</Badge>
                          ) : (
                            <Badge variant="phase">Split (Due)</Badge>
                          )
                        )}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)' }}>
                        Rs. {formatMoney(sale.grand_total)}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 600 }}>
                        Rs. {formatMoney(sale.paid_amount)}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: sale.due_amount > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: sale.due_amount > 0 ? 800 : 400 }}>
                        Rs. {formatMoney(sale.due_amount)}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <User size={13} />
                          <span>{sale.cashier_name}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                          <Button
                            variant="outline"
                            icon={<Eye size={14} />}
                            onClick={() => setSelectedReceiptSale(sale)}
                            title="View / Print Receipt"
                            style={{ padding: '0.3rem 0.45rem' }}
                          />

                          <Button
                            variant="outline"
                            icon={<RotateCcw size={14} />}
                            onClick={() => handleOpenReturnModal(sale)}
                            title="Process Return / Refund"
                            style={{ padding: '0.3rem 0.45rem' }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Printable Receipt Modal */}
      <POSReceiptModal
        isOpen={!!selectedReceiptSale}
        onClose={() => setSelectedReceiptSale(null)}
        sale={selectedReceiptSale}
      />

      {/* Sales Return Wizard Modal */}
      {returnTargetSale && (
        <Modal
          isOpen={!!returnTargetSale}
          onClose={() => setReturnTargetSale(null)}
          title={`Process Return for ${returnTargetSale.invoice_number}`}
          maxWidth="800px"
        >
          <form onSubmit={handleConfirmReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {returnError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{returnError}</span>
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Select the quantity of each product to return. The system verifies eligible returnable limits:
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border-medium)', borderRadius: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left' }}>Product</th>
                      <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>Sold</th>
                      <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>Already Ret.</th>
                      <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>Eligible</th>
                      <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center', width: '140px' }}>Return Qty</th>
                      <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnTargetSale.items.map((item) => {
                      const qty = returnQuantities[item.id] || 0;
                      const lineRefund = qty * item.unit_price;

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>
                            {item.product_name}
                            <code style={{ fontSize: '0.6875rem', display: 'block', color: 'var(--text-muted)' }}>{item.product_sku}</code>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            Rs. {formatMoney(item.unit_price)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                            {item.quantity}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', color: 'var(--warning)' }}>
                            {item.returned_quantity}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                            {item.returnable_quantity}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                              <button
                                type="button"
                                onClick={() => handleReturnQuantityChange(item.id, qty - 1, item.returnable_quantity)}
                                disabled={qty <= 0}
                                style={{ width: '1.5rem', height: '1.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '0.25rem', color: 'var(--text-main)', cursor: qty <= 0 ? 'not-allowed' : 'pointer' }}
                              >
                                -
                              </button>

                              <input
                                type="number"
                                min={0}
                                max={item.returnable_quantity}
                                value={qty}
                                onChange={(e) => handleReturnQuantityChange(item.id, parseFloat(e.target.value) || 0, item.returnable_quantity)}
                                style={{ width: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontWeight: 700 }}
                              />

                              <button
                                type="button"
                                onClick={() => handleReturnQuantityChange(item.id, qty + 1, item.returnable_quantity)}
                                disabled={qty >= item.returnable_quantity}
                                style={{ width: '1.5rem', height: '1.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '0.25rem', color: 'var(--text-main)', cursor: qty >= item.returnable_quantity ? 'not-allowed' : 'pointer' }}
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)' }}>
                            Rs. {formatMoney(lineRefund)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Refund Banner & Payout Account */}
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Total Instant Refund Payout:
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Paid directly to customer at counter (no store credit/overpayment stored)
                </div>
              </div>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                Rs. {formatMoney(totalRefundAmount)}
              </span>
            </div>

            {/* Refund Payment Mode & Account Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  Refund Payment Mode *
                </label>
                <select
                  value={returnPaymentMethod}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethodType)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Bank / Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  {returnPaymentMethod === 'CASH' ? 'Refund From Cash Account (101x) *' : 'Refund From Bank Account (102x) *'}
                </label>
                <select
                  value={selectedPaymentAccountId || ''}
                  onChange={(e) => setSelectedPaymentAccountId(parseInt(e.target.value) || undefined)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                  }}
                >
                  {getFilteredRefundAccounts(returnPaymentMethod).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Cheque Inputs when Payment Mode is Cheque */}
            {returnPaymentMethod === 'CHEQUE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.06)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                  Cheque Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Cheque Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CHQ-88201"
                      value={returnChequeNumber}
                      onChange={(e) => setReturnChequeNumber(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Cheque Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={returnChequeDate}
                      onChange={(e) => setReturnChequeDate(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    Customer / Drawer Bank (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meezan Bank, HBL, Allied Bank..."
                    value={returnChequeBank}
                    onChange={(e) => setReturnChequeBank(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Return Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                Return Reason *
              </label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Defective item, customer changed mind..."
                required
                style={{ width: '100%', padding: '0.55rem 0.75rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => setReturnTargetSale(null)} disabled={returnSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={returnSubmitting}
                disabled={totalRefundAmount <= 0}
                icon={<RotateCcw size={16} />}
              >
                Confirm Refund (Rs. {formatMoney(totalRefundAmount)})
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
