"""
Management command to seed demo employee profiles, attendance logs, and payroll salary slips.
"""

from decimal import Decimal
from datetime import datetime, time, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone

from apps.employees.models import Employee, Attendance, AttendanceStatus, SalarySlip, SalaryPayment
from apps.employees.services import EmployeeService, AttendanceService, PayrollService
from apps.accounting.models import Account


class Command(BaseCommand):
    help = "Seeds demo employees, attendance records, and payroll salary slips."

    def handle(self, *args, **options):
        self.stdout.write("=== Seeding Phase 10 Employees, Attendance & Payroll ===")

        admin_user = User.objects.filter(username="admin").first()
        cashier_user = User.objects.filter(username="cashier").first()
        manager_user = User.objects.filter(username="manager").first()

        # 1. Employees Master
        emp1, _ = Employee.objects.get_or_create(
            employee_id="EMP-00001",
            defaults={
                "user": cashier_user,
                "full_name": "Kashif Ali",
                "phone": "0301-5544332",
                "email": "kashif.ali@apexpos.local",
                "address": "Street 4, Sector G-9/1, Islamabad",
                "job_title": "Senior Cashier",
                "department": "Sales & Counter Operations",
                "date_of_joining": timezone.now().date() - timedelta(days=180),
                "basic_salary": Decimal("45000.00"),
                "payment_method": "BANK",
                "bank_name": "Meezan Bank",
                "bank_account_title": "Kashif Ali",
                "bank_account_number": "01020304050607",
                "is_active": True,
                "created_by": admin_user,
            },
        )
        self.stdout.write(f"✓ Employee created: [{emp1.employee_id}] {emp1.full_name} ({emp1.job_title})")

        emp2, _ = Employee.objects.get_or_create(
            employee_id="EMP-00002",
            defaults={
                "user": manager_user,
                "full_name": "Saima Tariq",
                "phone": "0321-7788990",
                "email": "saima.tariq@apexpos.local",
                "address": "Apartment 12-B, F-11 Markaz, Islamabad",
                "job_title": "Store Operations Manager",
                "department": "Operations & Administration",
                "date_of_joining": timezone.now().date() - timedelta(days=365),
                "basic_salary": Decimal("75000.00"),
                "payment_method": "BANK",
                "bank_name": "Habib Bank Limited",
                "bank_account_title": "Saima Tariq",
                "bank_account_number": "99887766554433",
                "is_active": True,
                "created_by": admin_user,
            },
        )
        self.stdout.write(f"✓ Employee created: [{emp2.employee_id}] {emp2.full_name} ({emp2.job_title})")

        emp3, _ = Employee.objects.get_or_create(
            employee_id="EMP-00003",
            defaults={
                "user": None,
                "full_name": "Rashid Minhas",
                "phone": "0345-1122334",
                "email": "rashid.minhas@apexpos.local",
                "address": "House 55, Satellite Town, Rawalpindi",
                "job_title": "Inventory & Stock Clerk",
                "department": "Logistics & Warehouse",
                "date_of_joining": timezone.now().date() - timedelta(days=90),
                "basic_salary": Decimal("38000.00"),
                "payment_method": "CASH",
                "is_active": True,
                "created_by": admin_user,
            },
        )
        self.stdout.write(f"✓ Employee created: [{emp3.employee_id}] {emp3.full_name} ({emp3.job_title})")

        # 2. Seed Attendance for past 5 working days
        today = timezone.now().date()
        for i in range(5):
            att_date = today - timedelta(days=i)
            # Emp 1
            if not Attendance.objects.filter(employee=emp1, date=att_date).exists():
                Attendance.objects.create(
                    employee=emp1,
                    date=att_date,
                    check_in=time(9, 2),
                    check_out=time(18, 5),
                    status=AttendanceStatus.PRESENT,
                    notes="On time shift",
                    created_by=admin_user,
                )
            # Emp 2
            if not Attendance.objects.filter(employee=emp2, date=att_date).exists():
                Attendance.objects.create(
                    employee=emp2,
                    date=att_date,
                    check_in=time(8, 55),
                    check_out=time(18, 30),
                    status=AttendanceStatus.PRESENT,
                    created_by=admin_user,
                )
            # Emp 3
            if not Attendance.objects.filter(employee=emp3, date=att_date).exists():
                Attendance.objects.create(
                    employee=emp3,
                    date=att_date,
                    check_in=time(9, 35) if i == 1 else time(9, 0),
                    check_out=time(18, 0),
                    status=AttendanceStatus.LATE if i == 1 else AttendanceStatus.PRESENT,
                    notes="Late due to traffic" if i == 1 else "",
                    created_by=admin_user,
                )
        self.stdout.write("✓ Seeded 5-day attendance logs for all employees.")

        # 3. Seed Monthly Payroll Slips
        current_month = today.month
        current_year = today.year

        bank_acc = Account.objects.filter(code="1020").first()

        # Slip 1 for Kashif Ali (Submitted + Disbursed)
        if not SalarySlip.objects.filter(employee=emp1, month=current_month, year=current_year).exists():
            slip1 = PayrollService.create_salary_slip(
                data={
                    "employee": emp1,
                    "month": current_month,
                    "year": current_year,
                    "date": today,
                    "basic_salary": emp1.basic_salary,
                    "allowances": Decimal("2500.00"),
                    "deductions": Decimal("1000.00"),
                    "notes": "August regular payroll + performance bonus",
                },
                user=admin_user,
                submit_now=True,
            )
            self.stdout.write(f"✓ Generated and accrued salary slip: {slip1.slip_number} (Net: Rs. {slip1.net_salary}) -> GL: {slip1.journal_entry.entry_number}")

            # Disburse full payment
            pay1 = PayrollService.disburse_salary_payment(
                data={
                    "salary_slip": slip1,
                    "amount": slip1.payable_amount,
                    "payment_method": "BANK",
                    "payment_account": bank_acc,
                    "reference": "SAL-PAY-0089",
                    "notes": "Bank salary transfer",
                },
                user=admin_user,
            )
            self.stdout.write(f"✓ Disbursed salary payment: {pay1.payment_number} (Rs. {pay1.amount}) -> GL: {pay1.journal_entry.entry_number}")

        # Slip 2 for Rashid Minhas (Submitted, unpaid)
        if not SalarySlip.objects.filter(employee=emp3, month=current_month, year=current_year).exists():
            slip2 = PayrollService.create_salary_slip(
                data={
                    "employee": emp3,
                    "month": current_month,
                    "year": current_year,
                    "date": today,
                    "basic_salary": emp3.basic_salary,
                    "allowances": Decimal("0.00"),
                    "deductions": Decimal("0.00"),
                    "notes": "August regular payroll",
                },
                user=admin_user,
                submit_now=True,
            )
            self.stdout.write(f"✓ Generated and accrued salary slip: {slip2.slip_number} (Net: Rs. {slip2.net_salary}) -> GL: {slip2.journal_entry.entry_number}")

        self.stdout.write("=== Phase 10 Seeding Completed! ===")
