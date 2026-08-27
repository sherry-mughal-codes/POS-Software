from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from apps.sales.models import Sale, SaleItem, SalePayment, SalesReturn, SalesReturnItem, POSDaySession
from apps.purchases.models import Purchase, PurchaseItem, PurchaseReturn, PurchaseReturnItem, SupplierPayment
from apps.inventory.models import StockMovement, StockAdjustment, StockAdjustmentItem
from apps.accounting.models import JournalEntry, JournalItem, Account
from apps.expenses.models import Expense, AccountTransfer
from apps.employees.models import SalarySlip, SalaryPayment, Attendance, Employee
from apps.contacts.models import Customer, Supplier, CustomerPayment
from apps.products.models import Product, Category, Unit
from apps.core.models import SystemSetting
from apps.core.sequences import DocumentSequenceService


class Command(BaseCommand):
    help = "Clears all transactional data and demo contacts/employees while preserving master structures, settings, Chart of Accounts, and default Walk-in Customer. Resets all document sequences to start from 00001."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== [ApexPOS] Clearing All Transactional Data & Resetting Sequences ==="))

        with transaction.atomic():
            # 1. Sales & Returns
            self.stdout.write("1. Clearing Sales, Split Payments, Returns & POS Registers...")
            sr_items = SalesReturnItem.objects.all().delete()[0]
            sr = SalesReturn.objects.all().delete()[0]
            sp = SalePayment.objects.all().delete()[0]
            si = SaleItem.objects.all().delete()[0]
            s = Sale.objects.all().delete()[0]
            ds = POSDaySession.objects.all().delete()[0]
            self.stdout.write(f"   Deleted {s} Sales, {si} SaleItems, {sp} SalePayments, {sr} SalesReturns, {ds} DaySessions.")

            # 2. Purchases & Supplier Returns
            self.stdout.write("2. Clearing Purchases, Supplier Payments & Supplier Returns...")
            pri = PurchaseReturnItem.objects.all().delete()[0]
            pr = PurchaseReturn.objects.all().delete()[0]
            pi = PurchaseItem.objects.all().delete()[0]
            p = Purchase.objects.all().delete()[0]
            spay = SupplierPayment.objects.all().delete()[0]
            self.stdout.write(f"   Deleted {p} Purchases, {pi} PurchaseItems, {pr} PurchaseReturns, {spay} SupplierPayments.")

            # 3. Inventory Stock Movements & Adjustments
            self.stdout.write("3. Clearing Stock Movements & Adjustments...")
            sai = StockAdjustmentItem.objects.all().delete()[0]
            sa = StockAdjustment.objects.all().delete()[0]
            sm = StockMovement.objects.all().delete()[0]
            self.stdout.write(f"   Deleted {sm} StockMovements, {sa} StockAdjustments, {sai} StockAdjustmentItems.")

            # 4. Expenses & Account Transfers
            self.stdout.write("4. Clearing Expenses & Transfers...")
            exp = Expense.objects.all().delete()[0]
            trf = AccountTransfer.objects.all().delete()[0]
            self.stdout.write(f"   Deleted {exp} Expenses, {trf} AccountTransfers.")

            # 5. Employees, Payroll & Attendance
            self.stdout.write("5. Clearing Payroll Vouchers, Attendance logs & Demo Staff...")
            salpay = SalaryPayment.objects.all().delete()[0]
            slip = SalarySlip.objects.all().delete()[0]
            att = Attendance.objects.all().delete()[0]
            emp = Employee.objects.all().delete()[0]
            self.stdout.write(f"   Deleted {salpay} SalaryPayments, {slip} SalarySlips, {att} Attendance logs, {emp} Employee records.")

            # 6. Customer Receivables & Supplier Directories
            self.stdout.write("6. Clearing Customer Payments, Demo Customers & Suppliers...")
            cpay = CustomerPayment.objects.all().delete()[0]
            cus = Customer.objects.filter(is_walkin=False).delete()[0]
            sup = Supplier.objects.all().delete()[0]
            
            # Ensure Walk-in Customer exists with CUS-WALKIN code
            walkin = Customer.objects.filter(is_walkin=True).first()
            if not walkin:
                Customer.objects.create(
                    customer_id="CUS-WALKIN",
                    name="Walk-in Customer",
                    phone="0000000000",
                    is_walkin=True,
                    credit_enabled=False,
                    opening_balance=0.0,
                    is_active=True,
                )
            else:
                walkin.customer_id = "CUS-WALKIN"
                walkin.opening_balance = 0.0
                walkin.save()
            self.stdout.write(f"   Deleted {cpay} CustomerPayments, {cus} Demo Customers, {sup} Suppliers. Walk-in Customer preserved.")

            # 7. Accounting General Ledger
            self.stdout.write("7. Clearing Double-Entry General Ledger...")
            ji = JournalItem.objects.all().delete()[0]
            je = JournalEntry.objects.all().delete()[0]
            self.stdout.write(f"   Deleted {je} JournalEntries, {ji} JournalItems (GL entries).")

            # 8. Reset all Document Sequence start numbers in SystemSettings to default
            self.stdout.write("8. Resetting Document Numbering Sequences to start at 00001 (Current = 0)...")
            for doc_type, cfg in DocumentSequenceService.CONFIGS.items():
                start_key = cfg.get("start_key")
                prefix_key = cfg.get("prefix_key")
                default_prefix = cfg.get("default_prefix")
                
                # Ensure default prefix and start number 1
                if start_key:
                    SystemSetting.set_setting(start_key, "1", "POS", f"Start number for {cfg.get('title')}")
                if prefix_key and not SystemSetting.objects.filter(key=prefix_key).exists():
                    SystemSetting.set_setting(prefix_key, default_prefix, "POS", f"Prefix for {cfg.get('title')}")

            # 9. Summary of Preserved Master Data & Sequence Status
            self.stdout.write(self.style.SUCCESS("\n=== Preserved Master & Administrative Modules ==="))
            self.stdout.write(f"✓ Users & Admin Accounts: {User.objects.count()} active users")
            self.stdout.write(f"✓ Chart of Accounts (COA): {Account.objects.count()} ledger accounts (All zero balance)")
            self.stdout.write(f"✓ Categories: {Category.objects.count()}")
            self.stdout.write(f"✓ Units of Measure: {Unit.objects.count()}")
            self.stdout.write(f"✓ Product Master Definitions: {Product.objects.count()} products (Stock: 0)")
            walkin_obj = Customer.objects.filter(is_walkin=True).first()
            self.stdout.write(f"✓ Default Customer: '{walkin_obj.name}' ({walkin_obj.customer_id})")

            self.stdout.write(self.style.SUCCESS("\n=== Document Sequence Reset Status ==="))
            for doc_type, seq_info in DocumentSequenceService.get_all_sequences_info().items():
                self.stdout.write(f"  • {seq_info['title']:28s}: Prefix = {seq_info['prefix']:8s} | Current Latest = {seq_info['current_number']:2d} | Next Preview = {seq_info['next_preview']}")

        self.stdout.write(self.style.SUCCESS("\n================================================================="))
        self.stdout.write(self.style.SUCCESS("✓ ALL SEQUENCES & NUMBERS START FROM ZERO / 00001 SUCCESSFULLY!"))
        self.stdout.write(self.style.SUCCESS("================================================================="))
