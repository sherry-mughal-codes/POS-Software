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
  Hash,
  Cloud,
  CloudUpload,
  HardDrive,
  RotateCcw,
  Clock,
  AlertTriangle,
  FileCode,
  Search,
  Check,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { settingsService, DocumentSequenceInfo } from '../../services/settingsService';
import { Account } from '../../types/accounting';
import { accountingService } from '../../services/accountingService';
import { backupService, BackupItem, DropboxTestResult } from '../../services/backupService';

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
  const { showSuccess, showError } = useToast();
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('store');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [docSequences, setDocSequences] = useState<Record<string, DocumentSequenceInfo>>({});

  const [accounts, setAccounts] = useState<Account[]>([]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [res, accs] = await Promise.all([
        settingsService.getSettings(),
        accountingService.getAccounts({ is_active: true }),
      ]);
      setFormData(res.settings || {});
      if (res.document_sequences) {
        setDocSequences(res.document_sequences);
      }
      setAccounts(accs || []);
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
      showError(err?.message || 'Failed to load system configuration', 'Settings Error');
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
        showError('Logo image size must be under 2MB.', 'Invalid Image Size');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Str = uploadEvent.target?.result as string;
        handleChange('company_logo', base64Str);
        showSuccess('Store logo selected. Click "Save Changes" to apply.', 'Logo Selected');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    handleChange('company_logo', '');
    showSuccess('Logo removed. Click "Save Changes" to apply.', 'Logo Cleared');
  };

  // Database Backup & Dropbox States
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupsLoading, setBackupsLoading] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [restoringBackup, setRestoringBackup] = useState<boolean>(false);
  const [testingDropbox, setTestingDropbox] = useState<boolean>(false);
  const [dropboxTestResult, setDropboxTestResult] = useState<DropboxTestResult | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState<boolean>(false);
  const [selectedFilesForRestore, setSelectedFilesForRestore] = useState<File[]>([]);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupItem | null>(null);
  const [syncingDropboxId, setSyncingDropboxId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [backupToDelete, setBackupToDelete] = useState<BackupItem | null>(null);
  const [backupSearchQuery, setBackupSearchQuery] = useState<string>('');

  const fetchBackups = async () => {
    try {
      setBackupsLoading(true);
      const res = await backupService.getBackups();
      setBackups(res.backups || []);
    } catch (err: any) {
      console.error('Failed to load database backups:', err);
    } finally {
      setBackupsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'system') {
      fetchBackups();
    }
  }, [activeTab]);

  const handleCreateBackupNow = async () => {
    try {
      setCreatingBackup(true);
      const res = await backupService.createBackup();
      if (res.success) {
        showSuccess(`Database .SQL backup (${res.filename}) generated successfully!`, 'Backup Created');
        fetchBackups();
      } else {
        showError(res.error || 'Failed to create database backup.', 'Backup Error');
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || err?.message || 'Database backup failed.', 'Backup Error');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadSql = async (b: BackupItem) => {
    try {
      await backupService.downloadBackup(b.id, b.filename);
    } catch (err: any) {
      showError('Failed to download .SQL file.', 'Download Error');
    }
  };

  const handleManualSyncToDropbox = async (b: BackupItem) => {
    try {
      setSyncingDropboxId(b.id);
      const res = await backupService.syncToDropbox(b.id);
      if (res.success) {
        showSuccess(`Backup ${b.filename} successfully synced to Dropbox!`, 'Dropbox Synced');
        fetchBackups();
      } else {
        showError(res.error || 'Failed to sync backup to Dropbox.', 'Dropbox Error');
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || err?.message || 'Dropbox sync failed.', 'Dropbox Error');
    } finally {
      setSyncingDropboxId(null);
    }
  };

  const handleTestDropbox = async () => {
    try {
      setTestingDropbox(true);
      setDropboxTestResult(null);
      const res = await backupService.testDropbox(formData.dropbox_access_token);
      setDropboxTestResult(res);
      if (res.success) {
        showSuccess('Dropbox connection verified successfully!', 'Connection Verified');
      } else {
        showError(res.error || 'Dropbox connection failed.', 'Connection Failed');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Dropbox connection failed.';
      setDropboxTestResult({
        success: false,
        error: errMsg,
      });
      showError(errMsg, 'Connection Error');
    } finally {
      setTestingDropbox(false);
    }
  };

  const handleOpenRestoreModal = (b?: BackupItem) => {
    if (b) {
      setSelectedBackupForRestore(b);
      setSelectedFilesForRestore([]);
    } else {
      setSelectedBackupForRestore(null);
      setSelectedFilesForRestore([]);
    }
    setRestoreModalOpen(true);
  };

  const handleExecuteRestore = async () => {
    if (selectedFilesForRestore.length === 0 && !selectedBackupForRestore) {
      showError('Please select one or more .SQL backup files or a folder to restore.', 'Missing Backup File');
      return;
    }
    try {
      setRestoringBackup(true);
      const res = await backupService.restoreBackup({
        files: selectedFilesForRestore.length > 0 ? selectedFilesForRestore : undefined,
        backupId: selectedBackupForRestore ? selectedBackupForRestore.id : undefined,
      });
      if (res.success) {
        setRestoreModalOpen(false);
        const countMsg = res.restored_count ? `(${res.restored_count} files restored)` : '';
        showSuccess(`Database has been successfully restored from backup ${countMsg}! Reloading...`, 'Database Restored');
        setTimeout(() => {
          window.location.reload();
        }, 2200);
      } else {
        showError(res.error || 'Database restore failed.', 'Restore Error');
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || err?.message || 'Failed to execute database restore.', 'Restore Error');
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleDeleteBackupConfirm = async () => {
    if (!backupToDelete) return;
    try {
      await backupService.deleteBackup(backupToDelete.id);
      setDeleteModalOpen(false);
      setBackupToDelete(null);
      showSuccess('Backup file deleted successfully.', 'Backup Deleted');
      fetchBackups();
    } catch (err: any) {
      showError('Failed to delete backup file.', 'Delete Error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await settingsService.updateSettings(formData);
      if (res.settings) {
        setFormData(res.settings);
      }
      if (res.document_sequences) {
        setDocSequences(res.document_sequences);
      }
      await ctxUpdateSettings(formData);
      showSuccess('System configuration, prefixes, and start sequences saved successfully.', 'Settings Saved');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showError(err?.message || 'Failed to save configuration settings', 'Save Error');
    } finally {
      setSaving(false);
    }
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
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
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
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                      />

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
                  placeholder="e.g. 0300-1234567 or +92 300 1234567"
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

        {/* TAB 2: POS & Receipts & Document Numbering */}
        {activeTab === 'pos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Transactional Document Numbering & Prefixes */}
            <Card title="Transactional Numbering Sequences & Prefixes" icon={<Hash size={18} />}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Configure unique serial prefixes and starting numbers for all system transactions. Changing a start number to e.g. <strong>100</strong> will start subsequent numbers from 100 while preserving existing historical records.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  {
                    key: 'invoice',
                    title: 'Invoice',
                    desc: 'Retail Point of Sale and Customer Sales Invoices',
                    prefix_key: 'invoice_prefix',
                    start_key: 'invoice_start_number',
                    default_prefix: 'INV-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'sales_return',
                    title: 'Sales Return',
                    desc: 'Customer refunds and return credit vouchers',
                    prefix_key: 'sales_return_prefix',
                    start_key: 'sales_return_start_number',
                    default_prefix: 'RET-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'purchase_order',
                    title: 'Purchase Order',
                    desc: 'Inventory vendor restocking and purchase orders',
                    prefix_key: 'purchase_order_prefix',
                    start_key: 'purchase_order_start_number',
                    default_prefix: 'PUR-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'purchase_return',
                    title: 'Purchase Return',
                    desc: 'Supplier stock debit notes and returns',
                    prefix_key: 'purchase_return_prefix',
                    start_key: 'purchase_return_start_number',
                    default_prefix: 'PRTN-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'customer_payment',
                    title: 'Customer Payment',
                    desc: 'Customer receivable collection vouchers',
                    prefix_key: 'customer_payment_prefix',
                    start_key: 'customer_payment_start_number',
                    default_prefix: 'CPAY-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'supplier_payment',
                    title: 'Supplier Payment',
                    desc: 'Supplier payable settlement vouchers',
                    prefix_key: 'supplier_payment_prefix',
                    start_key: 'supplier_payment_start_number',
                    default_prefix: 'SPAY-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'journal_entry',
                    title: 'Journal Entry',
                    desc: 'General Ledger double-entry vouchers',
                    prefix_key: 'journal_entry_prefix',
                    start_key: 'journal_entry_start_number',
                    default_prefix: 'JE-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'stock_adjustment',
                    title: 'Stock Adjustment',
                    desc: 'Inventory physical count audit adjustment vouchers',
                    prefix_key: 'stock_adjustment_prefix',
                    start_key: 'stock_adjustment_start_number',
                    default_prefix: 'ADJ-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'expense',
                    title: 'Expense Voucher',
                    desc: 'Store operational overhead payment vouchers',
                    prefix_key: 'expense_prefix',
                    start_key: 'expense_start_number',
                    default_prefix: 'EXP-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'customer',
                    title: 'Customer ID',
                    desc: 'Customer master directory account identifier',
                    prefix_key: 'customer_prefix',
                    start_key: 'customer_start_number',
                    default_prefix: 'CUS-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'supplier',
                    title: 'Supplier ID',
                    desc: 'Supplier / Vendor directory account identifier',
                    prefix_key: 'supplier_prefix',
                    start_key: 'supplier_start_number',
                    default_prefix: 'SUP-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'employee',
                    title: 'Employee ID',
                    desc: 'Staff and employee master directory identifier',
                    prefix_key: 'employee_prefix',
                    start_key: 'employee_start_number',
                    default_prefix: 'EMP-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'salary_slip',
                    title: 'Salary Slip #',
                    desc: 'Monthly HR payroll compensation pay slip number',
                    prefix_key: 'salary_slip_prefix',
                    start_key: 'salary_slip_start_number',
                    default_prefix: 'SAL-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'customer_warranty_claim',
                    title: 'Customer Warranty Claim #',
                    desc: 'Slip serial prefix and sequence for customer warranty replacements',
                    prefix_key: 'customer_warranty_claim_prefix',
                    start_key: 'customer_warranty_claim_start_number',
                    default_prefix: 'CLM-',
                    default_start: '1',
                    padding: 5,
                  },
                  {
                    key: 'supplier_warranty_claim',
                    title: 'Supplier Warranty Claim (RMA) #',
                    desc: 'Batch serial prefix and sequence for supplier RMA dispatches',
                    prefix_key: 'supplier_warranty_claim_prefix',
                    start_key: 'supplier_warranty_claim_start_number',
                    default_prefix: 'SUP-CLM-',
                    default_start: '1',
                    padding: 5,
                  },
                ].map((item) => {
                  const seqInfo = docSequences[item.key];
                  const currentPrefix = formData[item.prefix_key] !== undefined ? formData[item.prefix_key] : (seqInfo?.prefix || item.default_prefix);
                  const currentStart = formData[item.start_key] !== undefined ? formData[item.start_key] : (seqInfo?.start_number?.toString() || item.default_start);
                  const latestNumber = seqInfo?.current_number ?? 0;

                  const startInt = parseInt(currentStart, 10) || 1;
                  let nextNum = 1;
                  if (startInt > 1) {
                    nextNum = latestNumber >= startInt ? latestNumber + 1 : startInt + 1;
                  } else {
                    nextNum = latestNumber >= 1 ? latestNumber + 1 : 1;
                  }
                  const effectivePad = Math.max(item.padding, String(nextNum).length);
                  const previewNext = `${currentPrefix}${String(nextNum).padStart(effectivePad, '0')}`;

                  return (
                    <div
                      key={item.key}
                      style={{
                        padding: '0.875rem 1rem',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            {item.title}
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {item.desc}
                          </span>
                        </div>
                        <div style={{
                          fontSize: '0.72rem',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          color: 'var(--primary-400)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontWeight: 600,
                        }}>
                          Next Generated: <strong>{previewNext}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            Prefix
                          </label>
                          <Input
                            value={currentPrefix}
                            onChange={(e) => handleChange(item.prefix_key, e.target.value)}
                            placeholder={`e.g. ${item.default_prefix}`}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            Start Number
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={currentStart}
                            onChange={(e) => handleChange(item.start_key, e.target.value)}
                            placeholder={`e.g. ${item.default_start}`}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            Current Latest Number
                          </label>
                          <div style={{
                            padding: '0.45rem 0.65rem',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '0.375rem',
                            fontSize: '0.8125rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-main)',
                            fontWeight: 700,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <span>{latestNumber > 0 ? latestNumber : (startInt > 1 ? `${startInt} (Configured)` : '0')}</span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              {latestNumber > 0 ? 'Latest in DB' : 'Initial'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Receipt Styling & Register Policy */}
            <Card title="POS Register & Receipt Customization">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
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
          </div>
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
                  value={formData.low_stock_default_threshold ?? '10'}
                  onChange={(e) => handleChange('low_stock_default_threshold', e.target.value)}
                  placeholder="10"
                  min="0"
                  step="1"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                  Products reaching this balance or lower trigger low stock alerts. When saved, this threshold automatically applies as the default for all products.
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

        {/* TAB 5: System Diagnostics & Database Backup Control Center */}
        {activeTab === 'system' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* System Status Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <div style={{ padding: '0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Application Version</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>ApexPOS Enterprise v1.0.0</div>
              </div>

              <div style={{ padding: '0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Database Engine</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={15} /> PostgreSQL 16 (Connected)
                </div>
              </div>

              <div style={{ padding: '0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Local Laptop Backups</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-400)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HardDrive size={15} /> {backups.length} .SQL Dumps Available
                </div>
              </div>

              <div style={{ padding: '0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dropbox Cloud Sync</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: formData.dropbox_backup_enabled === 'true' ? 'var(--info)' : 'var(--text-subtle)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Cloud size={15} /> {formData.dropbox_backup_enabled === 'true' ? 'Active' : 'Disabled'}
                </div>
              </div>
            </div>

            {/* 1. Automated Daily Backup & Laptop Storage Configuration */}
            <Card title="Automated Daily Backup & Local Laptop Storage" icon={<Clock size={16} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                }}>
                  <HardDrive size={18} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Host Storage Location: </strong>
                    All .SQL backup files are saved directly onto your laptop at <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', color: 'var(--primary-300)' }}>./backend/backups/</code>.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                  {/* Auto Backup Toggle */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      <input
                        type="checkbox"
                        checked={formData.auto_backup_enabled !== 'false'}
                        onChange={(e) => handleChange('auto_backup_enabled', e.target.checked ? 'true' : 'false')}
                        style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary-500)' }}
                      />
                      Enable Automated Daily Database Backup
                    </label>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '1.6rem', marginTop: '0.2rem' }}>
                      Automatically executes a full PostgreSQL .sql dump every day.
                    </span>
                  </div>

                  {/* Scheduled Execution Time */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                      Daily Execution Time (24h)
                    </label>
                    <input
                      type="time"
                      value={formData.auto_backup_time || '02:00'}
                      onChange={(e) => handleChange('auto_backup_time', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>Default scheduled time: 02:00 AM (midnight off-peak)</span>
                  </div>

                  {/* Retention Policy */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                      Local Backup Retention Policy
                    </label>
                    <select
                      value={formData.backup_retention_days || '30'}
                      onChange={(e) => handleChange('backup_retention_days', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    >
                      <option value="7">Keep last 7 daily backups</option>
                      <option value="15">Keep last 15 daily backups</option>
                      <option value="30">Keep last 30 daily backups (Recommended)</option>
                      <option value="60">Keep last 60 daily backups</option>
                      <option value="90">Keep last 90 daily backups</option>
                      <option value="0">Keep all backups indefinitely</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Dropbox Cloud Sync Integration */}
            <Card title="Dropbox Cloud Sync Integration" icon={<Cloud size={16} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <input
                      type="checkbox"
                      checked={formData.dropbox_backup_enabled === 'true'}
                      onChange={(e) => handleChange('dropbox_backup_enabled', e.target.checked ? 'true' : 'false')}
                      style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary-500)' }}
                    />
                    Enable Dropbox Cloud Backup Sync
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    icon={<RefreshCw size={13} />}
                    loading={testingDropbox}
                    onClick={handleTestDropbox}
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.78125rem' }}
                  >
                    Test Dropbox Connection
                  </Button>
                </div>

                {/* Dropbox Disconnected Notification Banner */}
                {(!formData.dropbox_access_token || formData.dropbox_backup_enabled !== 'true') && !dropboxTestResult && (
                  <div style={{
                    padding: '0.65rem 0.875rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    fontSize: '0.8125rem',
                    color: 'var(--warning)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>
                      Dropbox is currently <strong>NOT connected</strong>. Backups are saved locally on the server. Enter your Dropbox Access Token below and click "Test Connection" to enable automatic off-site cloud replication.
                    </span>
                  </div>
                )}

                {/* Live Dropbox Test Feedback */}
                {dropboxTestResult && (
                  <div style={{
                    padding: '0.65rem 0.875rem',
                    borderRadius: '0.375rem',
                    backgroundColor: dropboxTestResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${dropboxTestResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontSize: '0.8125rem',
                    color: dropboxTestResult.success ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {dropboxTestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>
                        {dropboxTestResult.success
                          ? `Connected successfully as ${dropboxTestResult.name} (${dropboxTestResult.email})`
                          : `Connection failed: ${dropboxTestResult.error}`}
                      </span>
                    </div>
                    {dropboxTestResult.success && dropboxTestResult.space_total_mb && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Space: {dropboxTestResult.space_used_mb} MB / {dropboxTestResult.space_total_mb} MB
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {/* Dropbox Access Token */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                      Dropbox Access Token (Bearer)
                    </label>
                    <input
                      type="password"
                      placeholder="sl.u.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={formData.dropbox_access_token || ''}
                      onChange={(e) => handleChange('dropbox_access_token', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>Generated from your Dropbox App Console with files.content.write permission</span>
                  </div>

                  {/* Cloud Target Folder */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                      Dropbox Target Folder Path
                    </label>
                    <input
                      type="text"
                      placeholder="/ApexPOS_Backups"
                      value={formData.dropbox_folder_path || '/ApexPOS_Backups'}
                      onChange={(e) => handleChange('dropbox_folder_path', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>Folder path in your Dropbox where .SQL dumps will be stored</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. Database Operations Action Bar & File Manager */}
            <Card
              title="Database Backup & Disaster Recovery File Manager"
              icon={<Database size={16} />}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    variant="outline"
                    icon={<RefreshCw size={13} />}
                    loading={backupsLoading}
                    onClick={fetchBackups}
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                  >
                    Refresh
                  </Button>
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* PROMINENT ACTION BUTTONS BANNER */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-medium)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    {/* 1. IMPORT / RESTORE BUTTON */}
                    <Button
                      type="button"
                      variant="outline"
                      icon={<Upload size={15} />}
                      onClick={() => handleOpenRestoreModal()}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(234, 179, 8, 0.15)',
                        borderColor: 'rgba(234, 179, 8, 0.5)',
                        color: 'var(--warning)',
                      }}
                    >
                      Import / Restore .SQL Backup (Folder / Files)
                    </Button>

                    {/* 2. CREATE BACKUP NOW BUTTON */}
                    <Button
                      type="button"
                      variant="primary"
                      icon={<Database size={15} />}
                      loading={creatingBackup}
                      onClick={handleCreateBackupNow}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 700 }}
                    >
                      Create Database Backup Now (.SQL)
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                    <input
                      type="text"
                      placeholder="Search backups by filename or date..."
                      value={backupSearchQuery}
                      onChange={(e) => setBackupSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.65rem 0.4rem 1.9rem',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '0.375rem',
                        fontSize: '0.78125rem',
                        color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Backups Table */}
                {backupsLoading ? (
                  <LoadingSpinner label="Loading database backup records..." />
                ) : backups.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.01)', borderRadius: '0.5rem', border: '1px dashed var(--border-medium)' }}>
                    <Database size={32} style={{ margin: '0 auto 0.5rem auto', color: 'var(--text-subtle)', opacity: 0.5 }} />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>No Database Backups Generated Yet</h4>
                    <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Click "Create Backup Now (.SQL)" to generate your first complete database snapshot.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '0.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-medium)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                          <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Backup Filename (.SQL)</th>
                          <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Created Date & Time</th>
                          <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>File Size</th>
                          <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type</th>
                          <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups
                          .filter((b) => !backupSearchQuery || b.filename.toLowerCase().includes(backupSearchQuery.toLowerCase()) || b.created_at.includes(backupSearchQuery))
                          .map((b) => (
                            <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                              <td style={{ padding: '0.5rem 0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <FileCode size={16} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                                    {b.filename}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(b.created_at).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                                {b.file_size_formatted}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem' }}>
                                {b.backup_type === 'AUTOMATIC_DAILY' ? (
                                  <Badge variant="info">Daily 02:00 AM</Badge>
                                ) : b.backup_type === 'IMPORT_RESTORE' ? (
                                  <Badge variant="warning">Imported</Badge>
                                ) : (
                                  <Badge variant="phase">Manual</Badge>
                                )}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem' }}>
                                {b.status === 'DROPBOX_SYNCED' ? (
                                  <Badge variant="success">
                                    <Cloud size={12} style={{ marginRight: '0.2rem' }} /> Dropbox Synced
                                  </Badge>
                                ) : b.status === 'LOCAL_ONLY' ? (
                                  <Badge variant="info">
                                    <HardDrive size={12} style={{ marginRight: '0.2rem' }} /> Saved Locally (.SQL)
                                  </Badge>
                                ) : b.status === 'RESTORED' ? (
                                  <Badge variant="success">
                                    <Check size={12} style={{ marginRight: '0.2rem' }} /> Active / Restored
                                  </Badge>
                                ) : (
                                  <Badge variant="danger">
                                    <AlertCircle size={12} style={{ marginRight: '0.2rem' }} /> Failed
                                  </Badge>
                                )}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                                  {/* Sync to Dropbox Button */}
                                  {b.status !== 'DROPBOX_SYNCED' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      icon={<CloudUpload size={13} />}
                                      title="Sync this backup to Dropbox now"
                                      loading={syncingDropboxId === b.id}
                                      onClick={() => handleManualSyncToDropbox(b)}
                                      style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', color: 'var(--info)', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                                    >
                                      Sync
                                    </Button>
                                  )}

                                  <Button
                                    type="button"
                                    variant="outline"
                                    icon={<Download size={13} />}
                                    title="Download .SQL Dump to Laptop"
                                    onClick={() => handleDownloadSql(b)}
                                    style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                                  >
                                    Download
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    icon={<RotateCcw size={13} />}
                                    title="Restore database from this backup"
                                    onClick={() => handleOpenRestoreModal(b)}
                                    style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', color: 'var(--warning)', borderColor: 'rgba(234, 179, 8, 0.3)' }}
                                  >
                                    Restore
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="danger"
                                    icon={<Trash2 size={13} />}
                                    title="Delete this backup file"
                                    onClick={() => {
                                      setBackupToDelete(b);
                                      setDeleteModalOpen(true);
                                    }}
                                    style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>
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

      {/* MODAL 1: Disaster Recovery / Import .SQL Backup Modal */}
      <Modal
        isOpen={restoreModalOpen}
        onClose={() => {
          if (!restoringBackup) setRestoreModalOpen(false);
        }}
        title="Restore / Import Database from .SQL Backup"
        maxWidth="620px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Warning Banner */}
          <div style={{
            padding: '0.875rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}>
            <AlertTriangle size={22} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--danger)' }}>CRITICAL DATA RESTORATION NOTICE</h4>
              <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                Restoring will overwrite current database tables and replace them with the data stored inside the selected .SQL dump(s). All records from all chosen files will be sequentially imported.
              </p>
            </div>
          </div>

          {selectedBackupForRestore ? (
            <div style={{ padding: '0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Backup File:</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                {selectedBackupForRestore.filename} ({selectedBackupForRestore.file_size_formatted})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Recorded: {new Date(selectedBackupForRestore.created_at).toLocaleString()}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                  Upload Whole Backup Folder / Multiple .SQL Files / .ZIP Archive:
                </label>
                <input
                  type="file"
                  multiple
                  accept=".sql,.dump,.zip"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setSelectedFilesForRestore(files);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                  }}
                />
                <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  You can select multiple .sql files, a .zip folder of backups, or single .sql dump.
                </span>
              </div>

              {selectedFilesForRestore.length > 0 && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.35rem' }}>
                    {selectedFilesForRestore.length} File(s) Selected for Batch Restoration:
                  </div>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.75rem', color: 'var(--text-main)' }}>
                    {selectedFilesForRestore.map((f, i) => (
                      <li key={i} style={{ marginBottom: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                        {f.name} ({(f.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button
              variant="outline"
              onClick={() => setRestoreModalOpen(false)}
              disabled={restoringBackup}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={<RotateCcw size={15} />}
              loading={restoringBackup}
              onClick={handleExecuteRestore}
            >
              {restoringBackup ? 'Restoring All Data in Batch...' : `Confirm & Restore Data (${selectedFilesForRestore.length || 1} file${selectedFilesForRestore.length > 1 ? 's' : ''})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Delete Backup Confirmation */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Backup Deletion"
        maxWidth="460px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Are you sure you want to permanently delete this .SQL backup file from your laptop storage?
          </p>
          {backupToDelete && (
            <div style={{ padding: '0.625rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.375rem', fontFamily: 'var(--font-mono)', fontSize: '0.78125rem', color: 'var(--text-main)' }}>
              {backupToDelete.filename}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={handleDeleteBackupConfirm}>
              Delete File
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
