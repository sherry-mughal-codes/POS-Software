import React, { useState } from 'react';
import { BookOpen, Search, RotateCcw, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { JournalEntry } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';

interface JournalEntriesTabProps {
  entries: JournalEntry[];
  loading: boolean;
  onRefresh: () => void;
}

export const JournalEntriesTab: React.FC<JournalEntriesTabProps> = ({
  entries,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reversingEntry, setReversingEntry] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ width: '320px' }}>
          <Input
            placeholder="Search entry #, reference, or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
      </div>

      {/* Entries List Card */}
      <Card
        title="Double-Entry Journal Vouchers"
        subtitle={`${filteredEntries.length} chronological journal transactions`}
        icon={<BookOpen size={20} />}
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
        subtitle="Creates an exact inverse balancing transaction without modifying historical records."
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
    </div>
  );
};
