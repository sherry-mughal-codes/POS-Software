import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Power,
  RefreshCw,
  DollarSign,
  Receipt,
  FileText,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Printer,
  Sliders,
  Clock,
  Briefcase,
  Send,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Employee,
  Attendance,
  AttendanceStatusKind,
  SalarySlip,
  EmployeePaymentMethodKind,
  PayrollReport,
} from '../../types/employee';
import { Account } from '../../types/accounting';
import { employeeService } from '../../services/employeeService';
import { accountingService } from '../../services/accountingService';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { printPayrollSlip } from '../../utils/printPayrollSlip';
import { formatErrorMessage } from '../../utils/formatError';

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const EmployeesDashboardPage: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const { currencySymbol, companyName, companyPhone } = useSettings();
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payroll' | 'reports'>('employees');

  // Accounts master data
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);

  // 1. Employees Master State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // 2. Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('');
  const [attendanceEmployeeFilter, setAttendanceEmployeeFilter] = useState<string | number>('');

  // 3. Payroll State
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState<number>(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState<number>(new Date().getFullYear());
  const [payrollStatusFilter, setPayrollStatusFilter] = useState('');

  // 4. Reports State
  const [payrollReport, setPayrollReport] = useState<PayrollReport | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Modals
  // Employee Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    job_title: 'Cashier',
    department: 'Sales & Counter Operations',
    date_of_joining: new Date().toISOString().split('T')[0],
    basic_salary: '',
    payment_method: 'CASH' as EmployeePaymentMethodKind,
    bank_name: '',
    bank_account_title: '',
    bank_account_number: '',
    notes: '',
  });
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  // Attendance Modal
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceFormData, setAttendanceFormData] = useState({
    employee: 0,
    date: new Date().toISOString().split('T')[0],
    check_in: '09:00',
    check_out: '18:00',
    status: 'PRESENT' as AttendanceStatusKind,
    notes: '',
  });
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Salary Slip Modal
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [slipFormData, setSlipFormData] = useState({
    employee: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    basic_salary: '',
    allowances: '0',
    deductions: '0',
    notes: '',
    submit_now: true,
  });
  const [slipSubmitting, setSlipSubmitting] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);

  // Disburse Payment Modal
  const [disburseSlipTarget, setDisburseSlipTarget] = useState<SalarySlip | null>(null);
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disburseMethod, setDisburseMethod] = useState<EmployeePaymentMethodKind>('CASH');
  const [disburseAccountId, setDisburseAccountId] = useState<number>(0);
  const [disburseReference, setDisburseReference] = useState('');
  const [disburseChequeNumber, setDisburseChequeNumber] = useState('');
  const [disburseChequeDate, setDisburseChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [disburseChequeBank, setDisburseChequeBank] = useState('');
  const [disburseNotes, setDisburseNotes] = useState('');
  const [disburseSubmitting, setDisburseSubmitting] = useState(false);
  const [disburseError, setDisburseError] = useState<string | null>(null);

  const getFilteredDisburseAccounts = (method: EmployeePaymentMethodKind) => {
    if (method === 'CASH') {
      return paymentAccounts.filter(
        (a) =>
          (a.code.startsWith('101') || a.parent_code === '1010' || (a.name.toLowerCase().includes('cash') && !a.code.startsWith('102'))) &&
          !a.name.toLowerCase().includes('jazz') &&
          !a.name.toLowerCase().includes('easy') &&
          !a.code.startsWith('102')
      );
    }
    return paymentAccounts.filter(
      (a) =>
        a.code.startsWith('102') ||
        a.parent_code === '1020' ||
        a.name.toLowerCase().includes('bank') ||
        a.name.toLowerCase().includes('card') ||
        a.name.toLowerCase().includes('jazz') ||
        a.name.toLowerCase().includes('easy')
    );
  };

  // View / Print Slip Modal
  const [viewingSlip, setViewingSlip] = useState<SalarySlip | null>(null);
  const [slipPaperWidth, setSlipPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  // Cancel Modal
  const [cancelTarget, setCancelTarget] = useState<{ type: 'slip' | 'payment'; id: number; number: string; amount: number } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Fetch Accounts
  useEffect(() => {
    accountingService.getAccounts().then((accs) => {
      if (accs) {
        const isLeaf = (a: Account) => a.is_leaf ?? (!a.is_header && (!a.children_count || a.children_count === 0));
        const cashBank = accs.filter(
          (a) => a.account_type === 'ASSET' && isLeaf(a) && (a.code.startsWith('101') || a.code.startsWith('102') || a.parent_code === '1010' || a.parent_code === '1020')
        );
        setPaymentAccounts(cashBank.length > 0 ? cashBank : accs.filter((a) => a.account_type === 'ASSET' && isLeaf(a)));
      }
    });
  }, []);

  // Fetch Employees
  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data || []);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  // Fetch Attendance
  const fetchAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const data = await employeeService.getAttendance({
        date_from: attendanceDate || undefined,
        date_to: attendanceDate || undefined,
        employee: attendanceEmployeeFilter ? Number(attendanceEmployeeFilter) : undefined,
        status: attendanceStatusFilter || undefined,
      });
      setAttendanceRecords(data || []);
    } finally {
      setAttendanceLoading(false);
    }
  }, [attendanceDate, attendanceEmployeeFilter, attendanceStatusFilter]);

  // Fetch Salary Slips
  const fetchSalarySlips = useCallback(async () => {
    setPayrollLoading(true);
    try {
      const data = await employeeService.getSalarySlips({
        month: payrollMonth || undefined,
        year: payrollYear || undefined,
        status: payrollStatusFilter || undefined,
      });
      setSalarySlips(data || []);
    } finally {
      setPayrollLoading(false);
    }
  }, [payrollMonth, payrollYear, payrollStatusFilter]);

  // Fetch Report
  const fetchReport = useCallback(async () => {
    setReportsLoading(true);
    try {
      const data = await employeeService.getPayrollReport({
        month: payrollMonth || undefined,
        year: payrollYear || undefined,
      });
      setPayrollReport(data);
    } finally {
      setReportsLoading(false);
    }
  }, [payrollMonth, payrollYear]);

  // Tab change triggers
  useEffect(() => {
    if (activeTab === 'employees') fetchEmployees();
    else if (activeTab === 'attendance') fetchAttendance();
    else if (activeTab === 'payroll') fetchSalarySlips();
    else if (activeTab === 'reports') fetchReport();
  }, [activeTab, fetchEmployees, fetchAttendance, fetchSalarySlips, fetchReport]);

  // Employee Form Handlers
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeFormData({
      full_name: '',
      phone: '',
      email: '',
      address: '',
      job_title: 'Cashier',
      department: 'Sales & Counter Operations',
      date_of_joining: new Date().toISOString().split('T')[0],
      basic_salary: '',
      payment_method: 'CASH',
      bank_name: '',
      bank_account_title: '',
      bank_account_number: '',
      notes: '',
    });
    setEmployeeError(null);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      full_name: emp.full_name,
      phone: emp.phone || '',
      email: emp.email || '',
      address: emp.address || '',
      job_title: emp.job_title,
      department: emp.department,
      date_of_joining: emp.date_of_joining,
      basic_salary: emp.basic_salary.toString(),
      payment_method: emp.payment_method,
      bank_name: emp.bank_name || '',
      bank_account_title: emp.bank_account_title || '',
      bank_account_number: emp.bank_account_number || '',
      notes: emp.notes || '',
    });
    setEmployeeError(null);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeError(null);
    setEmployeeSubmitting(true);

    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.id, {
          ...employeeFormData,
          basic_salary: parseFloat(employeeFormData.basic_salary || '0'),
        });
      } else {
        await employeeService.createEmployee({
          ...employeeFormData,
          basic_salary: parseFloat(employeeFormData.basic_salary || '0'),
        });
      }
      setIsEmployeeModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setEmployeeError(formatErrorMessage(err));
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  const handleToggleEmployeeStatus = async (emp: Employee) => {
    try {
      await employeeService.toggleEmployeeStatus(emp.id);
      showSuccess(`Employee ${emp.full_name} status updated.`, 'Employee Status');
      fetchEmployees();
    } catch (err: any) {
      showError(err?.response?.data?.detail || err?.message || 'Failed to toggle status.', 'Employee Error');
    }
  };

  // Attendance Form Handlers
  const handleOpenMarkAttendance = () => {
    const targetDate = attendanceDate || new Date().toISOString().split('T')[0];
    const availableEmployees = employees.filter(
      (e) => e.is_active && !attendanceRecords.some((rec) => rec.employee === e.id && rec.date === targetDate)
    );
    setAttendanceFormData({
      employee: availableEmployees[0]?.id || 0,
      date: targetDate,
      check_in: '09:00',
      check_out: '18:00',
      status: 'PRESENT',
      notes: '',
    });
    setAttendanceError(null);
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttendanceError(null);
    setAttendanceSubmitting(true);

    try {
      await employeeService.recordAttendance({
        employee: attendanceFormData.employee,
        date: attendanceFormData.date,
        check_in: attendanceFormData.status === 'ABSENT' || attendanceFormData.status === 'LEAVE' ? undefined : attendanceFormData.check_in,
        check_out: attendanceFormData.status === 'ABSENT' || attendanceFormData.status === 'LEAVE' ? undefined : attendanceFormData.check_out,
        status: attendanceFormData.status,
        notes: attendanceFormData.notes,
      });
      setIsAttendanceModalOpen(false);
      fetchAttendance();
    } catch (err: any) {
      setAttendanceError(err?.response?.data?.detail || err?.message || 'Failed to record attendance.');
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  // Salary Slip Form Handlers
  const handleOpenCreateSlip = () => {
    // Select first active employee who does NOT already have an active/submitted slip for this month
    const unpaidEmp = employees.find((e) => {
      if (!e.is_active) return false;
      const hasActiveSlip = salarySlips.some(
        (s) => s.employee === e.id && s.month === payrollMonth && s.year === payrollYear && s.status !== 'CANCELLED'
      );
      return !hasActiveSlip;
    }) || employees.find((e) => e.is_active) || employees[0];

    setSlipFormData({
      employee: unpaidEmp?.id || 0,
      month: payrollMonth,
      year: payrollYear,
      date: new Date().toISOString().split('T')[0],
      basic_salary: unpaidEmp?.basic_salary ? unpaidEmp.basic_salary.toString() : '',
      allowances: '0',
      deductions: '0',
      notes: '',
      submit_now: true,
    });
    setSlipError(null);
    setIsSlipModalOpen(true);
  };

  const handleSaveSalarySlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlipError(null);
    setSlipSubmitting(true);

    try {
      await employeeService.createSalarySlip({
        employee: slipFormData.employee,
        month: slipFormData.month,
        year: slipFormData.year,
        date: slipFormData.date,
        basic_salary: parseFloat(slipFormData.basic_salary || '0'),
        allowances: parseFloat(slipFormData.allowances || '0'),
        deductions: parseFloat(slipFormData.deductions || '0'),
        notes: slipFormData.notes,
        submit_now: slipFormData.submit_now,
      });
      setIsSlipModalOpen(false);
      fetchSalarySlips();
    } catch (err: any) {
      setSlipError(err?.response?.data?.detail || err?.message || 'Failed to create salary slip.');
    } finally {
      setSlipSubmitting(false);
    }
  };

  const handleSubmitSlip = async (id: number) => {
    try {
      await employeeService.submitSalarySlip(id);
      showSuccess('Salary slip posted and finalized successfully!', 'Slip Finalized');
      fetchSalarySlips();
    } catch (err: any) {
      showError(err?.response?.data?.detail || err?.message || 'Failed to submit salary slip.', 'Salary Slip Error');
    }
  };

  // Disburse Payment Handlers
  const handleOpenDisbursePayment = (slip: SalarySlip) => {
    setDisburseSlipTarget(slip);
    setDisburseAmount(slip.payable_amount.toString());
    setDisburseMethod('CASH');
    const cashAccs = getFilteredDisburseAccounts('CASH');
    setDisburseAccountId(cashAccs[0]?.id || paymentAccounts[0]?.id || 0);
    setDisburseReference('');
    setDisburseChequeNumber('');
    setDisburseChequeDate(new Date().toISOString().split('T')[0]);
    setDisburseChequeBank('');
    setDisburseNotes('');
    setDisburseError(null);
  };

  const handleDisburseMethodChange = (newMethod: EmployeePaymentMethodKind) => {
    setDisburseMethod(newMethod);
    const validAccs = getFilteredDisburseAccounts(newMethod);
    if (validAccs.length > 0) {
      setDisburseAccountId(validAccs[0].id);
    }
  };

  const handleSaveDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseSlipTarget) return;
    setDisburseError(null);

    const amt = parseFloat(disburseAmount);
    if (amt <= 0 || amt > disburseSlipTarget.payable_amount) {
      setDisburseError(`Payment amount must be between Rs. 0.01 and Rs. ${formatMoney(disburseSlipTarget.payable_amount)}.`);
      return;
    }

    if (disburseMethod === 'CHEQUE' && !disburseChequeNumber.trim()) {
      setDisburseError('Cheque Number is required.');
      return;
    }

    setDisburseSubmitting(true);

    try {
      await employeeService.disburseSalaryPayment({
        salary_slip: disburseSlipTarget.id,
        amount: amt,
        payment_method: disburseMethod,
        payment_account: disburseAccountId || undefined,
        reference: disburseReference,
        cheque_number: disburseMethod === 'CHEQUE' ? disburseChequeNumber.trim() : undefined,
        cheque_date: disburseMethod === 'CHEQUE' ? disburseChequeDate : undefined,
        cheque_bank: disburseMethod === 'CHEQUE' ? disburseChequeBank.trim() : undefined,
        notes: disburseNotes,
      });
      setDisburseSlipTarget(null);
      fetchSalarySlips();
    } catch (err: any) {
      setDisburseError(err?.response?.data?.detail || err?.message || 'Failed to disburse salary payment.');
    } finally {
      setDisburseSubmitting(false);
    }
  };

  // Cancel Handlers
  const handleOpenCancel = (type: 'slip' | 'payment', id: number, number: string, amount: number) => {
    setCancelTarget({ type, id, number, amount });
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelError(null);
    setCancelSubmitting(true);

    try {
      if (cancelTarget.type === 'slip') {
        await employeeService.cancelSalarySlip(cancelTarget.id, cancelReason);
      } else {
        await employeeService.cancelSalaryPayment(cancelTarget.id, cancelReason);
      }
      setCancelTarget(null);
      fetchSalarySlips();
    } catch (err: any) {
      setCancelError(err?.response?.data?.detail || err?.message || 'Failed to cancel.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Filtered Employees
  const filteredEmployees = employees.filter((e) => {
    const q = employeeSearch.toLowerCase();
    const matchesSearch =
      e.full_name.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      (e.phone && e.phone.toLowerCase().includes(q)) ||
      (e.job_title && e.job_title.toLowerCase().includes(q));

    let matchesDept = true;
    if (deptFilter) matchesDept = e.department === deptFilter;

    let matchesStatus = true;
    if (activeStatusFilter === 'ACTIVE') matchesStatus = e.is_active;
    if (activeStatusFilter === 'INACTIVE') matchesStatus = !e.is_active;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const handleRefreshAll = () => {
    fetchEmployees();
    if (activeTab === 'attendance') {
      fetchAttendance();
    } else if (activeTab === 'payroll') {
      fetchSalarySlips();
    } else if (activeTab === 'reports') {
      fetchReport();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Employees & Payroll
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {activeTab !== 'attendance' && (
            <Button
              variant="secondary"
              icon={<RefreshCw size={13} />}
              loading={employeesLoading || attendanceLoading || payrollLoading || reportsLoading}
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
              onClick={handleRefreshAll}
            >
              Refresh
            </Button>
          )}

          {activeTab === 'attendance' && (
            <Button variant="primary" icon={<Clock size={14} />} style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} onClick={handleOpenMarkAttendance}>
              Mark Attendance
            </Button>
          )}

          {activeTab === 'payroll' && (
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                fontWeight: 700,
                padding: '0.25rem 0.55rem',
                fontSize: '0.75rem',
              }}
              onClick={handleOpenCreateSlip}
            >
              Create Salary Slip
            </Button>
          )}

          {activeTab === 'employees' && (
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                fontWeight: 700,
                padding: '0.25rem 0.55rem',
                fontSize: '0.75rem',
              }}
              onClick={handleOpenAddEmployee}
            >
              Register Employee
            </Button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
        <button
          onClick={() => setActiveTab('employees')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'employees' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'employees' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Users size={14} />
          <span>Staff Directory ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'attendance' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'attendance' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Clock size={14} />
          <span>Attendance Roster</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'payroll' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'payroll' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <DollarSign size={14} />
          <span>Salary Slips & Payouts</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: activeTab === 'reports' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'reports' ? 'var(--primary-400)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.78125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <BarChart3 size={14} />
          <span>Payroll Reports</span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEES MASTER */}
      {activeTab === 'employees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Filters Bar */}
          <Card title="Employee Directory Filters" icon={<Users size={16} />}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Search Employee
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input
                    type="text"
                    placeholder="Name, EMP-00001, phone, or title..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.5rem 0.45rem 2rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Department
                </label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Status
                </label>
                <select
                  value={activeStatusFilter}
                  onChange={(e) => setActiveStatusFilter(e.target.value as any)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Staff</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <Button
                variant="outline"
                icon={<RefreshCw size={13} />}
                onClick={() => {
                  setEmployeeSearch('');
                  setDeptFilter('');
                  setActiveStatusFilter('ALL');
                }}
              />
            </div>
          </Card>

          {/* Employees Table */}
          <Card title={`Registered Staff Profiles (${filteredEmployees.length})`} icon={<Briefcase size={16} />}>
            {employeesLoading ? (
              <LoadingSpinner label="Loading staff profiles..." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Employee ID</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Full Name</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Job Title & Dept</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Contact</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Basic Salary (Rs.)</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>System Login</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No employees found. Click "Register Employee" to add one.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr
                          key={emp.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{emp.employee_id}</code>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{emp.full_name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>Joined: {emp.date_of_joining}</div>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div style={{ fontWeight: 600 }}>{emp.job_title}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{emp.department}</div>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            {emp.phone ? <div>{emp.phone}</div> : <span style={{ color: 'var(--text-subtle)' }}>-</span>}
                            {emp.email && <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>{emp.email}</div>}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)' }}>
                            Rs. {formatMoney(emp.basic_salary)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            {emp.user_username ? (
                              <Badge variant="success">@{emp.user_username}</Badge>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>None</span>
                            )}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            <Badge variant={emp.is_active ? 'success' : 'danger'}>
                              {emp.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                              <Button
                                variant="outline"
                                icon={<Edit2 size={12} />}
                                onClick={() => handleOpenEditEmployee(emp)}
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                title="Edit Profile"
                              />
                              <Button
                                variant="outline"
                                icon={<Power size={12} />}
                                onClick={() => handleToggleEmployeeStatus(emp)}
                                style={{
                                  padding: '0.3rem 0.45rem',
                                  color: emp.is_active ? 'var(--warning)' : 'var(--success)',
                                  borderColor: emp.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                                }}
                                title={emp.is_active ? 'Deactivate' : 'Reactivate'}
                              />
                            </div>
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

      {/* TAB 2: ATTENDANCE TRACKER */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Attendance Controls */}
          <Card title="Attendance Date & Filter" icon={<Clock size={16} />}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Filter by Employee
                </label>
                <select
                  value={attendanceEmployeeFilter}
                  onChange={(e) => setAttendanceEmployeeFilter(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.employee_id}] {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Status
                </label>
                <select
                  value={attendanceStatusFilter}
                  onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">On Leave</option>
                </select>
              </div>

              <Button variant="primary" icon={<Search size={13} />} onClick={fetchAttendance}>
                Search
              </Button>
            </div>
          </Card>

          {/* Attendance Table */}
          <Card title={`Attendance Logs for ${attendanceDate} (${attendanceRecords.length})`} icon={<Clock size={16} />}>
            {attendanceLoading ? (
              <LoadingSpinner label="Loading attendance records..." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Employee</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Role / Dept</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Check In</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Check Out</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Working Hours</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No attendance recorded for {attendanceDate}. Click "Mark Attendance" to add a record.
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((att) => (
                        <tr
                          key={att.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{att.employee_name}</div>
                            <code style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{att.employee_code}</code>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div>{att.job_title}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>{att.department}</div>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                            {att.date}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                            {att.check_in || '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                            {att.check_out || '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {att.working_hours > 0 ? `${att.working_hours} hrs` : '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            {att.status === 'PRESENT' && <Badge variant="success">Present</Badge>}
                            {att.status === 'LATE' && <Badge variant="warning">Late</Badge>}
                            {att.status === 'HALF_DAY' && <Badge variant="phase">Half Day</Badge>}
                            {att.status === 'ABSENT' && <Badge variant="danger">Absent</Badge>}
                            {att.status === 'LEAVE' && <Badge variant="phase">On Leave</Badge>}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                            {att.notes || '-'}
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

      {/* TAB 3: PAYROLL & SALARY SLIPS */}
      {activeTab === 'payroll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Period Selector Card */}
          <Card title="Payroll Period Filter" icon={<Receipt size={16} />}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Payroll Month
                </label>
                <select
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(parseInt(e.target.value))}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Year
                </label>
                <input
                  type="number"
                  value={payrollYear}
                  onChange={(e) => setPayrollYear(parseInt(e.target.value))}
                  style={{ width: '90px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Slip Status
                </label>
                <select
                  value={payrollStatusFilter}
                  onChange={(e) => setPayrollStatusFilter(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.45rem 0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">All Statuses</option>
                  <option value="SUBMITTED">Submitted (Accrued)</option>
                  <option value="PAID">Fully Paid</option>
                  <option value="DRAFT">Draft</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <Button variant="primary" icon={<Search size={13} />} onClick={fetchSalarySlips}>
                Filter
              </Button>
            </div>
          </Card>

          {/* Salary Slips Table */}
          <Card title={`Salary Slips for ${MONTHS.find((m) => m.value === payrollMonth)?.label} ${payrollYear} (${salarySlips.length})`} icon={<Receipt size={16} />}>
            {payrollLoading ? (
              <LoadingSpinner label="Loading salary slips..." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Slip #</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Employee</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Basic (Rs.)</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Allowances (+)</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Deductions (-)</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Net Payable (Rs.)</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Paid (Rs.)</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Remaining Due</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salarySlips.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No salary slips generated for this period. Click "Generate Salary Slip" to create one.
                        </td>
                      </tr>
                    ) : (
                      salarySlips.map((slip) => (
                        <tr
                          key={slip.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <code style={{ fontWeight: 800, color: 'var(--primary-400)' }}>{slip.slip_number}</code>
                            {slip.journal_entry_number && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>GL: {slip.journal_entry_number}</div>
                            )}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{slip.employee_name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{slip.job_title}</div>
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            Rs. {formatMoney(slip.basic_salary)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                            {slip.allowances > 0 ? `+ Rs. ${formatMoney(slip.allowances)}` : '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                            {slip.deductions > 0 ? `- Rs. ${formatMoney(slip.deductions)}` : '-'}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            Rs. {formatMoney(slip.net_salary)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                            Rs. {formatMoney(slip.paid_amount)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: slip.payable_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            Rs. {formatMoney(slip.payable_amount)}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            {slip.status === 'SUBMITTED' && <Badge variant="warning">Accrued / Due</Badge>}
                            {slip.status === 'PAID' && <Badge variant="success">Fully Paid</Badge>}
                            {slip.status === 'DRAFT' && <Badge variant="phase">Draft</Badge>}
                            {slip.status === 'CANCELLED' && <Badge variant="danger">Cancelled</Badge>}
                          </td>

                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                              {slip.status === 'DRAFT' && (
                                <Button
                                  variant="primary"
                                  icon={<Send size={12} />}
                                  onClick={() => handleSubmitSlip(slip.id)}
                                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                                  title="Submit & Accrue to Ledger"
                                />
                              )}

                              {(slip.status === 'SUBMITTED' || slip.status === 'DRAFT') && slip.payable_amount > 0 && (
                                <Button
                                  variant="primary"
                                  icon={<DollarSign size={12} />}
                                  onClick={() => handleOpenDisbursePayment(slip)}
                                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                                  title="Disburse Payment"
                                />
                              )}

                              <Button
                                variant="outline"
                                icon={<FileText size={12} />}
                                onClick={() => setViewingSlip(slip)}
                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                                title="View / Print Salary Slip"
                              />

                              {(slip.status === 'SUBMITTED' || slip.status === 'PAID') && (
                                <Button
                                  variant="outline"
                                  icon={<RotateCcw size={12} />}
                                  onClick={() => handleOpenCancel('slip', slip.id, slip.slip_number, slip.net_salary)}
                                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem' }}
                                  title="Cancel Slip & Reverse Ledger"
                                />
                              )}
                            </div>
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

      {/* TAB 4: HR & PAYROLL REPORTS */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {reportsLoading ? (
            <LoadingSpinner label="Generating reports..." />
          ) : payrollReport ? (
            <>
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.625rem' }}>
                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Total Net Payroll</span>
                    <DollarSign size={15} style={{ color: 'var(--primary-400)' }} />
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary-400)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(payrollReport.summary.total_net_salary)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    For {MONTHS.find((m) => m.value === payrollMonth)?.label} {payrollYear}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Disbursed / Paid</span>
                    <CheckCircle size={15} style={{ color: 'var(--success)' }} />
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(payrollReport.summary.total_paid)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Cleared via Cash/Bank
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Outstanding Salary Payable</span>
                    <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                    Rs. {formatMoney(payrollReport.summary.total_outstanding_payable)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Accrued in Account [2030]
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <Card title="Monthly Payroll Breakdown" icon={<BarChart3 size={16} />}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Employee</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Department</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Basic (Rs.)</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Allowances (+)</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Deductions (-)</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Net (Rs.)</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Paid (Rs.)</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Unpaid Due</th>
                        <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollReport.rows.map((row: any) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.625rem 0.75rem', fontWeight: 700 }}>
                            {row.employee_name} <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>({row.employee_code})</span>
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>{row.department}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {formatMoney(row.basic_salary)}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>+ Rs. {formatMoney(row.allowances)}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>- Rs. {formatMoney(row.deductions)}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Rs. {formatMoney(row.net_salary)}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>Rs. {formatMoney(row.paid_amount)}</td>
                          <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: row.payable_amount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            Rs. {formatMoney(row.payable_amount)}
                          </td>
                          <td style={{ padding: '0.625rem 0.75rem' }}>
                            <Badge variant={row.status === 'PAID' ? 'success' : row.status === 'SUBMITTED' ? 'warning' : 'phase'}>
                              {row.status_display}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* REGISTER / EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title={editingEmployee ? `Edit Employee (${editingEmployee.employee_id})` : 'Register New Employee'}
        maxWidth="600px"
      >
        <form onSubmit={handleSaveEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {employeeError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{employeeError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Kashif Ali"
                value={employeeFormData.full_name}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, full_name: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Phone Number
              </label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={employeeFormData.phone}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Job Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Cashier, Store Manager"
                value={employeeFormData.job_title}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, job_title: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Department *
              </label>
              <input
                type="text"
                placeholder="e.g. Sales & Counter Operations"
                value={employeeFormData.department}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, department: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Basic Monthly Salary ({currencySymbol || 'Rs.'}) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={employeeFormData.basic_salary}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, basic_salary: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Date of Joining *
              </label>
              <input
                type="date"
                value={employeeFormData.date_of_joining}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, date_of_joining: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="staff@apexpos.local"
                value={employeeFormData.email}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Preferred Payment Mode *
              </label>
              <select
                value={employeeFormData.payment_method}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, payment_method: e.target.value as EmployeePaymentMethodKind })}
                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank / Card</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          {employeeFormData.payment_method !== 'CASH' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meezan Bank, HBL"
                  value={employeeFormData.bank_name}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, bank_name: e.target.value })}
                  style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  Bank Account / IBAN #
                </label>
                <input
                  type="text"
                  placeholder="e.g. PK00MEZN0001234567"
                  value={employeeFormData.bank_account_number}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, bank_account_number: e.target.value })}
                  style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsEmployeeModalOpen(false)} disabled={employeeSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={employeeSubmitting} icon={<CheckCircle size={15} />}>
              {editingEmployee ? 'Update Profile' : 'Save Employee Profile'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MARK ATTENDANCE MODAL */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        title="Mark Employee Attendance"
        maxWidth="500px"
      >
        <form onSubmit={handleSaveAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {attendanceError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{attendanceError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Employee *
            </label>
            <select
              value={attendanceFormData.employee}
              onChange={(e) => setAttendanceFormData({ ...attendanceFormData, employee: parseInt(e.target.value) })}
              required
              style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            >
              <option value={0} disabled>Select an employee...</option>
              {employees
                .filter((e) => e.is_active)
                .filter((e) => {
                  const alreadyMarked = attendanceRecords.some(
                    (rec) => rec.employee === e.id && rec.date === attendanceFormData.date
                  );
                  return !alreadyMarked;
                })
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    [{e.employee_id}] {e.full_name} ({e.job_title})
                  </option>
                ))}
            </select>
            {employees
              .filter((e) => e.is_active)
              .filter((e) => !attendanceRecords.some((rec) => rec.employee === e.id && rec.date === attendanceFormData.date))
              .length === 0 && (
              <div style={{ fontSize: '0.6875rem', color: 'var(--success)', marginTop: '0.25rem', fontWeight: 600 }}>
                ✓ All active employees have already had attendance recorded for {attendanceFormData.date}.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Date *
              </label>
              <input
                type="date"
                value={attendanceFormData.date}
                onChange={(e) => setAttendanceFormData({ ...attendanceFormData, date: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Attendance Status *
              </label>
              <select
                value={attendanceFormData.status}
                onChange={(e) => setAttendanceFormData({ ...attendanceFormData, status: e.target.value as AttendanceStatusKind })}
                required
                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late Arrival</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">On Leave</option>
              </select>
            </div>
          </div>

          {attendanceFormData.status !== 'ABSENT' && attendanceFormData.status !== 'LEAVE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Check In Time
                </label>
                <input
                  type="time"
                  value={attendanceFormData.check_in}
                  onChange={(e) => setAttendanceFormData({ ...attendanceFormData, check_in: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Check Out Time
                </label>
                <input
                  type="time"
                  value={attendanceFormData.check_out}
                  onChange={(e) => setAttendanceFormData({ ...attendanceFormData, check_out: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Approved leave, overtime notes..."
              value={attendanceFormData.notes}
              onChange={(e) => setAttendanceFormData({ ...attendanceFormData, notes: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsAttendanceModalOpen(false)} disabled={attendanceSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={attendanceSubmitting} icon={<CheckCircle size={15} />}>
              Save Attendance Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* GENERATE SALARY SLIP MODAL */}
      <Modal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        title="Generate Monthly Salary Slip"
        maxWidth="540px"
      >
        <form onSubmit={handleSaveSalarySlip} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {slipError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{slipError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Select Unpaid Employee (Current Month) *
            </label>
            <select
              value={slipFormData.employee}
              onChange={(e) => {
                const target = employees.find((emp) => emp.id === parseInt(e.target.value));
                setSlipFormData({
                  ...slipFormData,
                  employee: parseInt(e.target.value),
                  basic_salary: target ? target.basic_salary.toString() : '',
                });
              }}
              required
              style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
            >
              <option value={0} disabled>Select an unpaid employee...</option>
              {employees
                .filter((e) => e.is_active)
                .filter((e) => {
                  // Strictly show only employees who DO NOT have an active/submitted slip for this month & year
                  const hasSlip = salarySlips.some(
                    (s) => s.employee === e.id && s.month === slipFormData.month && s.year === slipFormData.year && s.status !== 'CANCELLED'
                  );
                  return !hasSlip;
                })
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    [{e.employee_id}] {e.full_name} — Base: Rs. {formatMoney(e.basic_salary)}
                  </option>
                ))}
            </select>
            {employees
              .filter((e) => e.is_active)
              .filter((e) => !salarySlips.some((s) => s.employee === e.id && s.month === slipFormData.month && s.year === slipFormData.year && s.status !== 'CANCELLED'))
              .length === 0 && (
              <div style={{ fontSize: '0.6875rem', color: 'var(--success)', marginTop: '0.25rem', fontWeight: 600 }}>
                ✓ All active employees have already had salary slips generated for {MONTHS.find((m) => m.value === slipFormData.month)?.label} {slipFormData.year}.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Payroll Month *
              </label>
              <select
                value={slipFormData.month}
                onChange={(e) => setSlipFormData({ ...slipFormData, month: parseInt(e.target.value) })}
                required
                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Payroll Year *
              </label>
              <input
                type="number"
                value={slipFormData.year}
                onChange={(e) => setSlipFormData({ ...slipFormData, year: parseInt(e.target.value) })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Basic Salary (Rs.) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={slipFormData.basic_salary}
                onChange={(e) => setSlipFormData({ ...slipFormData, basic_salary: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Allowances (+)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={slipFormData.allowances}
                onChange={(e) => setSlipFormData({ ...slipFormData, allowances: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--success)', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Deductions (-)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={slipFormData.deductions}
                onChange={(e) => setSlipFormData({ ...slipFormData, deductions: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--danger)', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none' }}
              />
            </div>
          </div>

          {/* Calculated Net Salary preview */}
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Calculated Net Payable Salary:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              Rs. {formatMoney(
                Math.max(
                  0,
                  (parseFloat(slipFormData.basic_salary || '0') + parseFloat(slipFormData.allowances || '0') - parseFloat(slipFormData.deductions || '0'))
                )
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.375rem' }}>
            <input
              type="checkbox"
              id="submit_slip_checkbox"
              checked={slipFormData.submit_now}
              onChange={(e) => setSlipFormData({ ...slipFormData, submit_now: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="submit_slip_checkbox" style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              <strong>Submit & Accrue to Ledger</strong> (Posts DR 5020 Salaries / CR 2030 Accrued Salaries)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsSlipModalOpen(false)} disabled={slipSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={slipSubmitting} icon={<CheckCircle size={15} />}>
              {slipFormData.submit_now ? 'Submit & Accrue Salary' : 'Save as Draft'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DISBURSE SALARY PAYMENT MODAL */}
      {disburseSlipTarget && (
        <Modal
          isOpen={!!disburseSlipTarget}
          onClose={() => setDisburseSlipTarget(null)}
          title={`Disburse Salary Payment (${disburseSlipTarget.slip_number})`}
          maxWidth="500px"
        >
          <form onSubmit={handleSaveDisbursement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {disburseError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{disburseError}</span>
              </div>
            )}

            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff: <strong>{disburseSlipTarget.employee_name}</strong></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period: <strong>{disburseSlipTarget.payroll_period}</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--danger)', fontWeight: 600 }}>Unpaid Payable Balance:</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                  Rs. {formatMoney(disburseSlipTarget.payable_amount)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Disbursement Amount (Rs.) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={disburseSlipTarget.payable_amount}
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Disbursement Mode *
                </label>
                <select
                  value={disburseMethod}
                  onChange={(e) => handleDisburseMethodChange(e.target.value as EmployeePaymentMethodKind)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank / Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {disburseMethod === 'CASH' ? 'Disburse From Cash Account (101x) *' : 'Disburse From Bank Account (102x) *'}
              </label>
              <select
                value={disburseAccountId}
                onChange={(e) => setDisburseAccountId(parseInt(e.target.value))}
                required
                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', padding: '0.5rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              >
                {getFilteredDisburseAccounts(disburseMethod).map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Cheque Inputs when Disbursement Mode is Cheque */}
            {disburseMethod === 'CHEQUE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.06)', border: '1px solid var(--border-subtle)', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                  Cheque Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Cheque Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CHQ-77201"
                      value={disburseChequeNumber}
                      onChange={(e) => setDisburseChequeNumber(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Cheque Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={disburseChequeDate}
                      onChange={(e) => setDisburseChequeDate(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    Employee / Payee Bank (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meezan Bank, HBL, Allied Bank..."
                    value={disburseChequeBank}
                    onChange={(e) => setDisburseChequeBank(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem 0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.25rem', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Reference # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SAL-TXN-901"
                  value={disburseReference}
                  onChange={(e) => setDisburseReference(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Disbursement Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared through main branch"
                  value={disburseNotes}
                  onChange={(e) => setDisburseNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="outline" onClick={() => setDisburseSlipTarget(null)} disabled={disburseSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={disburseSubmitting}
                icon={<CheckCircle size={15} />}
                style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
              >
                Disburse Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW / PRINT SALARY SLIP MODAL */}
      {viewingSlip && (
        <Modal
          isOpen={!!viewingSlip}
          onClose={() => setViewingSlip(null)}
          title={`Salary Slip Voucher: ${viewingSlip.slip_number}`}
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Thermal Width Switcher */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-app)',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-subtle)',
            }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Sliders size={14} /> Slip Width:
              </span>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  onClick={() => setSlipPaperWidth('80mm')}
                  style={{
                    padding: '0.25rem 0.625rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '0.375rem',
                    border: '1px solid',
                    borderColor: slipPaperWidth === '80mm' ? 'var(--primary-400)' : 'var(--border-subtle)',
                    backgroundColor: slipPaperWidth === '80mm' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: slipPaperWidth === '80mm' ? 'var(--primary-400)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  80mm (Standard)
                </button>
                <button
                  onClick={() => setSlipPaperWidth('58mm')}
                  style={{
                    padding: '0.25rem 0.625rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '0.375rem',
                    border: '1px solid',
                    borderColor: slipPaperWidth === '58mm' ? 'var(--primary-400)' : 'var(--border-subtle)',
                    backgroundColor: slipPaperWidth === '58mm' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: slipPaperWidth === '58mm' ? 'var(--primary-400)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  58mm (Small)
                </button>
              </div>
            </div>

            {/* Printable Slip Paper Preview */}
            <div
              id="salary-thermal-slip"
              className="pos-thermal-receipt"
              style={{
                backgroundColor: '#ffffff',
                color: '#111827',
                padding: '1.25rem 1rem',
                borderRadius: '0.5rem',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: slipPaperWidth === '58mm' ? '0.72rem' : '0.8125rem',
                lineHeight: 1.35,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: slipPaperWidth === '58mm' ? '320px' : '400px',
                margin: '0 auto',
              }}
            >
              {/* Store Header */}
              <div style={{ textAlign: 'center', marginBottom: '0.75rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.625rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 900, margin: '0 0 0.25rem 0', letterSpacing: '0.05em' }}>
                  {companyName || 'ApexPOS Retail'}
                </h3>
                <div style={{ fontSize: '0.6875rem', color: '#4b5563' }}>Human Resources & Payroll Core</div>
                {companyPhone && <div style={{ fontSize: '0.6875rem', color: '#4b5563' }}>Tel: {companyPhone}</div>}
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  marginTop: '0.35rem',
                  textTransform: 'uppercase',
                  color: '#0f172a',
                }}>
                  === SALARY PAY SLIP ===
                </div>
              </div>

              {/* Meta details */}
              <div style={{ fontSize: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Slip #: <strong>{viewingSlip.slip_number}</strong></span>
                  <span>Period: <strong>{viewingSlip.payroll_period}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                  <span>Date: <strong>{viewingSlip.date}</strong></span>
                  <span>Status: <strong>{viewingSlip.status_display || viewingSlip.status}</strong></span>
                </div>
                <div style={{ marginTop: '0.25rem' }}>
                  <span>Staff: <strong>{viewingSlip.employee_name}</strong> ({viewingSlip.employee_code})</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#4b5563', marginTop: '0.1rem' }}>
                  {viewingSlip.job_title} • {viewingSlip.department}
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #111827', paddingBottom: '0.2rem', marginBottom: '0.35rem' }}>
                  Earnings & Deductions
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', fontSize: '0.75rem' }}>
                  <span>Basic Base Salary:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Rs. {formatMoney(viewingSlip.basic_salary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', fontSize: '0.75rem', color: '#16a34a' }}>
                  <span>Allowances / Bonus (+):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>+ Rs. {formatMoney(viewingSlip.allowances)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', fontSize: '0.75rem', color: '#dc2626' }}>
                  <span>Deductions / Absences (-):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>- Rs. {formatMoney(viewingSlip.deductions)}</span>
                </div>
              </div>

              {/* NET PAYABLE HIGHLIGHT */}
              <div style={{ borderTop: '1px solid #111827', borderBottom: '1px solid #111827', padding: '0.4rem 0', margin: '0.35rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '0.875rem', color: '#111827' }}>NET PAYABLE:</strong>
                <strong style={{ fontSize: '1.125rem', fontFamily: 'monospace', color: '#15803d' }}>
                  Rs. {formatMoney(viewingSlip.net_salary)}
                </strong>
              </div>

              {/* Payment Summary */}
              <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', margin: '0.4rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span>Amount Disbursed:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Rs. {formatMoney(viewingSlip.paid_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: viewingSlip.payable_amount > 0 ? '#b45309' : '#15803d' }}>
                  <span>Remaining Unpaid:</span>
                  <span style={{ fontFamily: 'monospace' }}>Rs. {formatMoney(viewingSlip.payable_amount)}</span>
                </div>
                {viewingSlip.journal_entry_number && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#6b7280', marginTop: '0.15rem' }}>
                    <span>GL Accrual JE:</span>
                    <span style={{ fontFamily: 'monospace' }}>{viewingSlip.journal_entry_number}</span>
                  </div>
                )}
              </div>

              {/* Disbursement Log */}
              {viewingSlip.payments && viewingSlip.payments.length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #9ca3af', paddingTop: '0.35rem' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, marginBottom: '0.2rem' }}>Payment Vouchers:</div>
                  {viewingSlip.payments.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', padding: '0.1rem 0' }}>
                      <span>{p.payment_number} ({p.date}):</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>Rs. {formatMoney(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dual Signature Blocks */}
              <div style={{ marginTop: '1.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #9ca3af' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#374151' }}>
                  <div style={{ textAlign: 'center', width: '45%' }}>
                    <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.25rem', height: '1.25rem' }}></div>
                    <strong>Prepared By</strong>
                  </div>
                  <div style={{ textAlign: 'center', width: '45%' }}>
                    <div style={{ borderBottom: '1px solid #111827', marginBottom: '0.25rem', height: '1.25rem' }}></div>
                    <strong>Staff Signature</strong>
                  </div>
                </div>
              </div>

              {/* Slip Footer */}
              <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.625rem', color: '#6b7280' }}>
                <div>System Generated • ApexPOS HR Core</div>
                <div>Printed: {new Date().toLocaleString()}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button variant="outline" onClick={() => setViewingSlip(null)}>
                Close
              </Button>

              <Button
                variant="primary"
                icon={<Printer size={16} />}
                onClick={() =>
                  printPayrollSlip(viewingSlip, {
                    paperWidth: slipPaperWidth,
                    storeName: companyName || 'ApexPOS Retail',
                    phone: companyPhone,
                  })
                }
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  fontWeight: 700,
                }}
              >
                Print Salary Slip ({slipPaperWidth})
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCELLATION MODAL */}
      {cancelTarget && (
        <Modal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title={`Cancel ${cancelTarget.type === 'slip' ? 'Salary Slip' : 'Payment'} (${cancelTarget.number})`}
          maxWidth="460px"
        >
          <form onSubmit={handleConfirmCancel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cancelError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '0.5rem', color: 'var(--danger)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{cancelError}</span>
              </div>
            )}

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Are you sure you want to cancel <strong>{cancelTarget.number}</strong> for <strong>Rs. {formatMoney(cancelTarget.amount)}</strong>?
              <div style={{ marginTop: '0.5rem', color: 'var(--warning)', fontWeight: 600 }}>
                This will automatically post a counter-reversal journal entry in the General Ledger.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Reason for Cancellation *
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Incorrect hours calculation, wrong amount..."
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '0.375rem', color: 'var(--text-main)', fontSize: '0.8125rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelSubmitting}>
                Keep Active
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={cancelSubmitting}
                icon={<RotateCcw size={15} />}
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                Confirm Cancellation & Reversal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
