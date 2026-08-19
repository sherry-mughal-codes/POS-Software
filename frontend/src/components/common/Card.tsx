import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  highlight = false,
  className = '',
  style,
}) => {
  return (
    <div className={`glass-card ${highlight ? 'highlight' : ''} ${className}`} style={style}>
      {(title || action || icon) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {icon && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.85rem',
                height: '1.85rem',
                borderRadius: '0.375rem',
                background: 'rgba(56, 189, 248, 0.1)',
                color: 'var(--primary-400)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                flexShrink: 0,
              }}>
                {icon}
              </div>
            )}
            <div>
              {title && <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h3>}
              {subtitle && <p style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
