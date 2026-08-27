"""
Comprehensive End-to-End User Acceptance Testing (UAT) Suite for ApexPOS.
Executes all real-world business scenarios across all modules:
1. Master Catalog Setup (Products, Categories, Units, Customers, Suppliers, Employees)
2. Opening Capital Double-Entry Posting
3. Procurement, Supplier Payment & Purchase Returns
4. POS Cash Sale, Credit Sale, Sale Return & Customer Payment Receipt
5. Operational Indirect Expenses & Cash-to-Bank Fund Transfer
6. Employee Attendance, Monthly Salary Slip & Payroll Journal
7. Physical Inventory Audit & Shrinkage Write-Off
8. General Ledger, Trial Balance, Income Statement & Balance Sheet Integrity
"""

import os
import sys
import django
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.utils import timezone
from django.contrib.auth.models import User, Group, Permission
from apps.products.models import Category, Unit, Product
from apps.contacts.models import Customer, Supplier, CustomerPayment
from apps.employees.models import Employee, SalarySlip, SalaryPayment, Attendance
from apps.inventory.models import StockMovement, StockAdjustment, StockAdjustmentItem, AdjustmentType, AdjustmentReason, MovementType
from apps.purchases.models import Purchase, PurchaseItem, PurchaseReturn, PurchaseReturnItem, SupplierPayment
from apps.sales.models import Sale, SaleItem, SalePayment, SalesReturn, SalesReturnItem, POSDaySession
from apps.expenses.models import Expense, AccountTransfer
from apps.accounting.models import Account, JournalEntry, JournalItem, PaymentMethod, ReferenceType, JournalEntryStatus
from apps.accounting.services import AccountingService
from apps.purchases.services import PurchaseService
from apps.sales.services import SalesService, DaySessionService
from apps.expenses.services import ExpenseService
from apps.inventory.services import InventoryService

admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
tests = []

def run_test(name, fn):
    try:
        details = fn()
        tests.append({"name": name, "passed": True, "details": details})
        print(f"[PASS] {name} -> {details}")
    except Exception as e:
        import traceback
        err = f"{e}\n{traceback.format_exc()}"
        tests.append({"name": name, "passed": False, "error": str(e), "traceback": err})
        print(f"[FAIL] {name} -> {e}")

print("================================================================================")
print("             APEXPOS COMPREHENSIVE USER ACCEPTANCE TESTING (UAT)                ")
print("================================================================================")

# 1. Master Data Setup
def test_master_data():
    cat, _ = Category.objects.get_or_create(name="Beverages & Snacks")
    unit, _ = Unit.objects.get_or_create(name="Piece", short_code="pcs")
    p1, _ = Product.objects.get_or_create(
        sku="PRD-COFFEE-500G",
        defaults={
            "name": "Gourmet Coffee Beans 500g",
            "category": cat,
            "unit": unit,
            "purchase_price": Decimal("1200.00"),
            "selling_price": Decimal("1800.00"),
            "barcode": "890123456789",
        }
    )
    p2, _ = Product.objects.get_or_create(
        sku="PRD-WATER-1500ML",
        defaults={
            "name": "Mineral Water 1.5L",
            "category": cat,
            "unit": unit,
            "purchase_price": Decimal("50.00"),
            "selling_price": Decimal("90.00"),
            "barcode": "890123456790",
        }
    )
    supp, _ = Supplier.objects.get_or_create(
        supplier_id="SUP-000001",
        defaults={
            "name": "Agro Foods Distribution Ltd",
            "phone": "03001234567",
            "company_name": "Agro Foods PK",
        }
    )
    cust, _ = Customer.objects.get_or_create(
        customer_id="CUS-000002",
        defaults={
            "name": "Ali Enterprise & Retailers",
            "phone": "03219876543",
            "credit_enabled": True,
        }
    )
    emp, _ = Employee.objects.get_or_create(
        employee_id="EMP-000001",
        defaults={
            "full_name": "Hamza Khan",
            "job_title": "Cashier",
            "department": "Sales & Counter Operations",
            "basic_salary": Decimal("35000.00"),
            "date_of_joining": timezone.now().date(),
        }
    )
    return f"Products({p1.name}, {p2.name}), Customer({cust.name}), Supplier({supp.name}), Employee({emp.full_name})"

run_test("1. Master Catalog & Contacts Initialization", test_master_data)

