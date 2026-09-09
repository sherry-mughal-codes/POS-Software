import React from 'react';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'phase';
  children: React.ReactNode;
  icon?: React.ReactNode;
  pulse?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  children,
  icon,
  pulse = false,
  style,
  className = '',
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`} style={style}>
      {pulse && <span className="pulse-dot" />}
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
