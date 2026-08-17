import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  History,
  ShoppingCart,
  Package,
  Truck,
  ShoppingBag,
  Receipt,
  Boxes,
  DollarSign,
  UserCheck,
  BookOpen,
  BarChart3,
  Settings,
  Layers,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { useAuth } from '../../hooks/useAuth';

export interface NavItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  phase: string;
  requiredPermission?: string;
  requiredRole?: string;
  disabled?: boolean;
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { hasPermission, hasRole } = useAuth();

  const navItems: NavItem[] = [
    { id: 'dashboard', name: 'Business Dashboard', icon: <LayoutDashboard size={18} />, phase: 'Phase 13' },
    { id: 'reports', name: 'Reports Center', icon: <BarChart3 size={18} />, phase: 'Phase 13' },
    { id: 'register', name: 'POS Register Terminal', icon: <ShoppingCart size={18} />, phase: 'Phase 7' },
    { id: 'sales', name: 'Sales & Receipts', icon: <Receipt size={18} />, phase: 'Phase 7' },
    { id: 'products', name: 'Product Catalog', icon: <Package size={18} />, phase: 'Phase 3' },
    { id: 'inventory', name: 'Inventory & Stock Control', icon: <Boxes size={18} />, phase: 'Phase 6' },
    { id: 'purchases', name: 'Purchasing & Payables', icon: <ShoppingBag size={18} />, phase: 'Phase 5' },
    { id: 'customers', name: 'Customers & Receivables', icon: <UserCheck size={18} />, phase: 'Phase 4' },
    { id: 'suppliers', name: 'Suppliers & Vendors', icon: <Truck size={18} />, phase: 'Phase 4' },
    { id: 'accounting', name: 'Double Entry Ledger', icon: <BookOpen size={18} />, phase: 'Phase 2' },
    { id: 'expenses', name: 'Expenses & Transfers', icon: <DollarSign size={18} />, phase: 'Phase 8' },
    { id: 'employees', name: 'Employees & Payroll', icon: <UserCheck size={18} />, phase: 'Phase 10' },
    { id: 'day-sessions', name: 'Day Closing & X/Z Reports', icon: <Lock size={18} />, phase: 'Phase 11' },
    { id: 'users', name: 'User Management', icon: <Users size={18} />, phase: 'Phase 1', requiredPermission: 'manage_users' },
    { id: 'roles', name: 'Roles & Permissions', icon: <ShieldCheck size={18} />, phase: 'Phase 1', requiredPermission: 'manage_roles' },
    { id: 'audit-logs', name: 'Security Audit Logs', icon: <History size={18} />, phase: 'Phase 1', requiredPermission: 'view_audit_logs' },
    { id: 'settings', name: 'System Settings', icon: <Settings size={18} />, phase: 'Phase 1', disabled: true },
  ];

  return (
    <aside
      style={{
        width: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        flexShrink: 0,
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: isCollapsed ? '1rem 0.5rem' : '1.25rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          <div
            style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)',
              flexShrink: 0,
            }}
          >
            <Layers size={18} />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Apex<span className="text-gradient">POS</span>
              </h1>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                Financial Core
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.375rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-main)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isCollapsed ? '0.75rem 0.375rem' : '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {!isCollapsed && (
          <div style={{ padding: '0.25rem 0.75rem', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Modules & Sales
          </div>
        )}

        {navItems.map((item) => {
          const isSelected = currentTab === item.id;

          let isPermitted = true;
          if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
            isPermitted = false;
          }
          if (item.requiredRole && !hasRole(item.requiredRole)) {
            isPermitted = false;
          }

          const isLocked = !isPermitted;
          const isDisabled = item.disabled || isLocked;

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && onSelectTab(item.id)}
              disabled={isDisabled}
              title={isCollapsed ? `${item.name} (${item.phase})` : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                width: '100%',
                padding: isCollapsed ? '0.625rem 0' : '0.625rem 0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: isSelected ? 'var(--primary-400)' : isLocked ? 'var(--text-subtle)' : item.disabled ? 'var(--text-subtle)' : 'var(--text-muted)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                outline: 'none',
                opacity: isLocked ? 0.45 : item.disabled ? 0.65 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isDisabled && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : '0.625rem' }}>
                <span style={{ color: isSelected ? 'var(--primary-400)' : 'inherit', display: 'flex' }}>{item.icon}</span>
                {!isCollapsed && <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? 600 : 500, whiteSpace: 'nowrap' }}>{item.name}</span>}
              </div>

              {!isCollapsed && (
                isLocked ? (
                  <span title="Access Restricted by Role" style={{ color: 'var(--text-subtle)', display: 'flex', alignItems: 'center' }}>
                    <Lock size={13} />
                  </span>
                ) : (
                  <Badge variant={isSelected ? 'success' : 'phase'}>
                    {item.phase}
                  </Badge>
                )
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!isCollapsed && (
        <div
          style={{
            padding: '0.875rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <strong>Ledger:</strong> Double-Entry
            </div>
            <Badge variant="success" pulse>Active</Badge>
          </div>
        </div>
      )}
    </aside>
  );
};