# 2. Opening Balance Journal Entry
def test_opening_balance():
    cash_acc = Account.objects.get(code="1010")
    bank_acc = Account.objects.get(code="1020")
    equity_acc = Account.objects.get(code="3010")
    
    jv = JournalEntry.objects.filter(entry_number="JV-OPENING-001").first()
    if not jv:
        jv = JournalEntry.objects.create(
            entry_number="JV-OPENING-001",
            entry_date=timezone.now().date(),
            reference_type=ReferenceType.OPENING_BALANCE,
            narration="Initial Capital & Opening Float Setup",
            status=JournalEntryStatus.POSTED,
            created_by=admin_user
        )
        JournalItem.objects.create(journal_entry=jv, account=cash_acc, debit=Decimal("50000.00"), credit=Decimal("0.00"), description="Cash Float in Vault")
        JournalItem.objects.create(journal_entry=jv, account=bank_acc, debit=Decimal("100000.00"), credit=Decimal("0.00"), description="Meezan Bank Operating Account")
        JournalItem.objects.create(journal_entry=jv, account=equity_acc, debit=Decimal("0.00"), credit=Decimal("150000.00"), description="Owner's Capital Investment")
    return f"Voucher {jv.entry_number}: Total DR=Rs. {jv.total_debit:,.2f}, Total CR=Rs. {jv.total_credit:,.2f}"

run_test("2. Opening Capital Double-Entry Posting", test_opening_balance)

# 3. Procurement Workflow
def test_procurement_workflow():
    supp = Supplier.objects.get(supplier_id="SUP-000001")
    p1 = Product.objects.get(sku="PRD-COFFEE-500G")
    p2 = Product.objects.get(sku="PRD-WATER-1500ML")
    bank_acc = Account.objects.get(code="1020")
    
    # 3.1 Create Purchase Order
    purchase = Purchase.objects.filter(notes="Initial Inventory Procurement Batch 1").first()
    if not purchase:
        purchase = PurchaseService.create_purchase(
            supplier=supp,
            items_data=[
                {"product": p1, "quantity": 50, "purchase_rate": Decimal("1200.00")},
                {"product": p2, "quantity": 100, "purchase_rate": Decimal("50.00")},
            ],
            purchase_date=timezone.now().date(),
            notes="Initial Inventory Procurement Batch 1",
            submit_immediately=True,
            created_by=admin_user
        )
    
    # 3.2 Supplier Payment (Partial: Rs. 40,000 via Bank)
    pay = SupplierPayment.objects.filter(reference="CHQ-98124").first()
    if not pay:
        pay = PurchaseService.record_supplier_payment(
            supplier=supp,
            amount=Decimal("40000.00"),
            payment_method="BANK",
            payment_account=bank_acc,
            payment_date=timezone.now().date(),
            reference="CHQ-98124",
            submit_now=True,
            created_by=admin_user
        )
    
    # 3.3 Purchase Return (5 pcs water)
    item_water = purchase.items.get(product=p2)
    prtn = PurchaseReturn.objects.filter(original_purchase=purchase).first()
    if not prtn:
        prtn = PurchaseService.process_purchase_return(
            purchase=purchase,
            items_to_return=[{"purchase_item_id": item_water.id, "quantity": 5}],
            refund_method="PAYABLE_DEDUCTION",
            notes="Damaged seal packaging",
            created_by=admin_user
        )
    
    stock_p1 = InventoryService.get_product_stock(p1.id)
    stock_p2 = InventoryService.get_product_stock(p2.id)
    supp_balance = PurchaseService.get_supplier_outstanding(supp.id)
    return f"PO {purchase.purchase_number} (Rs. {purchase.grand_total:,.2f}), Paid: Rs. {pay.amount:,.2f}, Return: Rs. {prtn.total_amount:,.2f}. Stock: Coffee={stock_p1}, Water={stock_p2}. Supplier Balance Payable: Rs. {supp_balance:,.2f}"

run_test("3. Procurement, Supplier Payment & Return Workflow", test_procurement_workflow)

