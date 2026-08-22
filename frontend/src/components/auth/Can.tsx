import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface CanProps {
  permission?: string;
  anyOfPermissions?: string[];
  role?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  anyOfPermissions,
  role,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole } = useAuth();

  let isAllowed = true;

  if (permission && !hasPermission(permission)) {
    isAllowed = false;
  }

  if (anyOfPermissions && anyOfPermissions.length > 0) {
    const hasAny = anyOfPermissions.some((p) => hasPermission(p));
    if (!hasAny) {
      isAllowed = false;
    }
  }

  if (role && !hasRole(role)) {
    isAllowed = false;
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
