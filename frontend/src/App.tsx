import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
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
import { NotFoundPage } from './pages/NotFound/NotFoundPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Can } from './components/auth/Can';
import { healthService } from './services/healthService';
import { HealthCheckResponse } from './types/api';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await healthService.getHealth();
      setHealthData(data);
    } catch (err: any) {
      console.error('Failed to connect to Django API backend:', err);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

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
      healthData={healthData}
      loading={healthLoading}
      onRefreshHealth={fetchHealth}
    >
      {currentTab === 'dashboard' && (
        <DashboardPage onNavigate={setCurrentTab} />
      )}

      {currentTab === 'reports' && (
        <ReportsCenterPage onNavigate={setCurrentTab} />
      )}

      {currentTab === 'products' && (
        <ProductCatalogPage />
      )}

      {currentTab === 'purchases' && (
        <PurchasesDashboardPage />
      )}

      {currentTab === 'inventory' && (
        <InventoryDashboardPage />
      )}

      {currentTab === 'customers' && (
        <CustomersPage />
      )}

      {currentTab === 'suppliers' && (
        <SuppliersPage />
      )}

      {currentTab === 'register' && (
        <POSTerminalPage />
      )}

      {currentTab === 'sales' && (
        <SalesHistoryPage />
      )}

      {currentTab === 'sales-reports' && (
        <SalesReportPage />
      )}

      {currentTab === 'expenses' && (
        <ExpensesDashboardPage />
      )}

      {currentTab === 'employees' && (
        <EmployeesDashboardPage />
      )}

      {currentTab === 'day-sessions' && (
        <DaySessionsPage />
      )}

      {currentTab === 'accounting' && (
        <AccountingDashboardPage />
      )}

      {currentTab === 'users' && (
        <Can
          permission="manage_users"
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
          permission="manage_roles"
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
          permission="view_audit_logs"
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
        <SettingsPage />
      )}

      {!['dashboard', 'reports', 'products', 'purchases', 'inventory', 'register', 'sales', 'sales-reports', 'expenses', 'employees', 'day-sessions', 'customers', 'suppliers', 'accounting', 'users', 'roles', 'audit-logs', 'settings'].includes(currentTab) && (
        <NotFoundPage onGoHome={() => setCurrentTab('dashboard')} />
      )}
    </MainLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
