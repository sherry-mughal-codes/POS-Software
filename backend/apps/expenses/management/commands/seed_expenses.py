"""
Seed operational expenses and account transfers for Phase 8 testing.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from apps.accounting.models import Account, AccountType
from apps.expenses.models import Expense, AccountTransfer
from apps.expenses.services import ExpenseService, TransferService


class Command(BaseCommand):
    help = "Seed demo operational expenses and account transfers."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Seeding Phase 8 Expenses & Transfers ==="))

        admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()

        # Fetch accounts
        rent_acc = Account.objects.filter(code="5030").first()
        util_acc = Account.objects.filter(code="5040").first()
        maint_acc = Account.objects.filter(code="5050").first()

        cash_acc = Account.objects.filter(code="1010").first()
        bank_acc = Account.objects.filter(code="1020").first()

        if not (rent_acc and util_acc and cash_acc and bank_acc):
            self.stdout.write(self.style.ERROR("Required accounts missing. Please run seed_chart_of_accounts first."))
            return

        if not Expense.objects.exists():
            # 1. Submitted Cash Expense - Electricity Bill
            exp1 = ExpenseService.create_expense(
                data={
                    "date": timezone.now().date(),
                    "expense_account": util_acc,
                    "payment_account": cash_acc,
                    "amount": Decimal("15000.00"),
                    "description": "Monthly Commercial Electricity Bill (IESCO)",
                    "reference_no": "BILL-2026-08",
                    "notes": "Paid directly from cash drawer",
                },
                user=admin_user,
                submit_now=True,
            )
            self.stdout.write(self.style.SUCCESS(f"✓ Created submitted expense: {exp1.expense_number} (Rs. {exp1.amount})"))

            # 2. Submitted Bank Expense - Store Rent
            exp2 = ExpenseService.create_expense(
                data={
                    "date": timezone.now().date(),
                    "expense_account": rent_acc,
                    "payment_account": bank_acc,
                    "amount": Decimal("45000.00"),
                    "description": "Commercial Store Rent for August 2026",
                    "reference_no": "RENT-AGR-0826",
                    "notes": "Direct bank transfer to landlord",
                },
                user=admin_user,
                submit_now=True,
            )
            self.stdout.write(self.style.SUCCESS(f"✓ Created submitted expense: {exp2.expense_number} (Rs. {exp2.amount})"))

            # 3. Draft Expense - Store Supplies & Maintenance
            if maint_acc:
                exp3 = ExpenseService.create_expense(
                    data={
                        "date": timezone.now().date(),
                        "expense_account": maint_acc,
                        "payment_account": cash_acc,
                        "amount": Decimal("4200.00"),
                        "description": "Cleaning materials, thermal receipt paper rolls, and air fresheners",
                        "reference_no": "RCPT-9812",
                        "notes": "Pending manager approval",
                    },
                    user=admin_user,
                    submit_now=False,
                )
                self.stdout.write(self.style.SUCCESS(f"✓ Created draft expense: {exp3.expense_number} (Rs. {exp3.amount})"))

        if not AccountTransfer.objects.exists():
            # 4. Account Transfer: Cash in Hand -> Main Bank Account
            trf1 = TransferService.create_transfer(
                data={
                    "date": timezone.now().date(),
                    "from_account": cash_acc,
                    "to_account": bank_acc,
                    "amount": Decimal("50000.00"),
                    "reference": "DEP-SLIP-0912",
                    "notes": "End-of-day excess cash deposit to Meezan Bank",
                },
                user=admin_user,
            )
            self.stdout.write(self.style.SUCCESS(f"✓ Created account transfer: {trf1.transfer_number} (Rs. {trf1.amount})"))

        self.stdout.write(self.style.SUCCESS("=== Phase 8 Seeding Completed! ==="))
