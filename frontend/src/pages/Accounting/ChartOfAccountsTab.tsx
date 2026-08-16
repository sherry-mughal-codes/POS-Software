import React, { useState } from 'react';
import { Plus, Search, FolderTree, CheckCircle2, XCircle } from 'lucide-react';
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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ width: '220px' }}>
            <Input
              placeholder="Search code or account..."
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
        subtitle={`${filteredAccounts.length} accounts configured`}
        icon={<FolderTree size={20} />}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Account Name</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Normal Balance</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Current Balance</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc) => {
                const isHeader = !acc.parent;
                return (
                  <tr
                    key={acc.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isHeader ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isHeader ? 'rgba(255, 255, 255, 0.02)' : 'transparent'}
                  >
                    {/* Code */}
                    <td style={{ padding: '1rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: isHeader ? 'var(--primary-400)' : 'var(--text-main)',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                      }}>
                        {acc.code}
                      </code>
                    </td>

                    {/* Name with indentation for children */}
                    <td style={{ padding: '1rem', paddingLeft: acc.parent ? '2.25rem' : '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {acc.parent && <span style={{ color: 'var(--text-subtle)' }}>└─</span>}
                        <strong style={{ color: isHeader ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isHeader ? 700 : 500 }}>
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
                      <Button
                        variant="outline"
                        style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                        onClick={() => onSelectAccountForLedger(acc.id)}
                      >
                        View Ledger
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
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
    </div>
  );
};
