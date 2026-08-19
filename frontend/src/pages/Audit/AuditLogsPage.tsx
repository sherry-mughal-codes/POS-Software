import React, { useState, useEffect, useCallback } from 'react';
import { History, User, Clock, Globe, RefreshCw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { userService } from '../../services/userService';
import { AuditLogEntry } from '../../types/auth';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAuditLogs();
      setLogs(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load security audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'success';
      case 'LOGOUT':
        return 'info';
      case 'LOGIN_FAILED':
      case 'USER_DEACTIVATED':
        return 'danger';
      case 'USER_CREATED':
      case 'USER_ACTIVATED':
        return 'primary';
      case 'ROLE_MODIFIED':
      case 'ROLE_ASSIGNED':
        return 'warning';
      default:
        return 'phase';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Security Audit Logs
          </h2>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw size={13} />}
          loading={loading}
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
          onClick={fetchLogs}
        >
          Refresh
        </Button>
      </div>

      {/* Audit Log Table Card */}
      <Card
        title="Audit Events Log"
        icon={<History size={16} />}
      >
        {loading ? (
          <LoadingSpinner label="Loading audit logs..." />
        ) : error ? (
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: '0.5rem',
            color: 'var(--danger)',
          }}>
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No audit records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>User</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>IP Address</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Event Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Timestamp */}
                    <td style={{ padding: '0.45rem 0.6rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <Clock size={12} />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Username */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={15} style={{ color: 'var(--primary-400)' }} />
                        <strong style={{ color: 'var(--text-main)' }}>{log.username}</strong>
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '1rem' }}>
                      <Badge variant={getActionBadgeVariant(log.action) as any}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    {/* IP */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        <Globe size={13} />
                        <code>{log.ip_address || '127.0.0.1'}</code>
                      </div>
                    </td>

                    {/* Details */}
                    <td style={{ padding: '1rem' }}>
                      <code style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        color: '#38bdf8',
                      }}>
                        {JSON.stringify(log.details)}
                      </code>
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