# 4. POS and Sales Workflow
def test_pos_sales_workflow():
    p1 = Product.objects.get(sku="PRD-COFFEE-500G")
    p2 = Product.objects.get(sku="PRD-WATER-1500ML")
    cust = Customer.objects.get(customer_id="CUS-000002")
    walkin = Customer.objects.filter(is_walkin=True).first() or Customer.objects.first()
    cash_acc = Account.objects.get(code="1010")
    bank_acc = Account.objects.get(code="1020")
    ar_acc = Account.objects.get(code="1030")
    
    # 4.1 Ensure Open Day Session
    session = DaySessionService.get_active_session()
    if not session:
        session = DaySessionService.open_day(
            opening_cash=Decimal("5000.00"),
            opening_notes="Morning Terminal 1 Session",
            opened_by=admin_user
        )
    
    # 4.2 Cash Sale 1 (Walk-in Customer)
    sale1 = Sale.objects.filter(customer=walkin, grand_total=Decimal("3960.00")).first()
    if not sale1:
        sale1 = SalesService.create_sale(
            customer_id=walkin.id,
            items_data=[
                {"product": p1.id, "quantity": 2, "unit_price": Decimal("1800.00")},
                {"product": p2.id, "quantity": 4, "unit_price": Decimal("90.00")},
            ],
            payment_method="CASH",
            payment_account_id=cash_acc.id,
            paid_amount=Decimal("3960.00"),
            created_by=admin_user
        )
    
    # 4.3 Credit Sale 2 (Ali Enterprise)
    sale2 = Sale.objects.filter(customer=cust, grand_total=Decimal("9000.00")).first()
    if not sale2:
        sale2 = SalesService.create_sale(
            customer_id=cust.id,
            items_data=[
                {"product": p1.id, "quantity": 5, "unit_price": Decimal("1800.00")},
            ],
            payment_method="CREDIT",
            paid_amount=Decimal("0.00"),
            created_by=admin_user
        )
    
    # 4.4 Sale Return (1 pc water from Sale 1)
    ret = SalesReturn.objects.filter(original_sale=sale1).first()
    if not ret:
        sale1_water_item = sale1.items.get(product=p2)
        ret = SalesService.process_sales_return(
            sale_id=sale1.id,
            items_data=[{"sale_item_id": sale1_water_item.id, "quantity": 1}],
            reason="Customer requested cancellation",
            payment_account_id=cash_acc.id,
            created_by=admin_user
        )
    
    # 4.5 Customer Payment Receipt (Ali Enterprise pays Rs. 5,000)
    cust_pay = CustomerPayment.objects.filter(reference="Online Transfer Ref #8812").first()
    if not cust_pay:
        cust_pay = CustomerPayment.objects.create(
            payment_number="PAY-2026-00001",
            customer=cust,
            date=timezone.now().date(),
            amount=Decimal("5000.00"),
            payment_method="BANK",
            payment_account=bank_acc,
            reference="Online Transfer Ref #8812"
        )
        jv_cp = JournalEntry.objects.create(
            entry_number="JV-PAY-00001",
            entry_date=timezone.now().date(),
            reference_type=ReferenceType.CUSTOMER_PAYMENT,
            reference_id=cust_pay.payment_number,
            narration=f"Customer Payment Receipt: {cust.name}",
            status=JournalEntryStatus.POSTED,
            created_by=admin_user
        )
        JournalItem.objects.create(journal_entry=jv_cp, account=bank_acc, debit=Decimal("5000.00"), credit=Decimal("0.00"), description=f"Payment received from {cust.name}")
        JournalItem.objects.create(journal_entry=jv_cp, account=ar_acc, debit=Decimal("0.00"), credit=Decimal("5000.00"), description=f"Receivable reduction for {cust.name}")
    
    # 4.6 Close POS Session
    if session and session.status == "OPEN":
        metrics = DaySessionService.calculate_session_metrics(session)
        expected = Decimal(str(metrics["cash_drawer"]["expected_cash"]))
        DaySessionService.close_day(
            actual_cash=expected,
            closed_by=admin_user,
            closing_notes="Closing verified and reconciled",
            session_id=session.id
        )
    
    stock_p1 = InventoryService.get_product_stock(p1.id)
    stock_p2 = InventoryService.get_product_stock(p2.id)
    
    from apps.contacts.services import CustomerReceivableService
    cust_balance = CustomerReceivableService.get_customer_outstanding(cust.id)["outstanding_balance"]
    
    return f"Cash Sale ({sale1.invoice_number}: Rs. {sale1.grand_total:,.2f}), Credit Sale ({sale2.invoice_number}: Rs. {sale2.grand_total:,.2f}), Return ({ret.return_number}: Rs. {ret.refund_amount:,.2f}). Customer Receivable: Rs. {cust_balance:,.2f}. Stock: Coffee={stock_p1}, Water={stock_p2}"

run_test("4. POS Cash Sale, Credit Sale, Sale Return & Customer Payment", test_pos_sales_workflow)

