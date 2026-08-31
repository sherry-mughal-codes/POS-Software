"""
Business logic service for Employee Management, Attendance, and Payroll.
"""

from decimal import Decimal
from datetime import datetime, date, time
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

from apps.accounting.models import Account, AccountType, JournalEntry, ReferenceType
from apps.accounting.services import AccountingService
from .models import (
    Employee,
    EmployeePaymentMethod,
    Attendance,
    AttendanceStatus,
    SalarySlip,
    SalarySlipStatus,
    SalaryPayment,
    SalaryPaymentStatus,
)


class EmployeeService:
    """
    Employee Master Data service operations.
    """

    @classmethod
    def create_employee(cls, data: dict, user: User) -> Employee:
        employee_id = data.get("employee_id") or Employee.generate_employee_id()
        full_name = data.get("full_name", "").strip()
        if not full_name:
            raise ValidationError("Full name is required.")

        basic_salary = Decimal(str(data.get("basic_salary", "0")))
        if basic_salary < Decimal("0.00"):
            raise ValidationError("Basic salary cannot be negative.")

        user_id = data.get("user")
        user_obj = None
        if user_id:
            user_obj = User.objects.get(pk=user_id) if isinstance(user_id, int) else user_id

        employee = Employee.objects.create(
            employee_id=employee_id,
            user=user_obj,
            full_name=full_name,
            phone=data.get("phone", "").strip() or None,
            email=data.get("email", "").strip() or None,
            address=data.get("address", "").strip() or None,
            job_title=data.get("job_title", "Staff").strip(),
            department=data.get("department", "Sales & Counter Operations").strip(),
            date_of_joining=data.get("date_of_joining") or timezone.now().date(),
            basic_salary=basic_salary,
            payment_method=data.get("payment_method", "CASH"),
            bank_name=data.get("bank_name", "").strip() or None,
            bank_account_title=data.get("bank_account_title", "").strip() or None,
            bank_account_number=data.get("bank_account_number", "").strip() or None,
            is_active=data.get("is_active", True),
            notes=data.get("notes", "").strip() or None,
            created_by=user,
        )
        return employee

    @classmethod
    def get_employee_report(cls, department=None, job_title=None, is_active=None) -> dict:
        qs = Employee.objects.all().select_related("user", "created_by")
        if department:
            qs = qs.filter(department__icontains=department)
        if job_title:
            qs = qs.filter(job_title__icontains=job_title)
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        total_employees = qs.count()
        active_employees = qs.filter(is_active=True).count()
        total_monthly_payroll = sum((e.basic_salary for e in qs.filter(is_active=True)), Decimal("0.00"))

        dept_breakdown = {}
        for emp in qs:
            dept = emp.department
            dept_breakdown[dept] = dept_breakdown.get(dept, 0) + 1

        rows = []
        for emp in qs:
            rows.append({
                "id": emp.id,
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "job_title": emp.job_title,
                "department": emp.department,
                "phone": emp.phone or "-",
                "email": emp.email or "-",
                "date_of_joining": str(emp.date_of_joining),
                "basic_salary": float(emp.basic_salary),
                "payment_method": emp.payment_method,
                "is_active": emp.is_active,
                "has_system_user": bool(emp.user),
                "system_username": emp.user.username if emp.user else None,
            })

        return {
            "summary": {
                "total_employees": total_employees,
                "active_employees": active_employees,
                "inactive_employees": total_employees - active_employees,
                "total_monthly_payroll": float(total_monthly_payroll),
                "department_breakdown": dept_breakdown,
            },
            "rows": rows,
        }


