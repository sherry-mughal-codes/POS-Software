import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounting.models import Account, JournalItem
from apps.purchases.models import Purchase, SupplierPayment
from apps.contacts.models import Supplier
from apps.purchases.services import PurchaseService
from django.db.models import Sum

print("=" * 80)
print("ACCOUNT 2010 (Accounts Payable - Suppliers) AUDIT")
print("=" * 80)
ap_acc = Account.objects.get(code="2010")
items_2010 = JournalItem.objects.filter(account=ap_acc, journal_entry__status="POSTED").order_by("journal_entry__entry_date", "id")
tot_dr = items_2010.aggregate(s=Sum("debit"))["s"] or 0
tot_cr = items_2010.aggregate(s=Sum("credit"))["s"] or 0
net_cr = tot_cr - tot_dr
print(f"Total DR (Payments): Rs. {tot_dr}")
print(f"Total CR (Purchases): Rs. {tot_cr}")
print(f"Net Balance (CR - DR): Rs. {net_cr}")
print("\nAll Journal Items in Account 2010:")
for item in items_2010:
    je = item.journal_entry
    print(f"  {je.entry_date} | {je.entry_number} | {je.reference_type:16s} [{je.reference_id}] | DR: {item.debit:10.2f} | CR: {item.credit:10.2f} | {item.description}")

print("\n" + "=" * 80)
print("ALL SUPPLIERS AND PURCHASES SUB-LEDGER:")
print("=" * 80)
for sup in Supplier.objects.all():
    stmt = PurchaseService.get_supplier_statement(sup.id)
    purchases = Purchase.objects.filter(supplier=sup)
    payments = SupplierPayment.objects.filter(supplier=sup)
    tot_payable = sum(p.payable_amount for p in purchases)
    if tot_payable > 0 or purchases.exists() or payments.exists():
        print(f"Supplier [{sup.supplier_id}] {sup.company_name} ({sup.name}):")
        print(f"  Total Purchases Payable: Rs. {tot_payable}")
        print(f"  Statement Closing Balance: Rs. {stmt['summary']['closing_balance']}")
        for p in purchases:
            print(f"    Purchase {p.purchase_number}: Grand={p.grand_total}, Paid={p.paid_amount}, Payable={p.payable_amount}")
        for py in payments:
            print(f"    Payment {py.payment_number}: Amount={py.amount}, Status={py.status}")
