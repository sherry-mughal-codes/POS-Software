"""
Phase 2 Automated Verification Suite for Commission Management.
Tests all 10 core constraints, GL double-entry integrity, return adjustments, and advance credit.
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from apps.core.models import SystemModule
from apps.products.models import Product, Category, Unit
from apps.contacts.models import Customer
from apps.accounting.models import Account, AccountType, JournalEntry, JournalItem, ReferenceType
from apps.accounting.services import ensure_commission_accounts, AccountingService
from apps.sales.models import Sale, SaleItem, SalesReturn, SalesReturnItem
from apps.sales.services import SalesService
from apps.commission.models import (
    SalesAgent,
    CommissionRecord,
    CommissionPayment,
    CommissionAdjustment,
    CommissionStatus,
)
from apps.commission.services import CommissionService


def run_tests():
    print("=" * 70)
    print("STARTING PHASE 2 COMMISSION MANAGEMENT AUTOMATED TESTS")
    print("=" * 70)

    # 0. Setup User & System Accounts
    user, _ = User.objects.get_or_create(username="admin_test", defaults={"is_superuser": True})
    SystemModule.objects.update_or_create(
        key="commission_management",
        defaults={"name": "Commission Management", "is_enabled": True, "is_core": False}
    )

    payable_acc, expense_acc = ensure_commission_accounts()
    print(f"[*] Commission GL Accounts: Payable={payable_acc.code} ({payable_acc.name}), Expense={expense_acc.code} ({expense_acc.name})")

    # Ensure Day Session is Open for POS Checkouts
    from apps.sales.services import DaySessionService
    active_session = DaySessionService.get_active_session()
    if not active_session:
        DaySessionService.open_day(opening_cash=Decimal("1000.00"), opened_by=user)
        print("[*] Opened POS Day Session for tests.")

    cash_acc = Account.objects.filter(code="1011").first() or Account.objects.filter(code="1010").first()
    if not cash_acc:
        asset_root = Account.objects.filter(code="1000").first()
        cash_acc = Account.objects.create(code="1011", name="Counter Cash", account_type=AccountType.ASSET, parent=asset_root, is_active=True)

    cat = Category.objects.first()
    if not cat:
        cat = Category.objects.create(name="Electronics", code="ELEC-TEST-001")
    unit = Unit.objects.first()
    if not unit:
        unit = Unit.objects.create(name="Piece", short_name="pc")
    product = Product.objects.filter(sku="TEST-PROD-001").first()
    if not product:
        product = Product.objects.create(
            sku="TEST-PROD-001",
            name="High-End Laptop",
            selling_price=Decimal("100000.00"),
            purchase_price=Decimal("70000.00"),
            unit=unit,
            category=cat,
            maintain_stock=False,
            is_active=True,
        )

    customer, _ = Customer.objects.get_or_create(
        name="Apex Test VIP Customer",
        defaults={"is_walkin": False, "credit_enabled": True, "is_active": True}
    )

    # Setup Sales Agent (5% commission)
    agent, _ = SalesAgent.objects.get_or_create(
        code="AGT-TEST-001",
        defaults={
            "name": "Hamza Tariq",
            "phone": "03001234567",
            "commission_percentage": Decimal("5.00"),
            "is_active": True,
        }
    )
    # Ensure active & 5%
    agent.commission_percentage = Decimal("5.00")
    agent.is_active = True
    agent.save()

    # -------------------------------------------------------------
    # TEST 1: Sale WITHOUT Sales Agent
    # -------------------------------------------------------------
    print("\n--- TEST 1: Sale WITHOUT Sales Agent ---")
    sale1 = SalesService.create_sale(
        customer_id=customer.id,
        items_data=[{"product": product.id, "quantity": 1, "unit_price": 100000.0, "discount": 0}],
        payment_method="CASH",
        discount_amount=Decimal("0.00"),
        paid_amount=Decimal("100000.00"),
        sales_agent_id=None,
        created_by=user,
    )
    comm1 = CommissionRecord.objects.filter(sale=sale1).first()
    assert comm1 is None, "ERROR: CommissionRecord should NOT be created when no sales agent is assigned!"
    assert sale1.sales_agent is None
    print(f"[PASSED] Sale {sale1.invoice_number} created with no sales agent. No commission record generated.")

    # -------------------------------------------------------------
    # TEST 2: Sale WITH Sales Agent & Math Verification
    # (Subtotal = 100,000, Discount = 10,000, Tax = 5,000 -> Base = 90,000 -> Commission at 5% = 4,500)
    # -------------------------------------------------------------
    print("\n--- TEST 2: Sale WITH Sales Agent & Formula Calculation ---")
    sale2 = SalesService.create_sale(
        customer_id=customer.id,
        items_data=[{"product": product.id, "quantity": 1, "unit_price": 100000.0, "discount": 0}],
        payment_method="CASH",
        discount_amount=Decimal("10000.00"),
        tax_amount=Decimal("5000.00"),
        paid_amount=Decimal("95000.00"),
        sales_agent_id=agent.id,
        created_by=user,
    )
    assert sale2.sales_agent == agent
    comm2 = CommissionRecord.objects.filter(sale=sale2).first()
    assert comm2 is not None, "ERROR: CommissionRecord was NOT created for sale with agent!"
    
    expected_base = Decimal("90000.00")  # 100,000 - 10,000
    expected_comm = Decimal("4500.00")   # 90,000 * 5%
    print(f"[*] Record #{comm2.record_number}: Base={comm2.commission_base_amount}, Rate={comm2.commission_rate_percentage}%, Comm={comm2.commission_amount}, BalanceDue={comm2.balance_due}")
    
    assert comm2.commission_base_amount == expected_base, f"Base mismatch: expected {expected_base}, got {comm2.commission_base_amount}"
    assert comm2.commission_amount == expected_comm, f"Commission mismatch: expected {expected_comm}, got {comm2.commission_amount}"
    assert comm2.balance_due == expected_comm
    assert comm2.status == CommissionStatus.UNPAID
    assert comm2.sales_agent == agent
    
    # 1-to-1 link and no duplicated sales check
    total_sales_count = Sale.objects.filter(invoice_number=sale2.invoice_number).count()
    assert total_sales_count == 1, "ERROR: Sale invoice duplicated!"
    print(f"[PASSED] Math calculation and 1-to-1 link verified accurately (Base: Rs. {expected_base}, Comm: Rs. {expected_comm}).")

    # -------------------------------------------------------------
    # TEST 3: General Ledger Accrual Verification
    # -------------------------------------------------------------
    print("\n--- TEST 3: General Ledger Accrual Verification ---")
    accrual_entry = JournalEntry.objects.filter(
        reference_type=ReferenceType.COMMISSION_ACCRUAL,
        reference_id=comm2.record_number,
    ).first()
    assert accrual_entry is not None, "ERROR: Commission accrual GL JournalEntry not found!"
    items = list(accrual_entry.lines.all())
    assert len(items) == 2, f"Expected 2 lines in accrual entry, found {len(items)}"
    
    dr_line = next(i for i in items if i.debit > 0)
    cr_line = next(i for i in items if i.credit > 0)
    
    assert dr_line.account == expense_acc, f"DR line must be Expense (5090), got {dr_line.account.code}"
    assert dr_line.debit == expected_comm, f"DR amount mismatch: {dr_line.debit}"
    assert cr_line.account == payable_acc, f"CR line must be Payable (2040), got {cr_line.account.code}"
    assert cr_line.credit == expected_comm, f"CR amount mismatch: {cr_line.credit}"
    print(f"[PASSED] GL Accrual Journal Entry #{accrual_entry.entry_number} verified: DR {dr_line.account.code} Rs. {dr_line.debit} | CR {cr_line.account.code} Rs. {cr_line.credit}")

    # -------------------------------------------------------------
    # TEST 4: Partial Payment Settlement
    # -------------------------------------------------------------
    print("\n--- TEST 4: Partial Commission Payment (Rs. 2,000 of 4,500) ---")
    pmt1 = CommissionService.pay_commission(
        commission_record_id=comm2.id,
        amount=Decimal("2000.00"),
        payment_account_id=cash_acc.id,
        created_by=user,
    )
    comm2.refresh_from_db()
    assert comm2.paid_amount == Decimal("2000.00")
    assert comm2.balance_due == Decimal("2500.00")
    assert comm2.status == CommissionStatus.PARTIALLY_PAID
    print(f"[PASSED] Partial Payment {pmt1.payment_number} posted. Balance remaining: Rs. {comm2.balance_due}, Status: {comm2.status}")

    # Check GL Entry for Payment
    pmt_gl = JournalEntry.objects.filter(
        reference_type=ReferenceType.COMMISSION_PAYMENT,
        reference_id=pmt1.payment_number,
    ).first()
    assert pmt_gl is not None, "ERROR: Commission payment GL entry missing!"
    p_dr = next(i for i in pmt_gl.lines.all() if i.debit > 0)
    p_cr = next(i for i in pmt_gl.lines.all() if i.credit > 0)
    assert p_dr.account == payable_acc, "Payment DR must be 2040 Commission Payable"
    assert p_cr.account == cash_acc, "Payment CR must be Cash Account"
    print(f"[PASSED] GL Payment Entry #{pmt_gl.entry_number} verified: DR {p_dr.account.code} Rs. {p_dr.debit} | CR {p_cr.account.code} Rs. {p_cr.credit}")

    # -------------------------------------------------------------
    # TEST 5: Overpayment Protection
    # -------------------------------------------------------------
    print("\n--- TEST 5: Overpayment Protection Check ---")
    try:
        CommissionService.pay_commission(
            commission_record_id=comm2.id,
            amount=Decimal("5000.00"),  # Exceeds remaining 2,500
            payment_account_id=cash_acc.id,
            created_by=user,
        )
        assert False, "ERROR: Overpayment did not throw ValidationError!"
    except ValidationError as e:
        print(f"[PASSED] Overpayment successfully blocked with ValidationError: {e.message if hasattr(e, 'message') else e}")

    # -------------------------------------------------------------
    # TEST 6: Sales Return Commission Reversal / Adjustment
    # (Return on sale with partial commission paid)
    # -------------------------------------------------------------
    print("\n--- TEST 6: Sales Return Commission Adjustment ---")
    # Return 1 unit of product on sale2
    sale_item2 = sale2.items.first()
    s_return = SalesService.process_sales_return(
        sale_id=sale2.id,
        items_data=[{"sale_item_id": sale_item2.id, "quantity": 1}],
        reason="Customer defective item return",
        created_by=user,
    )
    comm2.refresh_from_db()
    # On return of 100k (subtotal returned 100k, adjusted = 100k * 5% = 5,000, capped at net comm 4,500)
    print(f"[*] Post-return state: Comm={comm2.commission_amount}, Paid={comm2.paid_amount}, Adjusted={comm2.adjusted_amount}, BalanceDue={comm2.balance_due}, AdvanceCredit={comm2.advance_credit}, Status={comm2.status}")
    
    assert comm2.balance_due == Decimal("0.00"), "Balance due should be 0 after full return!"
    assert comm2.advance_credit == Decimal("2000.00"), f"Advance credit should be Rs. 2,000 (already paid), got {comm2.advance_credit}"
    assert comm2.status == CommissionStatus.ADJUSTED
    print("[PASSED] Sales Return adjustment processed cleanly with advance credit preservation.")

    # -------------------------------------------------------------
    # TEST 7: Agent Percentage Immutability Snapshot Check
    # (Changing agent's profile rate should NOT alter historical records)
    # -------------------------------------------------------------
    print("\n--- TEST 7: Historical Commission Snapshot Immutability ---")
    agent.commission_percentage = Decimal("15.00")
    agent.save()
    comm2.refresh_from_db()
    assert comm2.commission_rate_percentage == Decimal("5.00"), "Historical rate was mutated when agent profile changed!"
    print(f"[PASSED] Snapshot immutability verified (Record retains 5.00% despite agent updated to 15.00%).")

    # -------------------------------------------------------------
    # TEST 8: Global Module Switch Toggle Protection
    # -------------------------------------------------------------
    print("\n--- TEST 8: Global Module Switch Toggle Protection ---")
    mod = SystemModule.objects.get(key="commission_management")
    mod.is_enabled = False
    mod.save()

    sale3 = SalesService.create_sale(
        customer_id=customer.id,
        items_data=[{"product": product.id, "quantity": 1, "unit_price": 100000.0, "discount": 0}],
        payment_method="CASH",
        paid_amount=Decimal("100000.00"),
        sales_agent_id=agent.id,
        created_by=user,
    )
    comm3 = CommissionRecord.objects.filter(sale=sale3).first()
    assert comm3 is None, "ERROR: CommissionRecord created when module was disabled!"
    print(f"[PASSED] When commission_management is disabled, no commission record is generated and checkout succeeds.")

    # Re-enable module for production
    mod.is_enabled = True
    mod.save()

    print("\n" + "=" * 70)
    print("ALL PHASE 2 AUTOMATED INTEGRITY TESTS COMPLETED AND PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
