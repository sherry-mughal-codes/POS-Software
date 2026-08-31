export type EmployeePaymentMethodKind = 'CASH' | 'BANK' | 'CHEQUE';
export type AttendanceStatusKind = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
export type SalarySlipStatusKind = 'DRAFT' | 'SUBMITTED' | 'PAID' | 'CANCELLED';
export type SalaryPaymentStatusKind = 'SUBMITTED' | 'CANCELLED';

export interface Employee {
  id: number;
  employee_id: string;
  user?: number | null;
  user_username?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  job_title: string;
  department: string;
  date_of_joining: string;
  basic_salary: number;
  payment_method: EmployeePaymentMethodKind;
  bank_name?: string | null;
  bank_account_title?: string | null;
  bank_account_number?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_by?: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeePayload {
  employee_id?: string;
  user?: number | null;
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  job_title: string;
  department?: string;
  date_of_joining?: string;
  basic_salary: number;
  payment_method?: EmployeePaymentMethodKind;
  bank_name?: string;
  bank_account_title?: string;
  bank_account_number?: string;
  is_active?: boolean;
  notes?: string;
}

export interface Attendance {
  id: number;
  employee: number;
  employee_name: string;
  employee_code: string;
  department: string;
  job_title: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatusKind;
  status_display: string;
  working_hours: number;
  notes?: string | null;
  created_by?: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface AttendancePayload {
  employee: number;
  date?: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatusKind;
  notes?: string;
}

export interface SalaryPayment {
  id: number;
  payment_number: string;
  salary_slip: number;
  slip_number: string;
  employee: number;
  employee_name: string;
  employee_code: string;
  date: string;
  amount: number;
  payment_method: EmployeePaymentMethodKind;
  payment_account: number;
  payment_account_name: string;
  payment_account_code: string;
  reference?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_bank?: string | null;
  notes?: string | null;
  status: SalaryPaymentStatusKind;
  journal_entry?: number | null;
  journal_entry_number?: string | null;
  created_by?: number | null;
  created_by_name: string;
  cancelled_by?: number | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryPaymentPayload {
  salary_slip: number;
  amount: number;
  payment_method?: EmployeePaymentMethodKind;
  payment_account?: number;
  date?: string;
  reference?: string;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  notes?: string;
}

export interface SalarySlip {
  id: number;
  slip_number: string;
  employee: number;
  employee_name: string;
  employee_code: string;
  department: string;
  job_title: string;
  month: number;
  year: number;
  payroll_period: string;
  date: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  paid_amount: number;
  payable_amount: number;
  is_fully_paid: boolean;
  status: SalarySlipStatusKind;
  status_display: string;
  notes?: string | null;
  journal_entry?: number | null;
  journal_entry_number?: string | null;
  payments: SalaryPayment[];
  created_by?: number | null;
  created_by_name: string;
  submitted_by?: number | null;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  cancelled_by?: number | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalarySlipPayload {
  employee: number;
  month?: number;
  year?: number;
  date?: string;
  basic_salary?: number;
  allowances?: number;
  deductions?: number;
  notes?: string;
  submit_now?: boolean;
}

export interface EmployeeReportSummary {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  total_monthly_payroll: number;
  department_breakdown: Record<string, number>;
}

export interface EmployeeReport {
  summary: EmployeeReportSummary;
  rows: any[];
}

export interface AttendanceReportSummary {
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  half_day_count: number;
  leave_count: number;
  total_working_hours: number;
}

export interface AttendanceReport {
  summary: AttendanceReportSummary;
  rows: Attendance[];
}

export interface PayrollReportSummary {
  total_slips: number;
  submitted_count: number;
  total_gross_salary: number;
  total_allowances: number;
  total_deductions: number;
  total_net_salary: number;
  total_paid: number;
  total_outstanding_payable: number;
}

export interface PayrollReport {
  summary: PayrollReportSummary;
  rows: any[];
}
