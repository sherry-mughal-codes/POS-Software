import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Lock,
  Printer,
  FileText,
  TrendingUp,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  POSDaySession,
  XReportData,
  ZReportData,
  DaySessionsReport,
} from '../../types/daySession';
import { daySessionService } from '../../services/daySessionService';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const DaySessionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'control' | 'history' | 'report'>('control');

  // Current session & live X-report state
  const [currentSession, setCurrentSession] = useState<POSDaySession | null>(null);
  const [liveXReport, setLiveXReport] = useState<XReportData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Historical sessions
  const [sessionsList, setSessionsList] = useState<POSDaySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Report
  const [sessionsReport, setSessionsReport] = useState<DaySessionsReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Modals
  // 1. Open Day Modal
  const [isOpenDayModalOpen, setIsOpenDayModalOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('');
  const [openingNotesInput, setOpeningNotesInput] = useState('');
  const [openDaySubmitting, setOpenDaySubmitting] = useState(false);
  const [openDayError, setOpenDayError] = useState<string | null>(null);

  // 2. Close Day Modal
  const [isCloseDayModalOpen, setIsCloseDayModalOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [differenceReasonInput, setDifferenceReasonInput] = useState('');
  const [closingNotesInput, setClosingNotesInput] = useState('');
  const [closeDaySubmitting, setCloseDaySubmitting] = useState(false);
  const [closeDayError, setCloseDayError] = useState<string | null>(null);

  // 3. X-Report Modal
  const [isXReportModalOpen, setIsXReportModalOpen] = useState(false);

  // 4. Z-Report Modal
  const [viewingZReport, setViewingZReport] = useState<ZReportData | null>(null);

  // Fetch Current Session & Live X-Report
  const fetchCurrentSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = await daySessionService.getCurrentSession();
      if (res.active && res.session) {
        setCurrentSession(res.session);
        setLiveXReport(res.x_report || null);
      } else {
        setCurrentSession(null);
        setLiveXReport(null);
      }
    } catch {
      setCurrentSession(null);
      setLiveXReport(null);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  // Fetch Historical Sessions
  const fetchSessionsList = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await daySessionService.getDaySessions({
        status: statusFilter || undefined,
        date_from: dateFilter || undefined,
        date_to: dateFilter || undefined,
      });
      setSessionsList(data || []);
    } finally {
      setSessionsLoading(false);
    }
  }, [statusFilter, dateFilter]);

  // Fetch Report
  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const data = await daySessionService.getDaySessionsReport({
        status: statusFilter || undefined,
      });
      setSessionsReport(data);
    } finally {
      setReportLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCurrentSession();
  }, [fetchCurrentSession]);

  useEffect(() => {
    if (activeTab === 'history') fetchSessionsList();
    if (activeTab === 'report') fetchReport();
  }, [activeTab, fetchSessionsList, fetchReport]);

  // Open Day Handlers
  const handleOpenDayModal = () => {
    setOpeningCashInput('0');
    setOpeningNotesInput('');
    setOpenDayError(null);
    setIsOpenDayModalOpen(true);
  };

  const handleOpenDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpenDayError(null);
    setOpenDaySubmitting(true);

    const cash = parseFloat(openingCashInput || '0');
    if (cash < 0) {
      setOpenDayError('Opening cash cannot be negative.');
      setOpenDaySubmitting(false);
      return;
    }

    try {
      await daySessionService.openDay({
        opening_cash: cash,
        opening_notes: openingNotesInput,
      });
      setIsOpenDayModalOpen(false);
      await fetchCurrentSession();
      if (activeTab === 'history') fetchSessionsList();
    } catch (err: any) {
      setOpenDayError(err?.response?.data?.detail || err?.message || 'Failed to open business day.');
    } finally {
      setOpenDaySubmitting(false);
    }
  };

  // Close Day Handlers
  const handleOpenCloseDayModal = () => {
    setActualCashInput(liveXReport?.cash_drawer?.expected_cash?.toString() || '0');
    setDifferenceReasonInput('');
    setClosingNotesInput('');
    setCloseDayError(null);
    setIsCloseDayModalOpen(true);
  };

  const handleCloseDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloseDayError(null);
    setCloseDaySubmitting(true);

    const actualCash = parseFloat(actualCashInput || '0');
    const expectedCash = liveXReport?.cash_drawer?.expected_cash || 0;
    const diff = actualCash - expectedCash;

    if (diff !== 0 && !differenceReasonInput.trim()) {
      setCloseDayError(`A reason is required for the cash difference of Rs. ${formatMoney(Math.abs(diff))} (${diff < 0 ? 'Shortage' : 'Excess'}).`);
      setCloseDaySubmitting(false);
      return;
    }

    try {
      const res = await daySessionService.closeDay({
        actual_cash: actualCash,
        difference_reason: differenceReasonInput,
        closing_notes: closingNotesInput,
      });
      setIsCloseDayModalOpen(false);
      setViewingZReport(res.z_report);
      await fetchCurrentSession();
      if (activeTab === 'history') fetchSessionsList();
    } catch (err: any) {
      setCloseDayError(err?.response?.data?.detail || err?.message || 'Failed to close business day.');
    } finally {
      setCloseDaySubmitting(false);
    }
  };

  // View Z-Report for a session
  const handleViewZReport = async (session: POSDaySession) => {
    if (session.z_report_snapshot) {
      setViewingZReport(session.z_report_snapshot);
      return;
    }

    setReportLoading(true);
    try {
      const zData = await daySessionService.getZReport(session.id);
      setViewingZReport(zData);
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to load Z-Report.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Top Navigation & Session Status Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem', paddingBottom: '0.25rem' }}>
        {/* Left Side: Title & Session Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
            Day Closing & X/Z Reports
          </h2>

          {sessionLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Connecting session...</span>
            </div>
          ) : currentSession?.status === 'OPEN' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem' }}>
              <span style={{ width: '0.4rem', height: '0.4rem', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>Day Open:</span>
              <code style={{ color: 'var(--text-main)', fontWeight: 800 }}>{currentSession.session_number}</code>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem' }}>
                <span style={{ width: '0.4rem', height: '0.4rem', borderRadius: '50%', backgroundColor: 'var(--danger)', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>Day Closed</span>
              </div>
              <Button
                variant="primary"
                icon={<Plus size={12} />}
                onClick={handleOpenDayModal}
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
                  fontSize: '0.6875rem',
                  padding: '0.2rem 0.45rem',
                  fontWeight: 700,
                }}
              >
                Open Day
              </Button>
            </div>
          )}
        </div>

        {/* Right Side: Quick KPIs (Opening / Expected), X/Z Actions & Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {currentSession?.status === 'OPEN' && liveXReport && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.45rem', borderRadius: '0.375rem', fontSize: '0.6875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Opening:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(currentSession.opening_cash)}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '0.15rem 0.45rem', borderRadius: '0.375rem', fontSize: '0.6875rem' }}>
                <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>Expected Drawer:</span>
                <strong style={{ color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(liveXReport.cash_drawer.expected_cash)}</strong>
              </div>

              <Button
                variant="outline"
                icon={<FileText size={11} />}
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem' }}
                onClick={() => setIsXReportModalOpen(true)}
                title="View Operational X-Report Snapshot"
              >
                X-Report
              </Button>

              <Button
                variant="primary"
                icon={<Lock size={11} />}
                onClick={handleOpenCloseDayModal}
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', fontWeight: 700, padding: '0.2rem 0.45rem', fontSize: '0.6875rem' }}
                title="Finalize & Lock Z-Report"
              >
                Close Day (Z-Report)
              </Button>
            </>
          )}

          <Button
            variant="outline"
            icon={<RefreshCw size={11} />}
            loading={sessionLoading || sessionsLoading || reportLoading}
            style={{ padding: '0.2rem 0.45rem', fontSize: '0.6875rem' }}
            onClick={() => {
              fetchCurrentSession();
              if (activeTab === 'history') fetchSessionsList();
              if (activeTab === 'report') fetchReport();
            }}
            title="Refresh Session Data"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
        <button
          onClick={() => setActiveTab('control')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'control' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'control' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <DollarSign size={14} />
          <span>Live Day Control</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'history' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'history' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Calendar size={14} />
          <span>Sessions History & Z-Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'report' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'report' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <ShieldCheck size={14} />
          <span>Daily Audit Report</span>
        </button>
      </div>

      {/* TAB 1: LIVE DAY CONTROL & DRAWER AUDIT */}
      {activeTab === 'control' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {liveXReport ? (
            <>
              {/* Standardized Operational Streams Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Net Sales</span>
                    <TrendingUp size={15} style={{ color: 'var(--primary-400)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(liveXReport.sales.net_sales)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    <span>Cash: Rs. {formatMoney(liveXReport.sales.cash_sales)}</span>
                    <span>Card: Rs. {formatMoney(liveXReport.sales.card_sales)}</span>
                    {liveXReport.sales.credit_sales > 0 && (
                      <span>Credit: Rs. {formatMoney(liveXReport.sales.credit_sales)}</span>
                    )}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Cash In (+)</span>
                    <ArrowDownRight size={15} style={{ color: 'var(--success)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    + Rs. {formatMoney(liveXReport.cash_drawer.total_cash_in)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Cash Sales + Customer Receipts
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Cash Out (-)</span>
                    <ArrowUpRight size={15} style={{ color: 'var(--danger)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                    - Rs. {formatMoney(liveXReport.cash_drawer.total_cash_out)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Refunds & Drawer Payouts
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem', border: '1px solid var(--primary-400)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--primary-400)', fontWeight: 700, textTransform: 'uppercase' }}>Expected Cash</span>
                    <DollarSign size={15} style={{ color: 'var(--primary-400)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(liveXReport.cash_drawer.expected_cash)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Opening (Rs. {formatMoney(liveXReport.opening_cash)}) + In - Out
                  </div>
                </div>
              </div>

              {/* Detailed Real-time Cash Ledger Matrix */}
              <Card title="Real-Time Physical Cash Drawer Breakdown" icon={<DollarSign size={18} />}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Stream / Transaction Type</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Source System Module</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Total Transacted</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Drawer Cash Effect</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: 700 }}>Initial Drawer Opening Cash</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>Day Session Opening</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(liveXReport.opening_cash)}</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>+ Rs. {formatMoney(liveXReport.opening_cash)}</td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>POS Sales Received in Cash</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>POS Register ({liveXReport.sales.invoices_count} invoices)</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(liveXReport.sales.net_sales)}</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 700 }}>+ Rs. {formatMoney(liveXReport.sales.cash_sales)}</td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Customer Receivable Payments (Cash)</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>Customers ({liveXReport.customer_payments.count} receipts)</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(liveXReport.customer_payments.total)}</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 700 }}>+ Rs. {formatMoney(liveXReport.customer_payments.cash)}</td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Sales Returns / Cash Refunds</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>Sales Returns ({liveXReport.returns.returns_count} returns)</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(liveXReport.returns.total_returns)}</td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontWeight: 700 }}>- Rs. {formatMoney(liveXReport.returns.cash_refunds)}</td>
                      </tr>

                      <tr style={{ borderTop: '2px solid var(--border-medium)', backgroundColor: 'var(--bg-card)' }}>
                        <td colSpan={3} style={{ padding: '0.75rem', fontWeight: 800, fontSize: '0.875rem' }}>
                          Calculated Expected Physical Cash in Drawer
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary-400)' }}>
                          Rs. {formatMoney(liveXReport.cash_drawer.expected_cash)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No business day session is active. Click "Open Business Day" to start the cash reconciliation cycle.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAY SESSIONS HISTORY & Z-REPORTS */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Standard Compact Filter Toolbar */}
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
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Filter by Date"
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.3rem 0.6rem',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '0.375rem',
                padding: '0.3rem 0.6rem',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                outline: 'none',
                minWidth: '130px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed (Z-Report)</option>
            </select>

            <Button
              variant="primary"
              icon={<Search size={12} />}
              onClick={fetchSessionsList}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Filter
            </Button>

            {(dateFilter || statusFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setDateFilter('');
                  setStatusFilter('');
                }}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.71875rem' }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Historical Table */}
          <Card title={`POS Business Day Sessions (${sessionsList.length})`} icon={<Receipt size={18} />}>
            {sessionsLoading ? (
              <LoadingSpinner label="Loading day sessions..." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Session #</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Opened By</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Opening Cash</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Expected Cash</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Counted Cash</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Discrepancy</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsList.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No day sessions found.
                        </td>
                      </tr>
                    ) : (
                      sessionsList.map((s) => (
                        <tr
                          key={s.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{s.session_number}</code>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                            {s.date}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div>{s.opened_by_name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
                              {new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            Rs. {formatMoney(s.opening_cash)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {s.expected_cash !== null && s.expected_cash !== undefined ? `Rs. ${formatMoney(s.expected_cash)}` : '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {s.actual_cash !== null && s.actual_cash !== undefined ? `Rs. ${formatMoney(s.actual_cash)}` : '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                            {s.cash_difference !== null && s.cash_difference !== undefined ? (
                              <span style={{ color: s.cash_difference === 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {s.cash_difference > 0 ? `+ Rs. ${formatMoney(s.cash_difference)}` : s.cash_difference < 0 ? `- Rs. ${formatMoney(Math.abs(s.cash_difference))}` : 'Exact (Rs. 0.00)'}
                              </span>
                            ) : '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            <Badge variant={s.status === 'OPEN' ? 'success' : 'phase'}>
                              {s.status_display}
                            </Badge>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            {s.status === 'CLOSED' ? (
                              <Button
                                variant="outline"
                                icon={<Printer size={13} />}
                                onClick={() => handleViewZReport(s)}
                                style={{ padding: '0.3rem 0.45rem' }}
                                title="View / Print Z-Report"
                              />
                            ) : (
                              <Button
                                variant="outline"
                                icon={<FileText size={13} />}
                                onClick={() => setIsXReportModalOpen(true)}
                                style={{ padding: '0.3rem 0.45rem' }}
                                title="View Live X-Report"
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: MASTER DAILY AUDIT REPORT */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {reportLoading ? (
            <LoadingSpinner label="Compiling daily audit report..." />
          ) : sessionsReport ? (
            <>
              {/* Standardized Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Day Sessions</span>
                    <Calendar size={15} style={{ color: 'var(--primary-400)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                    {sessionsReport.summary.total_sessions}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {sessionsReport.summary.closed_sessions} closed, {sessionsReport.summary.open_sessions} active
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Opening Cash Seeded</span>
                    <DollarSign size={15} style={{ color: 'var(--text-main)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(sessionsReport.summary.total_opening_cash)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Across all business days
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Counted Actual Cash</span>
                    <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(sessionsReport.summary.total_actual_cash)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Physical cash audited at closing
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Discrepancy / Variance</span>
                    <AlertTriangle size={15} style={{ color: sessionsReport.summary.total_cash_difference === 0 ? 'var(--success)' : 'var(--danger)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: sessionsReport.summary.total_cash_difference === 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {sessionsReport.summary.total_cash_difference > 0 ? `+ Rs. ${formatMoney(sessionsReport.summary.total_cash_difference)}` : sessionsReport.summary.total_cash_difference < 0 ? `- Rs. ${formatMoney(Math.abs(sessionsReport.summary.total_cash_difference))}` : 'Rs. 0.00 (Balanced)'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Cumulative drawer variances
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* OPEN DAY MODAL */}
      <Modal
        isOpen={isOpenDayModalOpen}
        onClose={() => setIsOpenDayModalOpen(false)}
        title="Open Business Day Session"
        maxWidth="480px"
      >
        <form onSubmit={handleOpenDaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {openDayError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{openDayError}</span>
            </div>
          )}

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Opening the business day records the starting cash in your physical drawer. <strong>Only one business day session can be open at a time.</strong>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Initial Opening Cash Drawer (Rs.) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={openingCashInput}
              onChange={(e) => setOpeningCashInput(e.target.value)}
              required
              style={{ width: '100%', padding: '0.625rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Opening Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Starting float seeded from safe..."
              value={openingNotesInput}
              onChange={(e) => setOpeningNotesInput(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsOpenDayModalOpen(false)} disabled={openDaySubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={openDaySubmitting} icon={<CheckCircle size={15} />}>
              Open Business Day
            </Button>
          </div>
        </form>
      </Modal>

      {/* CLOSE DAY MODAL (Z-REPORT PROMPT) */}
      <Modal
        isOpen={isCloseDayModalOpen}
        onClose={() => setIsCloseDayModalOpen(false)}
        title="Close Business Day & Generate Z-Report"
        maxWidth="520px"
      >
        <form onSubmit={handleCloseDaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {closeDayError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{closeDayError}</span>
            </div>
          )}

          {liveXReport && (
            <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Session: <strong>{liveXReport.session_number}</strong></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opening Float: <strong>Rs. {formatMoney(liveXReport.opening_cash)}</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--primary-400)', fontWeight: 700 }}>Expected Drawer Cash:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--primary-400)' }}>
                  Rs. {formatMoney(liveXReport.cash_drawer.expected_cash)}
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Physical Counted Cash in Drawer (Rs.) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
              required
              style={{ width: '100%', padding: '0.625rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', outline: 'none' }}
            />
          </div>

          {/* Difference Calculation Preview */}
          {liveXReport && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Calculated Cash Difference:</span>
              <span style={{
                fontSize: '1.125rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: (parseFloat(actualCashInput || '0') - liveXReport.cash_drawer.expected_cash) === 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                {(parseFloat(actualCashInput || '0') - liveXReport.cash_drawer.expected_cash) > 0
                  ? `+ Rs. ${formatMoney(parseFloat(actualCashInput || '0') - liveXReport.cash_drawer.expected_cash)} (Excess)`
                  : (parseFloat(actualCashInput || '0') - liveXReport.cash_drawer.expected_cash) < 0
                  ? `- Rs. ${formatMoney(Math.abs(parseFloat(actualCashInput || '0') - liveXReport.cash_drawer.expected_cash))} (Shortage)`
                  : 'Rs. 0.00 (Exact Match)'}
              </span>
            </div>
          )}

          {/* Reason required if difference != 0 */}
          {liveXReport && (parseFloat(actualCashInput || '0') - liveXReport.cash_drawer.expected_cash) !== 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.25rem' }}>
                Discrepancy Rationale / Reason *
              </label>
              <input
                type="text"
                placeholder="e.g. Unrecorded petty cash expense, change rounding..."
                value={differenceReasonInput}
                onChange={(e) => setDifferenceReasonInput(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--danger)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Closing Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Cash transferred to safe for night deposit..."
              value={closingNotesInput}
              onChange={(e) => setClosingNotesInput(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsCloseDayModalOpen(false)} disabled={closeDaySubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={closeDaySubmitting}
              icon={<Lock size={15} />}
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}
            >
              Finalize Day & Lock Z-Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* X-REPORT MODAL */}
      {liveXReport && (
        <Modal
          isOpen={isXReportModalOpen}
          onClose={() => setIsXReportModalOpen(false)}
          title={`X-Report (Snapshot) — ${liveXReport.session_number}`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ borderBottom: '2px solid var(--border-medium)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>ApexPOS Retail Financial Core</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operational X-Report (Non-Closing Snapshot)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{liveXReport.session_number}</code>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Generated: {new Date().toLocaleTimeString()}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', border: '1px solid var(--border-subtle)' }}>
              <tbody>
                <tr style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>Opening Cash Drawer Float</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    Rs. {formatMoney(liveXReport.opening_cash)}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Gross Sales Subtotal</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(liveXReport.sales.gross_sales)}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--success)' }}>Cash Sales Received</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                    + Rs. {formatMoney(liveXReport.sales.cash_sales)}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>Card Sales (Non-Drawer)</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(liveXReport.sales.card_sales)}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>Credit Sales / Receivables (Non-Drawer)</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(liveXReport.sales.credit_sales)}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--success)' }}>Customer Payments Collected (Cash)</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                    + Rs. {formatMoney(liveXReport.customer_payments.cash)}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--danger)' }}>Customer Cash Refunds</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                    - Rs. {formatMoney(liveXReport.returns.cash_refunds)}
                  </td>
                </tr>

                <tr style={{ backgroundColor: 'var(--bg-card)', borderTop: '2px solid var(--border-medium)' }}>
                  <td style={{ padding: '0.625rem 0.75rem', fontWeight: 800, fontSize: '0.9375rem' }}>Expected Drawer Cash Right Now</td>
                  <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.125rem', color: 'var(--primary-400)' }}>
                    Rs. {formatMoney(liveXReport.cash_drawer.expected_cash)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <Button variant="outline" onClick={() => window.print()} icon={<Printer size={14} />}>
                Print X-Report
              </Button>
              <Button variant="primary" onClick={() => setIsXReportModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Z-REPORT MODAL (IMMUTABLE CLOSING AUDIT) */}
      {viewingZReport && (
        <Modal
          isOpen={!!viewingZReport}
          onClose={() => setViewingZReport(null)}
          title={`Z-Report (Final Day Closing Audit) — ${viewingZReport.session_number}`}
          maxWidth="580px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ borderBottom: '2px solid var(--border-medium)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>ApexPOS Retail Financial Core</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official Daily Z-Report (Closed & Audited)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{viewingZReport.session_number}</code>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Closed on: {viewingZReport.closing_audit.closed_at ? new Date(viewingZReport.closing_audit.closed_at).toLocaleString() : viewingZReport.date}</div>
              </div>
            </div>

            {/* Reconciliation Comparison Callout */}
            <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Expected Drawer Cash</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(viewingZReport.closing_audit.expected_cash)}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Counted Actual Cash</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>Rs. {formatMoney(viewingZReport.closing_audit.actual_cash)}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Variance / Difference</div>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  color: viewingZReport.closing_audit.cash_difference === 0 ? 'var(--success)' : 'var(--danger)',
                }}>
                  {viewingZReport.closing_audit.cash_difference > 0
                    ? `+ Rs. ${formatMoney(viewingZReport.closing_audit.cash_difference)}`
                    : viewingZReport.closing_audit.cash_difference < 0
                    ? `- Rs. ${formatMoney(Math.abs(viewingZReport.closing_audit.cash_difference))}`
                    : 'Balanced (Rs. 0)'}
                </div>
              </div>
            </div>

            {viewingZReport.closing_audit.difference_reason && (
              <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
                <strong>Discrepancy Reason:</strong> {viewingZReport.closing_audit.difference_reason}
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', border: '1px solid var(--border-subtle)' }}>
              <tbody>
                <tr style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>Starting Drawer Opening Float</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(viewingZReport.opening_cash)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Gross Invoiced Sales ({viewingZReport.sales.invoices_count} sales)</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(viewingZReport.sales.gross_sales)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--success)' }}>Cash Sales Received</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>+ Rs. {formatMoney(viewingZReport.sales.cash_sales)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--success)' }}>Customer Payments in Cash</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>+ Rs. {formatMoney(viewingZReport.customer_payments.cash)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--danger)' }}>Customer Refunds Paid in Cash</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>- Rs. {formatMoney(viewingZReport.returns.cash_refunds)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Closed by: <strong>{viewingZReport.closing_audit.closed_by}</strong></span>
              <span>Audited Status: <strong>IMMUTABLE (Z-REPORT)</strong></span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <Button variant="outline" onClick={() => window.print()} icon={<Printer size={14} />}>
                Print Z-Report
              </Button>
              <Button variant="primary" onClick={() => setViewingZReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
