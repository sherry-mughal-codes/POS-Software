"""
Comprehensive Unit and Integration Tests for ApexPOS Warranty Claim Module.
"""

from decimal import Decimal
import datetime
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.users.models import User
from apps.products.models import Product, Category, Unit
from apps.contacts.models import Customer, Supplier
from apps.sales.models import Sale, SaleItem, SaleStatus
from apps.sales.services import SalesService
from apps.inventory.models import StockMovement, MovementType
from apps.accounting.models import Account, AccountType
from apps.accounting.management.commands.seed_chart_of_accounts import Command as SeedCoaCommand
from apps.warranty.models import (
    CustomerWarrantyClaim,
    CustomerWarrantyClaimStatus,
    SupplierWarrantyClaim,
    SupplierWarrantyClaimStatus,
)
from apps.warranty.services import WarrantyService


class WarrantyClaimModuleTestCase(TestCase):
    def setUp(self):
        # Run Seed Chart of Accounts
        SeedCoaCommand().handle()

        self.user = User.objects.create_user(
            username="cashier1",
            email="cashier@apexpos.local",
            password="Password123!",
            is_staff=True,
        )

        self.category = Category.objects.create(name="Electronics", code="ELEC")
        self.unit = Unit.objects.create(name="Piece", short_code="pcs", allow_decimal=False)

        self.supplier = Supplier.objects.create(
            name="Apex Tech Supplies",
            company_name="Apex Tech Pvt Ltd",
            phone="+923001234567",
        )

        self.customer = Customer.objects.create(
            name="John Doe",
            phone="+923009876543",
        )

        # Product with 365 days warranty
        self.product_with_warranty = Product.objects.create(
            sku="PRD-GPU-001",
            name="Nvidia RTX 4070 GPU",
            category=self.category,
            unit=self.unit,
            purchase_price=Decimal("150000.00"),
            selling_price=Decimal("185000.00"),
            maintain_stock=True,
            warranty_period_days=365,
        )

        # Replacement product (same or different SKU)
        self.product_replacement = Product.objects.create(
            sku="PRD-GPU-002",
            name="Nvidia RTX 4070 Super",
            category=self.category,
            unit=self.unit,
            purchase_price=Decimal("155000.00"),
            selling_price=Decimal("190000.00"),
            maintain_stock=True,
            warranty_period_days=365,
        )

        # Opening stock for both products
        StockMovement.objects.create(
            product=self.product_with_warranty,
            movement_type=MovementType.OPENING_STOCK,
            quantity=Decimal("10.00"),
            unit_cost=Decimal("150000.00"),
            balance_after=Decimal("10.00"),
        )
        StockMovement.objects.create(
            product=self.product_replacement,
            movement_type=MovementType.OPENING_STOCK,
            quantity=Decimal("5.00"),
            unit_cost=Decimal("155000.00"),
            balance_after=Decimal("5.00"),
        )

        from apps.sales.services import DaySessionService
        DaySessionService.open_day(opening_cash=Decimal("10000.00"), opened_by=self.user)

        # Create a POS Sale
        self.sale = SalesService.create_sale(
            customer_id=self.customer.id,
            items_data=[
                {
                    "product": self.product_with_warranty.id,
                    "quantity": 2,
                    "unit_price": 185000.00,
                    "discount": 0.00,
                }
            ],
            payment_method="CASH",
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            notes="Test warranty sale",
            created_by=self.user,
        )
        self.sale_item = self.sale.items.first()

    def test_sale_item_warranty_snapshot(self):
        """Verify SaleItem captures warranty snapshot and calculates expiration date."""
        self.assertEqual(self.sale_item.warranty_period_days_snapshot, 365)
        self.assertIsNotNone(self.sale_item.warranty_expiry_date)
        expected_expiry = self.sale.date + datetime.timedelta(days=365)
        self.assertEqual(self.sale_item.warranty_expiry_date, expected_expiry)

    def test_search_sale_for_warranty(self):
        """Verify searching sale returns correct warranty eligibility and status."""
        results = WarrantyService.search_sale_for_warranty(self.sale.invoice_number)
        self.assertEqual(len(results), 1)
        found_sale = results[0]
        self.assertEqual(found_sale["invoice_number"], self.sale.invoice_number)
        self.assertEqual(len(found_sale["items"]), 1)
        item = found_sale["items"][0]
        self.assertEqual(item["warranty_status"], "ACTIVE")
        self.assertTrue(item["is_eligible"])
        self.assertEqual(item["remaining_claimable_quantity"], 2.0)

    def test_customer_warranty_claim_flow(self):
        """
        Verify end-to-end customer warranty replacement:
        - Decrements replacement stock by 1
        - Retains defective item in 1060 Warranty Claim Asset
        - Posts balanced GL entry: DR 1060 / CR 1040
        """
        initial_replacement_stock = self.product_replacement.get_current_stock()

        claim = WarrantyService.complete_customer_warranty_claim(
            sale_id=self.sale.id,
            sale_item_id=self.sale_item.id,
            replacement_product_id=self.product_replacement.id,
            quantity=Decimal("1.00"),
            supplier_id=self.supplier.id,
            notes="GPU fan bearing failure",
            user=self.user,
        )

        self.assertEqual(claim.status, CustomerWarrantyClaimStatus.COMPLETED)
        self.assertEqual(claim.quantity, Decimal("1.00"))
        self.assertTrue(claim.claim_number.startswith("CLM-"))

        # Verify replacement product stock decreased
        new_replacement_stock = self.product_replacement.get_current_stock()
        self.assertEqual(new_replacement_stock, initial_replacement_stock - Decimal("1.00"))

        # Verify stock movement entry
        last_mv = StockMovement.objects.filter(product=self.product_replacement).order_by("-id").first()
        self.assertEqual(last_mv.movement_type, MovementType.WARRANTY_REPLACEMENT)
        self.assertEqual(last_mv.quantity, Decimal("-1.00"))

        # Verify GL Journal Entry
        self.assertIsNotNone(claim.journal_entry)
        dr_line = claim.journal_entry.lines.filter(debit__gt=0).first()
        cr_line = claim.journal_entry.lines.filter(credit__gt=0).first()
        self.assertEqual(dr_line.account.code, "1060")  # Warranty Claim Asset
        self.assertEqual(cr_line.account.code, "1040")  # Inventory Asset

        # Verify remaining claimable quantity on sale item
        results = WarrantyService.search_sale_for_warranty(self.sale.invoice_number)
        item = results[0]["items"][0]
        self.assertEqual(item["claimed_quantity"], 1.0)
        self.assertEqual(item["remaining_claimable_quantity"], 1.0)

    def test_prevent_over_claiming(self):
        """Verify that claims exceeding remaining purchased quantity are rejected."""
        WarrantyService.complete_customer_warranty_claim(
            sale_id=self.sale.id,
            sale_item_id=self.sale_item.id,
            replacement_product_id=self.product_replacement.id,
            quantity=Decimal("2.00"),
            supplier_id=self.supplier.id,
            user=self.user,
        )

        # Attempt to claim 1 more when remaining is 0
        with self.assertRaises(ValidationError):
            WarrantyService.complete_customer_warranty_claim(
                sale_id=self.sale.id,
                sale_item_id=self.sale_item.id,
                replacement_product_id=self.product_replacement.id,
                quantity=Decimal("1.00"),
                supplier_id=self.supplier.id,
                user=self.user,
            )

    def test_supplier_warranty_claim_full_lifecycle(self):
        """
        Verify Supplier Warranty Claim:
        1. Customer Claim creates held asset in 1060.
        2. Supplier Claim dispatches batch to IN_PROGRESS (DR 1070 / CR 1060).
        3. Supplier Claim completes on replacement receipt (DR 1040 / CR 1070) with MovementType.WARRANTY_SUPPLIER_RECEIPT.
        """
        cust_claim = WarrantyService.complete_customer_warranty_claim(
            sale_id=self.sale.id,
            sale_item_id=self.sale_item.id,
            replacement_product_id=self.product_replacement.id,
            quantity=Decimal("1.00"),
            supplier_id=self.supplier.id,
            user=self.user,
        )

        # 1. Check available items for supplier
        avail = WarrantyService.get_available_supplier_claim_items(self.supplier.id)
        self.assertEqual(len(avail), 1)
        self.assertEqual(avail[0]["customer_warranty_claim_id"], cust_claim.id)
        self.assertEqual(avail[0]["available_quantity"], 1.0)

        # 2. Dispatch to Supplier (IN_PROGRESS)
        sup_claim = WarrantyService.process_supplier_warranty_claim(
            supplier_id=self.supplier.id,
            items_data=[{"customer_warranty_claim_id": cust_claim.id, "quantity": 1.0}],
            notes="Defective GPU sent for vendor RMA",
            user=self.user,
        )
        self.assertEqual(sup_claim.status, SupplierWarrantyClaimStatus.IN_PROGRESS)
        self.assertEqual(sup_claim.total_quantity, Decimal("1.00"))
        self.assertIsNotNone(sup_claim.dispatch_journal_entry)

        dispatch_dr = sup_claim.dispatch_journal_entry.lines.filter(debit__gt=0).first()
        dispatch_cr = sup_claim.dispatch_journal_entry.lines.filter(credit__gt=0).first()
        self.assertEqual(dispatch_dr.account.code, "1070")  # Supplier Claim Asset
        self.assertEqual(dispatch_cr.account.code, "1060")  # Warranty Claim Asset

        # 3. Complete Supplier Claim (Receive Replacement)
        pre_stock = self.product_with_warranty.get_current_stock()
        completed_batch = WarrantyService.complete_supplier_warranty_claim(sup_claim.id, user=self.user)
        self.assertEqual(completed_batch.status, SupplierWarrantyClaimStatus.WARRANTY_COMPLETED)

        # Verify stock incremented via WARRANTY_SUPPLIER_RECEIPT
        post_stock = self.product_with_warranty.get_current_stock()
        self.assertEqual(post_stock, pre_stock + Decimal("1.00"))

        last_mv = StockMovement.objects.filter(product=self.product_with_warranty).order_by("-id").first()
        self.assertEqual(last_mv.movement_type, MovementType.WARRANTY_SUPPLIER_RECEIPT)
        self.assertEqual(last_mv.quantity, Decimal("1.00"))

        # Verify completion journal entry
        self.assertIsNotNone(completed_batch.completion_journal_entry)
        comp_dr = completed_batch.completion_journal_entry.lines.filter(debit__gt=0).first()
        comp_cr = completed_batch.completion_journal_entry.lines.filter(credit__gt=0).first()
        self.assertEqual(comp_dr.account.code, "1040")  # Inventory Asset
        self.assertEqual(comp_cr.account.code, "1070")  # Supplier Claim Asset

    def test_warranty_dashboard_metrics(self):
        """Verify dashboard metrics count held units and valuation in real-time."""
        cust_claim = WarrantyService.complete_customer_warranty_claim(
            sale_id=self.sale.id,
            sale_item_id=self.sale_item.id,
            replacement_product_id=self.product_replacement.id,
            quantity=Decimal("1.00"),
            supplier_id=self.supplier.id,
            user=self.user,
        )

        metrics = WarrantyService.get_warranty_dashboard_metrics()
        self.assertEqual(metrics["warranty_claim_units"], 1.0)
        self.assertGreater(metrics["warranty_claim_valuation"], 0.0)
