import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { HealthCheckResponse } from '../../types/api';

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  healthData: HealthCheckResponse | null;
  loading: boolean;
  onRefreshHealth: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentTab,
  onSelectTab,
  healthData,
  loading,
  onRefreshHealth,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('apexpos_sidebar_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('apexpos_sidebar_collapsed', String(next));
      return next;
    });
  };

  const isPOS = currentTab === 'register';

  return (
    <div className="app-container" style={{ overflow: 'hidden', height: '100vh' }}>
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: isPOS ? 'hidden' : 'auto',
        }}
      >
        <Header healthData={healthData} loading={loading} onRefresh={onRefreshHealth} />
        <main
          className="page-container"
          style={{
            flex: 1,
            padding: isPOS ? '0.75rem 1rem' : '2rem',
            maxWidth: isPOS ? '100%' : '1400px',
            margin: '0 auto',
            width: '100%',
            height: isPOS ? 'calc(100vh - var(--header-height))' : 'auto',
            display: isPOS ? 'flex' : 'block',
            flexDirection: 'column',
            overflow: isPOS ? 'hidden' : 'visible',
          }}
        >
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, { isSidebarCollapsed })
            : children}
        </main>
      </div>
    </div>
  );
};
