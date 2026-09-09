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
  UserCheck,
  UserX,
  Percent,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { SalesAgentModal } from './SalesAgentModal';
import { SalesAgent } from '../../types/commission';
import { commissionService } from '../../services/commissionService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

import { CommissionPayablesPage } from './CommissionPayablesPage';
import { AgentCommissionSettlementModal } from './AgentCommissionSettlementModal';

export const SalesAgentsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'agents' | 'payables'>('agents');
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [payablesLoading, setPayablesLoading] = useState<boolean>(false);
  const [payablesRefreshTrigger, setPayablesRefreshTrigger] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedAgent, setSelectedAgent] = useState<SalesAgent | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);

  const canManage = hasPermission('manage_sales_agents');
  const canPay = hasPermission('pay_commission');
  const canViewPayables = hasPermission('view_commission_payables') || canPay;

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
        setTotalCount(data.count ?? data.results.length);
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

  const handleGlobalRefresh = () => {
    if (activeTab === 'agents') {
      fetchAgents();
    } else {
      setPayablesRefreshTrigger((prev) => prev + 1);
    }
  };

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
      modalMode === 'edit' ? 'Sales agent updated successfully.' : 'New sales agent registered successfully.',
      'Agent Saved'
    );
    fetchAgents();
  };

  const activeAgentsCount = agents.filter((a) => a.is_active).length;
  const inactiveAgentsCount = agents.filter((a) => !a.is_active).length;
  const avgCommissionRate =
    agents.length > 0
      ? agents.reduce((acc, a) => acc + Number(a.commission_percentage || 0), 0) / agents.length
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Standard Single Header with One Global Refresh Button */}
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
            Commission Management
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activeTab === 'payables' && canPay && (
            <Button
              variant="primary"
              icon={<DollarSign size={13} />}
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                fontWeight: 700,
                padding: '0.25rem 0.55rem',
                fontSize: '0.75rem',
              }}
              onClick={() => setIsSettlementModalOpen(true)}
            >
              Pay Commission
            </Button>
          )}

          <Button
            variant="outline"
            icon={<RefreshCw size={13} />}
            loading={activeTab === 'agents' ? loading : payablesLoading}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={handleGlobalRefresh}
            title="Refresh Commission Data"
          >
            Refresh
          </Button>

          {activeTab === 'agents' && canManage && (
            <Button
              variant="primary"
              icon={<Plus size={13} />}
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                fontWeight: 700,
                padding: '0.25rem 0.55rem',
                fontSize: '0.75rem',
              }}
              onClick={handleOpenCreate}
            >
              Register Sales Agent
            </Button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('agents')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'agents' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'agents' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={14} />
          <span>Sales Agents Directory ({totalCount || agents.length})</span>
        </button>

        {canViewPayables && (
          <button
            type="button"
            onClick={() => setActiveTab('payables')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: activeTab === 'payables' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'payables' ? 'var(--primary-400)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.78125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
            }}
          >
            <DollarSign size={14} />
            <span>Commission Payables</span>
          </button>
        )}
      </div>

      {activeTab === 'payables' ? (
        <CommissionPayablesPage
          refreshTrigger={payablesRefreshTrigger}
          onLoadingChange={setPayablesLoading}
        />
      ) : (
        <>
          {/* Standardized KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
            <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Agents
                </span>
                <Users size={14} style={{ color: 'var(--primary-400)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {totalCount || agents.length}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Active Agents
                </span>
                <UserCheck size={14} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                {activeAgentsCount}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Inactive Agents
                </span>
                <UserX size={14} style={{ color: 'var(--danger)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                {inactiveAgentsCount}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Avg Commission Rate
                </span>
                <Percent size={14} style={{ color: 'var(--warning)' }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                {avgCommissionRate.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Standardized Compact Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.65rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-subtle)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search code, name, phone, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.3rem 0.6rem 0.3rem 1.85rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.3rem 0.6rem',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                outline: 'none',
                minWidth: '110px',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            {(searchQuery || statusFilter !== 'ALL') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Reset
              </Button>
            )}
          </div>

          {/* Main Table Card */}
          <Card>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                <LoadingSpinner size="lg" />
              </div>
            ) : agents.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9375rem' }}>No Sales Agents Found</h4>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try adjusting your search criteria or status filter.'
                    : 'Get started by registering a new sales agent.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Agent Profile</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Contact Info</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Commission Rate %</th>
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
                        <td style={{ padding: '0.625rem 0.75rem' }}>
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
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span>{agent.name}</span>
                                {Number(agent.advance_credit_balance || 0) > 0 && (
                                  <Badge variant="warning" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                                    Rs. {Number(agent.advance_credit_balance).toFixed(2)} Advance Credit
                                  </Badge>
                                )}
                                {Number(agent.total_adjusted || 0) > 0 && Number(agent.advance_credit_balance || 0) <= 0 && (
                                  <Badge variant="warning" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                                    Rs. {Number(agent.total_adjusted).toFixed(2)} Return Offset
                                  </Badge>
                                )}
                              </div>
                              <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {agent.code}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
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
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontWeight: 700,
                              fontSize: '0.8125rem',
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
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{agent.joining_date || '—'}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                          <Badge variant={agent.is_active ? 'success' : 'danger'}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>

                        {/* Action Column (ONLY ICONS) */}
                        <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            {/* View Action Icon Button */}
                            <Button
                              variant="outline"
                              icon={<Eye size={13} />}
                              onClick={() => handleOpenView(agent)}
                              style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                              title="View Sales Agent Profile"
                            />

                            {/* Edit Action Icon Button */}
                            {canManage && (
                              <Button
                                variant="outline"
                                icon={<Edit2 size={13} />}
                                onClick={() => handleOpenEdit(agent)}
                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                                title="Edit Sales Agent"
                              />
                            )}

                            {/* Toggle Active/Inactive Action Icon Button */}
                            {canManage && (
                              <Button
                                variant="outline"
                                icon={<Power size={13} />}
                                onClick={() => handleToggleStatus(agent)}
                                style={{
                                  padding: '0.25rem 0.45rem',
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

      {/* Agent Commission Settlement Modal (Bulk / Full Balance) */}
      <AgentCommissionSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onPaymentSuccess={handleGlobalRefresh}
      />
    </div>
  );
};
export default SalesAgentsPage;
