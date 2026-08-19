import React, { useState } from 'react';
import { Plus, Search, FolderTree, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Account, AccountType } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';

interface ChartOfAccountsTabProps {
  accounts: Account[];
  loading: boolean;
  onRefresh: () => void;
  onSelectAccountForLedger: (accountId: number) => void;
}

export const ChartOfAccountsTab: React.FC<ChartOfAccountsTabProps> = ({
  accounts,
  onRefresh,
  onSelectAccountForLedger,
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Opening Balance Modal State
  const [openingModalAccount, setOpeningModalAccount] = useState<Account | null>(null);
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingNarration, setOpeningNarration] = useState('');
  const [openingSaving, setOpeningSaving] = useState(false);
  const [openingError, setOpeningError] = useState<string | null>(null);

  // Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>('EXPENSE');
  const [newParent, setNewParent] = useState<string>('');
  const [newDesc, setNewDesc] = useState('');

  const accountTypes: Array<{ key: string; label: string }> = [
    { key: 'ALL', label: 'All Accounts' },
    { key: 'ASSET', label: 'Assets (1000s)' },
    { key: 'LIABILITY', label: 'Liabilities (2000s)' },
    { key: 'EQUITY', label: 'Equity (3000s)' },
    { key: 'INCOME', label: 'Revenue (4000s)' },
    { key: 'EXPENSE', label: 'Expenses (5000s)' },
  ];

  const handleOpenModal = () => {
    setNewCode('');
    setNewName('');
    setNewType('EXPENSE');
    setNewParent('');
    setNewDesc('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) {
      setFormError('Account code and name are required.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await accountingService.createAccount({
        code: newCode,
        name: newName,
        account_type: newType,
        parent: newParent ? parseInt(newParent, 10) : null,
        description: newDesc,
        is_active: true,
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenOpeningModal = (acc: Account) => {
    setOpeningModalAccount(acc);
    setOpeningAmount('');
    setOpeningDate(new Date().toISOString().split('T')[0]);
    setOpeningNarration(`Initial opening balance setup for [${acc.code}] ${acc.name}`);
    setOpeningError(null);
  };

  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingModalAccount) return;

    const amt = parseFloat(openingAmount);
    if (!amt || amt <= 0) {
      setOpeningError('Please enter a valid opening balance amount greater than zero.');
      return;
    }

    setOpeningSaving(true);
    setOpeningError(null);
    try {
      await accountingService.setAccountOpeningBalance(openingModalAccount.id, {
        amount: amt,
        date: openingDate,
        narration: openingNarration,
      });
      setOpeningModalAccount(null);
      onRefresh();
    } catch (err: any) {
      setOpeningError(err?.response?.data?.detail || err?.message || 'Failed to save opening balance.');
    } finally {
      setOpeningSaving(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesType = selectedType === 'ALL' || acc.account_type === selectedType;
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getTypeBadgeVariant = (type: AccountType) => {
    switch (type) {
      case 'ASSET':
        return 'info';
      case 'LIABILITY':
        return 'warning';
      case 'EQUITY':
        return 'phase';
      case 'INCOME':
        return 'success';
      case 'EXPENSE':
        return 'danger';
      default:
        return 'info';
    }
  };

  const totalIncome = accounts
    .filter((a) => a.account_type === 'INCOME')
    .reduce((sum, a) => {
      // If contra-income account (e.g. 4020 Sales Returns with normal balance DEBIT), subtract it
      if (a.normal_balance === 'DEBIT') {
        return sum - a.current_balance;
      }
      return sum + a.current_balance;
    }, 0);

  const totalExpenses = accounts
    .filter((a) => a.account_type === 'EXPENSE')
    .reduce((sum, a) => {
      // If contra-expense account (normal balance CREDIT), subtract it
      if (a.normal_balance === 'CREDIT') {
        return sum - a.current_balance;
      }
      return sum + a.current_balance;
    }, 0);

  const netOperatingProfit = totalIncome - totalExpenses;
  const baseEquityTotal = accounts
    .filter((a) => a.account_type === 'EQUITY')
    .reduce((sum, a) => sum + a.current_balance, 0);
  const realTimeTotalEquity = baseEquityTotal + netOperatingProfit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Controls & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {accountTypes.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: selectedType === t.key ? 'var(--primary-400)' : 'var(--border-subtle)',
                backgroundColor: selectedType === t.key ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-elevated)',
                color: selectedType === t.key ? 'var(--primary-400)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: '260px' }}>
            <Input
              placeholder="Search code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={14} />}
            />
          </div>

          <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenModal}>
            Add Account
          </Button>
        </div>
      </div>

      {/* Accounts Table Card */}
      <Card
        title="Chart of Accounts Hierarchy"
        subtitle={`${filteredAccounts.length} active ledger accounts`}
        icon={<FolderTree size={20} />}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-subtle)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Account Name</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Normal Bal</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Current Balance</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Active</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc) => {
                const isChild = !!acc.parent;
                return (
                  <tr
                    key={acc.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isChild ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                    }}
                  >
                    {/* Code */}
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-400)' }}>
                      {acc.code}
                    </td>

                    {/* Name */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: isChild ? '1.5rem' : '0' }}>
                        {isChild && <span style={{ color: 'var(--text-subtle)' }}>└─</span>}
                        <strong style={{ color: 'var(--text-main)', fontWeight: isChild ? 500 : 700 }}>
                          {acc.name}
                        </strong>
                        {acc.is_system && (
                          <span title="System Protected Account" style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
                            [System]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '1rem' }}>
                      <Badge variant={getTypeBadgeVariant(acc.account_type)}>
                        {acc.account_type}
                      </Badge>
                    </td>

                    {/* Normal Balance */}
                    <td style={{ padding: '1rem', color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>
                      {acc.normal_balance}
                    </td>

                    {/* Current Balance */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: acc.current_balance > 0 ? 'var(--success)' : acc.current_balance < 0 ? 'var(--danger)' : 'var(--text-subtle)',
                      }}>
                        Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {acc.is_active ? (
                        <CheckCircle2 size={16} style={{ color: 'var(--success)', margin: '0 auto' }} />
                      ) : (
                        <XCircle size={16} style={{ color: 'var(--danger)', margin: '0 auto' }} />
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {acc.code !== '3010' && (
                          <Button
                            variant="outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.71875rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--primary-400)' }}
                            onClick={() => handleOpenOpeningModal(acc)}
                          >
                            Set Opening Bal
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.71875rem' }}
                          onClick={() => onSelectAccountForLedger(acc.id)}
                        >
                          View Ledger
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Dynamic Real-time Retained Earnings Row when viewing Equity or All */}
              {(selectedType === 'EQUITY' || (selectedType === 'ALL' && netOperatingProfit !== 0)) && (
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(165, 180, 252, 0.05)',
                  }}
                >
                  <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a5b4fc' }}>
                    3999
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ color: '#a5b4fc' }}>
                        Current Period Retained Earnings (Live Net Profit / Loss)
                      </strong>
                      <Badge variant={netOperatingProfit >= 0 ? 'success' : 'danger'}>
                        Live Operating {netOperatingProfit >= 0 ? 'Profit' : 'Loss'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Auto-calculated from Sales Revenue (4000s) minus Operating Expenses & COGS (5000s)
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <Badge variant="phase">EQUITY</Badge>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>
                    CREDIT
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      color: netOperatingProfit >= 0 ? 'var(--success)' : 'var(--danger)',
                    }}>
                      Rs. {netOperatingProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--success)', margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                    [Dynamic]
                  </td>
                </tr>
              )}
            </tbody>
            {selectedType !== 'ALL' && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-medium)', fontWeight: 800, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <td colSpan={4} style={{ padding: '1rem', color: 'var(--text-main)', textAlign: 'right' }}>
                    {selectedType === 'EQUITY' ? "Total Real-Time Owner's Equity (Capital + Net Profit):" : `Net ${accountTypes.find((t) => t.key === selectedType)?.label} Total:`}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '1rem', color: selectedType === 'EQUITY' ? '#a5b4fc' : 'var(--primary-400)' }}>
                    Rs. {(selectedType === 'EQUITY' ? realTimeTotalEquity : filteredAccounts.reduce((sum, a) => sum + a.current_balance, 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Add Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Account to Chart of Accounts"
        subtitle="Create custom general ledger accounts for revenue, expenses, or assets."
      >
        {formError && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <Input
              label="Account Code *"
              placeholder="e.g. 5090"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              required
            />
            <Input
              label="Account Name *"
              placeholder="e.g. Packing & Delivery Expense"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Account Type *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as AccountType)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                  padding: '0.625rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              >
                <option value="ASSET">Asset (1000s)</option>
                <option value="LIABILITY">Liability (2000s)</option>
                <option value="EQUITY">Equity (3000s)</option>
                <option value="INCOME">Revenue / Income (4000s)</option>
                <option value="EXPENSE">Expense (5000s)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Parent Header Account</label>
              <select
                value={newParent}
                onChange={(e) => setNewParent(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                  padding: '0.625rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              >
                <option value="">None (Top-Level Header)</option>
                {accounts.filter((a) => a.account_type === newType).map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Description / Purpose"
            placeholder="Operational purpose for this ledger account..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Set Opening Balance Modal */}
      <Modal
        isOpen={!!openingModalAccount}
        onClose={() => !openingSaving && setOpeningModalAccount(null)}
        title={`Set Opening Balance: [${openingModalAccount?.code}] ${openingModalAccount?.name}`}
        subtitle="Post opening funds. System will automatically credit/debit Owner's Capital (3010) to maintain balanced equity."
      >
        {openingError && (
          <div style={{
            padding: '0.625rem 0.875rem',
            borderRadius: '0.375rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.78125rem',
            marginBottom: '1rem',
          }}>
            {openingError}
          </div>
        )}

        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          fontSize: '0.78125rem',
          color: 'var(--text-muted)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Sparkles size={16} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
          <span>
            <strong>Automatic Equity Balancing:</strong> When you set this opening balance, Account <strong>3010 (Owner's Capital / Equity)</strong> will automatically update by the exact same amount.
          </span>
        </div>

        <form onSubmit={handleSaveOpeningBalance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
            <Input
              label="Opening Balance Amount (Rs.) *"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 50000.00"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              required
              autoFocus
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Effective Date *
              </label>
              <input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                required
                style={{
                  padding: '0.55rem 0.75rem',
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

          <Input
            label="Narration / Description *"
            placeholder="e.g. Initial cash in drawer on system setup"
            value={openingNarration}
            onChange={(e) => setOpeningNarration(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setOpeningModalAccount(null)} disabled={openingSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={openingSaving}>
              Post Opening Balance
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
