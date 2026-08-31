import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/Auth/LoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { ReportsCenterPage } from './pages/Reports/ReportsCenterPage';
import { UsersPage } from './pages/Users/UsersPage';
import { RolesPage } from './pages/Roles/RolesPage';
import { AuditLogsPage } from './pages/Audit/AuditLogsPage';
import { AccountingDashboardPage } from './pages/Accounting/AccountingDashboardPage';
import { ProductCatalogPage } from './pages/Products/ProductCatalogPage';
import { CustomersPage } from './pages/Customers/CustomersPage';
import { SuppliersPage } from './pages/Suppliers/SuppliersPage';
import { PurchasesDashboardPage } from './pages/Purchases/PurchasesDashboardPage';
import { InventoryDashboardPage } from './pages/Inventory/InventoryDashboardPage';
import { POSTerminalPage } from './pages/POS/POSTerminalPage';
import { SalesHistoryPage } from './pages/Sales/SalesHistoryPage';
import { SalesReportPage } from './pages/Sales/SalesReportPage';
import { ExpensesDashboardPage } from './pages/Expenses/ExpensesDashboardPage';
import { EmployeesDashboardPage } from './pages/Employees/EmployeesDashboardPage';
import { DaySessionsPage } from './pages/POS/DaySessionsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { WarrantyDashboardPage } from './pages/Warranty/WarrantyDashboardPage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Can } from './components/auth/Can';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, hasPermission } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isPOSSidebarOpen, setIsPOSSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (hasPermission('view_dashboard') || hasPermission('view_dashboard_analytics')) {
        setCurrentTab('dashboard');
      } else if (hasPermission('access_pos_register')) {
        setCurrentTab('register');
      } else if (hasPermission('view_product') || hasPermission('manage_products')) {
        setCurrentTab('products');
      } else if (hasPermission('view_sale')) {
        setCurrentTab('sales');
      } else if (hasPermission('view_customer')) {
        setCurrentTab('customers');
      } else if (hasPermission('view_purchase')) {
        setCurrentTab('purchases');
      } else if (hasPermission('view_stockmovement')) {
        setCurrentTab('inventory');
      } else if (hasPermission('view_expense')) {
        setCurrentTab('expenses');
      } else if (hasPermission('view_account')) {
        setCurrentTab('accounting');
      } else if (hasPermission('view_employee')) {
        setCurrentTab('employees');
      } else if (
        hasPermission('view_reports') ||
        hasPermission('view_sales_reports') ||
        hasPermission('view_inventory_reports') ||
        hasPermission('export_reports')
      ) {
        setCurrentTab('reports');
      } else {
        setCurrentTab('register');
      }
    }
  }, [isAuthenticated, hasPermission]);

  useEffect(() => {
    if (currentTab === 'register') {
      setIsPOSSidebarOpen(false);
    }
  }, [currentTab]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <LoadingSpinner size="lg" label="Initializing ApexPOS Security Session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <MainLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      isPOSSidebarOpen={isPOSSidebarOpen}
    >
      {currentTab === 'dashboard' && (
        <Can
          anyOfPermissions={['view_dashboard', 'view_dashboard_analytics']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to access the Business Dashboard.
              </p>
            </div>
          }
        >
          <DashboardPage onNavigate={setCurrentTab} />
        </Can>
      )}

      {currentTab === 'reports' && (
        <Can
          anyOfPermissions={['view_reports', 'view_sales_reports', 'view_inventory_reports', 'export_reports']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to access the Reports Center.
              </p>
            </div>
          }
        >
          <ReportsCenterPage onNavigate={setCurrentTab} />
        </Can>
      )}

      {currentTab === 'products' && (
        <Can
          anyOfPermissions={['view_product', 'add_product', 'change_product', 'manage_products']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view or manage products.
              </p>
            </div>
          }
        >
          <ProductCatalogPage />
        </Can>
      )}

      {currentTab === 'purchases' && (
        <Can
          anyOfPermissions={['view_purchase', 'add_purchase', 'approve_purchases']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to access purchasing or invoices.
              </p>
            </div>
          }
        >
          <PurchasesDashboardPage />
        </Can>
      )}

      {currentTab === 'inventory' && (
        <Can
          anyOfPermissions={['view_stockmovement', 'view_stockadjustment', 'create_stock_adjustment']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view or adjust inventory.
              </p>
            </div>
          }
        >
          <InventoryDashboardPage />
        </Can>
      )}

      {currentTab === 'customers' && (
        <Can
          anyOfPermissions={['view_customer', 'add_customer', 'change_customer']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view customer accounts.
              </p>
            </div>
          }
        >
          <CustomersPage />
        </Can>
      )}

      {currentTab === 'suppliers' && (
        <Can
          anyOfPermissions={['view_supplier', 'add_supplier', 'change_supplier']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view supplier records.
              </p>
            </div>
          }
        >
          <SuppliersPage />
        </Can>
      )}

      {currentTab === 'register' && (
        <Can
          permission="access_pos_register"
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to open the POS register.
              </p>
            </div>
          }
        >
          <POSTerminalPage
            isSidebarVisible={isPOSSidebarOpen}
            onToggleSidebar={() => setIsPOSSidebarOpen((prev) => !prev)}
          />
        </Can>
      )}

      {currentTab === 'sales' && (
        <Can
          anyOfPermissions={['view_sale', 'add_sale', 'process_sale_return']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view sales records.
              </p>
            </div>
          }
        >
          <SalesHistoryPage />
        </Can>
      )}

      {currentTab === 'sales-reports' && (
        <Can
          anyOfPermissions={['view_financial_reports', 'view_sale']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view sales reports.
              </p>
            </div>
          }
        >
          <SalesReportPage />
        </Can>
      )}

      {currentTab === 'expenses' && (
        <Can
          anyOfPermissions={['view_expense', 'add_expense', 'change_expense']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to manage expenses.
              </p>
            </div>
          }
        >
          <ExpensesDashboardPage />
        </Can>
      )}

      {currentTab === 'employees' && (
        <Can
          anyOfPermissions={['view_employee', 'add_employee', 'change_employee', 'view_salaryslip', 'view_attendance', 'view_salarypayment']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view or manage employees & payroll.
              </p>
            </div>
          }
        >
          <EmployeesDashboardPage />
        </Can>
      )}

      {(currentTab === 'warranty' || currentTab === 'customer-warranty-claims' || currentTab === 'supplier-warranty-claims') && (
        <Can
          anyOfPermissions={[
            'view_customer_warranty_claim',
            'create_customer_warranty_claim',
            'view_supplier_warranty_claim',
            'create_supplier_warranty_claim',
            'view_sale',
            'view_purchase',
            'manage_products',
            'access_pos_register'
          ]}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view or manage Warranty Claims.
              </p>
            </div>
          }
        >
          <WarrantyDashboardPage />
        </Can>
      )}

      {(currentTab === 'day-sessions' || currentTab === 'pos' || currentTab === 'pos-sessions' || currentTab === 'z-reports') && (
        <Can
          anyOfPermissions={['close_register_z_report', 'view_posdaysession', 'add_posdaysession']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to manage day closing & sessions.
              </p>
            </div>
          }
        >
          <DaySessionsPage />
        </Can>
      )}

      {currentTab === 'accounting' && (
        <Can
          anyOfPermissions={['view_account', 'add_account', 'change_account', 'view_financial_reports']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to access the accounting ledger.
              </p>
            </div>
          }
        >
          <AccountingDashboardPage />
        </Can>
      )}

      {currentTab === 'users' && (
        <Can
          anyOfPermissions={['manage_users', 'view_user', 'add_user', 'change_user']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view or manage system users.
              </p>
            </div>
          }
        >
          <UsersPage />
        </Can>
      )}

      {currentTab === 'roles' && (
        <Can
          anyOfPermissions={['manage_roles', 'view_group', 'add_group', 'change_group']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to configure roles and permissions.
              </p>
            </div>
          }
        >
          <RolesPage />
        </Can>
      )}

      {currentTab === 'audit-logs' && (
        <Can
          anyOfPermissions={['view_audit_logs', 'view_auditlog']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to view security audit logs.
              </p>
            </div>
          }
        >
          <AuditLogsPage />
        </Can>
      )}

      {currentTab === 'settings' && (
        <Can
          anyOfPermissions={['view_systemsetting', 'change_systemsetting']}
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              <h3>Access Denied (403 Forbidden)</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Your assigned role does not have permission to access system settings.
              </p>
            </div>
          }
        >
          <SettingsPage />
        </Can>
      )}



      {!['dashboard', 'reports', 'products', 'purchases', 'inventory', 'register', 'sales', 'sales-reports', 'expenses', 'employees', 'day-sessions', 'customers', 'suppliers', 'accounting', 'users', 'roles', 'audit-logs', 'settings', 'warranty'].includes(currentTab) && (
        <NotFoundPage onGoHome={() => setCurrentTab('dashboard')} />
      )}
    </MainLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
