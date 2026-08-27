import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginResponse } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('apexpos_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth from token
  const initializeAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('apexpos_token');
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setToken(savedToken);
    } catch (error) {
      console.warn('Saved session invalid, clearing auth:', error);
      localStorage.removeItem('apexpos_token');
      localStorage.removeItem('apexpos_refresh');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    const savedToken = localStorage.getItem('apexpos_token');
    if (!savedToken) return;
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
    const handlePermissionsUpdated = () => {
      refreshUser();
    };
    window.addEventListener('apexpos_permissions_updated', handlePermissionsUpdated);
    window.addEventListener('focus', handlePermissionsUpdated);
    return () => {
      window.removeEventListener('apexpos_permissions_updated', handlePermissionsUpdated);
      window.removeEventListener('focus', handlePermissionsUpdated);
    };
  }, [initializeAuth, refreshUser]);

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    const response = await authService.login(username, password);
    localStorage.setItem('apexpos_token', response.access);
    localStorage.setItem('apexpos_refresh', response.refresh);
    setToken(response.access);
    setUser(response.user);
    return response;
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('apexpos_token');
      localStorage.removeItem('apexpos_refresh');
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.is_superuser && (!user.roles || user.roles.length === 0)) return true;

    // Check direct matching or app_label.codename matching
    const perms = user.effective_permissions || [];
    return perms.some((p) => p === permission || p.endsWith(`.${permission}`));
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if (user.is_superuser && (!user.roles || user.roles.length === 0)) return true;
    return (user.roles || []).includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
