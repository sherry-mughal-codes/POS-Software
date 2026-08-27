"""
Django management command to seed the standard POS Chart of Accounts and Payment Methods.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounting.models import Account, AccountType, PaymentMethod
from apps.accounting.services import AccountingService


class Command(BaseCommand):
    help = "Seeds standard hierarchical Chart of Accounts and Payment Methods for the POS."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Seeding Chart of Accounts & Payment Methods ==="))

        # Define Chart of Accounts Hierarchy
        accounts_data = [
            # 1000 - ASSETS
            {"code": "1000", "name": "Assets", "type": AccountType.ASSET, "parent": None, "is_system": True},
            {"code": "1010", "name": "Cash in Hand", "type": AccountType.ASSET, "parent": "1000", "is_system": True},
            {"code": "1020", "name": "Main Bank Account", "type": AccountType.ASSET, "parent": "1000", "is_system": True},
            {"code": "1025", "name": "Card Clearing / POS Terminal Account", "type": AccountType.ASSET, "parent": "1000", "is_system": True},
            {"code": "1030", "name": "Accounts Receivable (Customer Credit)", "type": AccountType.ASSET, "parent": "1000", "is_system": True},
            {"code": "1040", "name": "Inventory Asset (Merchandise)", "type": AccountType.ASSET, "parent": "1000", "is_system": True},
            {"code": "1050", "name": "Store Equipment & Fixtures", "type": AccountType.ASSET, "parent": "1000", "is_system": False},

            # 2000 - LIABILITIES
            {"code": "2000", "name": "Liabilities", "type": AccountType.LIABILITY, "parent": None, "is_system": True},
            {"code": "2010", "name": "Accounts Payable (Suppliers)", "type": AccountType.LIABILITY, "parent": "2000", "is_system": True},
            {"code": "2020", "name": "Sales Tax Payable", "type": AccountType.LIABILITY, "parent": "2000", "is_system": True},
            {"code": "2030", "name": "Accrued Salaries Payable", "type": AccountType.LIABILITY, "parent": "2000", "is_system": False},

            # 3000 - EQUITY
            {"code": "3000", "name": "Equity", "type": AccountType.EQUITY, "parent": None, "is_system": True},
            {"code": "3010", "name": "Owner's Capital / Equity", "type": AccountType.EQUITY, "parent": "3000", "is_system": True},
            {"code": "3020", "name": "Retained Earnings", "type": AccountType.EQUITY, "parent": "3000", "is_system": True},

            # 4000 - INCOME
            {"code": "4000", "name": "Revenue / Income", "type": AccountType.INCOME, "parent": None, "is_system": True},
            {"code": "4010", "name": "Sales Revenue", "type": AccountType.INCOME, "parent": "4000", "is_system": True},
            {"code": "4020", "name": "Sales Returns & Allowances", "type": AccountType.INCOME, "parent": "4000", "is_system": True},
            {"code": "4030", "name": "Discount Received (Supplier)", "type": AccountType.INCOME, "parent": "4000", "is_system": False},
            {"code": "4040", "name": "Other Operating Income", "type": AccountType.INCOME, "parent": "4000", "is_system": False},

            # 5000 - DIRECT EXPENSES (COGS)
            {"code": "5000", "name": "Direct Expenses (COGS)", "type": AccountType.EXPENSE, "parent": None, "is_system": True},
            {"code": "5010", "name": "Cost of Goods Sold (COGS)", "type": AccountType.EXPENSE, "parent": "5000", "is_system": True},
            {"code": "5080", "name": "Inventory Shrinkage & Write-offs", "type": AccountType.EXPENSE, "parent": "5000", "is_system": False},

            # 5100 - INDIRECT EXPENSES (OPERATING & ADMIN)
            {"code": "5100", "name": "Indirect Expenses", "type": AccountType.EXPENSE, "parent": None, "is_system": True},
            {"code": "5020", "name": "Salaries & Wages Expense", "type": AccountType.EXPENSE, "parent": "5100", "is_system": False},
            {"code": "5030", "name": "Store Rent Expense", "type": AccountType.EXPENSE, "parent": "5100", "is_system": False},
            {"code": "5040", "name": "Utilities (Electricity, Water)", "type": AccountType.EXPENSE, "parent": "5100", "is_system": False},
            {"code": "5050", "name": "Store Maintenance & Supplies", "type": AccountType.EXPENSE, "parent": "5100", "is_system": False},
            {"code": "5060", "name": "Marketing & Advertising", "type": AccountType.EXPENSE, "parent": "5100", "is_system": False},
            {"code": "5070", "name": "Bank & Card Gateway Fees", "type": AccountType.EXPENSE, "parent": "5100", "is_system": False},
            {"code": "5082", "name": "Entertainment & Refreshment", "type": AccountType.EXPENSE, "parent": "5100", "is_system": False},
        ]

        created_count = 0
        account_map = {}

        for item in accounts_data:
            parent_acc = account_map.get(item["parent"]) if item["parent"] else None
            account, created = Account.objects.get_or_create(
                code=item["code"],
                defaults={
                    "name": item["name"],
                    "account_type": item["type"],
                    "parent": parent_acc,
                    "is_system": item["is_system"],
                    "is_active": True,
                },
            )
            account_map[item["code"]] = account
            if created:
                created_count += 1
                self.stdout.write(f"  + Created account: [{account.code}] {account.name} ({account.account_type})")

        self.stdout.write(self.style.SUCCESS(f"✓ Chart of Accounts initialized ({len(accounts_data)} total accounts)."))

        # Seed Payment Methods
        payment_methods_data = [
            {"name": "Cash", "code": "CASH", "account_code": "1010"},
            {"name": "Bank Transfer", "code": "BANK", "account_code": "1020"},
            {"name": "Credit / Debit Card", "code": "CARD", "account_code": "1025"},
        ]

        for pm in payment_methods_data:
            linked_acc = account_map.get(pm["account_code"])
            if linked_acc:
                method, created = PaymentMethod.objects.get_or_create(
                    code=pm["code"],
                    defaults={
                        "name": pm["name"],
                        "linked_account": linked_acc,
                        "is_active": True,
                    },
                )
                if created:
                    self.stdout.write(f"  + Created payment method: {method.name} -> [{linked_acc.code}] {linked_acc.name}")

        # Seed Opening Balance if no journal entries exist
        if not Account.objects.filter(journal_items__isnull=False).exists():
            equity_acc = account_map.get("3010")
            cash_acc = account_map.get("1010")
            bank_acc = account_map.get("1020")
            inventory_acc = account_map.get("1040")

            if equity_acc and cash_acc and bank_acc and inventory_acc:
                opening_entries = [
                    {"account": cash_acc, "debit": Decimal("100000.00"), "credit": Decimal("0.00")},
                    {"account": bank_acc, "debit": Decimal("250000.00"), "credit": Decimal("0.00")},
                    {"account": inventory_acc, "debit": Decimal("500000.00"), "credit": Decimal("0.00")},
                ]
                entry = AccountingService.record_opening_balance(
                    entry_date=timezone.now().date(),
                    account_balances=opening_entries,
                    equity_account=equity_acc,
                )
                self.stdout.write(self.style.SUCCESS(f"✓ Seeded system opening balances entry: {entry.entry_number} (Total: {entry.total_debit})"))

        self.stdout.write(self.style.SUCCESS("=== Accounting Setup Completed Successfully! ==="))
