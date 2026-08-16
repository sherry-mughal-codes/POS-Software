import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Building, AlertCircle, Send } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Supplier } from '../../types/contact';
import { PaymentMethod, Account } from '../../types/accounting';
import { SupplierStatement } from '../../types/purchase';
import { contactService } from '../../services/contactService';
import { accountingService } from '../../services/accountingService';
import { purchaseService } from '../../services/purchaseService';

interface SupplierPayablesTabProps {
  onRefreshAll: () => void;
}

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SupplierPayablesTab: React.FC<SupplierPayablesTabProps> = ({ onRefreshAll }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [statements, setStatements] = useState<Record<number, SupplierStatement>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);

  // Make Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchPayablesData = async () => {
    try {
      const [suppList, pms, accs] = await Promise.all([
        contactService.getSuppliers({ is_active: true }),
        accountingService.getPaymentMethods(),
        accountingService.getAccounts(),
      ]);

      setSuppliers(suppList || []);
      setPaymentMethods(pms || []);
      const validAccs = (accs || []).filter((a) => ['1010', '1020'].includes(a.code));
      setPaymentAccounts(validAccs);

      if (pms && pms.length > 0) setSelectedMethodId(pms[0].id.toString());
      if (validAccs.length > 0) setSelectedAccountId(validAccs[0].id.toString());

      // Fetch running statements for all suppliers
      const stmts: Record<number, SupplierStatement> = {};
      await Promise.all(
        suppList.map(async (s) => {
          try {
            const st = await purchaseService.getSupplierStatement(s.id);
            stmts[s.id] = st;
          } catch {
            // ignore
          }
        })
      );
      setStatements(stmts);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPayablesData();
  }, []);

  const handleOpenPaymentModal = (supp: Supplier) => {
    setSelectedSupplierForPay(supp);
    const stmt = statements[supp.id];
    setPayAmount(stmt ? stmt.net_payable : 0);
    setReference('');
    setNotes('');
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPay) return;
    if (payAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    setSavingPayment(true);
    setPaymentError(null);

    try {
      await purchaseService.createSupplierPayment({
        supplier: selectedSupplierForPay.id,
        amount: payAmount,
        payment_method: parseInt(selectedMethodId),
        payment_account: selectedAccountId ? parseInt(selectedAccountId) : undefined,
        reference,
        notes,
      });
      setIsPaymentModalOpen(false);
      fetchPayablesData();
      onRefreshAll();
    } catch (err: any) {
      setPaymentError(err?.message || 'Failed to record supplier payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  const totalOutstanding = Object.values(statements).reduce((sum, s) => sum + s.net_payable, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Accounts Payable</span>
            <DollarSign size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalOutstanding)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Across all vendor accounts</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Active Suppliers</span>
            <Building size={18} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {suppliers.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>With purchasing history</div>
        </div>
      </div>

      {/* Supplier Payables Directory */}
      <Card
        title="Supplier Accounts & Outstanding Payables"
        subtitle="Real-time statement of account derived automatically from purchases, returns, and payment vouchers"
        icon={<CreditCard size={20} />}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Supplier</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Contact Person</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Total Purchased</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Total Paid</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Returns Credit</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Net Payable</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const stmt = statements[s.id] || { total_purchased: 0, total_paid: 0, total_returns: 0, net_payable: 0 };
                return (
                  <tr
                    key={s.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {s.company_name || s.name}
                      </div>
                      <code style={{ fontSize: '0.75rem', color: 'var(--primary-400)' }}>{s.supplier_id}</code>
                    </td>

                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>
                      {s.name}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      Rs. {formatMoney(stmt.total_purchased)}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                      Rs. {formatMoney(stmt.total_paid)}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      Rs. {formatMoney(stmt.total_returns)}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: stmt.net_payable > 0 ? 'var(--warning)' : 'var(--success)' }}>
                      Rs. {formatMoney(stmt.net_payable)}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <Button
                        variant="primary"
                        icon={<DollarSign size={13} />}
                        style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                        onClick={() => handleOpenPaymentModal(s)}
                      >
                        Make Payment
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Make Payment Modal */}
      {selectedSupplierForPay && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Payment to: ${selectedSupplierForPay.company_name || selectedSupplierForPay.name}`}
          subtitle="Generate double-entry voucher reducing Accounts Payable and debiting cash/bank"
        >
          {paymentError && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: '0.5rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={16} />
              <span>{paymentError}</span>
            </div>
          )}

          <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Payment Amount (Rs.) *"
                type="number"
                min="1"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                required
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  Payment Method *
                </label>
                <select
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    padding: '0.625rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontSize: '0.8125rem',
                  }}
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name} ({pm.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  Disbursement Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    padding: '0.625rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontSize: '0.8125rem',
                  }}
                >
                  {paymentAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Bank Ref / Cheque #"
                placeholder="e.g. Cheque #49201 / Online Ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <Input
              label="Payment Notes"
              placeholder="Payment remarks / voucher notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={savingPayment} icon={<Send size={16} />}>
                Record Payment & Post Ledger
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
