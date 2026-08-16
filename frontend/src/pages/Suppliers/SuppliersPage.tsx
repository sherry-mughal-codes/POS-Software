import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building,
  Edit2,
  Power,
  RefreshCw,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SupplierModal } from './SupplierModal';
import { Supplier } from '../../types/contact';
import { contactService } from '../../services/contactService';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactService.getSuppliers();
      setSuppliers(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleToggleStatus = async (supp: Supplier) => {
    try {
      await contactService.toggleSupplierStatus(supp.id);
      fetchSuppliers();
    } catch (err: any) {
      alert(err?.message || 'Failed to update supplier status.');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Badge variant="phase">Phase 4 Active</Badge>
            <Badge variant="success" pulse>Supplier Master</Badge>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Suppliers & Vendor Directory
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Single source of truth for merchandise distributors, purchase order attribution, and accounts payable.
          </p>
        </div>

        <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenAdd}>
          Register Supplier
        </Button>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Suppliers</span>
            <Truck size={18} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active vendors & distributors</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Active Suppliers</span>
            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Eligible for Purchase Orders</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Tax / NTN Registered</span>
            <FileText size={18} style={{ color: '#a5b4fc' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
            {taxRegisteredCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>NTN / STRN on file</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, maxWidth: '500px' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <Input
              placeholder="Search company, contact, phone, or NTN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={14} />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.5rem',
              padding: '0.625rem',
              color: 'var(--text-main)',
              outline: 'none',
              fontSize: '0.8125rem',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={fetchSuppliers} />
      </div>

      {/* Supplier Table Card */}
      <Card
        title="Distributors & Suppliers Directory"
        subtitle={`${filteredSuppliers.length} suppliers registered`}
        icon={<Truck size={20} />}
      >
        {loading ? (
          <LoadingSpinner label="Loading supplier master records..." />
        ) : error ? (
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '0.5rem' }}>
            {error}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No suppliers match the search criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Supplier ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Company & Representative</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Contact Info</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Address / Warehouse</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Tax / NTN</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
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
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--primary-400)',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                      }}>
                        {supp.supplier_id}
                      </code>
                    </td>

                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building size={14} style={{ color: 'var(--primary-400)' }} />
                        <span>{supp.company_name || supp.name}</span>
                      </div>
                      {supp.company_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Contact: {supp.name}
                        </div>
                      )}
                      {supp.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                          <em>{supp.notes}</em>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem' }}>
                      {supp.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                          <Phone size={13} style={{ color: 'var(--primary-400)' }} />
                          <span>{supp.phone}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>No phone</span>
                      )}
                      {supp.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          <Mail size={12} />
                          <span>{supp.email}</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {supp.address ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <MapPin size={13} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
                          <span>{supp.address}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem' }}>
                      {supp.tax_id ? (
                        <Badge variant="phase">{supp.tax_id}</Badge>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>Unregistered</span>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <Badge variant={supp.is_active ? 'success' : 'danger'}>
                        {supp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <Button
                          variant="outline"
                          icon={<Edit2 size={13} />}
                          style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                          onClick={() => handleOpenEdit(supp)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          icon={<Power size={13} />}
                          title={supp.is_active ? 'Deactivate supplier' : 'Reactivate supplier'}
                          style={{
                            padding: '0.3rem 0.5rem',
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
    </div>
  );
};
