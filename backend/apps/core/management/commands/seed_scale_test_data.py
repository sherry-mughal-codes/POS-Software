"""
ApexPOS High-Scale & Durability Test Generator.
Purges all previous transactional records, sets pristine opening balances on Jan 1, 2026,
and synthesizes at least 500 records per transactional module distributed evenly across
the 245-day operational period (Jan 1, 2026 -> Sep 2, 2026).
"""

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Dict, List

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import models, transaction
from django.utils import timezone

from apps.accounting.models import Account, AccountType, JournalEntry, JournalEntryStatus, JournalItem, ReferenceType
from apps.contacts.models import Customer, CustomerPayment, CustomerPaymentStatus, Supplier
from apps.core.models import SystemSetting
from apps.core.sequences import DocumentSequenceService
from apps.employees.models import (
    Employee,
    EmployeePaymentMethod,
    SalaryPayment,
    SalarySlip,
    SalarySlipStatus,
)
from apps.expenses.models import AccountTransfer, Expense, ExpenseStatus, TransferStatus
from apps.inventory.models import MovementType, StockMovement
from apps.products.models import Category, Product, Unit
from apps.purchases.models import (
    PaymentMethod,
    Purchase,
    PurchaseItem,
    PurchaseReturn,
    PurchaseReturnItem,
    PurchaseStatus,
    RefundMethod,
    SupplierPayment,
    SupplierPaymentMethodType,
    SupplierPaymentStatus,
)
from apps.sales.models import (
    DaySessionStatus,
    PaymentMethodType,
    POSDaySession,
    Sale,
    SaleItem,
    SalePayment,
    SalesReturn,
    SalesReturnItem,
    SaleStatus,
)
from apps.warranty.models import (
    CustomerWarrantyClaim,
    CustomerWarrantyClaimStatus,
    SupplierWarrantyClaim,
    SupplierWarrantyClaimItem,
    SupplierWarrantyClaimStatus,
)


