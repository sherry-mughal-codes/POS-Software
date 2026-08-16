"""
Django management command to seed initial purchase orders, stock-in movements, and supplier payments.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.contacts.models import Supplier
from apps.products.models import Product
from apps.accounting.models import PaymentMethod, Account
from apps.purchases.models import Purchase
from apps.purchases.services import PurchaseService


class Command(BaseCommand):
    help = "Seeds demo purchase orders, stock movements, and supplier payments."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Seeding Purchase Orders & Supplier Transactions ==="))

        if Purchase.objects.exists():
            self.stdout.write("✓ Purchases already seeded.")
            return

        # Lookups
        supp_coca = Supplier.objects.filter(supplier_id="SUP-000001").first()
        supp_pepsi = Supplier.objects.filter(supplier_id="SUP-000002").first()
        supp_madina = Supplier.objects.filter(supplier_id="SUP-000003").first()

        prod_coke = Product.objects.filter(sku="PRD-00001").first()
        prod_pepsi = Product.objects.filter(sku="PRD-00002").first()
        prod_sprite = Product.objects.filter(sku="PRD-00003").first()
        prod_water = Product.objects.filter(sku="PRD-00004").first()
        prod_rice = Product.objects.filter(sku="PRD-00011").first()
        prod_oil = Product.objects.filter(sku="PRD-00012").first()

        pm_cash = PaymentMethod.objects.filter(code="CASH").first()
        pm_bank = PaymentMethod.objects.filter(code="BANK").first()
        acc_cash = Account.objects.filter(code="1010").first()
        acc_bank = Account.objects.filter(code="1020").first()

        # 1. Purchase 1: Fully Paid Cash Purchase from Coca-Cola
        if supp_coca and prod_coke and prod_sprite and pm_cash and acc_cash:
            p1_items = [
                {"product": prod_coke, "quantity": Decimal("100.00"), "purchase_rate": Decimal("85.00")},
                {"product": prod_sprite, "quantity": Decimal("50.00"), "purchase_rate": Decimal("75.00")},
            ]
            total1 = Decimal("100.00") * Decimal("85.00") + Decimal("50.00") * Decimal("75.00") # 12,250.00
            p1 = PurchaseService.create_purchase(
                supplier=supp_coca,
                items_data=p1_items,
                purchase_date=timezone.now().date(),
                paid_amount=total1,
                payment_method=pm_cash,
                payment_account=acc_cash,
                notes="Initial stock delivery - Paid in full via Cash",
                submit_immediately=True,
            )
            self.stdout.write(self.style.SUCCESS(f"  + Purchase 1 Submitted: {p1.purchase_number} (Rs. {p1.grand_total})"))

        # 2. Purchase 2: Partial Credit Purchase from PepsiCo
        if supp_pepsi and prod_pepsi and prod_water and pm_bank and acc_bank:
            p2_items = [
                {"product": prod_pepsi, "quantity": Decimal("80.00"), "purchase_rate": Decimal("160.00")}, # 12,800
                {"product": prod_water, "quantity": Decimal("100.00"), "purchase_rate": Decimal("60.00")}, # 6,000
            ]
            # Total 18,800. Paid 8,000. Payable 10,800
            p2 = PurchaseService.create_purchase(
                supplier=supp_pepsi,
                items_data=p2_items,
                purchase_date=timezone.now().date(),
                paid_amount=Decimal("8000.00"),
                payment_method=pm_bank,
                payment_account=acc_bank,
                notes="Beverages restocking - Partial bank transfer, balance on Net 30 terms",
                submit_immediately=True,
            )
            self.stdout.write(self.style.SUCCESS(f"  + Purchase 2 Submitted: {p2.purchase_number} (Total: Rs. {p2.grand_total}, Payable: Rs. {p2.payable_amount})"))

            # Record a standalone payment of Rs. 4,000 to PepsiCo
            spay = PurchaseService.record_supplier_payment(
                supplier=supp_pepsi,
                amount=Decimal("4000.00"),
                payment_method=pm_bank,
                payment_account=acc_bank,
                reference="FT-984210",
                notes="Partial clearance of invoice balance",
            )
            self.stdout.write(self.style.SUCCESS(f"  + Supplier Payment Recorded: {spay.payment_number} to {supp_pepsi.company_name} (Rs. {spay.amount})"))

        # 3. Purchase 3: Full Credit Purchase from Al-Madina Wholesalers
        if supp_madina and prod_rice and prod_oil and pm_cash and acc_cash:
            p3_items = [
                {"product": prod_rice, "quantity": Decimal("20.00"), "purchase_rate": Decimal("1650.00")}, # 33,000
                {"product": prod_oil, "quantity": Decimal("30.00"), "purchase_rate": Decimal("480.00")},   # 14,400
            ]
            # Total 47,400. Paid 0. Payable 47,400
            p3 = PurchaseService.create_purchase(
                supplier=supp_madina,
                items_data=p3_items,
                purchase_date=timezone.now().date(),
                paid_amount=Decimal("0.00"),
                payment_method=pm_cash,
                payment_account=acc_cash,
                notes="Bulk grain and oil delivery on credit",
                submit_immediately=True,
            )
            self.stdout.write(self.style.SUCCESS(f"  + Purchase 3 Submitted: {p3.purchase_number} (Total: Rs. {p3.grand_total}, 100% Credit)"))

        self.stdout.write(self.style.SUCCESS("=== Purchasing Seed Completed Successfully! ==="))
