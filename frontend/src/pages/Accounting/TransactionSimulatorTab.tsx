import React, { useState } from 'react';
import { Play, CheckCircle2, Zap, Layers } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { JournalEntry, SimulationPayload } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';

interface TransactionSimulatorTabProps {
  onTransactionPosted: () => void;
}

export const TransactionSimulatorTab: React.FC<TransactionSimulatorTabProps> = ({
  onTransactionPosted,
}) => {
  const [txType, setTxType] = useState<SimulationPayload['transaction_type']>('CASH_SALE');
  const [refId, setRefId] = useState('INV-1002');
  const [amount, setAmount] = useState('5000');
  const [paidAmount, setPaidAmount] = useState('5000');
  const [cogsAmount, setCogsAmount] = useState('3200');
  const [partyName, setPartyName] = useState('Ahmed Customer');
  const [narration, setNarration] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; entry: JournalEntry } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    {
      title: '💳 Standard Cash Sale',
      desc: 'Rs. 5,000 Cash received, Rs. 3,200 COGS/Inventory',
      setup: () => {
        setTxType('CASH_SALE');
        setRefId(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
        setAmount('5000');
        setPaidAmount('5000');
        setCogsAmount('3200');
        setNarration('POS Terminal Cash Sale');
      },
    },
    {
      title: '📑 Customer Credit Sale',
      desc: 'Rs. 10,000 Total, Rs. 4,000 Down Payment, Rs. 6,000 on Account',
      setup: () => {
        setTxType('CREDIT_SALE');
        setRefId(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
        setAmount('10000');
        setPaidAmount('4000');
        setCogsAmount('6500');
        setPartyName('Ali Traders');
        setNarration('Credit Sale to Ali Traders');
      },
    },
    {
      title: '💰 Customer Debt Settlement',
      desc: 'Customer pays Rs. 4,000 towards outstanding receivable',
      setup: () => {
        setTxType('CUSTOMER_PAYMENT');
        setRefId(`PAY-${Math.floor(1000 + Math.random() * 9000)}`);
        setAmount('4000');
        setPartyName('Ali Traders');
        setNarration('Partial debt settlement by Ali Traders');
      },
    },
    {
      title: '⚡ Store Electricity Expense',
      desc: 'Rs. 4,500 Utilities Expense paid in cash',
      setup: () => {
        setTxType('EXPENSE');
        setRefId(`EXP-${Math.floor(100 + Math.random() * 900)}`);
        setAmount('4500');
        setNarration('Monthly store electricity bill');
      },
    },
    {
      title: '📦 Supplier Inventory Purchase',
      desc: 'Rs. 40,000 inventory bought (Rs. 15,000 paid, Rs. 25,000 payable)',
      setup: () => {
        setTxType('SUPPLIER_PURCHASE');
        setRefId(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
        setAmount('40000');
        setPaidAmount('15000');
        setPartyName('Al-Madina Wholesalers');
        setNarration('Bulk merchandise delivery on credit');
      },
    },
  ];

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: SimulationPayload = {
        transaction_type: txType,
        reference_id: refId,
        amount: parseFloat(amount) || 0,
        paid_amount: parseFloat(paidAmount) || 0,
        cogs_amount: parseFloat(cogsAmount) || 0,
        customer_or_supplier_name: partyName,
        narration: narration || `Simulated ${txType} for ${refId}`,
      };

      const res = await accountingService.simulateTransaction(payload);
      setResult({ message: res.message, entry: res.journal_entry });
      onTransactionPosted();
    } catch (err: any) {
      setError(err?.message || 'Transaction simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Banner */}
      <div className="glass-card" style={{
        padding: '1.5rem',
        borderLeft: '4px solid var(--primary-400)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Interactive Double-Entry Accounting Simulator</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Simulate real POS business events to test how the centralized <code style={{ color: 'var(--primary-400)' }}>AccountingService</code> automatically constructs balanced journal entries.
          </p>
        </div>
        <Badge variant="phase">Live Accounting Engine</Badge>
      </div>

      {/* Quick Presets */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
          One-Click Test Presets
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={p.setup}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.5rem',
                color: 'var(--text-main)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-400)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Simulation Form & Result Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Form Card */}
        <Card
          title="Transaction Parameters"
          subtitle="Configure event details to dispatch to AccountingService"
          icon={<Zap size={20} />}
        >
          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRunSimulation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Transaction Event Type *</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as any)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                  padding: '0.625rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              >
                <option value="CASH_SALE">Cash Sale (POS Checkout)</option>
                <option value="CREDIT_SALE">Credit Sale (Partial / Full Customer Debt)</option>
                <option value="SALE_RETURN">Sales Return / Customer Refund</option>
                <option value="CUSTOMER_PAYMENT">Customer Receivable Settlement</option>
                <option value="EXPENSE">Operating Expense (Rent, Utilities, etc.)</option>
                <option value="SUPPLIER_PURCHASE">Supplier Inventory Purchase Order</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Reference Identifier *"
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
                required
              />
              <Input
                label="Total Transaction Amount (Rs.) *"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {(txType === 'CREDIT_SALE' || txType === 'SUPPLIER_PURCHASE') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Paid Down Payment Amount (Rs.)"
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
                <Input
                  label="Customer / Supplier Name"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                />
              </div>
            )}

            {(txType === 'CASH_SALE' || txType === 'CREDIT_SALE' || txType === 'SALE_RETURN') && (
              <Input
                label="Estimated Inventory COGS Cost (Rs.)"
                type="number"
                step="0.01"
                value={cogsAmount}
                onChange={(e) => setCogsAmount(e.target.value)}
                helperText="Triggers automatic COGS (DR) and Inventory Asset (CR) double-entry."
              />
            )}

            <Input
              label="Transaction Memo / Narration"
              placeholder="Optional notes for ledger entry..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              icon={<Play size={16} />}
              loading={loading}
              style={{ marginTop: '0.5rem' }}
            >
              Post Transaction to General Ledger
            </Button>
          </form>
        </Card>

        {/* Result Card */}
        <Card
          title="Generated Journal Voucher"
          subtitle="Real-time double-entry outcome from AccountingService"
          icon={<Layers size={20} />}
          action={result && <Badge variant="success">Posted & Balanced</Badge>}
        >
          {!result ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Click <strong>Post Transaction</strong> or choose a preset to inspect the generated double-entry voucher.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                borderRadius: '0.5rem',
                color: 'var(--success)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <CheckCircle2 size={16} />
                <span>{result.message}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Voucher Entry #:</span>
                <code style={{ color: 'var(--primary-400)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {result.entry.entry_number}
                </code>
              </div>

              {/* Lines table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Account</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Debit (DR)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Credit (CR)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.entry.lines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <strong>[{line.account_code}]</strong> {line.account_name}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: line.debit > 0 ? 'var(--primary-400)' : 'var(--text-subtle)' }}>
                        {line.debit > 0 ? `Rs. ${line.debit.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: line.credit > 0 ? 'var(--warning)' : 'var(--text-subtle)' }}>
                        {line.credit > 0 ? `Rs. ${line.credit.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-medium)', fontWeight: 800 }}>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>Balanced Total:</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                      Rs. {result.entry.total_debit.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                      Rs. {result.entry.total_credit.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