class AttendanceService:
    """
    Daily attendance service with duplicate prevention and analytics.
    """

    @classmethod
    @transaction.atomic
    def record_attendance(cls, data: dict, user: User) -> Attendance:
        employee = data.get("employee")
        if isinstance(employee, int):
            employee = Employee.objects.get(pk=employee)

        att_date = data.get("date") or timezone.now().date()
        if isinstance(att_date, str):
            att_date = datetime.strptime(att_date, "%Y-%m-%d").date()

        # Enforce no duplicate attendance per employee per day
        existing = Attendance.objects.filter(employee=employee, date=att_date).first()
        if existing:
            raise ValidationError(
                f"Attendance for '{employee.full_name}' on date {att_date} has already been recorded (Status: {existing.status})."
            )

        check_in = data.get("check_in")
        check_out = data.get("check_out")
        status = data.get("status", AttendanceStatus.PRESENT)
        notes = data.get("notes", "").strip() or None

        att = Attendance.objects.create(
            employee=employee,
            date=att_date,
            check_in=check_in,
            check_out=check_out,
            status=status,
            notes=notes,
            created_by=user,
        )
        return att

    @classmethod
    def get_attendance_report(
        cls,
        start_date=None,
        end_date=None,
        employee_id=None,
        department=None,
        status=None,
    ) -> dict:
        qs = Attendance.objects.all().select_related("employee", "created_by")

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if department:
            qs = qs.filter(employee__department__icontains=department)
        if status:
            qs = qs.filter(status=status)

        present_count = qs.filter(status=AttendanceStatus.PRESENT).count()
        absent_count = qs.filter(status=AttendanceStatus.ABSENT).count()
        late_count = qs.filter(status=AttendanceStatus.LATE).count()
        half_day_count = qs.filter(status=AttendanceStatus.HALF_DAY).count()
        leave_count = qs.filter(status=AttendanceStatus.LEAVE).count()

        total_working_hours = sum((a.working_hours for a in qs), 0.0)

        rows = []
        for att in qs:
            rows.append({
                "id": att.id,
                "employee_id": att.employee.id,
                "employee_code": att.employee.employee_id,
                "employee_name": att.employee.full_name,
                "department": att.employee.department,
                "job_title": att.employee.job_title,
                "date": str(att.date),
                "check_in": str(att.check_in) if att.check_in else None,
                "check_out": str(att.check_out) if att.check_out else None,
                "status": att.status,
                "status_display": att.get_status_display(),
                "working_hours": att.working_hours,
                "notes": att.notes,
                "created_by": att.created_by.get_full_name() or att.created_by.username if att.created_by else "System",
            })

        return {
            "summary": {
                "total_records": qs.count(),
                "present_count": present_count,
                "absent_count": absent_count,
                "late_count": late_count,
                "half_day_count": half_day_count,
                "leave_count": leave_count,
                "total_working_hours": round(total_working_hours, 2),
            },
            "rows": rows,
        }


