import React from 'react';
import { Server, Database, RefreshCw, LogOut } from 'lucide-react';
import { Badge } from '../common/Badge';
import { HealthCheckResponse } from '../../types/api';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  healthData: HealthCheckResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ healthData, loading, onRefresh }) => {
  const { user, logout } = useAuth();
  const isHealthy = healthData?.status === 'healthy';
  const isDbConnected = healthData?.services.database.status === 'connected';

  const primaryRole = user?.roles?.[0] || (user?.is_superuser ? 'Superuser' : 'User');

  return (
    <header style={{
      height: 'var(--header-height)',
      backgroundColor: 'rgba(13, 18, 31, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {/* Left: Breadcrumbs / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <span>Security & Access</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Phase 1 RBAC Foundation</span>
        </div>
      </div>

      {/* Right: Health Indicators + User Profile & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* PostgreSQL Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
          <Database size={15} style={{ color: isDbConnected ? 'var(--success)' : 'var(--danger)' }} />
          <span style={{ color: 'var(--text-muted)' }}>DB:</span>
          <Badge variant={isDbConnected ? 'success' : 'danger'} pulse={isDbConnected}>
            {isDbConnected ? 'Connected' : 'Offline'}
          </Badge>
        </div>

        {/* Django Backend Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
          <Server size={15} style={{ color: isHealthy ? 'var(--info)' : 'var(--warning)' }} />
          <span style={{ color: 'var(--text-muted)' }}>API:</span>
          <Badge variant={isHealthy ? 'info' : 'warning'}>
            {isHealthy ? 'REST v1' : 'Degraded'}
          </Badge>
        </div>

        {/* Refresh Ping Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Re-run health check"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-main)';
            e.currentTarget.style.borderColor = 'var(--border-medium)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* User Pill & Logout */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingLeft: '1rem',
            borderLeft: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              background: 'var(--bg-elevated)',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.625rem',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{
                width: '1.75rem',
                height: '1.75rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--primary-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.1 }}>
                  {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username}
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  @{user.username}
                </span>
              </div>
              <Badge variant={user.is_superuser || primaryRole === 'Administrator' ? 'danger' : primaryRole === 'Manager' ? 'warning' : 'info'}>
                {primaryRole}
              </Badge>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: 'var(--danger)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--danger-bg)';
                e.currentTarget.style.borderColor = 'var(--danger-border)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
