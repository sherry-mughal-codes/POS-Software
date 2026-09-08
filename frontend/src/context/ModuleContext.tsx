import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemModule } from '../types/commission';
import { moduleService } from '../services/moduleService';
import { useAuth } from './AuthContext';

interface ModuleContextType {
  modules: SystemModule[];
  isLoading: boolean;
  isModuleEnabled: (key: string) => boolean;
  refreshModules: () => Promise<void>;
  toggleModule: (key: string, is_enabled?: boolean) => Promise<SystemModule & { detail: string }>;
}

export const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchModules = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await moduleService.getModules();
      setModules(res.modules || []);
    } catch (err) {
      console.warn('Failed to load system modules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const isModuleEnabled = useCallback(
    (key: string): boolean => {
      const found = modules.find((m) => m.key === key);
      // If module registry not loaded or module not found, default to true for safety
      if (!found) return true;
      return found.is_enabled;
    },
    [modules]
  );

  const toggleModule = useCallback(
    async (key: string, is_enabled?: boolean) => {
      const updated = await moduleService.toggleModule(key, is_enabled);
      setModules((prev) =>
        prev.map((m) => (m.key === key ? { ...m, is_enabled: updated.is_enabled } : m))
      );
      return updated;
    },
    []
  );

  return (
    <ModuleContext.Provider
      value={{
        modules,
        isLoading,
        isModuleEnabled,
        refreshModules: fetchModules,
        toggleModule,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
};

export const useModules = (): ModuleContextType => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
};
