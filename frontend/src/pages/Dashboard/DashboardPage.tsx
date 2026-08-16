import React from 'react';
import {
  Database,
  XCircle,
  RefreshCw,
  Clock,
  Terminal,
  UserCheck,
  Users,
  Shield,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { HealthCheckResponse } from '../../types/api';
import { useAuth } from '../../hooks/useAuth';

interface DashboardPageProps {
  healthData: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigate: (tabId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  healthData,
  loading,
  error,
  onRefresh,
  onNavigate,
}) => {
  const { user, hasPermission } = useAuth();
  const isHealthy = healthData?.status === 'healthy';
  const isDbConnected = healthData?.services.database.status === 'connected';

  const primaryRole = user?.roles?.[0] || (user?.is_superuser ? 'Administrator' : 'User');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Banner */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(14, 116, 144, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Badge variant="phase">Phase 1 Active</Badge>
            <Badge variant="success" pulse>RBAC & Auth Enforced</Badge>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Security, Roles & User Access Control
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Welcome, <strong style={{ color: 'var(--text-main)' }}>{user?.first_name || user?.username}</strong> ({primaryRole}). Role-based access control is actively enforced on both React navigation and Django REST Framework API endpoints.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="primary"
            icon={<RefreshCw size={16} />}
            loading={loading}
            onClick={onRefresh}
          >
            Run Health Probe
          </Button>
        </div>
      </div>

      {/* Current Session Security Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Active Session Card */}
        <Card
          title="Active Authenticated Session"
          subtitle={`Logged in as @${user?.username}`}
          icon={<UserCheck size={20} />}
          action={
            <Badge variant={primaryRole === 'Administrator' ? 'danger' : primaryRole === 'Manager' ? 'warning' : 'info'}>
              {primaryRole}
            </Badge>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assigned Roles:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{user?.roles.join(', ') || 'None'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Effective Permissions:</span>
              <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
                {user?.is_superuser ? 'All System Capabilities' : `${user?.effective_permissions.length || 0} permissions`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Authentication Token:</span>
              <code style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                JWT Bearer (Valid)
              </code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Quick POS PIN:</span>
              <span style={{ color: user?.profile?.pin_code ? 'var(--success)' : 'var(--text-muted)', fontWeight: 500 }}>
                {user?.profile?.pin_code ? 'Configured' : 'Not Set'}
              </span>
            </div>
          </div>
        </Card>

        {/* User & Role Management Quick Links */}
        <Card
          title="Security Management"
          subtitle="Access-control administration"
          icon={<Shield size={20} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {hasPermission('manage_users') ? (
              <button
                onClick={() => onNavigate('users')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-500)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Users size={16} style={{ color: 'var(--primary-400)' }} />
                  <div>
                    <strong>User Management</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Create operators, toggle active status</div>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            ) : (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-app)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
                User Management is restricted for your role.
              </div>
            )}

            {hasPermission('manage_roles') ? (
              <button
                onClick={() => onNavigate('roles')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-500)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--primary-400)' }} />
                  <div>
                    <strong>Roles & Permissions</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inspect role matrix & assign permissions</div>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            ) : null}
          </div>
        </Card>

        {/* Database & Environment Status */}
        <Card
          title="Infrastructure State"
          subtitle="PostgreSQL & Backend Health"
          icon={<Database size={20} />}
          action={
            <Badge variant={isDbConnected ? 'success' : 'danger'}>
              {isDbConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Database Engine:</span>
              <code style={{ color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>PostgreSQL 16</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Query Latency:</span>
              <span style={{ color: isDbConnected ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {healthData?.services.database.latency_ms !== undefined ? `${healthData.services.database.latency_ms} ms` : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Authentication Layer:</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>SimpleJWT + DRF RBAC</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Health Probe Diagnostic Response */}
      <Card
        title="Live End-to-End Diagnostic Probe"
        subtitle="Real-time verification of Frontend ➔ Backend ➔ PostgreSQL communication"
        icon={<Terminal size={20} />}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {healthData && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Clock size={14} /> Total Latency: <strong style={{ color: 'var(--text-main)' }}>{healthData.total_latency_ms} ms</strong>
              </span>
            )}
            <Badge variant={isHealthy ? 'success' : 'danger'}>
              {isHealthy ? '200 OK' : 'Unavailable'}
            </Badge>
          </div>
        }
      >
        {error ? (
          <div style={{
            padding: '1.25rem',
            borderRadius: '0.5rem',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <XCircle size={20} />
            <div>
              <strong>Connection Error:</strong> {error}.
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'var(--bg-app)',
            borderRadius: '0.625rem',
            padding: '1.25rem',
            border: '1px solid var(--border-subtle)',
            overflowX: 'auto',
          }}>
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              color: '#38bdf8',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {healthData ? JSON.stringify(healthData, null, 2) : 'Loading live diagnostic response...'}
            </pre>
          </div>
        )}
      </Card>

      {/* Up Next: Phase 2 Banner */}
      <div className="glass-card" style={{
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        borderLeft: '4px solid var(--accent-500)',
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Up Next: Phase 2
          </span>
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem' }}>
            Chart of Accounts & Accounting Foundation
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Double-entry ledger structure, accounts hierarchy, debit/credit journal rules, and financial transaction immutability.
          </p>
        </div>
        <Badge variant="phase">Ready for Phase 2</Badge>
      </div>
    </div>
  );
};
