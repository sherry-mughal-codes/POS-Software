import React from 'react';
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
  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} />
      <div className="main-content-wrapper">
        <Header healthData={healthData} loading={loading} onRefresh={onRefreshHealth} />
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
};
