import os
import django
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.purchases.models import Purchase, SupplierPayment, PurchaseReturn
from apps.purchases.services import PurchaseService
from apps.accounting.models import JournalEntry, JournalItem

print("Fixing Supplier Payments...")

# 1. Fix Pak Traders SUP-PAY-2026-00003
p3 = SupplierPayment.objects.filter(payment_number="SUP-PAY-2026-00003").first()
if p3:
    print(f"Updating {p3.payment_number} from {p3.amount} to 20000.00")
    p3.amount = Decimal("20000.00")
    p3.save()
    
    # Update journal entry
    je = JournalEntry.objects.filter(reference_id=p3.payment_number).first()
    if je:
        for line in je.lines.all():
            if line.debit > 0:
                line.debit = Decimal("20000.00")
                line.save()
            if line.credit > 0:
                line.credit = Decimal("20000.00")
                line.save()
        print("Updated Journal Entry for SUP-PAY-2026-00003")

# 2. Fix Coca Cola SPAY-2026-00005 (Cancel duplicate payment)
p5 = SupplierPayment.objects.filter(payment_number="SPAY-2026-00005").first()
if p5:
    print(f"Cancelling {p5.payment_number} ({p5.amount})")
    p5.status = "CANCELLED"
    p5.save()
    
    # Clean journal entry
    je5 = JournalEntry.objects.filter(reference_id=p5.payment_number).first()
    if je5:
        je5.delete()
        print("Deleted Journal Entry for SPAY-2026-00005")

from apps.contacts.models import Supplier

for sup in Supplier.objects.all():
    PurchaseService.reallocate_supplier_payments(sup)
    print(f"Reallocated payments for {sup.company_name or sup.name}")

print("DONE!")
