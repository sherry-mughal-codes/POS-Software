import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building,
  Edit2,
  Power,
  RefreshCw,
  FileText,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SupplierModal } from './SupplierModal';
import { SupplierBulkImportModal } from './SupplierBulkImportModal';
import { Supplier } from '../../types/contact';
import { contactService } from '../../services/contactService';
import { useToast } from '../../context/ToastContext';

export const SuppliersPage: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactService.getSuppliers();
      setSuppliers(data || []);
    } catch (err: any) {
      showError(err?.message || 'Failed to load suppliers.', 'Failed to Load Suppliers');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleToggleStatus = async (supp: Supplier) => {
    try {
      await contactService.toggleSupplierStatus(supp.id);
      showSuccess(`Supplier ${supp.name} status updated.`, 'Supplier Status');
      fetchSuppliers();
    } catch (err: any) {
      showError(err?.message || 'Failed to update supplier status.', 'Supplier Error');
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supp: Supplier) => {
    setEditingSupplier(supp);
    setIsModalOpen(true);
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.company_name && s.company_name.toLowerCase().includes(q)) ||
      (s.supplier_id && s.supplier_id.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.tax_id && s.tax_id.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = s.is_active;
    if (statusFilter === 'INACTIVE') matchesStatus = !s.is_active;

    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.is_active).length;
  const taxRegisteredCount = suppliers.filter((s) => s.tax_id).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
            Suppliers & Vendors
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button
            variant="outline"
            icon={<RefreshCw size={13} />}
            loading={loading}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={fetchSuppliers}
            title="Refresh Supplier Data"
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            icon={<FileSpreadsheet size={13} />}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={() => setIsBulkImportModalOpen(true)}
          >
            Import Bulk
          </Button>

          <Button
            variant="primary"
            icon={<Plus size={13} />}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              fontWeight: 700,
              padding: '0.25rem 0.55rem',
              fontSize: '0.75rem',
            }}
            onClick={handleOpenAdd}
          >
            Register Supplier
          </Button>
        </div>
      </div>

      {/* Standardized Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Suppliers</span>
            <Truck size={14} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Active vendors & distributors</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Active Suppliers</span>
            <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Eligible for Purchase Orders</div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Tax / NTN Registered</span>
            <FileText size={14} style={{ color: '#a5b4fc' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
            {taxRegisteredCount}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>NTN / STRN on file</div>
        </div>
      </div>

      {/* Standardized Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: '220px', maxWidth: '380px' }}>
          <input
            type="text"
            placeholder="Search company, contact, phone, or NTN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.5rem',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: '0.375rem',
            padding: '0.35rem 0.5rem',
            color: 'var(--text-main)',
            outline: 'none',
            fontSize: '0.75rem',
          }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
      </div>

      {/* Supplier Table Card */}
      <Card
        title="Distributors & Suppliers Directory"
        icon={<Truck size={18} />}
      >
        {loading ? (
          <LoadingSpinner label="Loading supplier master records..." />
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No suppliers match the search criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Supplier ID</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Company & Representative</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Contact Info</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Address / Warehouse</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Tax / NTN</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Payable Balance</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supp) => (
                  <tr
                    key={supp.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', opacity: supp.is_active ? 1 : 0.55 }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: 'var(--primary-400)',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.25rem',
                      }}>
                        {supp.supplier_id}
                      </code>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                        <Building size={13} style={{ color: 'var(--primary-400)' }} />
                        <span>{supp.company_name || supp.name}</span>
                      </div>
                      {supp.company_name && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Contact: {supp.name}
                        </div>
                      )}
                      {supp.notes && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.1rem' }}>
                          <em>{supp.notes}</em>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      {supp.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                          <Phone size={11} style={{ color: 'var(--primary-400)' }} />
                          <span>{supp.phone}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.6875rem' }}>No phone</span>
                      )}
                      {supp.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          <Mail size={11} />
                          <span>{supp.email}</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {supp.address ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={11} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
                          <span>{supp.address}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      {supp.tax_id ? (
                        <Badge variant="phase">{supp.tax_id}</Badge>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.6875rem' }}>Unregistered</span>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {(supp.outstanding_payable || 0) > 0 ? (
                        <span style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>
                          Rs. {((supp.outstanding_payable || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontSize: '0.78125rem' }}>Rs. 0.00</span>
                      )}
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      <Badge variant={supp.is_active ? 'success' : 'danger'}>
                        {supp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                        <Button
                          variant="outline"
                          icon={<Edit2 size={12} />}
                          style={{ padding: '0.25rem 0.45rem' }}
                          title="Edit Supplier Details"
                          onClick={() => handleOpenEdit(supp)}
                        />
                        <Button
                          variant="outline"
                          icon={<Power size={12} />}
                          title={supp.is_active ? 'Deactivate supplier' : 'Reactivate supplier'}
                          style={{
                            padding: '0.25rem 0.45rem',
                            color: supp.is_active ? 'var(--warning)' : 'var(--success)',
                            borderColor: supp.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                          }}
                          onClick={() => handleToggleStatus(supp)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplierToEdit={editingSupplier}
        onSaved={fetchSuppliers}
      />

      <SupplierBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={fetchSuppliers}
      />
    </div>
  );
};
