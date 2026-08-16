import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  style,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '0.75rem',
            color: 'var(--text-subtle)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}>
            {icon}
          </span>
        )}
        <input
          id={inputId}
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-input)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border-medium)'}`,
            borderRadius: '0.5rem',
            padding: icon ? '0.625rem 0.75rem 0.625rem 2.25rem' : '0.625rem 0.75rem',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            transition: 'border-color 0.2s',
            ...style,
          }}
          onFocus={(e) => {
            if (!error) e.target.style.borderColor = 'var(--primary-400)';
          }}
          onBlur={(e) => {
            if (!error) e.target.style.borderColor = 'var(--border-medium)';
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{error}</span>
      )}
      {helperText && !error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{helperText}</span>
      )}
    </div>
  );
};
