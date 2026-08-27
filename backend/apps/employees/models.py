"""
Models for Employee Master Data, Attendance Tracking, Salary Slips, and Payroll Payments.
"""

from decimal import Decimal
from datetime import datetime, date, time
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounting.models import Account, JournalEntry


class EmployeePaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    BANK = "BANK", "Bank Transfer"
    CHEQUE = "CHEQUE", "Cheque"


class AttendanceStatus(models.TextChoices):
    PRESENT = "PRESENT", "Present"
    ABSENT = "ABSENT", "Absent"
    LATE = "LATE", "Late"
    HALF_DAY = "HALF_DAY", "Half Day"
    LEAVE = "LEAVE", "On Leave"


class SalarySlipStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted & Accrued"
    PAID = "PAID", "Fully Paid"
    CANCELLED = "CANCELLED", "Cancelled"


class SalaryPaymentStatus(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Submitted"
    CANCELLED = "CANCELLED", "Cancelled"


class Employee(models.Model):
    """
    Canonical Employee Master Record.
    """
    employee_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique employee identifier (e.g. EMP-00001)",
    )
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile",
        help_text="Optional link to system login user account",
    )
    full_name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=30, blank=True, null=True, db_index=True)
    email = models.EmailField(max_length=120, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    job_title = models.CharField(
        max_length=100,
        db_index=True,
        help_text="e.g. Cashier, Store Manager, Inventory Supervisor, Sales Representative",
    )
    department = models.CharField(
        max_length=100,
        default="Sales & Counter Operations",
        db_index=True,
        help_text="e.g. Sales, Operations, Finance, Logistics",
    )
    date_of_joining = models.DateField(default=timezone.now, db_index=True)
    basic_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Configured monthly basic wage rate (Rs.)",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=EmployeePaymentMethod.choices,
        default=EmployeePaymentMethod.CASH,
    )
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_account_title = models.CharField(max_length=150, blank=True, null=True)
    bank_account_number = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Active status. Inactive employees retain all historical attendance and salary slips.",
    )
    notes = models.TextField(blank=True, null=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_employees",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    def __str__(self):
        return f"[{self.employee_id}] {self.full_name} ({self.job_title})"

    @classmethod
    def generate_employee_id(cls):
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("employee")


class Attendance(models.Model):
    """
    Daily attendance transaction per employee with duplicate prevention.
    """
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="attendance_records",
        db_index=True,
    )
    date = models.DateField(default=timezone.now, db_index=True)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT,
        db_index=True,
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_attendances",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        unique_together = ("employee", "date")
        verbose_name = "Attendance Record"
        verbose_name_plural = "Attendance Records"

    def __str__(self):
        return f"{self.employee.full_name} - {self.date}: {self.status}"

    @property
    def working_hours(self) -> float:
        """Dynamically calculates total hours worked from check-in and check-out."""
        if self.check_in and self.check_out:
            t1 = datetime.combine(self.date, self.check_in)
            t2 = datetime.combine(self.date, self.check_out)
            if t2 >= t1:
                diff = t2 - t1
                return round(diff.total_seconds() / 3600.0, 2)
        return 0.0


class SalarySlip(models.Model):
    """
    Monthly salary slip payroll transaction.
    """
    slip_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique payroll slip number (e.g. SAL-2026-00001)",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="salary_slips",
        db_index=True,
    )
    month = models.PositiveSmallIntegerField(help_text="Payroll month (1-12)")
    year = models.PositiveIntegerField(help_text="Payroll year (e.g. 2026)")
    payroll_period = models.CharField(
        max_length=20,
        db_index=True,
        help_text="Formatted period (e.g. 2026-08)",
    )
    date = models.DateField(default=timezone.now, help_text="Issue/Calculation date")
    basic_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Snapshot of base salary for this period",
    )
    allowances = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Overtime, bonus, food/travel allowances",
    )
    deductions = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Taxes, unexcused absence/late deductions, penalties",
    )
    net_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Final payable salary: Basic + Allowances - Deductions",
    )
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total cumulative amount disbursed toward this slip",
    )
    status = models.CharField(
        max_length=20,
        choices=SalarySlipStatus.choices,
        default=SalarySlipStatus.DRAFT,
        db_index=True,
    )
    notes = models.TextField(blank=True, null=True)

    # General Ledger links
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accrued_salary_slips",
        help_text="Accrual journal entry: DR 5020 Salaries Expense / CR 2030 Accrued Salaries",
    )
    reversal_journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversed_salary_slips",
        help_text="Counter-reversal entry upon cancellation",
    )

    # Audit Trail
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_salary_slips",
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_salary_slips",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_salary_slips_by",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "-month", "-id"]
        unique_together = ("employee", "month", "year")
        verbose_name = "Salary Slip"
        verbose_name_plural = "Salary Slips"

    def __str__(self):
        return f"{self.slip_number} - {self.employee.full_name} [{self.payroll_period}]: Rs. {self.net_salary}"

    @property
    def payable_amount(self) -> Decimal:
        """Remaining unpaid salary balance."""
        return max(Decimal("0.00"), self.net_salary - self.paid_amount)

    @property
    def is_fully_paid(self) -> bool:
        return self.paid_amount >= self.net_salary

    @classmethod
    def generate_slip_number(cls, target_date=None):
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("salary_slip")


class SalaryPayment(models.Model):
    """
    Dedicated salary disbursement voucher reducing Accrued Salaries Payable (2030).
    """
    payment_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique salary payment voucher (e.g. SPAY-2026-00001)",
    )
    salary_slip = models.ForeignKey(
        SalarySlip,
        on_delete=models.PROTECT,
        related_name="payments",
        db_index=True,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="salary_payments",
        db_index=True,
    )
    date = models.DateField(default=timezone.now, db_index=True)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Disbursement amount paid out",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=EmployeePaymentMethod.choices,
        default=EmployeePaymentMethod.CASH,
    )
    payment_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="salary_payment_disbursements",
        help_text="Credit Asset Account (e.g. Cash in Hand 1010, Main Bank 1020)",
    )
    reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Cheque # / Bank Transfer Ref",
    )
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=SalaryPaymentStatus.choices,
        default=SalaryPaymentStatus.SUBMITTED,
        db_index=True,
    )

    # General Ledger links
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="salary_disbursement_payments",
        help_text="Disbursement entry: DR 2030 Accrued Salaries / CR 1010 Cash",
    )
    reversal_journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversed_salary_payments",
        help_text="Reversal journal entry upon payment cancellation",
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_salary_disbursements",
    )
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_salary_disbursements",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Salary Payment"
        verbose_name_plural = "Salary Payments"

    def __str__(self):
        return f"{self.payment_number} -> {self.employee.full_name}: Rs. {self.amount}"

    @classmethod
    def generate_payment_number(cls, target_date=None):
        """Generates sequential voucher: SALPAY-YYYY-XXXXX"""
        year = target_date.year if target_date else timezone.now().year
        prefix = f"SALPAY-{year}-"
        last = cls.objects.filter(payment_number__startswith=prefix).order_by("-payment_number").first()
        if last:
            try:
                seq = int(last.payment_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:05d}"
