import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Edit2,
  Power,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CustomerModal } from './CustomerModal';
import { Customer } from '../../types/contact';
import { contactService } from '../../services/contactService';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [creditFilter, setCreditFilter] = useState<'ALL' | 'CREDIT_ENABLED' | 'CASH_ONLY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactService.getCustomers();
      setCustomers(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleStatus = async (cust: Customer) => {
    if (cust.is_walkin) return;
    try {
      await contactService.toggleCustomerStatus(cust.id);
      fetchCustomers();
    } catch (err: any) {
      alert(err?.message || 'Failed to update customer status.');
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setIsModalOpen(true);
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customer_id && c.customer_id.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q));

    let matchesCredit = true;
    if (creditFilter === 'CREDIT_ENABLED') matchesCredit = c.credit_enabled;
    if (creditFilter === 'CASH_ONLY') matchesCredit = !c.credit_enabled;

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = c.is_active;
    if (statusFilter === 'INACTIVE') matchesStatus = !c.is_active;

    return matchesSearch && matchesCredit && matchesStatus;
  });

  // Metrics
  const totalCount = customers.length;
  const creditEligibleCount = customers.filter((c) => c.credit_enabled).length;
  const activeCount = customers.filter((c) => c.is_active).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Badge variant="phase">Phase 4 Active</Badge>
            <Badge variant="success" pulse>Customer Master</Badge>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Customer Accounts & Credit Eligibility
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Single source of truth for counter walk-ins and registered customers with credit purchase authorization.
          </p>
        </div>

        <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenAdd}>
          Register Customer
        </Button>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Total Customers</span>
            <Users size={18} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Registered + Walk-in</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Credit Authorized</span>
            <CreditCard size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            {creditEligibleCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Allowed on-account purchases</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Active Profiles</span>
            <UserCheck size={18} style={{ color: '#a5b4fc' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Available for POS sales</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, maxWidth: '600px' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <Input
              placeholder="Search by name, phone (+92...), or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={14} />}
            />
          </div>

          <select
            value={creditFilter}
            onChange={(e) => setCreditFilter(e.target.value as any)}
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
            <option value="ALL">All Credit Policies</option>
            <option value="CREDIT_ENABLED">Credit Authorized Only</option>
            <option value="CASH_ONLY">Cash-Only</option>
          </select>

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

        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={fetchCustomers} />
      </div>

      {/* Customer Table Card */}
      <Card
        title="Registered Customers Directory"
        subtitle={`${filteredCustomers.length} records matching filters`}
        icon={<Users size={20} />}
      >
        {loading ? (
          <LoadingSpinner label="Loading customer master records..." />
        ) : error ? (
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '0.5rem' }}>
            {error}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No customers match the search criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Customer ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Full Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Contact Info</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Location / Address</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Credit Allowed</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: cust.is_walkin ? 'rgba(56, 189, 248, 0.03)' : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = cust.is_walkin ? 'rgba(56, 189, 248, 0.03)' : 'transparent'}
                  >
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: cust.is_walkin ? 'var(--primary-400)' : 'var(--text-main)',
                        backgroundColor: 'var(--bg-app)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                      }}>
                        {cust.customer_id}
                      </code>
                    </td>

                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ color: 'var(--text-main)' }}>{cust.name}</strong>
                        {cust.is_walkin && (
                          <Badge variant="phase">Default Walk-in</Badge>
                        )}
                      </div>
                      {cust.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                          {cust.notes}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem' }}>
                      {cust.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                          <Phone size={13} style={{ color: 'var(--primary-400)' }} />
                          <span>{cust.phone}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>No phone</span>
                      )}
                      {cust.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          <Mail size={12} />
                          <span>{cust.email}</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {cust.address ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <MapPin size={13} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
                          <span>{cust.address}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      {cust.credit_enabled ? (
                        <Badge variant="success">Credit Enabled</Badge>
                      ) : (
                        <Badge variant="warning">Cash Only</Badge>
                      )}
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <Badge variant={cust.is_active ? 'success' : 'danger'}>
                        {cust.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <Button
                          variant="outline"
                          icon={<Edit2 size={13} />}
                          style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                          onClick={() => handleOpenEdit(cust)}
                        >
                          Edit
                        </Button>
                        {!cust.is_walkin && (
                          <Button
                            variant="outline"
                            icon={<Power size={13} />}
                            title={cust.is_active ? 'Deactivate customer' : 'Reactivate customer'}
                            style={{
                              padding: '0.3rem 0.5rem',
                              color: cust.is_active ? 'var(--warning)' : 'var(--success)',
                              borderColor: cust.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                            }}
                            onClick={() => handleToggleStatus(cust)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerToEdit={editingCustomer}
        onSaved={fetchCustomers}
      />
    </div>
  );
};
