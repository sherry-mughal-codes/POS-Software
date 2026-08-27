import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4500 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showError = useCallback(
    (message: string, title = 'Validation Error') => {
      showToast({ type: 'error', title, message });
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, title = 'Success') => {
      showToast({ type: 'success', title, message });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title = 'Warning') => {
      showToast({ type: 'warning', title, message });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title = 'Information') => {
      showToast({ type: 'info', title, message });
    },
    [showToast]
  );

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'error':
        return {
          bg: '#181111',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          color: '#fca5a5',
          titleColor: '#ef4444',
          icon: <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />,
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
        };
      case 'success':
        return {
          bg: '#0f1712',
          border: '1px solid rgba(34, 197, 94, 0.5)',
          color: '#86efac',
          titleColor: '#22c55e',
          icon: <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} />,
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)',
        };
      case 'warning':
        return {
          bg: '#18160f',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          color: '#fde047',
          titleColor: '#f59e0b',
          icon: <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />,
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
        };
      case 'info':
      default:
        return {
          bg: '#0f141c',
          border: '1px solid rgba(56, 189, 248, 0.5)',
          color: '#bae6fd',
          titleColor: '#38bdf8',
          icon: <Info size={18} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />,
          boxShadow: '0 8px 24px rgba(56, 189, 248, 0.25)',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showWarning, showInfo, removeToast }}>
      {children}

      {/* Global Bottom-Right Toast Notifications Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
          maxWidth: '420px',
          width: 'calc(100vw - 3rem)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const style = getToastStyles(toast.type);
          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                backgroundColor: style.bg,
                border: style.border,
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                boxShadow: style.boxShadow,
                animation: 'slideInBottomRight 0.25s ease-out',
                backdropFilter: 'blur(8px)',
              }}
            >
              {style.icon}
              <div style={{ flex: 1 }}>
                {toast.title && (
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: style.titleColor,
                      marginBottom: '0.15rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em',
                    }}
                  >
                    {toast.title}
                  </div>
                )}
                <div style={{ fontSize: '0.8125rem', color: style.color, lineHeight: 1.4 }}>
                  {toast.message}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
