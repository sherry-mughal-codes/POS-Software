import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Power,
  RefreshCw,
  Eye,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { SalesAgentModal } from './SalesAgentModal';
import { SalesAgent } from '../../types/commission';
import { commissionService } from '../../services/commissionService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

import { CommissionPayablesPage } from './CommissionPayablesPage';

export const SalesAgentsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'agents' | 'payables'>('agents');
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedAgent, setSelectedAgent] = useState<SalesAgent | null>(null);

  const canManage = hasPermission('manage_sales_agents');
  const canViewPayables = hasPermission('view_commission_payables') || hasPermission('pay_commission');

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        search: searchQuery.trim() || undefined,
        page: currentPage,
        page_size: pageSize,
      };
      if (statusFilter === 'ACTIVE') params.is_active = true;
      if (statusFilter === 'INACTIVE') params.is_active = false;

      const data = await commissionService.getAgents(params);
      if (Array.isArray(data)) {
        setAgents(data);
        setTotalCount(data.length);
      } else if (data && Array.isArray(data.results)) {
        setAgents(data.results);
        setTotalCount(data.count || data.results.length);
      } else {
        setAgents([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error('Failed to load sales agents:', err);
      showError(err?.response?.data?.detail || err?.message || 'Failed to load sales agents.', 'Data Error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage, pageSize, showError]);

  useEffect(() => {
    if (activeTab === 'agents') {
      fetchAgents();
    }
  }, [activeTab, fetchAgents]);

  const handleOpenCreate = () => {
    setSelectedAgent(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agent: SalesAgent) => {
    setSelectedAgent(agent);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleOpenView = (agent: SalesAgent) => {
    setSelectedAgent(agent);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (agent: SalesAgent) => {
    if (!canManage) return;
    try {
      const res = await commissionService.toggleAgentStatus(agent.id);
      showSuccess(res.detail || `Agent ${agent.name} status updated.`, 'Status Updated');
      fetchAgents();
    } catch (err: any) {
      showError(err?.response?.data?.detail || err?.message || 'Failed to update agent status.', 'Action Error');
    }
  };

  const handleAgentSaved = () => {
    showSuccess(
      modalMode === 'edit' ? 'Sales agent updated successfully.' : 'New sales agent created successfully.',
      'Agent Saved'
    );
    fetchAgents();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Commission Module Tab Switcher */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-medium)',
          gap: '0.5rem',
          paddingBottom: '0.2rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('agents')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: activeTab === 'agents' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
            border: activeTab === 'agents' ? '1px solid var(--primary-500)' : '1px solid transparent',
            borderRadius: '0.375rem',
            color: activeTab === 'agents' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={16} />
          Sales Agents Directory
        </button>

        {canViewPayables && (
          <button
            type="button"
            onClick={() => setActiveTab('payables')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: activeTab === 'payables' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              border: activeTab === 'payables' ? '1px solid var(--primary-500)' : '1px solid transparent',
              borderRadius: '0.375rem',
              color: activeTab === 'payables' ? 'var(--primary-400)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <DollarSign size={16} />
            Commission Payables & Settlements
          </button>
        )}
      </div>

      {activeTab === 'payables' ? (
        <CommissionPayablesPage onSwitchToAgents={() => setActiveTab('agents')} />
      ) : (
        <>
          {/* Compact Header Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
                Sales Agents Directory
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {canManage && (
                <Button
                  variant="primary"
                  icon={<Plus size={14} />}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                  onClick={handleOpenCreate}
                >
                  Register Sales Agent
                </Button>
              )}

              <Button
                variant="secondary"
                icon={<RefreshCw size={13} />}
                loading={loading}
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                onClick={fetchAgents}
                title="Refresh sales agent records"
              >
                Refresh
              </Button>
            </div>
          </div>

      {/* Main Table Card */}
      <Card
        title="Sales Agent Records"
        icon={<Users size={16} />}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ width: '220px' }}>
              <Input
                type="text"
                placeholder="Search code, name, phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                icon={<Search size={13} />}
              />
            </div>

            {/* Status Filter Buttons */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.375rem',
                padding: '2px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    borderRadius: '0.25rem',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: statusFilter === st ? 'var(--primary-500)' : 'transparent',
                    color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {loading ? (
          <LoadingSpinner label="Fetching sales agent master records..." />
        ) : agents.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              No sales agents found
            </div>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Get started by registering a new sales agent.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Agent Profile</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Contact Info</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Commission %</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Joining Date</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr
                    key={agent.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s ease',
                      opacity: agent.is_active ? 1 : 0.75,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Agent Name & Code */}
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.375rem',
                            backgroundColor: agent.is_active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            border: agent.is_active ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-subtle)',
                            color: agent.is_active ? 'var(--primary-400)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            flexShrink: 0,
                          }}
                        >
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{agent.name}</div>
                          <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {agent.code}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        {agent.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78125rem', color: 'var(--text-main)' }}>
                            <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{agent.phone}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>No phone</span>
                        )}
                        {agent.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                            <Mail size={11} />
                            <span>{agent.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Commission Rate */}
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: 'var(--primary-400)',
                          backgroundColor: 'rgba(56, 189, 248, 0.08)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {Number(agent.commission_percentage).toFixed(2)}%
                      </span>
                    </td>

                    {/* Joining Date */}
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{agent.joining_date || '—'}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <Badge variant={agent.is_active ? 'success' : 'danger'}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Action Column with Icon Tooltips */}
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        {/* View Action */}
                        <Button
                          variant="outline"
                          icon={<Eye size={13} />}
                          onClick={() => handleOpenView(agent)}
                          style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                          title="View Sales Agent Profile"
                        />

                        {/* Edit Action */}
                        {canManage && (
                          <Button
                            variant="outline"
                            icon={<Edit2 size={13} />}
                            onClick={() => handleOpenEdit(agent)}
                            style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                            title="Edit Sales Agent"
                          />
                        )}

                        {/* Toggle Active/Inactive Action */}
                        {canManage && (
                          <Button
                            variant="outline"
                            icon={<Power size={13} />}
                            onClick={() => handleToggleStatus(agent)}
                            style={{
                              padding: '0.3rem 0.45rem',
                              fontSize: '0.75rem',
                              color: agent.is_active ? 'var(--warning)' : 'var(--success)',
                              borderColor: agent.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                              backgroundColor: agent.is_active ? 'transparent' : 'rgba(34, 197, 94, 0.1)',
                            }}
                            title={agent.is_active ? 'Deactivate Sales Agent' : 'Reactivate Sales Agent'}
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

        {totalCount > pageSize && (
          <div style={{ marginTop: '0.75rem' }}>
            <Pagination
              currentPage={currentPage}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {/* Sales Agent Modal */}
      <SalesAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agentToEdit={selectedAgent}
        mode={modalMode}
        onSaved={handleAgentSaved}
      />
        </>
      )}
    </div>
  );
};
export default SalesAgentsPage;