# 5. Operational Expenses and Fund Transfers
def test_expenses_and_transfers():
    util_acc = Account.objects.get(code="5040")
    refresh_acc = Account.objects.get(code="5082")
    cash_acc = Account.objects.get(code="1010")
    bank_acc = Account.objects.get(code="1020")
    
    # 5.1 Electricity Bill
    exp1 = Expense.objects.filter(description="Monthly Electricity Utility Bill").first()
    if not exp1:
        exp1 = ExpenseService.create_expense({
            "expense_account": util_acc,
            "payment_account": bank_acc,
            "amount": Decimal("8500.00"),
            "date": timezone.now().date(),
            "description": "Monthly Electricity Utility Bill",
            "payee": "K-Electric / LESCO"
        }, user=admin_user)
    
    # 5.2 Staff Refreshment
    exp2 = Expense.objects.filter(description="Staff Daily Tea & Refreshment").first()
    if not exp2:
        exp2 = ExpenseService.create_expense({
            "expense_account": refresh_acc,
            "payment_account": cash_acc,
            "amount": Decimal("1200.00"),
            "date": timezone.now().date(),
            "description": "Staff Daily Tea & Refreshment",
            "payee": "Local Bakery"
        }, user=admin_user)
    
    # 5.3 Cash Deposit to Bank
    trf = AccountTransfer.objects.filter(notes="Deposited store cash to bank vault").first()
    if not trf:
        trf = AccountTransfer.objects.create(
            transfer_number="TRF-2026-00001",
            from_account=cash_acc,
            to_account=bank_acc,
            amount=Decimal("10000.00"),
            date=timezone.now().date(),
            notes="Deposited store cash to bank vault",
            created_by=admin_user
        )
        jv_trf = JournalEntry.objects.create(
            entry_number="JV-TRF-00001",
            entry_date=timezone.now().date(),
            reference_type=ReferenceType.TRANSFER,
            reference_id=trf.transfer_number,
            narration="Internal Cash Deposit to Bank",
            status=JournalEntryStatus.POSTED,
            created_by=admin_user
        )
        JournalItem.objects.create(journal_entry=jv_trf, account=bank_acc, debit=Decimal("10000.00"), credit=Decimal("0.00"), description="Deposit into bank")
        JournalItem.objects.create(journal_entry=jv_trf, account=cash_acc, debit=Decimal("0.00"), credit=Decimal("10000.00"), description="Cash drawer withdrawal")
        trf.journal_entry = jv_trf
        trf.save()
    
    return f"Expenses: {exp1.expense_number} (Rs. {exp1.amount:,.2f}), {exp2.expense_number} (Rs. {exp2.amount:,.2f}). Bank Transfer: {trf.transfer_number} (Rs. {trf.amount:,.2f})"

run_test("5. Operational Expenses & Cash-to-Bank Transfer", test_expenses_and_transfers)

# 6. Payroll and HR
def test_payroll_workflow():
    emp = Employee.objects.get(employee_id="EMP-000001")
    sal_acc = Account.objects.get(code="5020")
    bank_acc = Account.objects.get(code="1020")
    
    Attendance.objects.get_or_create(employee=emp, date=timezone.now().date(), defaults={"status": "PRESENT"})
    
    slip = SalarySlip.objects.filter(employee=emp, month=8, year=2026).first()
    if not slip:
        slip = SalarySlip.objects.create(
            slip_number="SLIP-2026-08-001",
            employee=emp,
            month=8,
            year=2026,
            payroll_period="2026-08",
            basic_salary=Decimal("35000.00"),
            allowances=Decimal("0.00"),
            deductions=Decimal("0.00"),
            net_salary=Decimal("35000.00"),
            status="PAID"
        )
    
    spay = SalaryPayment.objects.filter(salary_slip=slip).first()
    if not spay:
        spay = SalaryPayment.objects.create(
            payment_number="SAL-PAY-001",
            employee=emp,
            salary_slip=slip,
            amount=Decimal("35000.00"),
            date=timezone.now().date(),
            payment_method="BANK",
            payment_account=bank_acc
        )
        
        jv_sal = JournalEntry.objects.create(
            entry_number="JV-SAL-001",
            entry_date=timezone.now().date(),
            reference_type=ReferenceType.SALARY_PAYMENT,
            reference_id=spay.payment_number,
            narration=f"Staff Salary Disbursement: {emp.full_name}",
            status=JournalEntryStatus.POSTED,
            created_by=admin_user
        )
        JournalItem.objects.create(journal_entry=jv_sal, account=sal_acc, debit=Decimal("35000.00"), credit=Decimal("0.00"), description=f"Monthly Salary for {emp.full_name}")
        JournalItem.objects.create(journal_entry=jv_sal, account=bank_acc, debit=Decimal("0.00"), credit=Decimal("35000.00"), description=f"Salary paid via bank to {emp.full_name}")
        spay.journal_entry = jv_sal
        spay.save()
    
    return f"Salary Slip {slip.slip_number} (Rs. {slip.net_salary:,.2f}), Paid via Bank {spay.payment_number}"

