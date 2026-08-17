import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';

interface NotFoundPageProps {
  onGoHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
    }}>
      <AlertCircle size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '400px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        The requested operational module or page could not be located.
      </p>
      <Button variant="primary" onClick={onGoHome}>
        Return to Dashboard
      </Button>
    </div>
  );
};
