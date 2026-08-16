import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
}) => {
  const sizeMap = {
    sm: '1.25rem',
    md: '2rem',
    lg: '3rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem' }}>
      <div
        className="animate-spin"
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: '3px solid rgba(56, 189, 248, 0.2)',
          borderTopColor: 'var(--primary-400)',
          borderRadius: '50%',
        }}
      />
      {label && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{label}</p>}
    </div>
  );
};