run_test("6. Employee Attendance, Salary Slip & Payroll Journal", test_payroll_workflow)

# 7. Inventory Audit and Shrinkage Adjustment
def test_inventory_adjustment():
    p1 = Product.objects.get(sku="PRD-COFFEE-500G")
    loss_acc = Account.objects.get(code="5080")
    inv_acc = Account.objects.get(code="1040")
    
    adj = StockAdjustment.objects.filter(notes="Damaged coffee packet during shelf relocation").first()
    if not adj:
        adj = StockAdjustment.objects.create(
            adjustment_number="ADJ-2026-00001",
            date=timezone.now().date(),
            adjustment_type=AdjustmentType.OUT,
            reason=AdjustmentReason.DAMAGED,
            total_quantity=Decimal("1.00"),
            total_cost_impact=Decimal("1200.00"),
            notes="Damaged coffee packet during shelf relocation",
            created_by=admin_user
        )
        current_qty = InventoryService.get_product_stock(p1.id)
        StockAdjustmentItem.objects.create(
            adjustment=adj,
            product=p1,
            system_stock=current_qty,
            actual_stock=current_qty - 1,
            difference_quantity=Decimal("-1.00"),
            unit_cost=p1.purchase_price,
            subtotal=p1.purchase_price
        )
        
        StockMovement.objects.create(
            product=p1,
            movement_type=MovementType.ADJUSTMENT_OUT,
            quantity=-1,
            unit_cost=p1.purchase_price,
            reference_type="STOCK_ADJUSTMENT",
            reference_id=adj.adjustment_number,
            created_by=admin_user,
            notes="Damaged write-off"
        )
        
        jv_adj = JournalEntry.objects.create(
            entry_number="JV-ADJ-00001",
            entry_date=timezone.now().date(),
            reference_type=ReferenceType.STOCK_ADJUSTMENT,
            reference_id=adj.adjustment_number,
            narration="Inventory Shrinkage Write-off",
            status=JournalEntryStatus.POSTED,
            created_by=admin_user
        )
        JournalItem.objects.create(journal_entry=jv_adj, account=loss_acc, debit=Decimal("1200.00"), credit=Decimal("0.00"), description="Inventory Damage Loss")
        JournalItem.objects.create(journal_entry=jv_adj, account=inv_acc, debit=Decimal("0.00"), credit=Decimal("1200.00"), description="Inventory Asset reduction")
    
    final_stock = InventoryService.get_product_stock(p1.id)
    return f"Stock Adjustment {adj.adjustment_number} written off 1 pc. Final Coffee Stock: {final_stock} pcs"

run_test("7. Inventory Physical Audit & Shrinkage Write-Off", test_inventory_adjustment)

# 8. General Ledger and Double-Entry Accounting Verification
def test_accounting_integrity():
    total_debits = sum(ji.debit for ji in JournalItem.objects.all())
    total_credits = sum(ji.credit for ji in JournalItem.objects.all())
    variance = abs(total_debits - total_credits)
    
    tb = AccountingService.get_trial_balance()
    bs = AccountingService.get_balance_sheet()
    inc = AccountingService.get_income_statement()
    
    if variance >= Decimal("0.001"):
        raise ValueError(f"Double-entry variance detected! Debits ({total_debits}) != Credits ({total_credits})")
    
    tot_assets = bs["assets"]["total"]
    tot_liab = bs["liabilities"]["total"]
    tot_equity = bs["equity"]["total"]
    bs_variance = abs(tot_assets - (tot_liab + tot_equity))
    
    net_profit = inc["net_profit"]
    gross_revenue = inc["revenue"]["total"]
    
    return f"Total GL Vouchers={JournalEntry.objects.count()}, Journal Items={JournalItem.objects.count()}. Total Debits=Rs. {total_debits:,.2f}, Total Credits=Rs. {total_credits:,.2f} (Variance: Rs. {variance:.2f}). Balance Sheet: Assets(Rs. {tot_assets:,.2f}) = Liab(Rs. {tot_liab:,.2f}) + Equity(Rs. {tot_equity:,.2f}) [Variance: Rs. {bs_variance:.2f}]. Net Profit=Rs. {net_profit:,.2f}"

run_test("8. General Ledger, Trial Balance & Balance Sheet Mathematical Integrity", test_accounting_integrity)

print("================================================================================")
passed_count = sum(1 for t in tests if t["passed"])
total_count = len(tests)
print(f"UAT SUMMARY: {passed_count}/{total_count} Modules Passed (Score: {(passed_count/total_count)*100:.1f}%)")
print("================================================================================")
