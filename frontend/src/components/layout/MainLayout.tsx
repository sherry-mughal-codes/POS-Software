import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentTab,
  onSelectTab,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('apexpos_sidebar_collapsed') === 'true';
  });

  const isPOS = currentTab === 'register';

  // Automatically collapse sidebar when on POS register terminal
  React.useEffect(() => {
    if (isPOS) {
      setIsSidebarCollapsed(true);
    }
  }, [isPOS]);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('apexpos_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="app-container" style={{ overflow: 'hidden', height: '100vh', display: 'flex' }}>
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
          backgroundColor: 'var(--bg-app)',
        }}
      >
        <main
          className="page-container"
          style={{
            flex: 1,
            padding: isPOS ? '0.4rem 0.6rem' : '1.5rem 2rem',
            maxWidth: isPOS ? '100%' : '1440px',
            margin: '0 auto',
            width: '100%',
            height: '100vh',
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
