import React, { useState, useMemo } from 'react';
import { Plus, Search, Sparkles, Trash2, BookOpen, Edit2, FolderPlus } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Account, AccountType } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';
import { useToast } from '../../context/ToastContext';

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
  const { showError, showSuccess, showWarning } = useToast();
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Parent Group Modal State
  const [isParentGroupModalOpen, setIsParentGroupModalOpen] = useState(false);
  const [parentGroupCode, setParentGroupCode] = useState('');
  const [parentGroupName, setParentGroupName] = useState('');
  const [parentGroupType, setParentGroupType] = useState<AccountType>('EXPENSE');
  const [parentGroupParent, setParentGroupParent] = useState<string>('');
  const [parentGroupDesc, setParentGroupDesc] = useState('');
  const [parentGroupSaving, setParentGroupSaving] = useState(false);
  const [parentGroupError, setParentGroupError] = useState<string | null>(null);

  // Edit Account Modal State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editParent, setEditParent] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleOpenParentGroupModal = () => {
    setParentGroupCode('');
    setParentGroupName('');
    setParentGroupType('EXPENSE');
    setParentGroupParent('');
    setParentGroupDesc('');
    setParentGroupError(null);
    setIsParentGroupModalOpen(true);
  };

  const handleOpenEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setEditCode(acc.code);
    setEditName(acc.name);
    setEditDesc(acc.description || '');
    setEditParent(acc.parent ? acc.parent.toString() : '');
    setEditError(null);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = newCode.trim();
    const trimmedName = newName.trim();

    if (!trimmedCode || !trimmedName) {
      const msg = 'Account code and name are required.';
      setFormError(msg);
      showError(msg, 'Validation Error');
      return;
    }

    // Name uniqueness validation
    const duplicateName = accounts.find(
      (a) => a.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      const msg = `An account with the name '${trimmedName}' already exists (Code: ${duplicateName.code}). Please choose a distinct name.`;
      setFormError(msg);
      showError(msg, 'Duplicate Account Name');
      return;
    }

    // Code uniqueness validation
    const duplicateCode = accounts.find(
      (a) => a.code.trim().toLowerCase() === trimmedCode.toLowerCase()
    );
    if (duplicateCode) {
      const msg = `An account with code '${trimmedCode}' already exists (${duplicateCode.name}). Please choose a unique account code.`;
      setFormError(msg);
      showError(msg, 'Duplicate Account Code');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await accountingService.createAccount({
        code: trimmedCode,
        name: trimmedName,
        account_type: newType,
        parent: newParent ? parseInt(newParent, 10) : null,
        description: newDesc.trim(),
        is_active: true,
      });
      showSuccess(`Account [${trimmedCode}] ${trimmedName} created successfully!`, 'Account Created');
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.name?.[0] || err?.response?.data?.code?.[0] || err?.response?.data?.detail || err?.message || 'Failed to create account.';
      setFormError(msg);
      showError(msg, 'Creation Error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateParentGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = parentGroupCode.trim();
    const trimmedName = parentGroupName.trim();

    if (!trimmedCode || !trimmedName) {
      const msg = 'Parent group code and name are required.';
      setParentGroupError(msg);
      showError(msg, 'Validation Error');
      return;
    }

    const duplicateName = accounts.find(
      (a) => a.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      const msg = `An account group with the name '${trimmedName}' already exists. Please choose a distinct name.`;
      setParentGroupError(msg);
      showError(msg, 'Duplicate Group Name');
      return;
    }

    const duplicateCode = accounts.find(
      (a) => a.code.trim().toLowerCase() === trimmedCode.toLowerCase()
    );
    if (duplicateCode) {
      const msg = `An account with code '${trimmedCode}' already exists. Please choose a unique code.`;
      setParentGroupError(msg);
      showError(msg, 'Duplicate Code');
      return;
    }

    setParentGroupSaving(true);
    setParentGroupError(null);
    try {
      await accountingService.createAccount({
        code: trimmedCode,
        name: trimmedName,
        account_type: parentGroupType,
        parent: parentGroupParent ? parseInt(parentGroupParent, 10) : null,
        description: parentGroupDesc.trim(),
        is_active: true,
      });
      showSuccess(`Parent group [${trimmedCode}] ${trimmedName} created successfully!`, 'Group Created');
      setIsParentGroupModalOpen(false);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.name?.[0] || err?.response?.data?.code?.[0] || err?.response?.data?.detail || err?.message || 'Failed to create parent group.';
      setParentGroupError(msg);
      showError(msg, 'Group Creation Error');
    } finally {
      setParentGroupSaving(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const trimmedCode = editCode.trim();
    const trimmedName = editName.trim();

    if (!trimmedCode || !trimmedName) {
      const msg = 'Account code and name are required.';
      setEditError(msg);
      showError(msg, 'Validation Error');
      return;
    }

    const duplicateName = accounts.find(
      (a) => a.id !== editingAccount.id && a.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      const msg = `Another account with the name '${trimmedName}' already exists (Code: ${duplicateName.code}). Please choose a distinct name.`;
      setEditError(msg);
      showError(msg, 'Duplicate Account Name');
      return;
    }

    const duplicateCode = accounts.find(
      (a) => a.id !== editingAccount.id && a.code.trim().toLowerCase() === trimmedCode.toLowerCase()
    );
    if (duplicateCode) {
      const msg = `Another account with code '${trimmedCode}' already exists (${duplicateCode.name}). Please choose a unique code.`;
      setEditError(msg);
      showError(msg, 'Duplicate Code');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await accountingService.updateAccount(editingAccount.id, {
        code: trimmedCode,
        name: trimmedName,
        description: editDesc.trim(),
        parent: editParent ? parseInt(editParent, 10) : null,
      });
      showSuccess(`Account [${trimmedCode}] ${trimmedName} updated successfully!`, 'Account Updated');
      setEditingAccount(null);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.name?.[0] || err?.response?.data?.code?.[0] || err?.response?.data?.detail || err?.message || 'Failed to update account.';
      setEditError(msg);
      showError(msg, 'Update Error');
    } finally {
      setEditSaving(false);
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

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteAccount = async (acc: Account) => {
    if (acc.is_system) {
      showWarning(`System account [${acc.code}] ${acc.name} cannot be deleted.`, 'System Account');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete account [${acc.code}] ${acc.name}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(acc.id);
      await accountingService.deleteAccount(acc.id);
      showSuccess(`Account [${acc.code}] ${acc.name} deleted successfully.`, 'Account Deleted');
      onRefresh();
    } catch (err: any) {
      showError(err?.response?.data?.detail || err?.message || 'Failed to delete account. Accounts with existing journal entries cannot be deleted.', 'Delete Error');
    } finally {
      setDeletingId(null);
    }
  };

  const getAccountNestingLevel = (acc: Account, allAccs: Account[]): number => {
    let level = 0;
    let currentParentId = acc.parent;
    while (currentParentId) {
      level += 1;
      const parentAcc = allAccs.find((a) => a.id === currentParentId);
      currentParentId = parentAcc ? parentAcc.parent : null;
      if (level > 4) break;
    }
    return level;
  };

  const buildHierarchicalAccounts = (accList: Account[]): Account[] => {
    const childrenMap = new Map<number, Account[]>();
    const roots: Account[] = [];

    accList.forEach((acc: Account) => {
      if (!acc.parent) {
        roots.push(acc);
      } else {
        const existing = childrenMap.get(acc.parent) || [];
        existing.push(acc);
        childrenMap.set(acc.parent, existing);
      }
    });

    const allIds = new Set(accList.map((a: Account) => a.id));
    accList.forEach((acc: Account) => {
      if (acc.parent && !allIds.has(acc.parent) && !roots.some((r: Account) => r.id === acc.id)) {
        roots.push(acc);
      }
    });

    roots.sort((a: Account, b: Account) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    const result: Account[] = [];
    const traverse = (node: Account) => {
      result.push(node);
      const children = childrenMap.get(node.id) || [];
      children.sort((a: Account, b: Account) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      children.forEach(traverse);
    };

    roots.forEach(traverse);
    return result;
  };

  const filteredAccounts: Account[] = useMemo(() => {
    const matching = accounts.filter((acc: Account) => {
      const matchesType = selectedType === 'ALL' || acc.account_type === selectedType;
      const matchesSearch =
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });

    if (searchQuery.trim()) {
      return matching.sort((a: Account, b: Account) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    }

    return buildHierarchicalAccounts(matching);
  }, [accounts, selectedType, searchQuery]);

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
    .filter((a) => a.account_type === 'INCOME' && !a.is_header)
    .reduce((sum, a) => {
      // If contra-income account (e.g. 4020 Sales Returns with normal balance DEBIT), subtract it
      if (a.normal_balance === 'DEBIT') {
        return sum - a.current_balance;
      }
      return sum + a.current_balance;
    }, 0);

  const totalExpenses = accounts
    .filter((a) => a.account_type === 'EXPENSE' && !a.is_header)
    .reduce((sum, a) => {
      // If contra-expense account (normal balance CREDIT), subtract it
      if (a.normal_balance === 'CREDIT') {
        return sum - a.current_balance;
      }
      return sum + a.current_balance;
    }, 0);

  const netOperatingProfit = totalIncome - totalExpenses;
  const baseEquityTotal = accounts
    .filter((a) => a.account_type === 'EQUITY' && !a.is_header)
    .reduce((sum, a) => sum + a.current_balance, 0);
  const realTimeTotalEquity = baseEquityTotal + netOperatingProfit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Controls & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.625rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {accountTypes.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.78125rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: selectedType === t.key ? 'var(--primary-400)' : 'var(--bg-card)',
                color: selectedType === t.key ? '#000' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '200px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.35rem 0.65rem 0.35rem 1.9rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.78125rem',
                outline: 'none',
              }}
            />
          </div>

          <Button
            variant="outline"
            icon={<FolderPlus size={14} />}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', borderColor: '#c084fc', color: '#c084fc' }}
            onClick={handleOpenParentGroupModal}
          >
            Add Parent Group
          </Button>

          <Button
            variant="primary"
            icon={<Plus size={14} />}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={handleOpenModal}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* Accounts Ledger Table */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem', width: '100px' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Account Name</th>
                <th style={{ padding: '0.75rem 1rem', width: '130px' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', width: '110px' }}>Nature</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '160px' }}>Authoritative Balance</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc) => {
                const nestingLevel = getAccountNestingLevel(acc, accounts);
                const isHeader = !!acc.is_header || (acc.children_count && acc.children_count > 0);
                const indentRem = nestingLevel * 1.5;
                return (
                  <tr
                    key={acc.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isHeader ? 'rgba(168, 85, 247, 0.03)' : nestingLevel > 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                    }}
                  >
                    {/* Code */}
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: isHeader ? 800 : 700, color: isHeader ? '#c084fc' : 'var(--primary-400)' }}>
                      {acc.code}
                    </td>

                    {/* Name */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: `${indentRem}rem` }}>
                        {nestingLevel === 1 && <span style={{ color: 'var(--text-subtle)' }}>└─</span>}
                        {nestingLevel >= 2 && <span style={{ color: 'var(--primary-400)', opacity: 0.7 }}>└──</span>}
                        <strong style={{ color: isHeader ? 'var(--primary-400)' : 'var(--text-main)', fontWeight: isHeader ? 800 : nestingLevel > 0 ? 500 : 700 }}>
                          {acc.name}
                        </strong>
                        {isHeader && (
                          <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 700 }}>
                            Parent Group
                          </span>
                        )}
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
                        fontWeight: isHeader ? 800 : 700,
                        color: acc.current_balance > 0 ? 'var(--success)' : acc.current_balance < 0 ? 'var(--danger)' : 'var(--text-subtle)',
                      }}>
                        Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Edit Button in front of every account */}
                        <Button
                          variant="outline"
                          icon={<Edit2 size={13} />}
                          style={{ padding: '0.25rem 0.45rem', borderColor: 'var(--primary-400)', color: 'var(--primary-400)' }}
                          onClick={() => handleOpenEditModal(acc)}
                          title="Edit Account Code & Name"
                        />

                        {isHeader ? null : (
                          <>
                            {acc.code !== '3010' && (
                              <Button
                                variant="outline"
                                icon={<Sparkles size={13} />}
                                style={{ padding: '0.25rem 0.45rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--primary-400)' }}
                                onClick={() => handleOpenOpeningModal(acc)}
                                title="Set Initial Opening Balance"
                              />
                            )}
                            <Button
                              variant="outline"
                              icon={<BookOpen size={13} />}
                              style={{ padding: '0.25rem 0.45rem' }}
                              onClick={() => onSelectAccountForLedger(acc.id)}
                              title="View Account General Ledger"
                            />
                            {!acc.is_system && (
                              <Button
                                variant="outline"
                                icon={<Trash2 size={13} />}
                                title="Delete Account"
                                style={{ padding: '0.25rem 0.45rem', borderColor: 'rgba(239, 68, 68, 0.35)', color: 'var(--danger)' }}
                                onClick={() => handleDeleteAccount(acc)}
                                disabled={deletingId === acc.id}
                              />
                            )}
                          </>
                        )}
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
                    Rs. {(selectedType === 'EQUITY' ? realTimeTotalEquity : filteredAccounts.filter((a: Account) => !a.is_header).reduce((sum: number, a: Account) => sum + a.current_balance, 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td />
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
                {accounts
                  .filter((a) => a.account_type === newType)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} {a.is_header ? '— (Parent Group)' : ''}
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

      {/* Add Parent Group Modal */}
      <Modal
        isOpen={isParentGroupModalOpen}
        onClose={() => setIsParentGroupModalOpen(false)}
        title="Create New Parent Account Group"
      >
        {parentGroupError && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
          }}>
            {parentGroupError}
          </div>
        )}

        <form onSubmit={handleCreateParentGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <Input
              label="Group Code *"
              placeholder="e.g. 1050"
              value={parentGroupCode}
              onChange={(e) => setParentGroupCode(e.target.value)}
              required
            />
            <Input
              label="Group Name *"
              placeholder="e.g. Fixed Assets & Equipment"
              value={parentGroupName}
              onChange={(e) => setParentGroupName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Account Type *</label>
              <select
                value={parentGroupType}
                onChange={(e) => setParentGroupType(e.target.value as AccountType)}
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
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Parent (Optional)</label>
              <select
                value={parentGroupParent}
                onChange={(e) => setParentGroupParent(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.5rem',
                  padding: '0.625rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              >
                <option value="">None (Top-Level Group)</option>
                {accounts
                  .filter((a) => a.account_type === parentGroupType && a.is_header)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <Input
            label="Group Description / Scope"
            placeholder="e.g. Grouping for all physical assets and store machinery"
            value={parentGroupDesc}
            onChange={(e) => setParentGroupDesc(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsParentGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={parentGroupSaving}>
              Create Parent Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        isOpen={!!editingAccount}
        onClose={() => !editSaving && setEditingAccount(null)}
        title={`Edit Account: [${editingAccount?.code}] ${editingAccount?.name}`}
      >
        {editError && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
          }}>
            {editError}
          </div>
        )}

        <form onSubmit={handleUpdateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <Input
              label="Account Code *"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              required
            />
            <Input
              label="Account Name *"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Parent Header Account</label>
            <select
              value={editParent}
              onChange={(e) => setEditParent(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.5rem',
                padding: '0.625rem',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            >
              <option value="">None (Top-Level)</option>
              {accounts
                .filter((a) => a.account_type === editingAccount?.account_type && a.id !== editingAccount?.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name} {a.is_header ? '— (Parent Group)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <Input
            label="Description / Purpose"
            placeholder="Operational purpose for this ledger account..."
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setEditingAccount(null)} disabled={editSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={editSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Set Opening Balance Modal */}
      <Modal
        isOpen={!!openingModalAccount}
        onClose={() => !openingSaving && setOpeningModalAccount(null)}
        title={`Set Opening Balance: [${openingModalAccount?.code}] ${openingModalAccount?.name}`}
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
