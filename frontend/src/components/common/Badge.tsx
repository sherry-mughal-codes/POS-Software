import React from 'react';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'phase';
  children: React.ReactNode;
  icon?: React.ReactNode;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  children,
  icon,
  pulse = false,
}) => {
  return (
    <span className={`badge badge-${variant}`}>
      {pulse && <span className="pulse-dot" />}
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
