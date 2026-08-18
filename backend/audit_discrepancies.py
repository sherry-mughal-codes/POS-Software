import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.contacts.models import Customer, Supplier, CustomerPayment
from apps.contacts.services import CustomerReceivableService
from apps.sales.models import Sale, SalesReturn
from apps.purchases.models import Purchase, SupplierPayment, PurchaseReturn
from apps.purchases.services import PurchaseService
from django.db.models import Sum

print("=" * 80)
print("ITEM 2: CUSTOMERS & RECEIVABLES AUDIT")
print("=" * 80)
print(f"Total Sales Invoices Count: {Sale.objects.count()}")
for c in Customer.objects.all():
    stmt = CustomerReceivableService.get_customer_statement(c.id)
    sales = Sale.objects.filter(customer=c)
    payments = CustomerPayment.objects.filter(customer=c)
    returns = SalesReturn.objects.filter(original_sale__customer=c)
    
    tot_invoiced = sum(s.grand_total for s in sales if s.due_amount > 0 or s.payment_method == 'CREDIT')
    all_invoiced = sum(s.grand_total for s in sales)
    tot_paid = sum(p.amount for p in payments)
    tot_ret = sum(r.refund_amount for r in returns)
    
    print(f"\nCustomer [{c.customer_id}] {c.name}:")
    print(f"  Summary: {stmt['summary']}")
    print(f"  All Invoices Total: {all_invoiced}, Credit Invoices Total: {tot_invoiced}, Payments Total: {tot_paid}, Returns: {tot_ret}")
    for s in sales:
        print(f"    Sale {s.invoice_number} | Grand: {s.grand_total} | Paid: {s.paid_amount} | Due: {s.due_amount} | Method: {s.payment_method}")
    for p in payments:
        print(f"    Payment {p.payment_number} | Amount: {p.amount} | Status: {p.status} | Date: {p.date}")
    for r in returns:
        print(f"    Return {r.return_number} | Amount: {r.refund_amount} | Sale: {r.original_sale.invoice_number}")

print("\n" + "=" * 80)
print("ITEM 3: PURCHASING & PAYABLES AUDIT")
print("=" * 80)
for sup in Supplier.objects.all():
    stmt = PurchaseService.get_supplier_statement(sup.id)
    purchases = Purchase.objects.filter(supplier=sup)
    payments = SupplierPayment.objects.filter(supplier=sup)
    returns = PurchaseReturn.objects.filter(supplier=sup)
    
    tot_purch = sum(p.grand_total for p in purchases)
    tot_init_paid = sum(p.initial_paid_amount for p in purchases)
    tot_vouchers = sum(py.amount for py in payments if py.status == 'SUBMITTED')
    tot_ret = sum(r.total_amount for r in returns)
    
    print(f"\nSupplier [{sup.supplier_id}] {sup.company_name} ({sup.name}):")
    print(f"  Summary: {stmt['summary']}")
    print(f"  Purchases: {tot_purch}, Upfront Paid: {tot_init_paid}, Voucher Payments: {tot_vouchers}, Total Paid: {tot_init_paid + tot_vouchers}, Returns: {tot_ret}")
    for p in purchases:
        print(f"    Purchase {p.purchase_number} | Grand: {p.grand_total} | Initial Paid: {p.initial_paid_amount} | Paid: {p.paid_amount} | Payable: {p.payable_amount} | Status: {p.status}")
    for py in payments:
        print(f"    Payment {py.payment_number} | Amount: {py.amount} | Status: {py.status} | Date: {py.date}")
    for r in returns:
        print(f"    Return {r.return_number} | Refund: {r.total_refund_amount} | Purchase: {r.purchase.purchase_number}")
