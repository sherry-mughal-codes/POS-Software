import React, { useState, useEffect } from 'react';
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
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Store,
  Clock,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface NavItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requiredRole?: string;
  disabled?: boolean;
}

export interface NavGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
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
  const { user, logout, hasPermission, hasRole } = useAuth();
  const { companyName, companyLogo, companyAddress } = useSettings();

  const [timeStr, setTimeStr] = useState<string>('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Live real-time clock
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

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  // Persisted collapsible state for each group
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('apexpos_sidebar_groups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem('apexpos_sidebar_groups', JSON.stringify(next));
      return next;
    });
  };

  // Permission check helper
  const isItemPermitted = (item: NavItem): boolean => {
    if (user?.is_superuser && (!user.roles || user.roles.length === 0)) return true;

    if (item.requiredRole && !hasRole(item.requiredRole)) {
      return false;
    }

    if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
      return false;
    }

    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasAny = item.requiredPermissions.some((p) => hasPermission(p));
      if (!hasAny) return false;
    }

    return true;
  };

  // Structured Module Groups with granular permissions
  const navGroups: NavGroup[] = [
    {
      id: 'dashboard-reports',
      title: 'Dashboard & Reports',
      icon: <LayoutDashboard size={18} />,
      items: [
        {
          id: 'dashboard',
          name: 'Business Dashboard',
          icon: <LayoutDashboard size={16} />,
          requiredPermissions: ['view_dashboard', 'view_dashboard_analytics'],
        },
        {
          id: 'reports',
          name: 'Reports Center',
          icon: <BarChart3 size={16} />,
          requiredPermissions: ['view_reports', 'view_sales_reports', 'view_inventory_reports', 'export_reports'],
        },
      ],
    },
    {
      id: 'pos-sales',
      title: 'POS and Sales',
      icon: <ShoppingCart size={18} />,
      items: [
        {
          id: 'register',
          name: 'POS Register Terminal',
          icon: <ShoppingCart size={16} />,
          requiredPermissions: ['access_pos_register'],
        },
        {
          id: 'sales',
          name: 'Sales & Receipts',
          icon: <Receipt size={16} />,
          requiredPermissions: ['view_sale', 'add_sale', 'process_sale_return'],
        },
        {
          id: 'customers',
          name: 'Customers & Receivables',
          icon: <UserCheck size={16} />,
          requiredPermissions: ['view_customer', 'add_customer', 'change_customer'],
        },
        {
          id: 'day-sessions',
          name: 'Day Closing & X/Z Reports',
          icon: <Lock size={16} />,
          requiredPermissions: ['close_register_z_report', 'view_posdaysession', 'add_posdaysession'],
        },
      ],
    },
    {
      id: 'purchases-payables',
      title: 'Purchases & Payables',
      icon: <ShoppingBag size={18} />,
      items: [
        {
          id: 'purchases',
          name: 'Purchasing & Invoices',
          icon: <ShoppingBag size={16} />,
          requiredPermissions: ['view_purchase', 'add_purchase', 'approve_purchases'],
        },
        {
          id: 'suppliers',
          name: 'Suppliers & Payables',
          icon: <Truck size={16} />,
          requiredPermissions: ['view_supplier', 'add_supplier', 'change_supplier'],
        },
      ],
    },
    {
      id: 'inventory-stock',
      title: 'Inventory & Stock',
      icon: <Package size={18} />,
      items: [
        {
          id: 'products',
          name: 'Product Catalog',
          icon: <Package size={16} />,
          requiredPermissions: ['view_product', 'add_product', 'change_product', 'manage_products'],
        },
        {
          id: 'inventory',
          name: 'Inventory & Stock Control',
          icon: <Boxes size={16} />,
          requiredPermissions: ['view_stockmovement', 'view_stockadjustment', 'create_stock_adjustment'],
        },
      ],
    },
    {
      id: 'warranty-claims-group',
      title: 'Warranty Claims',
      icon: <ShieldCheck size={18} />,
      items: [
        {
          id: 'warranty',
          name: 'Warranty Claims',
          icon: <ShieldCheck size={16} />,
          requiredPermissions: ['view_customer_warranty_claim', 'create_customer_warranty_claim', 'view_sale', 'view_supplier_warranty_claim', 'create_supplier_warranty_claim'],
        },
      ],
    },
    {
      id: 'expense-ledger',
      title: 'Expense & Accounting',
      icon: <BookOpen size={18} />,
      items: [
        {
          id: 'expenses',
          name: 'Expense Management',
          icon: <DollarSign size={16} />,
          requiredPermissions: ['view_expense', 'add_expense', 'change_expense'],
        },
        {
          id: 'accounting',
          name: 'Double Entry Ledger',
          icon: <BookOpen size={16} />,
          requiredPermissions: ['view_account', 'add_account', 'change_account', 'view_financial_reports'],
        },
      ],
    },
    {
      id: 'employee-payroll',
      title: 'Employees & Payroll',
      icon: <Users size={18} />,
      items: [
        {
          id: 'employees',
          name: 'Employees & Payroll',
          icon: <Users size={16} />,
          requiredPermissions: ['view_employee', 'add_employee', 'change_employee', 'view_salaryslip', 'view_attendance', 'view_salarypayment'],
        },
      ],
    },
    {
      id: 'admin-security',
      title: 'Admin & System',
      icon: <Settings size={18} />,
      items: [
        {
          id: 'settings',
          name: 'System Settings',
          icon: <Settings size={16} />,
          requiredPermissions: ['view_systemsetting', 'change_systemsetting'],
        },
        {
          id: 'audit-logs',
          name: 'Security Audit Log',
          icon: <History size={16} />,
          requiredPermissions: ['view_audit_logs', 'view_auditlog'],
        },
        {
          id: 'users',
          name: 'User Management',
          icon: <Users size={16} />,
          requiredPermissions: ['manage_users', 'view_user', 'add_user', 'change_user'],
        },
        {
          id: 'roles',
          name: 'Roles & Permissions',
          icon: <ShieldCheck size={16} />,
          requiredPermissions: ['manage_roles', 'view_group', 'add_group', 'change_group'],
        },
      ],
    },
  ];

  // Auto-expand group containing the active tab
  useEffect(() => {
    navGroups.forEach((group) => {
      if (group.items.some((item) => item.id === currentTab)) {
        if (collapsedGroups[group.id]) {
          setCollapsedGroups((prev) => ({ ...prev, [group.id]: false }));
        }
      }
    });
  }, [currentTab]);

  return (
    <>
      <aside
        style={{
          width: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          flexShrink: 0,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          zIndex: 20,
          userSelect: 'none',
        }}
      >
        {/* Top Section: Store Brand & Live Clock */}
        <div
          style={{
            padding: isCollapsed ? '0.875rem 0.5rem' : '1rem 1rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Store Logo and Name */}
          {isCollapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt="Store Logo"
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    objectFit: 'contain',
                    borderRadius: '0.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '0.5rem',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)',
                  }}
                >
                  <Store size={18} />
                </div>
              )}

              <button
                onClick={onToggleCollapse}
                title="Expand Sidebar"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  width: '1.75rem',
                  height: '1.75rem',
                  transition: 'all 0.15s ease',
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
                <ChevronRight size={15} />
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0, overflow: 'hidden' }}>
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt="Store Logo"
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      objectFit: 'contain',
                      borderRadius: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)',
                      flexShrink: 0,
                    }}
                  >
                    <Store size={18} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={companyName}
                  >
                    {companyName || 'ApexPOS Store'}
                  </div>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.3,
                    }}
                    title={companyAddress}
                  >
                    {companyAddress || 'Main Retail Branch'}
                  </span>
                </div>
              </div>

              {/* Toggle Collapse Button */}
              <button
                onClick={onToggleCollapse}
                title="Collapse Sidebar"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
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
                <ChevronLeft size={15} />
              </button>
            </div>
          )}

          {/* Date & Time Clock (Clean minimalist display when expanded) */}
          {!isCollapsed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.625rem',
                borderRadius: '0.425rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Clock size={12} style={{ color: 'var(--primary-400)' }} />
              <span style={{ fontSize: '0.71875rem', fontWeight: 600 }}>{timeStr}</span>
            </div>
          )}
        </div>

        {/* Navigation Groups List */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isCollapsed ? '0.75rem 0.375rem' : '0.875rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {navGroups
            .map((group) => ({
              ...group,
              items: group.items.filter((item) => isItemPermitted(item) && !item.disabled),
            }))
            .filter((group) => group.items.length > 0)
            .map((group) => {
              const isGroupCollapsed = !!collapsedGroups[group.id];
              const hasActiveChild = group.items.some((item) => item.id === currentTab);

              // In collapsed sidebar mode (icon-only mode)
              if (isCollapsed) {
                return (
                  <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div
                      style={{
                        height: '1px',
                        backgroundColor: 'var(--border-subtle)',
                        margin: '0.25rem 0.5rem',
                        opacity: 0.5,
                      }}
                    />
                    {group.items.map((item) => {
                      const isSelected = currentTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => onSelectTab(item.id)}
                          title={item.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '2.5rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                            color: isSelected ? 'var(--primary-400)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {item.icon}
                        </button>
                      );
                    })}
                  </div>
                );
              }

              // Full Expanded Sidebar Mode with Collapsible Groups
              return (
                <div
                  key={group.id}
                  style={{
                    borderRadius: '0.625rem',
                    backgroundColor: hasActiveChild ? 'rgba(56, 189, 248, 0.03)' : 'transparent',
                    border: hasActiveChild ? '1px solid rgba(56, 189, 248, 0.15)' : '1px solid rgba(255, 255, 255, 0.03)',
                    padding: '0.25rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Group Heading Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    title={group.title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.5rem 0.625rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      color: hasActiveChild ? 'var(--primary-400)' : 'var(--text-main)',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                      <span style={{ display: 'flex', color: hasActiveChild ? 'var(--primary-400)' : 'var(--text-muted)' }}>
                        {group.icon}
                      </span>
                      <span
                        title={group.title}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {group.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.25rem', flexShrink: 0 }}>
                      <ChevronDown
                        size={14}
                        style={{
                          transform: isGroupCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          color: hasActiveChild ? 'var(--primary-400)' : 'var(--text-subtle)',
                        }}
                      />
                    </div>
                  </button>

                  {/* Sub-Modules List */}
                  {!isGroupCollapsed && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        padding: '0.375rem 0 0.25rem 0.625rem',
                      }}
                    >
                      {group.items.map((item) => {
                        const isSelected = currentTab === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => onSelectTab(item.id)}
                            title={item.name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              minHeight: '2.25rem',
                              padding: '0.45rem 0.625rem 0.45rem 0.75rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                              color: isSelected ? 'var(--primary-400)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s ease',
                              outline: 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                                e.currentTarget.style.color = 'var(--text-main)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-muted)';
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, overflow: 'hidden' }}>
                              <span style={{ color: isSelected ? 'var(--primary-400)' : 'inherit', display: 'flex', flexShrink: 0 }}>
                                {item.icon}
                              </span>
                              <span
                                title={item.name}
                                style={{
                                  fontSize: '0.8125rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {item.name}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        {/* Bottom Section: User Profile (Avatar + Username) & Logout */}
        <div
          style={{
            padding: isCollapsed ? '0.625rem 0.375rem' : '0.875rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {isCollapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              {/* User Avatar */}
              <div
                style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-400)',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                }}
                title={`@${user?.username || 'user'}`}
              >
                {user?.first_name ? user.first_name[0].toUpperCase() : user?.username?.[0]?.toUpperCase() || 'U'}
              </div>

              {/* Logout Button */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                title="Log out of session"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '0.375rem',
                  padding: '0.25rem',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  width: '1.75rem',
                  height: '1.75rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.borderColor = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>
              {/* User Avatar + Username */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-400)',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  {user?.first_name ? user.first_name[0].toUpperCase() : user?.username?.[0]?.toUpperCase() || 'U'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2,
                    }}
                  >
                    @{user?.username || 'user'}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                title="Log out of session"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '0.375rem',
                  padding: '0.45rem',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.borderColor = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Confirm Logout Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Confirm Session Logout"
        maxWidth="440px"
      >
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          Are you sure you want to log out of your session, <strong style={{ color: 'var(--text-main)' }}>@{user?.username}</strong>?
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
            Any unsaved changes in draft forms will be safely retained.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button
            variant="outline"
            onClick={() => setIsLogoutModalOpen(false)}
            disabled={isLoggingOut}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmLogout}
            loading={isLoggingOut}
            icon={<LogOut size={16} />}
          >
            Confirm Logout
          </Button>
        </div>
      </Modal>
    </>
  );
};
