import React, { useState, useEffect } from 'react';
import {
  Store,
  Receipt,
  Package,
  BookOpen,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  Download,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useSettings } from '../../context/SettingsContext';
import { settingsService } from '../../services/settingsService';
import { Account } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';

type SettingsTab = 'store' | 'pos' | 'inventory' | 'accounting' | 'system';

interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  country: string;
}

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee', country: 'Pakistan' },
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States' },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'European Union' },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', country: 'Saudi Arabia' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', country: 'United Arab Emirates' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', country: 'Canada' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', country: 'Australia' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', country: 'China' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', country: 'Turkey' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', country: 'Bangladesh' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia' },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', country: 'Oman' },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', country: 'Qatar' },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', country: 'Kuwait' },
  { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', country: 'Bahrain' },
];

export const SettingsPage: React.FC = () => {
  const { updateSettings: ctxUpdateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('store');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const [accounts, setAccounts] = useState<Account[]>([]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, accs] = await Promise.all([
        settingsService.getSettings(),
        accountingService.getAccounts({ is_active: true }),
      ]);
      setFormData(res.settings || {});
      setAccounts(accs || []);
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
      setError(err?.message || 'Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const leafAccounts = accounts.filter((a) => !a.is_header && a.is_active);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo image size must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Str = uploadEvent.target?.result as string;
        handleChange('company_logo', base64Str);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    handleChange('company_logo', '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      await ctxUpdateSettings(formData);
      setSuccessMsg('System configuration and store policies saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err?.message || 'Failed to save configuration settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = JSON.stringify(formData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ApexPOS_System_Config_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'store', label: 'Store Profile & Business Info', icon: <Store size={16} /> },
    { id: 'pos', label: 'POS & Receipt Templates', icon: <Receipt size={16} /> },
    { id: 'inventory', label: 'Inventory & Stock Thresholds', icon: <Package size={16} /> },
    { id: 'accounting', label: 'General Ledger Accounts Mapping', icon: <BookOpen size={16} /> },
    { id: 'system', label: 'System & Diagnostics', icon: <Database size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            System Settings
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Button
            variant="secondary"
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            icon={<RefreshCw size={13} />}
            loading={loading}
            onClick={fetchSettings}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            icon={<Save size={13} />}
            loading={saving}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '0.375rem',
            color: 'var(--success)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.375rem',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.35rem',
          overflowX: 'auto',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78125rem',
              fontWeight: 700,
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === t.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === t.id ? 'var(--primary-400)' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave}>
        {/* TAB 1: Store Profile */}
        {activeTab === 'store' && (
          <Card title="Store Profile & Business Details">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Store Logo Section */}
              <div style={{ gridColumn: '1 / -1', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Official Store Logo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {/* Logo Preview Box */}
                  <div
                    style={{
                      width: '4rem',
                      height: '4rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {formData.company_logo ? (
                      <img
                        src={formData.company_logo}
                        alt="Store Logo Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <ImageIcon size={24} style={{ color: 'var(--text-subtle)' }} />
                    )}
                  </div>

                  {/* Actions & File Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.375rem 0.75rem',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: '0.375rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                        }}
                      >
                        <Upload size={14} />
                        Upload New Logo
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                          onChange={handleLogoUpload}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {formData.company_logo && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.625rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '0.375rem',
                            fontSize: '0.8125rem',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Supports PNG, JPG, SVG, WebP up to 2MB. Appears in navbar and printed thermal receipts.
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Company / Store Name *
                </label>
                <Input
                  value={formData.company_name || ''}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="e.g. Apex Supermarket & Retail"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Business Contact Phone
                </label>
                <Input
                  value={formData.company_phone || ''}
                  onChange={(e) => handleChange('company_phone', e.target.value)}
                  placeholder="e.g. +92 42 111 2653"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Official Email Address
                </label>
                <Input
                  type="email"
                  value={formData.company_email || ''}
                  onChange={(e) => handleChange('company_email', e.target.value)}
                  placeholder="e.g. sales@apexpos.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Tax ID / NTN Number
                </label>
                <Input
                  value={formData.tax_id || ''}
                  onChange={(e) => handleChange('tax_id', e.target.value)}
                  placeholder="e.g. NTN-0891234-7"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Store Currency (Standard Dropdown)
                </label>
                <select
                  value={
                    CURRENCY_OPTIONS.some((c) => c.code === formData.currency_code)
                      ? formData.currency_code
                      : 'CUSTOM'
                  }
                  onChange={(e) => {
                    const selectedCode = e.target.value;
                    if (selectedCode === 'CUSTOM') {
                      return;
                    }
                    const opt = CURRENCY_OPTIONS.find((c) => c.code === selectedCode);
                    if (opt) {
                      setFormData((prev) => ({
                        ...prev,
                        currency_code: opt.code,
                        currency_symbol: opt.symbol,
                      }));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code} style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}>
                      {c.name} ({c.symbol} - {c.code}) - {c.country}
                    </option>
                  ))}
                  <option value="CUSTOM" style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}>
                    Custom Currency (Manual Entry)
                  </option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Currency Display Symbol
                </label>
                <Input
                  value={formData.currency_symbol || 'Rs.'}
                  onChange={(e) => handleChange('currency_symbol', e.target.value)}
                  placeholder="e.g. Rs. or $"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Currency Code (ISO)
                </label>
                <Input
                  value={formData.currency_code || 'PKR'}
                  onChange={(e) => handleChange('currency_code', e.target.value)}
                  placeholder="e.g. PKR, USD"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Physical Branch Address
                </label>
                <textarea
                  value={formData.company_address || ''}
                  onChange={(e) => handleChange('company_address', e.target.value)}
                  placeholder="Street address, city, province, postal code..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* TAB 2: POS & Receipts */}
        {activeTab === 'pos' && (
          <Card title="POS Register & Receipt Customization">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Invoice Number Prefix
                </label>
                <Input
                  value={formData.invoice_prefix || 'INV-'}
                  onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                  placeholder="e.g. INV-, REC-"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Default Sales Tax Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.tax_rate_percent || '0.00'}
                  onChange={(e) => handleChange('tax_rate_percent', e.target.value)}
                  placeholder="e.g. 0.00 or 18.00"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Receipt Header Note
                </label>
                <Input
                  value={formData.receipt_header || ''}
                  onChange={(e) => handleChange('receipt_header', e.target.value)}
                  placeholder="e.g. Welcome to ApexPOS Supermarket — Quality Guaranteed"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Receipt Footer Policy Note
                </label>
                <textarea
                  value={formData.receipt_footer || ''}
                  onChange={(e) => handleChange('receipt_footer', e.target.value)}
                  placeholder="e.g. Thank you for shopping with us! Returns accepted within 7 days with original receipt."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="autoPrintCheckbox"
                    checked={formData.auto_print_receipt === 'true'}
                    onChange={(e) => handleChange('auto_print_receipt', e.target.checked ? 'true' : 'false')}
                    style={{ width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoPrintCheckbox" style={{ fontSize: '0.875rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Automatically trigger receipt print dialog on POS checkout
                  </label>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 3: Inventory */}
        {activeTab === 'inventory' && (
          <Card title="Inventory & Stock Control Thresholds">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Default Low-Stock Alert Threshold (Units)
                </label>
                <Input
                  type="number"
                  value={formData.low_stock_default_threshold || '10'}
                  onChange={(e) => handleChange('low_stock_default_threshold', e.target.value)}
                  placeholder="10"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Products reaching this balance or lower will trigger low stock alert radar notifications.
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 4: Accounting GL Mapping */}
        {activeTab === 'accounting' && (
          <Card
            title="Chart of Accounts General Ledger Defaults"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Cash Account */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Default Cash Drawer Account (Asset)
                </label>
                <select
                  value={formData.default_cash_account || '1010'}
                  onChange={(e) => handleChange('default_cash_account', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {leafAccounts.filter((a) => a.account_type === 'ASSET').map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      [{acc.code}] {acc.name} (Bal: Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank Account */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Default Bank / Digital Account (Asset)
                </label>
                <select
                  value={formData.default_bank_account || '1020'}
                  onChange={(e) => handleChange('default_bank_account', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {leafAccounts.filter((a) => a.account_type === 'ASSET').map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      [{acc.code}] {acc.name} (Bal: Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sales Revenue */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Sales Revenue Account (Income)
                </label>
                <select
                  value={formData.default_sales_account || '4010'}
                  onChange={(e) => handleChange('default_sales_account', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {leafAccounts.filter((a) => a.account_type === 'INCOME').map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      [{acc.code}] {acc.name} (Bal: Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              {/* Inventory Asset */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Inventory Valuation Asset Account (Asset)
                </label>
                <select
                  value={formData.default_inventory_account || '1040'}
                  onChange={(e) => handleChange('default_inventory_account', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {leafAccounts.filter((a) => a.account_type === 'ASSET').map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      [{acc.code}] {acc.name} (Bal: Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              {/* COGS */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Cost of Goods Sold (COGS) Account (Expense)
                </label>
                <select
                  value={formData.default_cogs_account || '5010'}
                  onChange={(e) => handleChange('default_cogs_account', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {leafAccounts.filter((a) => a.account_type === 'EXPENSE').map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      [{acc.code}] {acc.name} (Bal: Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              {/* Accounts Payable */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Accounts Payable (Suppliers) (Liability)
                </label>
                <select
                  value={formData.default_ap_account || '2010'}
                  onChange={(e) => handleChange('default_ap_account', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {leafAccounts.filter((a) => a.account_type === 'LIABILITY').map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      [{acc.code}] {acc.name} (Bal: Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              {/* Accounts Receivable */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Accounts Receivable (Customers) (Asset)
                </label>
                <select
                  value={formData.default_ar_account || '1030'}
                  onChange={(e) => handleChange('default_ar_account', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {leafAccounts.filter((a) => a.account_type === 'ASSET').map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      [{acc.code}] {acc.name} (Bal: Rs. {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 5: System Diagnostics */}
        {activeTab === 'system' && (
          <Card title="System Diagnostics & Backup">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Application Version</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>ApexPOS Enterprise v1.0.0</div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Database Engine</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>PostgreSQL 16 (Connected)</div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accounting Standard</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--info)', marginTop: '0.25rem' }}>Double-Entry Accrual GL</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button
                  type="button"
                  variant="outline"
                  icon={<Download size={15} />}
                  onClick={handleDownloadBackup}
                >
                  Export System Configuration JSON Backup
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <Button
            type="submit"
            variant="primary"
            icon={<Save size={16} />}
            loading={saving}
          >
            Save All Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
