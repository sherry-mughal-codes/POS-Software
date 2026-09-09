import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Wallet,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { SalesAgent, CommissionRecord } from '../../types/commission';
import { Account } from '../../types/accounting';
import { commissionService } from '../../services/commissionService';
import { accountingService } from '../../services/accountingService';
import { useToast } from '../../context/ToastContext';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface AgentCommissionSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  initialAgentId?: number;
}

export const AgentCommissionSettlementModal: React.FC<AgentCommissionSettlementModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  initialAgentId,
}) => {
  const { showSuccess, showError } = useToast();

  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<SalesAgent | null>(null);
  const [agentSearch, setAgentSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [openRecords, setOpenRecords] = useState<CommissionRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);

  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE'>('CASH');
  const [paymentAccountId, setPaymentAccountId] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [chequeBank, setChequeBank] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter accounts based on payment method
  const getFilteredPaymentAccounts = (pm: 'CASH' | 'BANK' | 'CHEQUE') => {
    if (pm === 'CASH') {
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

  const handlePaymentMethodChange = (pm: 'CASH' | 'BANK' | 'CHEQUE') => {
    setPaymentMethod(pm);
    const validAccs = getFilteredPaymentAccounts(pm);
    if (validAccs.length > 0 && !validAccs.some((a) => a.id === paymentAccountId)) {
      setPaymentAccountId(validAccs[0].id);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [netAgentBalance, setNetAgentBalance] = useState<number>(0);
  const [advanceCreditBalance, setAdvanceCreditBalance] = useState<number>(0);
  const [totalAdjustedAmount, setTotalAdjustedAmount] = useState<number>(0);

  const loadAgentRecords = async (agent: SalesAgent) => {
    try {
      setLoadingRecords(true);
      const data = await commissionService.getPayables({ sales_agent: agent.id, page_size: 100 });
      const records: CommissionRecord[] = Array.isArray(data) ? data : (data as any)?.results || [];
      const nonCancelled = records.filter((r) => r.status !== 'CANCELLED');
      
      const totalNet = nonCancelled.reduce((sum, r) => sum + Number(r.net_payable_amount || 0), 0);
      const totalPaid = nonCancelled.reduce((sum, r) => sum + Number(r.paid_amount || 0), 0);
      const totalAdj = nonCancelled.reduce((sum, r) => sum + Number(r.adjusted_amount || 0), 0);
      const netDue = Math.max(0, totalNet - totalPaid);
      const advCredit = Math.max(0, totalPaid - totalNet);

      setNetAgentBalance(netDue);
      setAdvanceCreditBalance(advCredit);
      setTotalAdjustedAmount(totalAdj);

      const openList = records.filter((r) => {
        const due = Number(r.remaining_payable_amount ?? r.balance_due ?? 0);
        return due > 0 && r.status !== 'PAID' && r.status !== 'CANCELLED';
      });
      setOpenRecords(openList);

      if (netDue > 0) {
        setPaymentAmount(netDue.toFixed(2));
      } else {
        setPaymentAmount('0.00');
      }
    } catch {
      const fallback = Number((agent as any).outstanding_balance || 0);
      const fallbackAdj = Number((agent as any).total_adjusted || 0);
      const fallbackAdv = Number((agent as any).advance_credit_balance || 0);
      setNetAgentBalance(fallback);
      setTotalAdjustedAmount(fallbackAdj);
      setAdvanceCreditBalance(fallbackAdv);
      setPaymentAmount(fallback > 0 ? fallback.toFixed(2) : '');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSelectAgent = (ag: SalesAgent) => {
    setSelectedAgent(ag);
    setAgentSearch(`[${ag.code}] ${ag.name}`);
    setIsDropdownOpen(false);
    loadAgentRecords(ag);
  };

  // Fetch agents and chart of accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPaymentAmount('');
      setPaymentMethod('CASH');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setChequeNumber('');
      setChequeDate(new Date().toISOString().split('T')[0]);
      setChequeBank('');
      setNotes('');
      setIsDropdownOpen(false);
      setOpenRecords([]);
      setNetAgentBalance(0);
      setAdvanceCreditBalance(0);

      // Fetch Sales Agents
      const fetchAgents = async () => {
        try {
          setLoadingAgents(true);
          const data = await commissionService.getAgents({ page_size: 200 });
          const list: SalesAgent[] = Array.isArray(data) ? data : (data as any)?.results || [];
          setAgents(list);

          if (initialAgentId) {
            const found = list.find((a) => a.id === initialAgentId);
            if (found) {
              handleSelectAgent(found);
            }
          } else {
            setSelectedAgent(null);
            setAgentSearch('');
          }
        } catch {
          // ignore
        } finally {
          setLoadingAgents(false);
        }
      };

      // Fetch Chart of Accounts
      const fetchAccounts = async () => {
        try {
          const data = await accountingService.getAccounts({ is_active: true });
          const rawAccounts: Account[] = Array.isArray(data) ? data : (data as any)?.results || [];
          const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
          const payList = rawAccounts.filter(
            (a) => a.account_type === 'ASSET' && isLeaf(a) && (a.code.startsWith('101') || a.code.startsWith('102') || a.parent_code === '1010' || a.parent_code === '1020')
          );
          const validPayList = payList.length > 0 ? payList : rawAccounts.filter((a) => a.account_type === 'ASSET');
          setPaymentAccounts(validPayList);

          const cashAccs = validPayList.filter((a) => a.code.startsWith('101') || a.parent_code === '1010' || a.name.toLowerCase().includes('cash'));
          if (cashAccs.length > 0) {
            setPaymentAccountId(cashAccs[0].id);
          } else if (validPayList.length > 0) {
            setPaymentAccountId(validPayList[0].id);
          }
        } catch {
          // ignore
        }
      };

      fetchAgents();
      fetchAccounts();
    }
  }, [isOpen, initialAgentId]);

  const agentOutstanding = netAgentBalance > 0
    ? netAgentBalance
    : selectedAgent
    ? Number((selectedAgent as any).outstanding_balance || 0)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) {
      setError('Please select a sales agent to settle commission for.');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (agentOutstanding > 0 && amt > agentOutstanding + 0.0001) {
      setError(`Payment amount (Rs. ${formatMoney(amt)}) exceeds agent's outstanding payable balance (Rs. ${formatMoney(agentOutstanding)}).`);
      return;
    }

    if (!paymentAccountId) {
      setError('Please select a disbursement cash or bank account.');
      return;
    }

    if (paymentMethod === 'CHEQUE' && !chequeNumber.trim()) {
      setError('Cheque Number is required when Cheque is selected.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        sales_agent: selectedAgent.id,
        amount: amt,
        payment_account: paymentAccountId,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        cheque_number: paymentMethod === 'CHEQUE' ? chequeNumber : undefined,
        cheque_date: paymentMethod === 'CHEQUE' && chequeDate ? chequeDate : undefined,
        cheque_bank: paymentMethod === 'CHEQUE' ? chequeBank : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await commissionService.settleAgentCommissions(payload);
      showSuccess(res.detail || `Commission of Rs. ${formatMoney(amt)} settled for ${selectedAgent.name}.`, 'Settlement Successful');
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      console.error('Agent settlement failed:', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.amount || err?.message || 'Failed to settle commission.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      showError(msg, 'Settlement Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settle Sales Agent Commission" maxWidth="620px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div
            style={{
              padding: '0.625rem 0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--danger)',
              borderRadius: '0.375rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Searchable Sales Agent Combobox */}
        <div ref={dropdownRef} style={{ position: 'relative', zIndex: 50 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Select Sales Agent *
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-input)',
              border: isDropdownOpen ? '1px solid var(--primary-500)' : '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              padding: '0.2rem 0.5rem',
              position: 'relative',
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)', marginRight: '0.4rem', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="-- Search agent by name, code, or phone --"
              value={selectedAgent ? `[${selectedAgent.code}] ${selectedAgent.name}` : agentSearch}
              onChange={(e) => {
                setSelectedAgent(null);
                setOpenRecords([]);
                setAgentSearch(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                padding: '0.3rem 0',
              }}
            />
            {selectedAgent || agentSearch ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedAgent(null);
                  setOpenRecords([]);
                  setAgentSearch('');
                  setPaymentAmount('');
                  setIsDropdownOpen(false);
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
                title="Clear agent"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          {/* Dropdown Popover */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.25rem',
                maxHeight: '220px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                zIndex: 99999,
              }}
            >
              {agents
                .filter((a) => {
                  if (!agentSearch.trim()) return true;
                  const q = agentSearch.toLowerCase();
                  return (
                    a.name.toLowerCase().includes(q) ||
                    (a.code && a.code.toLowerCase().includes(q)) ||
                    (a.phone && a.phone.includes(q))
                  );
                })
                .map((ag) => {
                  const bal = (ag as any).outstanding_balance || 0;
                  return (
                    <div
                      key={ag.id}
                      onClick={() => handleSelectAgent(ag)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: selectedAgent?.id === ag.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedAgent?.id === ag.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                          {ag.name} <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>({ag.code})</span>
                        </div>
                        {ag.phone && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
                            📞 {ag.phone}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: bal > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          Rs. {formatMoney(bal)}
                        </span>
                        <div style={{ fontSize: '0.625rem', color: bal > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {bal > 0 ? 'Due' : 'Cleared'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {agents.filter((a) => {
                if (!agentSearch.trim()) return true;
                const q = agentSearch.toLowerCase();
                return (
                  a.name.toLowerCase().includes(q) ||
                  (a.code && a.code.toLowerCase().includes(q)) ||
                  (a.phone && a.phone.includes(q))
                );
              }).length === 0 && (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {loadingAgents ? 'Loading sales agents...' : 'No matching sales agents found.'}
                </div>
              )}
            </div>
          )}
        </div>



        {selectedAgent && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Total Net Commission Payable:</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: agentOutstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                Rs. {formatMoney(agentOutstanding)}
              </div>
              {(advanceCreditBalance > 0 || totalAdjustedAmount > 0 || Number(selectedAgent.total_adjusted || 0) > 0 || Number(selectedAgent.advance_credit_balance || 0) > 0) && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--warning)', marginTop: '0.2rem', fontWeight: 600 }}>
                  Includes Rs. {formatMoney(advanceCreditBalance > 0 ? advanceCreditBalance : (totalAdjustedAmount || selectedAgent.total_adjusted || selectedAgent.advance_credit_balance))} credit offset from return reversals
                </div>
              )}
            </div>

            {agentOutstanding > 0 && (
              <Button
                type="button"
                variant="outline"
                icon={<CheckCircle size={13} />}
                onClick={() => setPaymentAmount(agentOutstanding.toFixed(2))}
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              >
                Pay Full Balance
              </Button>
            )}
          </div>
        )}

        {/* Open Vouchers Breakdown List if Available */}
        {selectedAgent && (loadingRecords || openRecords.length > 0) && (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.375rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.35rem 0.6rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Open Commission Vouchers ({openRecords.length}) — Settled FIFO
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
                1 Single Entry Settle All
              </span>
            </div>
            {loadingRecords ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Loading open vouchers...
              </div>
            ) : (
              <div style={{ maxHeight: '130px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', color: 'var(--text-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '0.3rem 0.5rem' }}>Voucher #</th>
                    <th style={{ padding: '0.3rem 0.5rem' }}>Invoice #</th>
                    <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>Total Comm</th>
                    <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>Remaining Due</th>
                  </tr>
                </thead>
                <tbody>
                  {openRecords.map((rec) => {
                    const due = Number(rec.remaining_payable_amount ?? rec.balance_due ?? 0);
                    return (
                      <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)', fontWeight: 600 }}>
                          {rec.commission_number || `COM-${rec.id}`}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {rec.invoice_number || `INV-${rec.sale}`}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          <div>Rs. {formatMoney(rec.commission_amount)}</div>
                          {Number(rec.adjusted_amount || 0) > 0 && (
                            <div style={{ fontSize: '0.625rem', color: 'var(--warning)', fontWeight: 600 }}>
                              -Rs. {formatMoney(rec.adjusted_amount)} Return
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                          Rs. {formatMoney(rec.paid_amount)}
                        </td>
                        <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontWeight: 700 }}>
                          Rs. {formatMoney(due)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Payment Amount & Date Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Payment Amount (Rs.) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              max={agentOutstanding > 0 ? agentOutstanding : undefined}
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Settlement Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Payment Method 1st, Disbursement Account 2nd */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => handlePaymentMethodChange(e.target.value as 'CASH' | 'BANK' | 'CHEQUE')}
              required
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.5rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="CASH">Cash</option>
              <option value="BANK">Bank / Card</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              {paymentMethod === 'CASH' ? 'Disbursement Account (Cash 101x) *' : 'Disbursement Account (Bank 102x) *'}
            </label>
            <select
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(parseInt(e.target.value))}
              required
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.5rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              {getFilteredPaymentAccounts(paymentMethod).map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.code}] {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Cheque Inputs when Payment Method is Cheque */}
        {paymentMethod === 'CHEQUE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.06)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-400)' }}>
              Cheque Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  Cheque Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-991823"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  required={paymentMethod === 'CHEQUE'}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  Cheque Date *
                </label>
                <input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meezan Bank, HBL"
                  value={chequeBank}
                  onChange={(e) => setChequeBank(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Settlement Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Settlement Notes / Reference
          </label>
          <input
            type="text"
            placeholder="e.g. Full commission clearance for August sales"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              color: 'var(--text-main)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!selectedAgent || agentOutstanding <= 0}
            icon={<Wallet size={14} />}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              fontWeight: 700,
            }}
          >
            Post Commission Settlement
          </Button>
        </div>
      </form>
    </Modal>
  );
};
