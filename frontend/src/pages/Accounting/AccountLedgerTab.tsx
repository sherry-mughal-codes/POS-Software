import React, { useState, useEffect, useCallback } from 'react';
import { Book, RefreshCw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Account, AccountLedgerResponse } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';

interface AccountLedgerTabProps {
  accounts: Account[];
  initialAccountId?: number | null;
}

export const AccountLedgerTab: React.FC<AccountLedgerTabProps> = ({
  accounts,
  initialAccountId,
}) => {
  const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
  const postingAccounts = accounts.filter((a) => isLeaf(a));

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    initialAccountId || (postingAccounts.length > 0 ? postingAccounts[0].id : null)
  );
  const [ledgerData, setLedgerData] = useState<AccountLedgerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = useCallback(async (accId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountingService.getAccountLedger(accId);
      setLedgerData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch account ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger(selectedAccountId);
    }
  }, [selectedAccountId, fetchLedger]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Account Selector Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '480px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
            Select Account:
          </label>
          <select
            value={selectedAccountId || ''}
            onChange={(e) => setSelectedAccountId(parseInt(e.target.value, 10))}
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
            {postingAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                [{acc.code}] {acc.name} ({acc.account_type})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} />}
            loading={loading}
            onClick={() => selectedAccountId && fetchLedger(selectedAccountId)}
          >
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* Account Metric Summary */}
      {selectedAccount && ledgerData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Account Code & Name</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>
              [{selectedAccount.code}] {selectedAccount.name}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Badge variant="info">{selectedAccount.account_type}</Badge>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Normal Balance</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-400)', marginTop: '0.25rem' }}>
              {selectedAccount.normal_balance}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Total Debits</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              Rs. {ledgerData.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Total Credits</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              Rs. {ledgerData.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', borderColor: 'var(--primary-400)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Current Balance</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              Rs. {ledgerData.closing_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Statement of Account Table */}
      <Card
        title="Chronological Statement of Account"
        subtitle={`Audit transactions for ${selectedAccount?.name || 'selected account'}`}
        icon={<Book size={20} />}
      >
        {loading ? (
          <LoadingSpinner label="Loading account ledger statement..." />
        ) : error ? (
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '0.5rem' }}>
            {error}
          </div>
        ) : !ledgerData || ledgerData.rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No posted transactions found for this account.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Entry #</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ref</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Description / Narration</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Debit (DR)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Credit (CR)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {row.entry_date}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                        {row.entry_number}
                      </code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant="phase">{row.reference_type}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-main)' }}>
                      {row.description || '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.debit > 0 ? 'var(--primary-400)' : 'var(--text-subtle)' }}>
                      {row.debit > 0 ? `Rs. ${row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: row.credit > 0 ? 'var(--warning)' : 'var(--text-subtle)' }}>
                      {row.credit > 0 ? `Rs. ${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                      Rs. {row.running_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
