"""
Seed initial demo stock adjustments and opening inventory movements for ApexPOS Phase 6.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.products.models import Product
from apps.inventory.models import StockAdjustment
from apps.inventory.services import InventoryService

User = get_user_model()


class Command(BaseCommand):
    help = "Seed initial inventory stock adjustments"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding Inventory Stock Adjustments..."))

        admin = User.objects.filter(username="admin").first()
        if not admin:
            self.stdout.write(self.style.ERROR("Admin user not found. Please run seed_users first."))
            return

        if StockAdjustment.objects.exists():
            self.stdout.write(self.style.SUCCESS("Stock adjustments already exist. Skipping seed."))
            return

        prods = list(Product.objects.all())
        if len(prods) < 3:
            self.stdout.write(self.style.WARNING("Not enough products to seed adjustments."))
            return

        # 1. Damaged stock adjustment (OUT)
        # e.g., 2 units of product 0 damaged during shelf stocking
        p1 = prods[0]
        curr1 = InventoryService.get_product_stock(p1.id)
        if curr1 >= 2:
            InventoryService.record_stock_adjustment(
                adjustment_type="OUT",
                reason="DAMAGED",
                items_data=[{"product": p1.id, "difference_quantity": 2}],
                notes="Accidental drop damage during aisle restock",
                created_by=admin,
            )
            self.stdout.write(f"  + Seeded Damaged Stock Adjustment for '{p1.name}' (-2 units)")

        # 2. Counting error adjustment (IN)
        # e.g., 5 extra units found in back storage
        p2 = prods[1]
        InventoryService.record_stock_adjustment(
            adjustment_type="IN",
            reason="COUNTING_ERROR",
            items_data=[{"product": p2.id, "difference_quantity": 5}],
            notes="Physical inventory recount discovered 5 extra units in warehouse backroom",
            created_by=admin,
        )
        self.stdout.write(f"  + Seeded Counting Adjustment for '{p2.name}' (+5 units)")

        self.stdout.write(self.style.SUCCESS("Inventory seeding completed successfully!"))
