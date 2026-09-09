import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Search,
  Eye,
  Printer,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { CommissionRecord, CommissionStatus, SalesAgent } from '../../types/commission';
import { commissionService } from '../../services/commissionService';
import { CommissionPaymentModal } from './CommissionPaymentModal';
import { CommissionDetailModal } from './CommissionDetailModal';
import { CommissionSlipModal } from './CommissionSlipModal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface CommissionPayablesPageProps {
  refreshTrigger?: number;
  onLoadingChange?: (loading: boolean) => void;
}

export const CommissionPayablesPage: React.FC<CommissionPayablesPageProps> = ({
  refreshTrigger,
  onLoadingChange,
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
      onLoadingChange?.(true);
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
        setTotalCount(data.count ?? data.results.length);
      } else {
        setPayables([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error('Failed to load commission payables:', err);
      showError(err?.response?.data?.detail || err?.message || 'Failed to load commission records.', 'Data Error');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [searchQuery, statusFilter, selectedAgentId, dateFrom, dateTo, currentPage, pageSize, showError, onLoadingChange]);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables, refreshTrigger]);

  // Aggregate KPI metrics
  const totalAccrued = payables.reduce((acc, p) => acc + Number(p.commission_amount || 0), 0);
  const totalPaid = payables.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
  const totalOutstanding = payables.reduce((acc, p) => {
    const bal = p.remaining_payable_amount !== undefined
      ? Number(p.remaining_payable_amount)
      : p.balance_due !== undefined
      ? Number(p.balance_due)
      : Math.max(0, Number(p.commission_amount || 0) - Number(p.adjusted_amount || 0) - Number(p.paid_amount || 0));
    return acc + bal;
  }, 0);
  const totalAdjusted = payables.reduce((acc, p) => acc + Number(p.adjusted_amount || 0), 0);

  const getStatusBadge = (status: CommissionStatus | string) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Standardized Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Accrued
            </span>
            <DollarSign size={14} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalAccrued)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Settled
            </span>
            <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalPaid)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
              Outstanding Due
            </span>
            <Clock size={14} style={{ color: 'var(--danger)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalOutstanding)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
              Return Deductions
            </span>
            <TrendingUp size={14} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
            Rs. {formatMoney(totalAdjusted)}
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
        <div style={{ position: 'relative', flex: '1 1 190px', minWidth: '160px' }}>
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
            placeholder="Search voucher, invoice, agent..."
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
            setStatusFilter(e.target.value);
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
          <option value="UNPAID">Unpaid Only</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Fully Paid</option>
          <option value="ADJUSTED">Return Adjusted</option>
        </select>

        {/* Sales Agent Filter */}
        <select
          value={selectedAgentId}
          onChange={(e) => {
            setSelectedAgentId(e.target.value);
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
            minWidth: '140px',
          }}
        >
          <option value="">All Sales Agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.code || `${agent.commission_percentage}%`})
            </option>
          ))}
        </select>

        {/* Date From */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              padding: '0.3rem 0.45rem',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Date To */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '0.375rem',
              padding: '0.3rem 0.45rem',
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              outline: 'none',
            }}
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
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Payables Data Table Card */}
      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <LoadingSpinner size="lg" />
          </div>
        ) : payables.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <AlertCircle size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9375rem' }}>No Commission Payables Found</h4>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
              {searchQuery || statusFilter !== 'ALL' || selectedAgentId || dateFrom
                ? 'Try adjusting your search criteria or clear active filters.'
                : 'Commission vouchers appear automatically when sales are completed with assigned sales agents.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--border-medium)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Voucher #</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Sale Invoice #</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Sales Agent</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Base Amount</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Rate %</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Commission</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Paid Amount</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Balance Due</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((payable) => {
                  const voucherNum = payable.commission_number || payable.record_number || `COM-${payable.id}`;
                  const invoiceNum = payable.invoice_number || payable.sale_invoice_number || `INV-${payable.sale}`;
                  const agentName = payable.sales_agent_name || (payable as any).agent_name_snapshot || 'Sales Agent';
                  const agentCode = payable.sales_agent_code || (payable as any).agent_code_snapshot || '';
                  const baseAmt = payable.commission_base !== undefined ? Number(payable.commission_base) : Number(payable.commission_base_amount || 0);
                  const ratePct = payable.commission_percentage !== undefined ? Number(payable.commission_percentage) : Number(payable.commission_rate_percentage || 0);
                  const commAmt = Number(payable.commission_amount || 0);
                  const paidAmt = Number(payable.paid_amount || 0);
                  const balDue = payable.remaining_payable_amount !== undefined
                    ? Number(payable.remaining_payable_amount)
                    : payable.balance_due !== undefined
                    ? Number(payable.balance_due)
                    : Math.max(0, commAmt - Number(payable.adjusted_amount || 0) - paidAmt);

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
                      {/* Voucher Number */}
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                        {voucherNum}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        {payable.date || payable.sale_date}
                      </td>

                      {/* Reference of Sale Invoice */}
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        {invoiceNum}
                      </td>

                      {/* Sales Agent */}
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{agentName}</div>
                        {agentCode && (
                          <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {agentCode}
                          </div>
                        )}
                      </td>

                      {/* Base Amount */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Rs. {formatMoney(baseAmt)}
                      </td>

                      {/* Commission Rate % */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        {ratePct.toFixed(2)}%
                      </td>

                      {/* Commission Amount */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                        <div>Rs. {formatMoney(commAmt)}</div>
                        {Number(payable.adjusted_amount || 0) > 0 && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontWeight: 600 }}>
                            -Rs. {formatMoney(payable.adjusted_amount)} Return
                          </div>
                        )}
                      </td>

                      {/* Paid Amount */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', color: 'var(--success)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        Rs. {formatMoney(paidAmt)}
                      </td>

                      {/* Balance Due */}
                      <td
                        style={{
                          padding: '0.625rem 0.75rem',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: balDue > 0 ? 'var(--danger)' : 'var(--success)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <div>Rs. {formatMoney(balDue)}</div>
                        {Number(payable.adjusted_amount || 0) > 0 && (
                          <div style={{ fontSize: '0.625rem', color: 'var(--text-subtle)' }}>
                            Net: Rs. {formatMoney(Number(payable.net_payable_amount || (commAmt - Number(payable.adjusted_amount || 0))))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                        {getStatusBadge(payable.status)}
                      </td>

                      {/* Actions (ONLY ICONS) */}
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          {/* Pay Icon Button */}
                          {canPay && balDue > 0 && (
                            <Button
                              variant="outline"
                              icon={<DollarSign size={13} />}
                              onClick={() => handleOpenPayment(payable)}
                              style={{
                                padding: '0.25rem 0.45rem',
                                fontSize: '0.75rem',
                                color: 'var(--success)',
                                borderColor: 'rgba(16, 185, 129, 0.4)',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              }}
                              title={`Settle Commission Payment (Due: Rs. ${formatMoney(balDue)})`}
                            />
                          )}

                          {/* View Details Icon Button */}
                          <Button
                            variant="outline"
                            icon={<Eye size={13} />}
                            onClick={() => handleOpenDetail(payable)}
                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                            title="View Commission Details & Audit Trail"
                          />

                          {/* Print Slip Icon Button */}
                          {canPrint && (
                            <Button
                              variant="outline"
                              icon={<Printer size={13} />}
                              onClick={() => handleOpenSlip(payable)}
                              style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                              title="Print Commission Settlement Slip"
                            />
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
