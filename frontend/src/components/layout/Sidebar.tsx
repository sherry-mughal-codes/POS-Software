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
  Lock
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
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { hasPermission, hasRole } = useAuth();

  const navItems: NavItem[] = [
    { id: 'dashboard', name: 'Overview & Diagnostics', icon: <LayoutDashboard size={18} />, phase: 'Phase 0' },
    { id: 'products', name: 'Product Catalog', icon: <Package size={18} />, phase: 'Phase 3' },
    { id: 'purchases', name: 'Purchasing & Payables', icon: <ShoppingBag size={18} />, phase: 'Phase 5' },
    { id: 'inventory', name: 'Inventory & Stock Control', icon: <Boxes size={18} />, phase: 'Phase 6' },
    { id: 'customers', name: 'Customers', icon: <UserCheck size={18} />, phase: 'Phase 4' },
    { id: 'suppliers', name: 'Suppliers', icon: <Truck size={18} />, phase: 'Phase 4' },
    { id: 'accounting', name: 'Double Entry Ledger', icon: <BookOpen size={18} />, phase: 'Phase 2' },
    { id: 'users', name: 'User Management', icon: <Users size={18} />, phase: 'Phase 1', requiredPermission: 'manage_users' },
    { id: 'roles', name: 'Roles & Permissions', icon: <ShieldCheck size={18} />, phase: 'Phase 1', requiredPermission: 'manage_roles' },
    { id: 'audit-logs', name: 'Security Audit Logs', icon: <History size={18} />, phase: 'Phase 1', requiredPermission: 'view_audit_logs' },
    { id: 'register', name: 'POS Register', icon: <ShoppingCart size={18} />, phase: 'Phase 7', disabled: true },
    { id: 'sales', name: 'Sales & Receipts', icon: <Receipt size={18} />, phase: 'Phase 8', disabled: true },
    { id: 'expenses', name: 'Expenses', icon: <DollarSign size={18} />, phase: 'Phase 9', disabled: true },
    { id: 'employees', name: 'Employees & Shifts', icon: <UserCheck size={18} />, phase: 'Phase 10', disabled: true },
    { id: 'reports', name: 'Analytics & Reports', icon: <BarChart3 size={18} />, phase: 'Phase 12', disabled: true },
    { id: 'settings', name: 'System Settings', icon: <Settings size={18} />, phase: 'Phase 1', disabled: true },
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.625rem',
          background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)',
        }}>
          <Layers size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Apex<span className="text-gradient">POS</span>
          </h1>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Financial Core
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}>
        <div style={{ padding: '0.25rem 0.75rem', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Core & Finance
        </div>
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.625rem 0.75rem',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ color: isSelected ? 'var(--primary-400)' : 'inherit' }}>{item.icon}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? 600 : 500 }}>{item.name}</span>
              </div>
              {isLocked ? (
                <span title="Access Restricted by Role" style={{ color: 'var(--text-subtle)', display: 'flex', alignItems: 'center' }}>
                  <Lock size={13} />
                </span>
              ) : (
                <Badge variant={isSelected ? 'success' : 'phase'}>
                  {item.phase}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <strong>Ledger Engine:</strong> Double-Entry
          </div>
          <Badge variant="success" pulse>Active</Badge>
        </div>
      </div>
    </aside>
  );
};