class Command(BaseCommand):
    help = "Purges transactions, initializes opening balances, and generates 500+ records per module from Jan 1 to Sep 2, 2026."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("================================================================================"))
        self.stdout.write(self.style.NOTICE("    APEXPOS HIGH-SCALE & DURABILITY SIMULATION (500+ ENTRIES PER MODULE)       "))
        self.stdout.write(self.style.NOTICE("================================================================================"))

        start_time = datetime.now()

        # Step 1: Wipe all transactional records and reset sequences
        self.stdout.write("\n[Step 1/14] Purging all existing transactional data and resetting counters...")
        call_command("clear_transactional_data")

        # Step 2: Ensure Chart of Accounts & Master Data exists
        self.stdout.write("\n[Step 2/14] Verifying and setting up Master Catalog & Chart of Accounts...")
        call_command("seed_chart_of_accounts")

        admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if not admin_user:
            admin_user = User.objects.create_superuser("admin", "admin@apexpos.com", "admin123")

        # Resolve accounts
        acc_cash = Account.objects.get(code="1010")
        acc_bank = Account.objects.get(code="1020")
        acc_card = Account.objects.get(code="1025")
        acc_ar = Account.objects.get(code="1030")
        acc_inventory = Account.objects.get(code="1040")
        acc_warranty_asset = Account.objects.get(code="1060")
        acc_supplier_asset = Account.objects.get(code="1070")
        acc_ap = Account.objects.get(code="2010")
        acc_tax_payable = Account.objects.get(code="2020")
        acc_salaries_payable = Account.objects.get(code="2030")
        acc_equity = Account.objects.get(code="3010")
        acc_sales_revenue = Account.objects.get(code="4010")
        acc_sales_returns = Account.objects.get(code="4020")
        acc_cogs = Account.objects.get(code="5010")
        acc_salaries_expense = Account.objects.get(code="5020")
        acc_rent = Account.objects.get(code="5030")
        acc_utilities = Account.objects.get(code="5040")
        acc_maintenance = Account.objects.get(code="5050")
        acc_marketing = Account.objects.get(code="5060")
        acc_gateway_fees = Account.objects.get(code="5070")
        acc_entertainment = Account.objects.get(code="5082")

        # Step 3: Seed realistic Master Entities (Categories, Units, Products, Customers, Suppliers, Staff)
        self.stdout.write("\n[Step 3/14] Seeding rich master catalog (Products, Customers, Suppliers, Staff)...")
        unit_pcs, _ = Unit.objects.get_or_create(short_code="pcs", defaults={"name": "Piece", "allow_decimal": False})
        unit_box, _ = Unit.objects.get_or_create(short_code="box", defaults={"name": "Box", "allow_decimal": False})
        unit_kg, _ = Unit.objects.get_or_create(short_code="kg", defaults={"name": "Kilogram", "allow_decimal": True})
        unit_ltr, _ = Unit.objects.get_or_create(short_code="ltr", defaults={"name": "Liter", "allow_decimal": True})

        categories_data = [
            ("BEV", "Beverages & Drinks"),
            ("GROC", "Groceries & Staples"),
            ("DAIRY", "Dairy & Chilled"),
            ("ELEC", "Consumer Electronics"),
            ("SNACK", "Snacks & Confectionery"),
            ("CARE", "Personal Care"),
            ("HOME", "Household Cleaning"),
            ("BAKE", "Bakery & Biscuits"),
        ]
        cat_map = {}
        for c_code, c_name in categories_data:
            cat, _ = Category.objects.get_or_create(code=c_code, defaults={"name": c_name, "is_active": True})
            cat_map[c_code] = cat

        products_spec = [
            ("PRD-00001", "Pepsi Cola 1.5L Bottle", "89640001001", "BEV", unit_pcs, Decimal("120.00"), Decimal("160.00"), 0),
            ("PRD-00002", "Coca-Cola Classic 1.5L", "89640001002", "BEV", unit_pcs, Decimal("125.00"), Decimal("165.00"), 0),
            ("PRD-00003", "Aquafina Mineral Water 1.5L", "89640001003", "BEV", unit_pcs, Decimal("55.00"), Decimal("80.00"), 0),
            ("PRD-00004", "Red Bull Energy Drink 250ml", "89640001004", "BEV", unit_pcs, Decimal("320.00"), Decimal("420.00"), 0),
            ("PRD-00005", "Nestle Pure Life 500ml", "89640001005", "BEV", unit_pcs, Decimal("35.00"), Decimal("50.00"), 0),
            ("PRD-00006", "Basmati Super Kernel Rice 5kg", "89640001006", "GROC", unit_box, Decimal("1650.00"), Decimal("2100.00"), 0),
            ("PRD-00007", "Dalda Premium Cooking Oil 5L", "89640001007", "GROC", unit_ltr, Decimal("2450.00"), Decimal("2950.00"), 0),
            ("PRD-00008", "Mehran Himalayan Pink Salt 800g", "89640001008", "GROC", unit_pcs, Decimal("85.00"), Decimal("120.00"), 0),
            ("PRD-00009", "National Chilli Garlic Sauce 500g", "89640001009", "GROC", unit_pcs, Decimal("210.00"), Decimal("280.00"), 0),
            ("PRD-00010", "Shan Biryani Masala Double Pack", "89640001010", "GROC", unit_pcs, Decimal("140.00"), Decimal("190.00"), 0),
            ("PRD-00011", "Olpers UHT Full Cream Milk 1L", "89640001011", "DAIRY", unit_ltr, Decimal("230.00"), Decimal("290.00"), 0),
            ("PRD-00012", "Nestle MilkPak Full Cream 1L", "89640001012", "DAIRY", unit_ltr, Decimal("235.00"), Decimal("295.00"), 0),
            ("PRD-00013", "Nurpur Butter Salted 200g", "89640001013", "DAIRY", unit_pcs, Decimal("320.00"), Decimal("410.00"), 0),
            ("PRD-00014", "Anker PowerCore 10000mAh Powerbank", "89640001014", "ELEC", unit_pcs, Decimal("3500.00"), Decimal("4800.00"), 365),
            ("PRD-00015", "Samsung Fast Charger Type-C 25W", "89640001015", "ELEC", unit_pcs, Decimal("1800.00"), Decimal("2600.00"), 180),
            ("PRD-00016", "Logitech B100 Optical USB Mouse", "89640001016", "ELEC", unit_pcs, Decimal("650.00"), Decimal("950.00"), 365),
            ("PRD-00017", "SanDisk Ultra 64GB USB 3.0 Drive", "89640001017", "ELEC", unit_pcs, Decimal("1100.00"), Decimal("1650.00"), 365),
            ("PRD-00018", "Lays French Cheese Crisps 65g", "89640001018", "SNACK", unit_pcs, Decimal("70.00"), Decimal("100.00"), 0),
            ("PRD-00019", "Kurkure Chutney Chaska 60g", "89640001019", "SNACK", unit_pcs, Decimal("50.00"), Decimal("70.00"), 0),
            ("PRD-00020", "Cadbury Dairy Milk Silk 150g", "89640001020", "SNACK", unit_pcs, Decimal("380.00"), Decimal("500.00"), 0),
            ("PRD-00021", "LU Prince Chocolate Biscuits 12pk", "89640001021", "BAKE", unit_box, Decimal("360.00"), Decimal("480.00"), 0),
            ("PRD-00022", "English Toast Plain Bread Large", "89640001022", "BAKE", unit_pcs, Decimal("120.00"), Decimal("160.00"), 0),
            ("PRD-00023", "Head & Shoulders Shampoo 360ml", "89640001023", "CARE", unit_pcs, Decimal("580.00"), Decimal("790.00"), 0),
            ("PRD-00024", "Colgate Total Clean Mint 140g", "89640001024", "CARE", unit_pcs, Decimal("210.00"), Decimal("290.00"), 0),
            ("PRD-00025", "Dettol Antiseptic Disinfectant 500ml", "89640001025", "HOME", unit_pcs, Decimal("480.00"), Decimal("650.00"), 0),
            ("PRD-00026", "Ariel Complete Detergent Powder 2kg", "89640001026", "HOME", unit_box, Decimal("890.00"), Decimal("1200.00"), 0),
            ("PRD-00027", "Vim Dishwashing Gel 500ml", "89640001027", "HOME", unit_pcs, Decimal("240.00"), Decimal("330.00"), 0),
            ("PRD-00028", "Sony WH-CH520 Wireless Headphones", "89640001028", "ELEC", unit_pcs, Decimal("11500.00"), Decimal("15000.00"), 365),
            ("PRD-00029", "Baseus 65W GaN Fast Wall Charger", "89640001029", "ELEC", unit_pcs, Decimal("4200.00"), Decimal("5800.00"), 365),
            ("PRD-00030", "Tapal Danedar Black Tea 900g Pouch", "89640001030", "BEV", unit_box, Decimal("1150.00"), Decimal("1450.00"), 0),
        ]

        products_list = []
        for sku, name, bc, cat_c, u, p_price, s_price, w_days in products_spec:
            prod, _ = Product.objects.update_or_create(
                sku=sku,
                defaults={
                    "name": name,
                    "barcode": bc,
                    "category": cat_map[cat_c],
                    "unit": u,
                    "purchase_price": p_price,
                    "selling_price": s_price,
                    "maintain_stock": True,
                    "warranty_period_days": w_days,
                    "is_active": True,
                },
            )
            products_list.append(prod)

        # Ensure Walk-in customer exists
        walkin, _ = Customer.objects.get_or_create(
            is_walkin=True,
            defaults={
                "customer_id": "CUS-00001",
                "name": "Walk-in Customer",
                "is_walkin": True,
                "credit_enabled": False,
                "opening_balance": Decimal("0.00"),
                "is_active": True,
            },
        )

        # Create 20 registered customers
        customer_names = [
            "Ahmed Khan Electronics", "Tariq Traders & Retail", "Bilal Mart Superstore", "Zahid General Store",
            "Usman & Sons Corp", "Hamza Trading Agency", "Rashid Medical & General", "Kashif Departmental Store",
            "Faisal Brothers Wholesalers", "Salman Mini Mart", "Omer Enterprise", "Imran Commercial Services",
            "Waseem Fast Retail", "Junaid Prov Store", "Saeed Super Bazar", "Noman Cash & Carry",
            "Shahid Corner Shop", "Farhan Stationers & Mart", "Naveed Grocery Plaza", "Asif Brothers Mart"
        ]
        customers_list = [walkin]
        for idx, cname in enumerate(customer_names, start=2):
            cid = f"CUS-{idx:05d}"
            c_obj, _ = Customer.objects.update_or_create(
                customer_id=cid,
                defaults={
                    "name": cname,
                    "phone": f"0300{random.randint(1000000, 9999999)}",
                    "credit_enabled": True,
                    "opening_balance": Decimal(f"{random.randint(5, 50) * 100}.00"),
                    "is_active": True,
                    "is_walkin": False,
                },
            )
            customers_list.append(c_obj)

        # Create 15 suppliers
        supplier_names = [
            ("Unilever Pakistan Corp", "Karachi Industrial Area"),
            ("Nestle Pakistan Ltd", "Sheikhupura Road"),
            ("PepsiCo Bottlers Pvt Ltd", "Lahore Industrial Estate"),
            ("Coca-Cola CCI Pakistan", "Multan Road Hub"),
            ("Shan Foods International", "Korangi Sector 23"),
            ("Dalda Foods Limited", "F.B Area Karachi"),
            ("National Foods Distribution", "Port Qasim Complex"),
            ("Engro Foods / FrieslandCampina", "Harappa Dairy Division"),
            ("Samsung Electronics Logistics", "Blue Area Islamabad"),
            ("Anker & Baseus Tech Imports", "Hafeez Center Lahore"),
            ("Logitech Peripheral Distributors", "Techno City Karachi"),
            ("Reckitt Benckiser Pakistan", "Clifton Commercial"),
            ("Procter & Gamble Trading", "Gulberg III Lahore"),
            ("Tapal Tea Private Limited", "West Wharf Road"),
            ("LU Continental Biscuits", "Sukkur Industrial Zone")
        ]
        suppliers_list = []
        for idx, (sname, saddr) in enumerate(supplier_names, start=1):
            sid = f"SUP-{idx:05d}"
            s_obj, _ = Supplier.objects.update_or_create(
                supplier_id=sid,
                defaults={
                    "name": sname,
                    "company_name": sname,
                    "phone": f"021{random.randint(1000000, 9999999)}",
                    "address": saddr,
                    "tax_id": f"NTN-{random.randint(1000000, 9999999)}-{idx}",
                    "opening_balance": Decimal(f"{random.randint(10, 100) * 1000}.00"),
                    "is_active": True,
                },
            )
            suppliers_list.append(s_obj)

        staff_names = [
            ("Ali Raza", "Cashier", "Sales & Counter Operations", Decimal("45000.00")),
            ("Mohammad Bilal", "Cashier", "Sales & Counter Operations", Decimal("42000.00")),
            ("Zubair Ahmed", "Inventory Specialist", "Logistics & Inventory", Decimal("50000.00")),
            ("Farrukh Shah", "Store Supervisor", "Store Management", Decimal("75000.00")),
            ("Hamid Nawaz", "Accounts Officer", "Finance & Accounts", Decimal("65000.00")),
            ("Shahbaz Ali", "Warranty Coordinator", "Customer Service & Warranty", Decimal("48000.00")),
            ("Kamran Khan", "Cashier", "Sales & Counter Operations", Decimal("42000.00")),
            ("Mubashir Hassan", "Floor Manager", "Store Management", Decimal("85000.00")),
        ]
        employees_list = []
        for idx, (ename, ejob, edept, salary) in enumerate(staff_names, start=1):
            empid = f"EMP-{idx:05d}"
            emp_obj, _ = Employee.objects.update_or_create(
                employee_id=empid,
                defaults={
                    "full_name": ename,
                    "job_title": ejob,
                    "department": edept,
                    "phone": f"0312{random.randint(1000000, 9999999)}",
                    "basic_salary": salary,
                    "date_of_joining": date(2025, 12, 1),
                    "is_active": True,
                    "payment_method": EmployeePaymentMethod.BANK,
                },
            )
            employees_list.append(emp_obj)

        # Date timeline setup: Jan 1, 2026 to Sep 2, 2026 (245 days)
        timeline_start = date(2026, 1, 1)
        timeline_end = date(2026, 9, 2)
        total_days = (timeline_end - timeline_start).days + 1  # 245 days

        def get_date_for_step(step_idx: int, total_steps: int) -> date:
            fraction = step_idx / max(1, total_steps - 1)
            offset_days = int(fraction * (total_days - 1))
            return timeline_start + timedelta(days=offset_days)

        # Step 4: Initial Opening Capital Journal Entry (Jan 1, 2026)
        self.stdout.write("\n[Step 4/14] Posting pristine Opening Balances on Jan 1, 2026...")
        open_je = JournalEntry.objects.create(
            entry_number="JE-00001",
            entry_date=timeline_start,
            reference_type=ReferenceType.OPENING_BALANCE,
            reference_id="INIT-CAPITAL-2026",
            narration="Fresh POS Deployment Initial Capital Injection & Opening Float",
            status=JournalEntryStatus.POSTED,
            created_by=admin_user,
        )
        JournalItem.objects.create(
            journal_entry=open_je,
            account=acc_cash,
            debit=Decimal("500000.00"),
            credit=Decimal("0.00"),
            description="Initial Cash Float for POS Cash Drawer",
        )
        JournalItem.objects.create(
            journal_entry=open_je,
            account=acc_bank,
            debit=Decimal("2500000.00"),
            credit=Decimal("0.00"),
            description="Commercial Bank Operating Capital",
        )
        JournalItem.objects.create(
            journal_entry=open_je,
            account=acc_equity,
            debit=Decimal("0.00"),
            credit=Decimal("3000000.00"),
            description="Owner Capital Contribution",
        )

        # Current GL entry counter
        je_counter = 1

        def next_je_number() -> str:
            nonlocal je_counter
            je_counter += 1
            return f"JE-{je_counter:05d}"

        # Step 5: 520 Purchases (Restocking merchandise and establishing WAC)
        self.stdout.write("\n[Step 5/14] Generating 520 Purchases with Stock Movements & Accounts Payable...")
        pm_cash = PaymentMethod.objects.filter(linked_account=acc_cash).first()
        pm_bank = PaymentMethod.objects.filter(linked_account=acc_bank).first()
        purchases_pool: List[Purchase] = []
        for i in range(1, 521):
            p_date = get_date_for_step(i - 1, 520)
            supplier = suppliers_list[(i - 1) % len(suppliers_list)]
            p_number = f"PUR-{i:05d}"

            # Pick 2 to 4 products
            chosen_prods = random.sample(products_list, k=random.randint(2, 4))
            subtotal = Decimal("0.00")
            items_payload = []

            for prod in chosen_prods:
                qty = Decimal(str(random.randint(20, 80)))
                rate = prod.purchase_price
                line_tot = qty * rate
                subtotal += line_tot
                items_payload.append((prod, qty, rate, line_tot))

            # 30% upfront cash/bank payment, 70% credit payable
            paid_upfront = (subtotal * Decimal("0.30")).quantize(Decimal("0.01")) if (i % 3 == 0) else Decimal("0.00")
            payment_acc = acc_bank if (i % 2 == 0) else acc_cash

            purchase = Purchase.objects.create(
                purchase_number=p_number,
                supplier=supplier,
                date=p_date,
                status=PurchaseStatus.SUBMITTED,
                subtotal=subtotal,
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("0.00"),
                grand_total=subtotal,
                initial_paid_amount=paid_upfront,
                paid_amount=paid_upfront,
                payment_method=(pm_bank if payment_acc == acc_bank else pm_cash) if paid_upfront > Decimal("0.00") else None,
                payment_account=payment_acc if paid_upfront > 0 else None,
                supplier_invoice_number=f"VINV-{p_date.strftime('%Y%m')}-{i:04d}",
                notes=f"Restock shipment batch #{i} from {supplier.name}",
                created_by=admin_user,
            )
            purchases_pool.append(purchase)

            # Purchase items & Stock Movements
            for prod, qty, rate, line_tot in items_payload:
                PurchaseItem.objects.create(
                    purchase=purchase,
                    product=prod,
                    quantity=qty,
                    purchase_rate=rate,
                    subtotal=line_tot,
                    returned_quantity=Decimal("0.00"),
                )
                StockMovement.objects.create(
                    product=prod,
                    movement_type=MovementType.PURCHASE,
                    quantity=qty,
                    unit_cost=rate,
                    reference_type="PURCHASE",
                    reference_id=p_number,
                    notes=f"Purchase order from {supplier.name} ({p_number})",
                    created_by=admin_user,
                )

            # Balanced Double-Entry GL
            je = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=p_date,
                reference_type=ReferenceType.PURCHASE,
                reference_id=p_number,
                narration=f"Merchandise Purchase from {supplier.name} ({p_number})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            # DR 1040 Inventory Asset
            JournalItem.objects.create(journal_entry=je, account=acc_inventory, debit=subtotal, credit=Decimal("0.00"), description="Inventory received")
            # CR 2010 Accounts Payable
            JournalItem.objects.create(journal_entry=je, account=acc_ap, debit=Decimal("0.00"), credit=subtotal, description=f"Payable to {supplier.name}")

            if paid_upfront > Decimal("0.00"):
                # Upfront payment settlement
                je_pay = JournalEntry.objects.create(
                    entry_number=next_je_number(),
                    entry_date=p_date,
                    reference_type=ReferenceType.SUPPLIER_PAYMENT,
                    reference_id=f"PAY-{p_number}",
                    narration=f"Upfront payment for Purchase {p_number}",
                    status=JournalEntryStatus.POSTED,
                    created_by=admin_user,
                )
                JournalItem.objects.create(journal_entry=je_pay, account=acc_ap, debit=paid_upfront, credit=Decimal("0.00"), description="AP reduction")
                JournalItem.objects.create(journal_entry=je_pay, account=payment_acc, debit=Decimal("0.00"), credit=paid_upfront, description="Cash/Bank tender")

        # Step 6: 500 Purchase Returns (Debit Notes to Suppliers)
        self.stdout.write("\n[Step 6/14] Generating 500 Purchase Returns & Debit Notes...")
        for i in range(1, 501):
            parent_purchase = purchases_pool[(i - 1) % len(purchases_pool)]
            p_item = parent_purchase.items.first()
            ret_date = parent_purchase.date + timedelta(days=random.randint(1, 4))
            if ret_date > timeline_end:
                ret_date = timeline_end

            ret_number = f"PRTN-{i:05d}"
            ret_qty = Decimal("1.00")
            ret_amount = ret_qty * p_item.purchase_rate

            p_item.returned_quantity += ret_qty
            p_item.save(update_fields=["returned_quantity"])

            pret = PurchaseReturn.objects.create(
                return_number=ret_number,
                original_purchase=parent_purchase,
                supplier=parent_purchase.supplier,
                date=ret_date,
                total_amount=ret_amount,
                refund_method=RefundMethod.PAYABLE_DEDUCTION,
                payment_account=acc_ap,
                notes=f"Supplier debit note return #{i} - quality discrepancy",
                created_by=admin_user,
            )
            PurchaseReturnItem.objects.create(
                purchase_return=pret,
                purchase_item=p_item,
                product=p_item.product,
                quantity=ret_qty,
                unit_rate=p_item.purchase_rate,
                subtotal=ret_amount,
            )
            StockMovement.objects.create(
                product=p_item.product,
                movement_type=MovementType.PURCHASE_RETURN,
                quantity=-ret_qty,
                unit_cost=p_item.purchase_rate,
                reference_type="PURCHASE_RETURN",
                reference_id=ret_number,
                notes=f"Return to {parent_purchase.supplier.name} ({ret_number})",
                created_by=admin_user,
            )

            # GL: DR 2010 Accounts Payable / CR 1040 Inventory Asset
            je = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=ret_date,
                reference_type=ReferenceType.PURCHASE_RETURN,
                reference_id=ret_number,
                narration=f"Purchase Return to {parent_purchase.supplier.name} ({ret_number})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je, account=acc_ap, debit=ret_amount, credit=Decimal("0.00"), description="Payable reduction (Debit Note)")
            JournalItem.objects.create(journal_entry=je, account=acc_inventory, debit=Decimal("0.00"), credit=ret_amount, description="Inventory returned to vendor")

        # Step 7: 500 Supplier Payments (Disbursements reducing Accounts Payable)
        self.stdout.write("\n[Step 7/14] Generating 500 Supplier Payment Vouchers...")
        for i in range(1, 501):
            supplier = suppliers_list[(i - 1) % len(suppliers_list)]
            pay_date = get_date_for_step(i - 1, 500)
            pay_number = f"SPAY-{i:05d}"
            amount = Decimal(str(random.randint(15, 60) * 100))
            pay_acc = acc_bank if (i % 2 == 0) else acc_cash

            SupplierPayment.objects.create(
                payment_number=pay_number,
                supplier=supplier,
                date=pay_date,
                amount=amount,
                payment_method=SupplierPaymentMethodType.BANK if pay_acc == acc_bank else SupplierPaymentMethodType.CASH,
                payment_account=pay_acc,
                status=SupplierPaymentStatus.SUBMITTED,
                reference=f"TXN-VEND-{pay_date.strftime('%Y%m')}-{i:04d}",
                notes=f"Vendor balance settlement voucher #{i}",
                created_by=admin_user,
            )

            # GL: DR 2010 Accounts Payable / CR Bank/Cash
            je = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=pay_date,
                reference_type=ReferenceType.SUPPLIER_PAYMENT,
                reference_id=pay_number,
                narration=f"Supplier Payment to {supplier.name} ({pay_number})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je, account=acc_ap, debit=amount, credit=Decimal("0.00"), description=f"AP cleared for {supplier.name}")
            JournalItem.objects.create(journal_entry=je, account=pay_acc, debit=Decimal("0.00"), credit=amount, description="Cash/Bank outflow")

        # Step 8: Daily POS Day Sessions (Jan 1, 2026 to Sep 2, 2026)
        self.stdout.write(f"\n[Step 8/14] Generating {total_days} consecutive POS Day Sessions & Audit Registers...")
        sessions_map: Dict[date, POSDaySession] = {}
        for day_idx in range(total_days):
            sess_date = timeline_start + timedelta(days=day_idx)
            sess_num = f"DS-{sess_date.strftime('%Y%m%d')}"
            open_dt = timezone.make_aware(datetime.combine(sess_date, time(8, 30)))
            close_dt = timezone.make_aware(datetime.combine(sess_date, time(22, 30)))
            is_today = (sess_date == timeline_end)

            sess = POSDaySession.objects.create(
                session_number=sess_num,
                date=sess_date,
                status=DaySessionStatus.OPEN if is_today else DaySessionStatus.CLOSED,
                opening_cash=Decimal("10000.00"),
                opened_by=admin_user,
                opened_at=open_dt,
                closed_by=admin_user if not is_today else None,
                closed_at=close_dt if not is_today else None,
                closing_notes="Standard daily store closing audit verified." if not is_today else None,
            )
            sessions_map[sess_date] = sess

        # Step 9: 550 POS Sales Invoices (Cash, Card, Credit, Split)
        self.stdout.write("\n[Step 9/14] Generating 550 POS Retail Sales Invoices with COGS & Inventory Deductions...")
        sales_pool: List[Sale] = []
        for i in range(1, 551):
            s_date = get_date_for_step(i - 1, 550)
            inv_number = f"INV-{i:05d}"
            # Distribution: 60% Walk-in, 40% Registered
            is_walkin_sale = (i % 5 != 0)
            customer = walkin if is_walkin_sale else customers_list[1 + (i % (len(customers_list) - 1))]

            # Choose 1 to 3 products
            chosen_prods = random.sample(products_list, k=random.randint(1, 3))
            subtotal = Decimal("0.00")
            total_cogs = Decimal("0.00")
            line_items_data = []

            for prod in chosen_prods:
                qty = Decimal(str(random.randint(1, 4)))
                u_price = prod.selling_price
                u_cost = prod.purchase_price
                line_sub = qty * u_price
                line_c = qty * u_cost
                subtotal += line_sub
                total_cogs += line_c
                w_days = prod.warranty_period_days
                w_exp = s_date + timedelta(days=w_days) if w_days > 0 else None
                line_items_data.append((prod, qty, u_price, u_cost, line_sub, w_days, w_exp))

            grand_total = subtotal

            # Payment method selection
            if is_walkin_sale:
                pmethod = PaymentMethodType.CASH if (i % 3 != 0) else PaymentMethodType.CARD
                paid_amt = grand_total
                due_amt = Decimal("0.00")
            else:
                # Registered customer credit / split option
                mod = i % 4
                if mod == 0:
                    pmethod = PaymentMethodType.CREDIT
                    paid_amt = Decimal("0.00")
                    due_amt = grand_total
                elif mod == 1:
                    pmethod = PaymentMethodType.SPLIT
                    paid_amt = (grand_total * Decimal("0.50")).quantize(Decimal("0.01"))
                    due_amt = grand_total - paid_amt
                elif mod == 2:
                    pmethod = PaymentMethodType.CARD
                    paid_amt = grand_total
                    due_amt = Decimal("0.00")
                else:
                    pmethod = PaymentMethodType.CASH
                    paid_amt = grand_total
                    due_amt = Decimal("0.00")

            sale = Sale.objects.create(
                invoice_number=inv_number,
                customer=customer,
                date=s_date,
                status=SaleStatus.COMPLETED,
                subtotal=subtotal,
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("0.00"),
                grand_total=grand_total,
                paid_amount=paid_amt,
                change_amount=Decimal("0.00"),
                due_amount=due_amt,
                payment_method=pmethod,
                payment_account=acc_cash if pmethod == PaymentMethodType.CASH else (acc_card if pmethod == PaymentMethodType.CARD else None),
                created_by=admin_user,
            )
            sale_dt = timezone.make_aware(datetime.combine(s_date, time(9 + (i % 12), (i * 7) % 60, (i * 13) % 60)))
            Sale.objects.filter(id=sale.id).update(created_at=sale_dt)
            sales_pool.append(sale)

            # Create sale items & stock movements
            for prod, qty, u_price, u_cost, line_sub, w_days, w_exp in line_items_data:
                SaleItem.objects.create(
                    sale=sale,
                    product=prod,
                    quantity=qty,
                    unit_price=u_price,
                    unit_cost=u_cost,
                    discount=Decimal("0.00"),
                    subtotal=line_sub,
                    warranty_period_days_snapshot=w_days,
                    warranty_expiry_date=w_exp,
                    returned_quantity=Decimal("0.00"),
                )
                StockMovement.objects.create(
                    product=prod,
                    movement_type=MovementType.SALE,
                    quantity=-qty,
                    unit_cost=u_cost,
                    reference_type="SALE",
                    reference_id=inv_number,
                    notes=f"POS Sale to {customer.name} ({inv_number})",
                    created_by=admin_user,
                )

            # Payment records
            if pmethod == PaymentMethodType.CASH:
                SalePayment.objects.create(sale=sale, payment_method=PaymentMethodType.CASH, payment_account=acc_cash, amount=paid_amt)
            elif pmethod == PaymentMethodType.CARD:
                SalePayment.objects.create(sale=sale, payment_method=PaymentMethodType.CARD, payment_account=acc_card, amount=paid_amt)
            elif pmethod == PaymentMethodType.CREDIT:
                SalePayment.objects.create(sale=sale, payment_method=PaymentMethodType.CREDIT, amount=due_amt)
            elif pmethod == PaymentMethodType.SPLIT:
                SalePayment.objects.create(sale=sale, payment_method=PaymentMethodType.CASH, payment_account=acc_cash, amount=paid_amt)
                SalePayment.objects.create(sale=sale, payment_method=PaymentMethodType.CREDIT, amount=due_amt)

            # GL: Revenue
            je_rev = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=s_date,
                reference_type=ReferenceType.SALE,
                reference_id=inv_number,
                narration=f"Revenue recognition for Sale {inv_number}",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            if paid_amt > Decimal("0.00"):
                rec_acc = acc_card if pmethod == PaymentMethodType.CARD else acc_cash
                JournalItem.objects.create(journal_entry=je_rev, account=rec_acc, debit=paid_amt, credit=Decimal("0.00"), description="Sales payment received")
            if due_amt > Decimal("0.00"):
                JournalItem.objects.create(journal_entry=je_rev, account=acc_ar, debit=due_amt, credit=Decimal("0.00"), description=f"Receivable from {customer.name}")
            JournalItem.objects.create(journal_entry=je_rev, account=acc_sales_revenue, debit=Decimal("0.00"), credit=grand_total, description="Sales Revenue")

            # GL: COGS
            je_cogs = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=s_date,
                reference_type=ReferenceType.SALE,
                reference_id=f"COGS-{inv_number}",
                narration=f"COGS recognition for Sale {inv_number}",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je_cogs, account=acc_cogs, debit=total_cogs, credit=Decimal("0.00"), description="Cost of Goods Sold")
            JournalItem.objects.create(journal_entry=je_cogs, account=acc_inventory, debit=Decimal("0.00"), credit=total_cogs, description="Inventory reduction")

        # Step 10: 500 Sales Returns (Customer Refunds)
        self.stdout.write("\n[Step 10/14] Generating 500 Sales Returns & Customer Refunds...")
        for i in range(1, 501):
            parent_sale = sales_pool[(i - 1) % len(sales_pool)]
            s_item = parent_sale.items.first()
            ret_date = parent_sale.date + timedelta(days=random.randint(1, 3))
            if ret_date > timeline_end:
                ret_date = timeline_end

            ret_num = f"RET-{i:05d}"
            ret_qty = Decimal("1.00")
            ret_amt = ret_qty * s_item.unit_price
            ret_cogs = ret_qty * s_item.unit_cost

            s_item.returned_quantity += ret_qty
            s_item.save(update_fields=["returned_quantity"])

            s_ret = SalesReturn.objects.create(
                return_number=ret_num,
                original_sale=parent_sale,
                date=ret_date,
                refund_amount=ret_amt,
                reason="Customer changed mind / packaging return",
                refund_method=PaymentMethodType.CASH,
                payment_account=acc_cash,
                created_by=admin_user,
            )
            SalesReturnItem.objects.create(
                return_order=s_ret,
                sale_item=s_item,
                product=s_item.product,
                quantity=ret_qty,
                unit_price=s_item.unit_price,
                unit_cost=s_item.unit_cost,
                subtotal=ret_amt,
            )
            StockMovement.objects.create(
                product=s_item.product,
                movement_type=MovementType.SALE_RETURN,
                quantity=ret_qty,
                unit_cost=s_item.unit_cost,
                reference_type="SALES_RETURN",
                reference_id=ret_num,
                notes=f"Return from sale {parent_sale.invoice_number}",
                created_by=admin_user,
            )

            # GL: Return Revenue adjustment
            je_ret = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=ret_date,
                reference_type=ReferenceType.SALE_RETURN,
                reference_id=ret_num,
                narration=f"Sales Return & Refund ({ret_num})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je_ret, account=acc_sales_returns, debit=ret_amt, credit=Decimal("0.00"), description="Sales Return Allowances")
            JournalItem.objects.create(journal_entry=je_ret, account=acc_cash, debit=Decimal("0.00"), credit=ret_amt, description="Cash refund tendered")

            # GL: Return Inventory restock
            je_restock = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=ret_date,
                reference_type=ReferenceType.SALE_RETURN,
                reference_id=f"STK-{ret_num}",
                narration=f"Inventory restock for return {ret_num}",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je_restock, account=acc_inventory, debit=ret_cogs, credit=Decimal("0.00"), description="Merchandise returned to shelf")
            JournalItem.objects.create(journal_entry=je_restock, account=acc_cogs, debit=Decimal("0.00"), credit=ret_cogs, description="COGS adjustment")

        # Step 11: 500 Customer Payment Collections (AR Debt Recovery)
        self.stdout.write("\n[Step 11/14] Generating 500 Customer Debt Payment Collections...")
        # Customers eligible for payment (registered customers with credit)
        reg_customers = [c for c in customers_list if not c.is_walkin]
        for i in range(1, 501):
            customer = reg_customers[(i - 1) % len(reg_customers)]
            pay_date = get_date_for_step(i - 1, 500)
            pay_num = f"CPAY-{i:05d}"
            amt = Decimal(str(random.randint(5, 30) * 100))
            p_acc = acc_cash if (i % 2 == 0) else acc_bank

            CustomerPayment.objects.create(
                payment_number=pay_num,
                customer=customer,
                date=pay_date,
                amount=amt,
                payment_method="CASH" if p_acc == acc_cash else "BANK",
                payment_account=p_acc,
                reference=f"RECPT-{pay_date.strftime('%Y%m')}-{i:04d}",
                notes=f"Customer debt recovery installment #{i}",
                status=CustomerPaymentStatus.SUBMITTED,
                created_by=admin_user,
            )

            # GL: DR Cash/Bank / CR Accounts Receivable
            je = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=pay_date,
                reference_type=ReferenceType.CUSTOMER_PAYMENT,
                reference_id=pay_num,
                narration=f"Customer Payment received from {customer.name} ({pay_num})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je, account=p_acc, debit=amt, credit=Decimal("0.00"), description="Cash/Bank collection")
            JournalItem.objects.create(journal_entry=je, account=acc_ar, debit=Decimal("0.00"), credit=amt, description=f"AR cleared for {customer.name}")

        # Step 12: 500 Indirect Operating Expenses & 500 Inter-Account Fund Transfers
        self.stdout.write("\n[Step 12/14] Generating 500 Operating Expenses & 500 Account Transfers...")
        expense_accounts_cycle = [
            (acc_utilities, "Monthly Electricity & Internet Bill", Decimal("15000.00")),
            (acc_rent, "Store Retail Outlet Monthly Rent", Decimal("45000.00")),
            (acc_maintenance, "POS Hardware & Shelving Maintenance", Decimal("3500.00")),
            (acc_marketing, "Digital & Local Area Marketing Campaign", Decimal("8000.00")),
            (acc_gateway_fees, "Card Terminal Merchant Discount Rate", Decimal("2200.00")),
            (acc_entertainment, "Staff Refreshments & Tea Supplies", Decimal("1800.00")),
        ]

        for i in range(1, 501):
            exp_date = get_date_for_step(i - 1, 500)
            exp_num = f"EXP-{i:05d}"
            exp_acc, exp_desc, base_amt = expense_accounts_cycle[(i - 1) % len(expense_accounts_cycle)]
            exp_amount = (base_amt + Decimal(str(random.randint(10, 50) * 50))).quantize(Decimal("0.01"))
            pay_acc = acc_bank if (i % 2 == 0) else acc_cash

            Expense.objects.create(
                expense_number=exp_num,
                date=exp_date,
                expense_account=exp_acc,
                description=f"{exp_desc} #{i}",
                amount=exp_amount,
                payment_method="BANK" if pay_acc == acc_bank else "CASH",
                payment_account=pay_acc,
                status=ExpenseStatus.SUBMITTED,
                notes=f"Audited operational expense voucher #{i}",
                created_by=admin_user,
            )

            # GL: DR Expense / CR Cash/Bank
            je = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=exp_date,
                reference_type=ReferenceType.EXPENSE,
                reference_id=exp_num,
                narration=f"Operating Expense: {exp_desc} ({exp_num})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je, account=exp_acc, debit=exp_amount, credit=Decimal("0.00"), description=exp_desc)
            JournalItem.objects.create(journal_entry=je, account=pay_acc, debit=Decimal("0.00"), credit=exp_amount, description="Disbursement account")

        # 500 Inter-Account Fund Transfers
        for i in range(1, 501):
            trf_date = get_date_for_step(i - 1, 500)
            trf_num = f"TRF-{i:05d}"
            trf_amount = Decimal(str(random.randint(5, 40) * 1000))
            from_acc, to_acc = (acc_cash, acc_bank) if (i % 2 == 0) else (acc_bank, acc_cash)

            AccountTransfer.objects.create(
                transfer_number=trf_num,
                date=trf_date,
                from_account=from_acc,
                to_account=to_acc,
                amount=trf_amount,
                reference=f"BANK-DEP-{trf_date.strftime('%Y%m')}-{i:04d}",
                notes=f"Inter-account treasury balancing transfer #{i}",
                status=TransferStatus.SUBMITTED,
                created_by=admin_user,
            )

            # GL: DR Destination / CR Source
            je = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=trf_date,
                reference_type=ReferenceType.TRANSFER,
                reference_id=trf_num,
                narration=f"Fund Transfer from {from_acc.name} to {to_acc.name} ({trf_num})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je, account=to_acc, debit=trf_amount, credit=Decimal("0.00"), description=f"Transfer in to {to_acc.name}")
            JournalItem.objects.create(journal_entry=je, account=from_acc, debit=Decimal("0.00"), credit=trf_amount, description=f"Transfer out from {from_acc.name}")

        # Step 13: 500 Customer Warranty Claims & 500 Supplier RMA Claims
        self.stdout.write("\n[Step 13/14] Generating 500 Customer Claims & 500 Supplier RMA Batches...")
        electronics_products = [p for p in products_list if p.warranty_period_days > 0]
        if not electronics_products:
            electronics_products = products_list[:5]

        cust_claims_list = []
        for i in range(1, 501):
            c_date = get_date_for_step(i - 1, 500)
            clm_num = f"CLM-{i:05d}"
            parent_sale = sales_pool[(i - 1) % len(sales_pool)]
            s_item = parent_sale.items.first()
            prod = s_item.product
            supplier = suppliers_list[(i - 1) % len(suppliers_list)]
            customer = parent_sale.customer
            qty = Decimal("1.00")
            item_cost = prod.purchase_price

            c_claim = CustomerWarrantyClaim.objects.create(
                claim_number=clm_num,
                original_sale=parent_sale,
                sale_item=s_item,
                customer=customer,
                claimed_product=prod,
                quantity=qty,
                claim_date=c_date,
                replacement_product=prod,
                original_unit_cost=item_cost,
                replacement_unit_cost=item_cost,
                supplier=supplier,
                notes=f"Customer warranty hardware replacement claim #{i}",
                status=CustomerWarrantyClaimStatus.COMPLETED,
                created_by=admin_user,
            )
            cust_claims_list.append(c_claim)

            StockMovement.objects.create(
                product=prod,
                movement_type=MovementType.WARRANTY_REPLACEMENT,
                quantity=-qty,
                unit_cost=item_cost,
                reference_type="WARRANTY_CLAIM",
                reference_id=clm_num,
                notes=f"Warranty replacement issued to {customer.name} ({clm_num})",
                created_by=admin_user,
            )

            # GL: DR 1060 Warranty Claim Asset / CR 1040 Inventory Asset
            je = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=c_date,
                reference_type=ReferenceType.CUSTOMER_WARRANTY_CLAIM,
                reference_id=clm_num,
                narration=f"Customer Warranty Replacement Issued ({clm_num})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je, account=acc_warranty_asset, debit=item_cost, credit=Decimal("0.00"), description="Defective unit held under Warranty Claim Asset")
            JournalItem.objects.create(journal_entry=je, account=acc_inventory, debit=Decimal("0.00"), credit=item_cost, description="Replacement unit deducted from inventory")

        # 500 Supplier RMA Claims
        for i in range(1, 501):
            c_claim = cust_claims_list[i - 1]
            rma_date = c_claim.claim_date if hasattr(c_claim, "claim_date") else get_date_for_step(i - 1, 500)
            sup_clm_num = f"SUP-CLM-{i:05d}"
            item_cost = c_claim.claimed_product.purchase_price

            sup_claim = SupplierWarrantyClaim.objects.create(
                claim_number=sup_clm_num,
                supplier=c_claim.supplier,
                date=rma_date,
                total_quantity=Decimal("1.00"),
                total_valuation=item_cost,
                status=SupplierWarrantyClaimStatus.IN_PROGRESS,
                notes=f"Supplier RMA dispatch batch #{i}",
                created_by=admin_user,
            )
            SupplierWarrantyClaimItem.objects.create(
                supplier_warranty_claim=sup_claim,
                customer_warranty_claim=c_claim,
                product=c_claim.claimed_product,
                quantity=Decimal("1.00"),
                unit_cost=item_cost,
                valuation=item_cost,
            )

            # GL: DR 1070 Supplier Claim Asset / CR 1060 Warranty Claim Asset
            je = JournalEntry.objects.create(
                entry_number=next_je_number(),
                entry_date=rma_date,
                reference_type=ReferenceType.SUPPLIER_WARRANTY_CLAIM,
                reference_id=sup_clm_num,
                narration=f"Supplier RMA Batch Dispatched to {c_claim.supplier.name} ({sup_clm_num})",
                status=JournalEntryStatus.POSTED,
                created_by=admin_user,
            )
            JournalItem.objects.create(journal_entry=je, account=acc_supplier_asset, debit=item_cost, credit=Decimal("0.00"), description="RMA dispatched to vendor")
            JournalItem.objects.create(journal_entry=je, account=acc_warranty_asset, debit=Decimal("0.00"), credit=item_cost, description="Credit Warranty Claim Asset")

        # Step 14: Payroll Slips & Disbursements (Jan - Aug 2026 for all 8 staff)
        self.stdout.write("\n[Step 14/14] Generating Monthly Payroll Slips & Salary Disbursements (Jan - Aug)...")
        slip_idx = 0
        for m in range(1, 9):  # Jan to Aug
            p_date = date(2026, m, 28)
            for emp in employees_list:
                slip_idx += 1
                slip_num = f"SAL-{slip_idx:05d}"
                b_salary = emp.basic_salary
                net_sal = b_salary

                slip = SalarySlip.objects.create(
                    slip_number=slip_num,
                    employee=emp,
                    month=m,
                    year=2026,
                    payroll_period=f"2026-{m:02d}",
                    date=p_date,
                    basic_salary=b_salary,
                    allowances=Decimal("0.00"),
                    deductions=Decimal("0.00"),
                    net_salary=net_sal,
                    paid_amount=net_sal,
                    status=SalarySlipStatus.PAID,
                    notes=f"Monthly payroll settlement for {emp.full_name}",
                    created_by=admin_user,
                )

                SalaryPayment.objects.create(
                    payment_number=f"SPAY-SAL-{slip_idx:05d}",
                    salary_slip=slip,
                    employee=emp,
                    date=p_date,
                    amount=net_sal,
                    payment_method=EmployeePaymentMethod.BANK,
                    payment_account=acc_bank,
                    reference=f"SAL-TRF-{2026}-{m:02d}-{emp.id}",
                    notes=f"Direct bank salary disbursement for {emp.full_name}",
                    created_by=admin_user,
                )

                # GL: Accrual (DR 5020 Salaries Expense / CR 2030 Salaries Payable)
                je_accrual = JournalEntry.objects.create(
                    entry_number=next_je_number(),
                    entry_date=p_date,
                    reference_type=ReferenceType.PAYROLL,
                    reference_id=slip_num,
                    narration=f"Payroll Accrual for {emp.full_name} ({slip.payroll_period})",
                    status=JournalEntryStatus.POSTED,
                    created_by=admin_user,
                )
                JournalItem.objects.create(journal_entry=je_accrual, account=acc_salaries_expense, debit=net_sal, credit=Decimal("0.00"), description="Salaries Expense")
                JournalItem.objects.create(journal_entry=je_accrual, account=acc_salaries_payable, debit=Decimal("0.00"), credit=net_sal, description="Accrued Salaries Payable")

                # GL: Payout (DR 2030 Salaries Payable / CR 1020 Main Bank)
                je_payout = JournalEntry.objects.create(
                    entry_number=next_je_number(),
                    entry_date=p_date,
                    reference_type=ReferenceType.PAYROLL,
                    reference_id=f"PAY-{slip_num}",
                    narration=f"Salary Disbursement to {emp.full_name} ({slip.payroll_period})",
                    status=JournalEntryStatus.POSTED,
                    created_by=admin_user,
                )
                JournalItem.objects.create(journal_entry=je_payout, account=acc_salaries_payable, debit=net_sal, credit=Decimal("0.00"), description="Salaries Payable settlement")
                JournalItem.objects.create(journal_entry=je_payout, account=acc_bank, debit=Decimal("0.00"), credit=net_sal, description="Main Bank disbursement")

        # Step 15: Print sequence status preview
        self.stdout.write("\nValidating next document numbering previews...")
        seq_info = DocumentSequenceService.get_all_sequences_info()
        for k, info in seq_info.items():
            self.stdout.write(f"  • {info['title']:<30}: Latest #{info['current_number']} -> Next {info['next_preview']}")

        # Step 16: Mathematical Verification of Double-Entry Ledger
        total_debits = JournalItem.objects.aggregate(tot=models.Sum("debit"))["tot"] or Decimal("0.00")
        total_credits = JournalItem.objects.aggregate(tot=models.Sum("credit"))["tot"] or Decimal("0.00")
        variance = abs(total_debits - total_credits)

        elapsed = (datetime.now() - start_time).total_seconds()

        self.stdout.write(self.style.SUCCESS("\n================================================================================"))
        self.stdout.write(self.style.SUCCESS("           APEXPOS SCALE & DURABILITY SIMULATION COMPLETE!                     "))
        self.stdout.write(self.style.SUCCESS("================================================================================"))
        self.stdout.write(f"✓ Total Execution Time: {elapsed:.2f} seconds")
        self.stdout.write(f"✓ Purchases Generated: {Purchase.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Purchase Returns Generated: {PurchaseReturn.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Supplier Payments: {SupplierPayment.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ POS Sales Invoices: {Sale.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Sales Returns / Refunds: {SalesReturn.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Customer Payments (AR): {CustomerPayment.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Operational Expenses: {Expense.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Inter-Account Transfers: {AccountTransfer.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Customer Warranty Claims: {CustomerWarrantyClaim.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Supplier Warranty Claims (RMA): {SupplierWarrantyClaim.objects.count()} (Target: >=500)")
        self.stdout.write(f"✓ Daily POS Sessions: {POSDaySession.objects.count()} (Jan 1 -> Sep 2, 2026)")
        self.stdout.write(f"✓ Total Journal Entries: {JournalEntry.objects.count()} (All POSTED)")
        self.stdout.write(f"✓ Total Journal Items: {JournalItem.objects.count()}")
        self.stdout.write(f"✓ Total Debits: Rs. {total_debits:,.2f} == Total Credits: Rs. {total_credits:,.2f} (Variance: Rs. {variance:,.2f})")
        self.stdout.write(self.style.SUCCESS("================================================================================"))
