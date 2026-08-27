import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  RotateCcw,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Account, JournalEntry, JournalPurposeType } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';

interface JournalEntriesTabProps {
  entries: JournalEntry[];
  accounts?: Account[];
  loading: boolean;
  onRefresh: () => void;
}

interface JournalLineFormItem {
  accountId: number;
  debit: string;
  credit: string;
  description: string;
}

export const JournalEntriesTab: React.FC<JournalEntriesTabProps> = ({
  entries,
  accounts = [],
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reversingEntry, setReversingEntry] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // New Journal Entry Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [purpose, setPurpose] = useState<JournalPurposeType>('OPENING_BALANCE');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceId, setReferenceId] = useState('');
  const [narration, setNarration] = useState('');
  const [isCustomNarration, setIsCustomNarration] = useState(false);
  const [lines, setLines] = useState<JournalLineFormItem[]>([
    { accountId: 0, debit: '', credit: '', description: '' },
    { accountId: 0, debit: '', credit: '', description: '' },
  ]);

  const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
  const activeAccounts = accounts.filter((a) => a.is_active && isLeaf(a));

  const computeDynamicNarration = (
    purposeType: JournalPurposeType,
    formLines: JournalLineFormItem[],
    accs: Account[]
  ): string => {
    const getAccLabel = (id: number): string => {
      const a = accs.find((acc) => acc.id === id);
      return a ? `[${a.code}] ${a.name}` : '';
    };

    const drLine = formLines.find((l) => parseFloat(l.debit) > 0) || formLines[0];
    const crLine = formLines.find((l) => parseFloat(l.credit) > 0) || formLines[1] || formLines[0];

    const drName = drLine?.accountId ? getAccLabel(drLine.accountId) : '';
    const crName = crLine?.accountId ? getAccLabel(crLine.accountId) : '';

    if (purposeType === 'TRANSFER') {
      if (crName && drName) return `Fund Transfer from ${crName} to ${drName}`;
      if (drName) return `Fund Transfer to ${drName}`;
      return 'Account fund transfer between cash and bank';
    }
    if (purposeType === 'EXPENSE') {
      if (drName && crName) return `Expense for ${drName} paid via ${crName}`;
      if (drName) return `Expense recording for ${drName}`;
      return 'Operational expense payment & accrual';
    }
    if (purposeType === 'OPENING_BALANCE') {
      if (drName && crName) return `Initial Opening Balance: ${drName} / ${crName}`;
      if (drName) return `Initial Opening Balance setup for ${drName}`;
      return 'Initial account opening balance setup';
    }
    if (purposeType === 'STOCK_ADJUSTMENT') {
      if (drName && crName) return `Stock audit adjustment: ${drName} vs ${crName}`;
      return 'Inventory valuation physical audit adjustment';
    }
    if (purposeType === 'REVERSAL') {
      if (drName && crName) return `Correction counter-entry: ${drName} / ${crName}`;
      return 'Correction & rectification counter-entry';
    }
    if (drName && crName) return `Journal voucher: ${drName} / ${crName}`;
    if (drName) return `Journal voucher for ${drName}`;
    return 'General manual journal voucher entry';
  };

  const handleOpenCreateModal = () => {
    setPurpose('OPENING_BALANCE');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setReferenceId('');
    setIsCustomNarration(false);
    setCreateError(null);

    const cashOrBank = activeAccounts.find((a) => a.code === '1011' || a.code === '1021' || a.parent_code === '1010' || a.parent_code === '1020') || activeAccounts[0];
    const equityAcc = activeAccounts.find((a) => a.code === '3010' || a.account_type === 'EQUITY') || activeAccounts[1] || activeAccounts[0];

    const initialLines: JournalLineFormItem[] = [
      { accountId: cashOrBank ? cashOrBank.id : 0, debit: '', credit: '', description: '' },
      { accountId: equityAcc ? equityAcc.id : 0, debit: '', credit: '', description: '' },
    ];
    setLines(initialLines);
    setNarration(computeDynamicNarration('OPENING_BALANCE', initialLines, activeAccounts));
    setIsCreateModalOpen(true);
  };

  const handlePurposeChange = (newPurpose: JournalPurposeType) => {
    setPurpose(newPurpose);
    if (!isCustomNarration) {
      setNarration(computeDynamicNarration(newPurpose, lines, activeAccounts));
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { accountId: 0, debit: '', credit: '', description: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    const nextLines = lines.filter((_, i) => i !== index);
    setLines(nextLines);
    if (!isCustomNarration) {
      setNarration(computeDynamicNarration(purpose, nextLines, activeAccounts));
    }
  };

  const handleLineChange = (index: number, field: keyof JournalLineFormItem, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Mutually exclusive debit / credit input per line
    if (field === 'debit' && value !== '') {
      newLines[index].credit = '';
    } else if (field === 'credit' && value !== '') {
      newLines[index].debit = '';
    }

    setLines(newLines);

    // Auto-update narration when accounts change if user hasn't overridden
    if (field === 'accountId' && !isCustomNarration) {
      setNarration(computeDynamicNarration(purpose, newLines, activeAccounts));
    }
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  const handleAutoBalance = () => {
    if (totalDebit === totalCredit) return;

    if (totalDebit > totalCredit) {
      const diff = (totalDebit - totalCredit).toFixed(2);
      // find first line with 0 debit/credit or update the last line
      const lastLineIndex = lines.length - 1;
      const updated = [...lines];
      if (updated[lastLineIndex].debit === '' && updated[lastLineIndex].credit === '') {
        updated[lastLineIndex].credit = diff;
      } else {
        const equity = activeAccounts.find((a) => a.code === '3010' || a.account_type === 'EQUITY');
        updated.push({
          accountId: equity ? equity.id : 0,
          debit: '',
          credit: diff,
          description: 'Balancing credit line',
        });
      }
      setLines(updated);
    } else {
      const diff = (totalCredit - totalDebit).toFixed(2);
      const updated = [...lines];
      const lastLineIndex = lines.length - 1;
      if (updated[lastLineIndex].debit === '' && updated[lastLineIndex].credit === '') {
        updated[lastLineIndex].debit = diff;
      } else {
        const cash = activeAccounts.find((a) => a.code === '1010' || a.code === '1020');
        updated.push({
          accountId: cash ? cash.id : 0,
          debit: diff,
          credit: '',
          description: 'Balancing debit line',
        });
      }
      setLines(updated);
    }
  };

  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!narration.trim()) {
      setCreateError('Please enter a description / narration for this journal entry.');
      return;
    }

    if (!isBalanced) {
      setCreateError(`Journal entry is not balanced. Total Debits (Rs. ${totalDebit.toFixed(2)}) must exactly equal Total Credits (Rs. ${totalCredit.toFixed(2)}). Difference: Rs. ${difference.toFixed(2)}`);
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId) {
        setCreateError(`Please select an account for line #${i + 1}.`);
        return;
      }
      const dr = parseFloat(line.debit) || 0;
      const cr = parseFloat(line.credit) || 0;
      if (dr === 0 && cr === 0) {
        setCreateError(`Line #${i + 1} must have either a debit or credit amount.`);
        return;
      }
    }

    setIsCreating(true);
    try {
      await accountingService.createJournalEntry({
        entry_date: entryDate,
        purpose: purpose,
        reference_type: purpose,
        reference_id: referenceId.trim() || undefined,
        narration: narration.trim(),
        lines: lines.map((l) => ({
          account: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description.trim() || undefined,
        })),
      });

      setIsCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || err?.response?.data?.lines || err?.message || 'Failed to create journal entry.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.entry_number.toLowerCase().includes(q) ||
      e.reference_type.toLowerCase().includes(q) ||
      (e.reference_id && e.reference_id.toLowerCase().includes(q)) ||
      (e.narration && e.narration.toLowerCase().includes(q)) ||
      e.lines.some((l) => l.account_name.toLowerCase().includes(q) || l.account_code.includes(q))
    );
  });

  const handleOpenReverseModal = (entry: JournalEntry) => {
    setReversingEntry(entry);
    setReversalReason(`Reversal of ${entry.entry_number}`);
    setReversalError(null);
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingEntry) return;

    setIsReversing(true);
    setReversalError(null);
    try {
      await accountingService.reverseJournalEntry(reversingEntry.id, reversalReason);
      setReversingEntry(null);
      onRefresh();
    } catch (err: any) {
      setReversalError(err?.message || 'Failed to reverse journal entry.');
    } finally {
      setIsReversing(false);
    }
  };

  const getReferenceBadgeVariant = (refType: string) => {
    switch (refType) {
      case 'SALE':
        return 'success';
      case 'SALE_RETURN':
        return 'warning';
      case 'EXPENSE':
        return 'danger';
      case 'CUSTOMER_PAYMENT':
      case 'SUPPLIER_PAYMENT':
        return 'info';
      case 'OPENING_BALANCE':
        return 'phase';
      default:
        return 'info';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Search & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ width: '320px' }}>
          <Input
            placeholder="Search entry #, reference, or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>

        <Button
          variant="primary"
          icon={<Plus size={14} />}
          onClick={handleOpenCreateModal}
          style={{ padding: '0.45rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700 }}
        >
          New Journal Entry
        </Button>
      </div>

      {/* Entries List Card */}
      <Card
        title="Double-Entry Journal Vouchers"
        icon={<BookOpen size={16} />}
      >
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No journal entries matching query.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredEntries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div
                  key={entry.id}
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.625rem',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header Row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isExpanded ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--primary-400)',
                        fontSize: '0.875rem',
                      }}>
                        {entry.entry_number}
                      </code>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        <Clock size={13} />
                        <span>{entry.entry_date}</span>
                      </div>

                      <Badge variant={getReferenceBadgeVariant(entry.reference_type)}>
                        {entry.reference_type}
                      </Badge>

                      {entry.reference_id && (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Ref: <strong style={{ color: 'var(--text-main)' }}>{entry.reference_id}</strong>
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Total Debit/Credit</div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                          Rs. {entry.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <Badge variant={entry.status === 'POSTED' ? 'success' : entry.status === 'CANCELLED' ? 'danger' : 'warning'}>
                        {entry.status}
                      </Badge>

                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Narration */}
                  {entry.narration && (
                    <div style={{ padding: '0 1.25rem 0.5rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <em>{entry.narration}</em>
                    </div>
                  )}

                  {/* Expanded Lines Table */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-elevated)', padding: '1rem 1.25rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-subtle)' }}>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Account Code & Name</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Memo / Description</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Debit (DR)</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Credit (CR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line) => (
                            <tr key={line.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '0.625rem 0.75rem' }}>
                                <strong style={{ color: 'var(--text-main)' }}>[{line.account_code}]</strong> {line.account_name}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{line.account_type}</span>
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                                {line.description || '—'}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: line.debit > 0 ? 'var(--primary-400)' : 'var(--text-subtle)' }}>
                                {line.debit > 0 ? `Rs. ${line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: line.credit > 0 ? 'var(--warning)' : 'var(--text-subtle)' }}>
                                {line.credit > 0 ? `Rs. ${line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '1px solid var(--border-medium)', fontWeight: 700 }}>
                            <td colSpan={3} style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-main)' }}>Total:</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                              Rs. {entry.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                              Rs. {entry.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                          <span>Double-Entry Verified: Total Debit strictly equals Total Credit</span>
                        </div>

                        {entry.status === 'POSTED' && entry.reference_type !== 'REVERSAL' && (
                          <Button
                            variant="outline"
                            icon={<RotateCcw size={13} />}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReverseModal(entry);
                            }}
                          >
                            Reverse Entry
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Reverse Modal */}
      <Modal
        isOpen={!!reversingEntry}
        onClose={() => setReversingEntry(null)}
        title={`Reverse Journal Entry: ${reversingEntry?.entry_number}`}
      >
        {reversalError && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
          }}>
            {reversalError}
          </div>
        )}

        <form onSubmit={handleExecuteReversal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Reason for Reversal *"
            placeholder="e.g. Invoiced wrong customer / Sale cancelled"
            value={reversalReason}
            onChange={(e) => setReversalReason(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setReversingEntry(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isReversing}>
              Confirm Reversal
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Journal Entry Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isCreating && setIsCreateModalOpen(false)}
        title="Create General Journal Entry"
        maxWidth="820px"
      >
        {createError && (
          <div
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '0.78125rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateJournalEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top Form Grid: Purpose / Reference Type, Date, Reference # */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {/* Purpose Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Entry Purpose / Type *
              </label>
              <select
                value={purpose}
                onChange={(e) => handlePurposeChange(e.target.value as JournalPurposeType)}
                style={{
                  padding: '0.45rem 0.6rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="OPENING_BALANCE">🏛️ Opening Balance / Initial Capital</option>
                <option value="MANUAL">📝 General Manual Journal Voucher</option>
                <option value="TRANSFER">🔄 Account Fund Transfer (Cash / Bank)</option>
                <option value="EXPENSE">💼 Expense Accrual / Prepayment</option>
                <option value="STOCK_ADJUSTMENT">📦 Stock & Asset Value Adjustment</option>
                <option value="REVERSAL">⚖️ Correction / Rectification Entry</option>
              </select>
            </div>

            {/* Entry Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Posting Date *
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                style={{
                  padding: '0.45rem 0.6rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Reference Document / Voucher # */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Voucher / Document Ref #
              </label>
              <input
                type="text"
                placeholder="e.g. OB-2026-001 or JV-101"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                style={{
                  padding: '0.45rem 0.6rem',
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

          {/* Description / Narration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Narration / Entry Memo *
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomNarration(false);
                  setNarration(computeDynamicNarration(purpose, lines, activeAccounts));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-400)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                title="Reset to intelligent auto-generated narration"
              >
                <Sparkles size={11} />
                Auto-Generate from Accounts
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. Fund Transfer from Cash to Bank..."
              value={narration}
              onChange={(e) => {
                setNarration(e.target.value);
                setIsCustomNarration(true);
              }}
              required
              style={{
                padding: '0.45rem 0.6rem',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Dynamic Debit / Credit Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Journal Line Items (Debit & Credit Accounts) *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!isBalanced && totalDebit > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '0.25rem',
                      color: 'var(--primary-400)',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Sparkles size={11} />
                    Auto-Balance Line
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddLine}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.25rem',
                    color: 'var(--text-main)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Plus size={11} />
                  Add Row
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.375rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78125rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.45rem 0.6rem', width: '48%' }}>Account</th>
                    <th style={{ padding: '0.45rem 0.6rem', width: '24%', textAlign: 'right' }}>Debit (Rs.)</th>
                    <th style={{ padding: '0.45rem 0.6rem', width: '24%', textAlign: 'right' }}>Credit (Rs.)</th>
                    <th style={{ padding: '0.45rem 0.4rem', width: '4%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      {/* Account Selector */}
                      <td style={{ padding: '0.35rem 0.5rem' }}>
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(idx, 'accountId', parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '0.3rem 0.45rem',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '0.25rem',
                            color: 'var(--text-main)',
                            fontSize: '0.75rem',
                            outline: 'none',
                          }}
                        >
                          <option value={0}>-- Select Account --</option>
                          {activeAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              [{acc.code}] {acc.name} ({acc.account_type})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Debit Input */}
                      <td style={{ padding: '0.35rem 0.5rem' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.3rem 0.45rem',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '0.25rem',
                            color: line.debit ? 'var(--primary-400)' : 'var(--text-main)',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textAlign: 'right',
                            outline: 'none',
                          }}
                        />
                      </td>

                      {/* Credit Input */}
                      <td style={{ padding: '0.35rem 0.5rem' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.3rem 0.45rem',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '0.25rem',
                            color: line.credit ? 'var(--warning)' : 'var(--text-main)',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textAlign: 'right',
                            outline: 'none',
                          }}
                        />
                      </td>

                      {/* Remove Button */}
                      <td style={{ padding: '0.35rem 0.4rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 2}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: lines.length <= 2 ? 'var(--text-subtle)' : 'var(--danger)',
                            cursor: lines.length <= 2 ? 'not-allowed' : 'pointer',
                            padding: '0.2rem',
                            borderRadius: '0.2rem',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Summary Footer */}
                <tfoot>
                  <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', borderTop: '1px solid var(--border-medium)', fontWeight: 800 }}>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                      Totals:
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                      Rs. {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                      Rs. {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>
                      {isBalanced ? (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={12} />
                          Balanced
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--danger)' }}>
                          Diff: Rs. {difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: isBalanced ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {isBalanced ? (
                <>
                  <CheckCircle2 size={14} color="var(--success)" />
                  <span>Double-entry balanced. Ready for posting.</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} color="var(--warning)" />
                  <span>Debits must equal Credits to post.</span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isCreating} disabled={!isBalanced}>
                Post Journal Entry
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
