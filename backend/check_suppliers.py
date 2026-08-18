import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.contacts.models import Supplier
from apps.purchases.models import Purchase, SupplierPayment, PurchaseReturn
from apps.purchases.services import PurchaseService

print("=" * 80)
print("ALL SUPPLIERS DETAILED BREAKDOWN:")
print("=" * 80)
for sup in Supplier.objects.all():
    purchases = Purchase.objects.filter(supplier=sup)
    payments = SupplierPayment.objects.filter(supplier=sup, status='SUBMITTED')
    returns = PurchaseReturn.objects.filter(supplier=sup)
    
    tot_purch = sum(p.grand_total for p in purchases)
    tot_init = sum(p.initial_paid_amount for p in purchases)
    tot_pay = sum(py.amount for py in payments)
    tot_ret = sum(r.total_amount for r in returns)
    net_due = tot_purch - tot_ret - (tot_init + tot_pay)
    
    if purchases.exists() or payments.exists() or returns.exists():
        print(f"\nSupplier [{sup.supplier_id}] {sup.company_name} ({sup.name}):")
        print(f"  Grand Purchases: Rs. {tot_purch}")
        print(f"  Upfront Paid:    Rs. {tot_init}")
        print(f"  Voucher Paid:    Rs. {tot_pay}")
        print(f"  Total Paid:      Rs. {tot_init + tot_pay}")
        print(f"  Returns:         Rs. {tot_ret}")
        print(f"  Net Due:         Rs. {net_due}")
        for p in purchases:
            print(f"    Purchase {p.purchase_number}: Grand={p.grand_total}, InitialPaid={p.initial_paid_amount}, Paid={p.paid_amount}, Payable={p.payable_amount}")
        for py in payments:
            print(f"    Payment {py.payment_number}: Amount={py.amount}, Method={py.payment_method}")
        for r in returns:
            print(f"    Return {r.return_number}: Amount={r.total_amount}, Orig={r.original_purchase.purchase_number if r.original_purchase else 'N/A'}")