class PayrollService:
    """
    Payroll calculation, salary slip accruals, disbursement payments, and General Ledger integration.
    """

    @classmethod
    @transaction.atomic
    def create_salary_slip(cls, data: dict, user: User, submit_now: bool = True) -> SalarySlip:
        employee = data.get("employee")
        if isinstance(employee, int):
            employee = Employee.objects.get(pk=employee)

        month = int(data.get("month") or timezone.now().month)
        year = int(data.get("year") or timezone.now().year)
        payroll_period = f"{year}-{month:02d}"

        # Prevent duplicate salary slip for same employee and period
        existing = SalarySlip.objects.filter(employee=employee, month=month, year=year).first()
        if existing:
            raise ValidationError(
                f"Salary slip for '{employee.full_name}' for period {payroll_period} already exists ({existing.slip_number})."
            )

        basic_salary = Decimal(str(data.get("basic_salary", employee.basic_salary)))
        allowances = Decimal(str(data.get("allowances", "0.00")))
        deductions = Decimal(str(data.get("deductions", "0.00")))

        if basic_salary < Decimal("0.00") or allowances < Decimal("0.00") or deductions < Decimal("0.00"):
            raise ValidationError("Salary figures cannot be negative.")

        net_salary = max(Decimal("0.00"), basic_salary + allowances - deductions)
        slip_number = SalarySlip.generate_slip_number(data.get("date"))

        slip = SalarySlip.objects.create(
            slip_number=slip_number,
            employee=employee,
            month=month,
            year=year,
            payroll_period=payroll_period,
            date=data.get("date") or timezone.now().date(),
            basic_salary=basic_salary,
            allowances=allowances,
            deductions=deductions,
            net_salary=net_salary,
            paid_amount=Decimal("0.00"),
            status=SalarySlipStatus.DRAFT,
            notes=data.get("notes", "").strip() or None,
            created_by=user,
        )

        if submit_now:
            cls.submit_salary_slip(slip, user)

        return slip

    @classmethod
    @transaction.atomic
    def submit_salary_slip(cls, slip: SalarySlip, user: User) -> SalarySlip:
        """
        Submits a salary slip and creates the balanced accrual accounting entry:
        Debit: 5020 Salaries & Wages Expense
        Credit: 2030 Accrued Salaries Payable
        """
        if slip.status != SalarySlipStatus.DRAFT:
            raise ValidationError(f"Cannot submit salary slip in '{slip.status}' status. Only DRAFT can be submitted.")

        salary_expense_acc = Account.objects.filter(code="5020").first() or Account.objects.get(code="5020")
        salaries_payable_acc = Account.objects.filter(code="2030").first() or Account.objects.get(code="2030")

        entry_lines = [
            {
                "account": salary_expense_acc,
                "debit": slip.net_salary,
                "credit": Decimal("0.00"),
                "description": f"Salary Expense [{slip.slip_number}] - {slip.employee.full_name} ({slip.payroll_period})",
            },
            {
                "account": salaries_payable_acc,
                "debit": Decimal("0.00"),
                "credit": slip.net_salary,
                "description": f"Accrued Salary Payable for {slip.employee.full_name} ({slip.payroll_period})",
            },
        ]

        journal_entry = AccountingService.create_journal_entry(
            entry_date=slip.date,
            reference_type=ReferenceType.PAYROLL if hasattr(ReferenceType, "PAYROLL") else ReferenceType.JOURNAL,
            reference_id=slip.slip_number,
            narration=f"Payroll Accrual [{slip.slip_number}]: {slip.employee.full_name} ({slip.payroll_period}) - Rs. {slip.net_salary:,.2f}",
            lines=entry_lines,
            created_by=user,
            post_immediately=True,
        )

        slip.journal_entry = journal_entry
        slip.status = SalarySlipStatus.SUBMITTED
        slip.submitted_by = user
        slip.submitted_at = timezone.now()
        slip.save(update_fields=["journal_entry", "status", "submitted_by", "submitted_at", "updated_at"])

        return slip

    @classmethod
    @transaction.atomic
    def cancel_salary_slip(cls, slip: SalarySlip, user: User, reason: str = "") -> SalarySlip:
        """
        Cancels a salary slip and posts a counter-reversal journal entry:
        Debit: 2030 Accrued Salaries Payable
        Credit: 5020 Salaries & Wages Expense
        """
        if slip.status == SalarySlipStatus.CANCELLED:
            raise ValidationError("Salary slip is already cancelled.")

        # Check if any payments have been recorded against this slip
        active_payments = slip.payments.filter(status=SalaryPaymentStatus.SUBMITTED)
        if active_payments.exists():
            raise ValidationError(
                f"Cannot cancel salary slip {slip.slip_number} because active payments have been disbursed against it. Please cancel those payments first."
            )

        if slip.status in [SalarySlipStatus.SUBMITTED, SalarySlipStatus.PAID] and slip.journal_entry:
            salary_expense_acc = Account.objects.filter(code="5020").first() or Account.objects.get(code="5020")
            salaries_payable_acc = Account.objects.filter(code="2030").first() or Account.objects.get(code="2030")

            reversal_lines = [
                {
                    "account": salaries_payable_acc,
                    "debit": slip.net_salary,
                    "credit": Decimal("0.00"),
                    "description": f"Reversal of {slip.slip_number} - {reason or 'Payroll Slip Cancelled'}",
                },
                {
                    "account": salary_expense_acc,
                    "debit": Decimal("0.00"),
                    "credit": slip.net_salary,
                    "description": f"Reversal of {slip.slip_number}",
                },
            ]

            reversal_entry = AccountingService.create_journal_entry(
                entry_date=timezone.now().date(),
                reference_type=ReferenceType.REVERSAL,
                reference_id=f"REV-{slip.slip_number}",
                narration=f"Cancellation Reversal for Payroll Slip [{slip.slip_number}]: {reason or 'N/A'}",
                lines=reversal_lines,
                created_by=user,
                post_immediately=True,
            )
            slip.reversal_journal_entry = reversal_entry

        slip.status = SalarySlipStatus.CANCELLED
        slip.cancelled_by = user
        slip.cancelled_at = timezone.now()
        slip.cancellation_reason = reason
        slip.save(update_fields=["status", "reversal_journal_entry", "cancelled_by", "cancelled_at", "cancellation_reason", "updated_at"])

        return slip

    @classmethod
    @transaction.atomic
    def disburse_salary_payment(cls, data: dict, user: User) -> SalaryPayment:
        """
        Disburses payment toward an accrued salary slip:
        Debit: 2030 Accrued Salaries Payable
        Credit: 1010 Cash in Hand / 1020 Bank
        """
        salary_slip = data.get("salary_slip")
        if isinstance(salary_slip, int):
            salary_slip = SalarySlip.objects.get(pk=salary_slip)

        if salary_slip.payable_amount <= Decimal("0.00") or salary_slip.is_fully_paid:
            raise ValidationError(
                f"This salary slip ({salary_slip.slip_number}) is already fully paid. Duplicate disbursement is not permitted for this employee."
            )

        if salary_slip.status == SalarySlipStatus.DRAFT:
            # Auto-submit draft salary slip so that general ledger accrual is posted prior to disbursement
            salary_slip = cls.submit_salary_slip(salary_slip, user)
        elif salary_slip.status == SalarySlipStatus.PAID and salary_slip.payable_amount > Decimal("0.00"):
            salary_slip.status = SalarySlipStatus.SUBMITTED
            salary_slip.save(update_fields=["status"])
        elif salary_slip.status != SalarySlipStatus.SUBMITTED:
            raise ValidationError(
                f"Salary payments cannot be processed against {salary_slip.status} salary slips."
            )

        amount = Decimal(str(data.get("amount", "0")))
        if amount <= Decimal("0.00"):
            raise ValidationError("Disbursement amount must be greater than zero.")

        if amount > salary_slip.payable_amount:
            raise ValidationError(
                f"Disbursement amount (Rs. {amount:,.2f}) exceeds remaining unpaid salary balance of Rs. {salary_slip.payable_amount:,.2f}."
            )

        payment_method = data.get("payment_method", "CASH")
        payment_account = data.get("payment_account")
        if isinstance(payment_account, int):
            payment_account = Account.objects.get(pk=payment_account)

        # Strictly ensure Bank account for BANK/CHEQUE and Cash account for CASH
        if payment_method in ["BANK", "CHEQUE"]:
            if not payment_account or payment_account.code.startswith("101") or (payment_account.parent and payment_account.parent.code == "1010"):
                payment_account = Account.objects.filter(code="1021").first() or Account.objects.filter(parent__code="1020").first() or Account.objects.filter(code="1020").first()
        elif payment_method == "CASH":
            if not payment_account or payment_account.code.startswith("102") or (payment_account.parent and payment_account.parent.code == "1020"):
                payment_account = Account.objects.filter(code="1011").first() or Account.objects.filter(parent__code="1010").first() or Account.objects.filter(code="1010").first()

        if not payment_account or payment_account.account_type != AccountType.ASSET:
            raise ValidationError(f"A valid Cash/Bank asset account is required for salary disbursement.")

        payment_date = data.get("date") or timezone.now().date()
        payment_number = SalaryPayment.generate_payment_number(payment_date)

        # General ledger disbursement entry
        salaries_payable_acc = Account.objects.filter(code="2030").first() or Account.objects.get(code="2030")

        entry_lines = [
            {
                "account": salaries_payable_acc,
                "debit": amount,
                "credit": Decimal("0.00"),
                "description": f"Salary Paid to {salary_slip.employee.full_name} ({salary_slip.slip_number})",
            },
            {
                "account": payment_account,
                "debit": Decimal("0.00"),
                "credit": amount,
                "description": f"Salary Disbursement via {payment_account.name}",
            },
        ]

        cheque_number = data.get("cheque_number", "").strip()
        cheque_date = data.get("cheque_date")
        cheque_bank = data.get("cheque_bank", "").strip()

        cheque_note = f" (Cheque #{cheque_number})" if payment_method == EmployeePaymentMethod.CHEQUE and cheque_number else ""

        journal_entry = AccountingService.create_journal_entry(
            entry_date=payment_date,
            reference_type=ReferenceType.SALARY_PAYMENT if hasattr(ReferenceType, "SALARY_PAYMENT") else ReferenceType.JOURNAL,
            reference_id=payment_number,
            narration=f"Salary Payment [{payment_number}]: {salary_slip.employee.full_name} ({salary_slip.slip_number}){cheque_note} - Rs. {amount:,.2f}",
            lines=entry_lines,
            created_by=user,
            post_immediately=True,
        )

        payment = SalaryPayment.objects.create(
            payment_number=payment_number,
            salary_slip=salary_slip,
            employee=salary_slip.employee,
            date=payment_date,
            amount=amount,
            payment_method=payment_method,
            payment_account=payment_account,
            reference=data.get("reference", "").strip() or None,
            cheque_number=cheque_number,
            cheque_date=cheque_date,
            cheque_bank=cheque_bank,
            notes=data.get("notes", "").strip() or None,
            status=SalaryPaymentStatus.SUBMITTED,
            journal_entry=journal_entry,
            created_by=user,
        )

        # Update slip paid amount
        salary_slip.paid_amount += amount
        if salary_slip.paid_amount >= salary_slip.net_salary:
            salary_slip.status = SalarySlipStatus.PAID
        salary_slip.save(update_fields=["paid_amount", "status", "updated_at"])

        return payment

    @classmethod
    @transaction.atomic
    def cancel_salary_payment(cls, payment: SalaryPayment, user: User, reason: str = "") -> SalaryPayment:
        """
        Cancels a salary payment and generates counter-reversal journal entry:
        Debit: 1010 Cash / 1020 Bank
        Credit: 2030 Accrued Salaries Payable
        """
        if payment.status == SalaryPaymentStatus.CANCELLED:
            raise ValidationError("Payment is already cancelled.")

        if payment.journal_entry:
            salaries_payable_acc = Account.objects.filter(code="2030").first() or Account.objects.get(code="2030")

            reversal_lines = [
                {
                    "account": payment.payment_account,
                    "debit": payment.amount,
                    "credit": Decimal("0.00"),
                    "description": f"Reversal of {payment.payment_number} - {reason or 'Payment Cancelled'}",
                },
                {
                    "account": salaries_payable_acc,
                    "debit": Decimal("0.00"),
                    "credit": payment.amount,
                    "description": f"Reversal of {payment.payment_number}",
                },
            ]

            reversal_entry = AccountingService.create_journal_entry(
                entry_date=timezone.now().date(),
                reference_type=ReferenceType.REVERSAL,
                reference_id=f"REV-{payment.payment_number}",
                narration=f"Cancellation Reversal for Salary Payment [{payment.payment_number}]: {reason or 'N/A'}",
                lines=reversal_lines,
                created_by=user,
                post_immediately=True,
            )
            payment.reversal_journal_entry = reversal_entry

        payment.status = SalaryPaymentStatus.CANCELLED
        payment.cancelled_by = user
        payment.cancelled_at = timezone.now()
        payment.cancellation_reason = reason
        payment.save(update_fields=["status", "reversal_journal_entry", "cancelled_by", "cancelled_at", "cancellation_reason", "updated_at"])

        # Restore slip payable balance
        slip = payment.salary_slip
        slip.paid_amount = max(Decimal("0.00"), slip.paid_amount - payment.amount)
        if slip.status == SalarySlipStatus.PAID:
            slip.status = SalarySlipStatus.SUBMITTED
        slip.save(update_fields=["paid_amount", "status", "updated_at"])

        return payment

    @classmethod
    def get_payroll_report(
        cls,
        start_date=None,
        end_date=None,
        month=None,
        year=None,
        employee_id=None,
        department=None,
        status=None,
    ) -> dict:
        qs = SalarySlip.objects.all().select_related("employee", "created_by", "submitted_by")

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if department:
            qs = qs.filter(employee__department__icontains=department)
        if status:
            qs = qs.filter(status=status)

        submitted_qs = qs.filter(status__in=[SalarySlipStatus.SUBMITTED, SalarySlipStatus.PAID])

        total_gross = sum((s.basic_salary for s in submitted_qs), Decimal("0.00"))
        total_allowances = sum((s.allowances for s in submitted_qs), Decimal("0.00"))
        total_deductions = sum((s.deductions for s in submitted_qs), Decimal("0.00"))
        total_net = sum((s.net_salary for s in submitted_qs), Decimal("0.00"))
        total_paid = sum((s.paid_amount for s in submitted_qs), Decimal("0.00"))
        total_outstanding = max(Decimal("0.00"), total_net - total_paid)

        rows = []
        for slip in qs:
            rows.append({
                "id": slip.id,
                "slip_number": slip.slip_number,
                "employee_id": slip.employee.id,
                "employee_code": slip.employee.employee_id,
                "employee_name": slip.employee.full_name,
                "department": slip.employee.department,
                "job_title": slip.employee.job_title,
                "payroll_period": slip.payroll_period,
                "month": slip.month,
                "year": slip.year,
                "date": str(slip.date),
                "basic_salary": float(slip.basic_salary),
                "allowances": float(slip.allowances),
                "deductions": float(slip.deductions),
                "net_salary": float(slip.net_salary),
                "paid_amount": float(slip.paid_amount),
                "payable_amount": float(slip.payable_amount),
                "status": slip.status,
                "status_display": slip.get_status_display(),
                "created_by": slip.created_by.get_full_name() or slip.created_by.username if slip.created_by else "System",
                "submitted_by": slip.submitted_by.get_full_name() or slip.submitted_by.username if slip.submitted_by else None,
            })

        return {
            "summary": {
                "total_slips": qs.count(),
                "submitted_count": submitted_qs.count(),
                "total_gross_salary": float(total_gross),
                "total_allowances": float(total_allowances),
                "total_deductions": float(total_deductions),
                "total_net_salary": float(total_net),
                "total_paid": float(total_paid),
                "total_outstanding_payable": float(total_outstanding),
            },
            "rows": rows,
        }
