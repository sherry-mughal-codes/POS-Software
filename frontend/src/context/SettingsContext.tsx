import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsService, SystemSettingsPayload } from '../services/settingsService';

interface SettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Record<string, string>) => Promise<void>;
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  taxId: string;
  currencySymbol: string;
  currencyCode: string;
  invoicePrefix: string;
  receiptHeader: string;
  receiptFooter: string;
  taxRatePercent: number;
  autoPrintReceipt: boolean;
  lowStockThreshold: number;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    try {
      const cached = localStorage.getItem('apexpos_settings');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res: SystemSettingsPayload = await settingsService.getSettings();
      if (res && res.settings) {
        setSettings(res.settings);
        try {
          localStorage.setItem('apexpos_settings', JSON.stringify(res.settings));
        } catch (e) {
          console.warn('Unable to cache settings in localStorage:', e);
        }
      }
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
      setError(err?.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Record<string, string>) => {
    const res = await settingsService.updateSettings(newSettings);
    if (res && res.settings) {
      setSettings(res.settings);
      try {
        localStorage.setItem('apexpos_settings', JSON.stringify(res.settings));
      } catch (e) {
        console.warn('Unable to cache updated settings in localStorage:', e);
      }
    }
  }, []);

  const value: SettingsContextType = {
    settings,
    loading,
    error,
    refreshSettings: fetchSettings,
    updateSettings,
    companyName: settings.company_name || 'ApexPOS Store',
    companyLogo: settings.company_logo || '',
    companyAddress: settings.company_address || '',
    companyPhone: settings.company_phone || '',
    companyEmail: settings.company_email || '',
    taxId: settings.tax_id || '',
    currencySymbol: settings.currency_symbol || 'Rs.',
    currencyCode: settings.currency_code || 'PKR',
    invoicePrefix: settings.invoice_prefix || 'INV-',
    receiptHeader: settings.receipt_header || '',
    receiptFooter: settings.receipt_footer || '',
    taxRatePercent: parseFloat(settings.tax_rate_percent || '0') || 0,
    autoPrintReceipt: settings.auto_print_receipt === 'true',
    lowStockThreshold: parseInt(settings.low_stock_default_threshold || '10', 10) || 10,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
