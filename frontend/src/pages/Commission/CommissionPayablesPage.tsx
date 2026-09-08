import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Search,
  Eye,
  Printer,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { CommissionRecord, CommissionStatus, SalesAgent } from '../../types/commission';
import { commissionService } from '../../services/commissionService';
import { CommissionPaymentModal } from './CommissionPaymentModal';
import { CommissionDetailModal } from './CommissionDetailModal';
import { CommissionSlipModal } from './CommissionSlipModal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

interface CommissionPayablesPageProps {
  onSwitchToAgents?: () => void;
}

export const CommissionPayablesPage: React.FC<CommissionPayablesPageProps> = ({
  onSwitchToAgents,
}) => {
  const { hasPermission } = useAuth();
  const { showError } = useToast();

  const [payables, setPayables] = useState<CommissionRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Sales Agents list for dropdown filter
  const [agents, setAgents] = useState<SalesAgent[]>([]);

  // Modals state
  const [selectedPayable, setSelectedPayable] = useState<CommissionRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);

  const canPay = hasPermission('pay_commission');
  const canPrint = hasPermission('print_commission_slip');

  // Load agents for filter dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await commissionService.getAgents({ page_size: 100 });
        const list = Array.isArray(data) ? data : data?.results || [];
        setAgents(list);
      } catch {
        // ignore
      }
    };
    fetchAgents();
  }, []);

  // Fetch payables list
  const fetchPayables = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sales_agent: selectedAgentId ? parseInt(selectedAgentId) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page: currentPage,
        page_size: pageSize,
      };

      const data = await commissionService.getPayables(params);
      if (Array.isArray(data)) {
        setPayables(data);
        setTotalCount(data.length);
      } else if (data && Array.isArray(data.results)) {
        setPayables(data.results);
        setTotalCount(data.count || data.results.length);
      } else {
        setPayables([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error('Failed to load commission payables:', err);
      showError(err?.response?.data?.detail || err?.message || 'Failed to load commission records.', 'Data Error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, selectedAgentId, dateFrom, dateTo, currentPage, pageSize, showError]);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  // Aggregate KPI metrics
  const totalAccrued = payables.reduce((acc, p) => acc + Number(p.commission_amount || 0), 0);
  const totalPaid = payables.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
  const totalOutstanding = payables.reduce((acc, p) => acc + Number(p.balance_due || 0), 0);
  const totalAdjusted = payables.reduce((acc, p) => acc + Number(p.adjusted_amount || 0), 0);

  const getStatusBadge = (status: CommissionStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">Paid</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="warning">Partial</Badge>;
      case 'UNPAID':
        return <Badge variant="danger">Unpaid</Badge>;
      case 'ADJUSTED':
        return <Badge variant="info">Adjusted</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const handleOpenDetail = (payable: CommissionRecord) => {
    setSelectedPayable(payable);
    setIsDetailModalOpen(true);
  };

  const handleOpenPayment = (payable: CommissionRecord) => {
    setSelectedPayable(payable);
    setIsPaymentModalOpen(true);
  };

  const handleOpenSlip = (payable: CommissionRecord) => {
    setSelectedPayable(payable);
    setIsSlipModalOpen(true);
  };

  const handlePaymentSuccess = (updatedRecord?: CommissionRecord) => {
    fetchPayables();
    if (updatedRecord && selectedPayable?.id === updatedRecord.id) {
      setSelectedPayable(updatedRecord);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header with Title and Tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Commission Payables & Settlements
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Track sales agent commission accruals, process disbursements, and inspect return reversals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {onSwitchToAgents && (
            <Button variant="outline" onClick={onSwitchToAgents}>
              View Agents Directory
            </Button>
          )}
          <Button variant="outline" icon={<RefreshCw size={14} />} onClick={() => fetchPayables()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-400)',
              }}
            >
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Commission Accrued
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                Rs. {totalAccrued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Settled / Paid
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.1rem' }}>
                Rs. {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger)',
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Outstanding Payables Due
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.1rem' }}>
                Rs. {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--warning)',
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Return Deductions
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.1rem' }}>
                Rs. {totalAdjusted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar Card */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'UNPAID', label: 'Unpaid' },
              { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
              { id: 'PAID', label: 'Fully Paid' },
              { id: 'ADJUSTED', label: 'Return Adjusted' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.78125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === tab.id ? '1px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                  backgroundColor: statusFilter === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--primary-400)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Secondary Selectors */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
              <Input
                type="text"
                placeholder="Search voucher #, invoice #, agent name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                icon={<Search size={15} />}
              />
            </div>

            {/* Sales Agent Filter */}
            <div style={{ width: '200px' }}>
              <select
                value={selectedAgentId}
                onChange={(e) => {
                  setSelectedAgentId(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              >
                <option value="">All Sales Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.code || `${agent.commission_percentage}%`})
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div style={{ width: '150px' }}>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                title="Date From"
              />
            </div>

            {/* Date To */}
            <div style={{ width: '150px' }}>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                title="Date To"
              />
            </div>

            {(searchQuery || statusFilter !== 'ALL' || selectedAgentId || dateFrom || dateTo) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setSelectedAgentId('');
                  setDateFrom('');
                  setDateTo('');
                  setCurrentPage(1);
                }}
                style={{ fontSize: '0.75rem' }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Payables Data Table */}
      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <LoadingSpinner size="lg" />
          </div>
        ) : payables.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <AlertCircle size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem' }}>No Commission Payables Found</h4>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.8125rem' }}>
              {searchQuery || statusFilter !== 'ALL' || selectedAgentId || dateFrom
                ? 'Try adjusting your search criteria or clear active filters.'
                : 'Commission vouchers will appear automatically when sales are processed with assigned sales agents.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--border-medium)',
                    color: 'var(--text-muted)',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '0.65rem 0.85rem' }}>Voucher #</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Date</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Linked Invoice</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Sales Agent</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Base Amount</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Rate</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Commission</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Paid Amount</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Balance Due</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((payable) => {
                  const bal = Number(payable.balance_due || 0);
                  const commAmt = Number(payable.commission_amount || 0);
                  const paidAmt = Number(payable.paid_amount || 0);
                  const baseAmt = Number(payable.commission_base_amount || 0);

                  return (
                    <tr
                      key={payable.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                        {payable.record_number}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        {payable.date || payable.sale_date}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {payable.sale_invoice_number}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{payable.sales_agent_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#a855f7' }}>{payable.sales_agent_code}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                        Rs. {baseAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-main)' }}>
                        {payable.commission_rate_percentage}%
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                        Rs. {commAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                        Rs. {paidAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: bal > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        Rs. {bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        {getStatusBadge(payable.status)}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          {/* View Details Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(payable)}
                            title="View Commission Details & Audit Trail"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '1.85rem',
                              height: '1.85rem',
                              borderRadius: '0.375rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-main)',
                              border: '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          {/* Settle / Pay Action (Icon Only) */}
                          {canPay && bal > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(payable)}
                              title={`Settle Payment (Due: Rs. ${bal.toLocaleString()})`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '1.85rem',
                                height: '1.85rem',
                                borderRadius: '0.375rem',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: 'var(--success)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                cursor: 'pointer',
                              }}
                            >
                              <DollarSign size={14} />
                            </button>
                          )}

                          {/* Print Slip Action */}
                          {canPrint && (
                            <button
                              type="button"
                              onClick={() => handleOpenSlip(payable)}
                              title="Print Commission Settlement Slip"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '1.85rem',
                                height: '1.85rem',
                                borderRadius: '0.375rem',
                                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                color: 'var(--primary-400)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                cursor: 'pointer',
                              }}
                            >
                              <Printer size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalCount > pageSize && (
          <div style={{ marginTop: '1rem' }}>
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

      {/* Modals */}
      <CommissionPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        payable={selectedPayable}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <CommissionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        payable={selectedPayable}
        onOpenPayModal={handleOpenPayment}
        onOpenPrintSlip={handleOpenSlip}
        canPay={canPay}
      />

      <CommissionSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        payable={selectedPayable}
      />
    </div>
  );
};
