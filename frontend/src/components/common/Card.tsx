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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {icon && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                background: 'rgba(56, 189, 248, 0.1)',
                color: 'var(--primary-400)',
                border: '1px solid rgba(56, 189, 248, 0.2)'
              }}>
                {icon}
              </div>
            )}
            <div>
              {title && <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>}
              {subtitle && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
