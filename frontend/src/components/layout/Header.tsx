import React, { useState, useEffect } from 'react';
import { Store, Clock, RefreshCw, LogOut } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { HealthCheckResponse } from '../../types/api';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';

interface HeaderProps {
  healthData: HealthCheckResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ healthData, loading, onRefresh }) => {
  const { user, logout } = useAuth();
  const { companyName, companyLogo, companyAddress } = useSettings();
  const [timeStr, setTimeStr] = useState<string>('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isHealthy = healthData?.status === 'healthy';

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const primaryRole = user?.roles?.[0] || (user?.is_superuser ? 'Administrator' : 'User');

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'rgba(13, 18, 31, 0.85)',
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
      }}
    >
      {/* Left: Store Brand & Branch info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem' }}>
          {companyLogo ? (
            <img
              src={companyLogo}
              alt="Store Logo"
              style={{
                height: '1.75rem',
                maxWidth: '3rem',
                objectFit: 'contain',
                borderRadius: '0.25rem',
              }}
            />
          ) : (
            <div
              style={{
                width: '1.75rem',
                height: '1.75rem',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-400)',
              }}
            >
              <Store size={16} />
            </div>
          )}
          <span style={{ color: 'var(--text-main)', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {companyName}
          </span>
          <span style={{ color: 'var(--text-subtle)' }}>•</span>
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              maxWidth: '280px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={companyAddress}
          >
            {companyAddress || 'Main Retail Branch'}
          </span>
        </div>
      </div>

      {/* Right: Live Clock + Status Indicator + Refresh + User Profile & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Real-time Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <Clock size={14} style={{ color: 'var(--primary-400)' }} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{timeStr}</span>
        </div>

        {/* Live Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: isHealthy ? 'var(--success)' : 'var(--warning)' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isHealthy ? 'var(--success)' : 'var(--warning)',
              display: 'inline-block',
              boxShadow: isHealthy ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
            }}
          />
          <span>{isHealthy ? 'Connected' : 'Connecting'}</span>
        </div>

        {/* Refresh Sync Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Sync status"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.375rem',
            padding: '0.35rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* User Pill & Logout */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingLeft: '1rem',
              borderLeft: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                background: 'var(--bg-elevated)',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.625rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
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
              onClick={() => setIsLogoutModalOpen(true)}
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

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => !isLoggingOut && setIsLogoutModalOpen(false)}
        title="Confirm Sign Out"
        subtitle="Are you sure you want to end your current session?"
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.875rem 1rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: '0.5rem',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
          }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)',
              flexShrink: 0,
            }}>
              <LogOut size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>Logging out of ApexPOS</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                You will need to enter your username and password to log in again. Any active open day sessions will remain safely recorded.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button
              variant="outline"
              onClick={() => setIsLogoutModalOpen(false)}
              disabled={isLoggingOut}
            >
              Cancel (Stay Logged In)
            </Button>
            <Button
              variant="danger"
              icon={<LogOut size={15} />}
              loading={isLoggingOut}
              onClick={async () => {
                setIsLoggingOut(true);
                try {
                  await logout();
                } finally {
                  setIsLoggingOut(false);
                  setIsLogoutModalOpen(false);
                }
              }}
            >
              Yes, Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  );
};
