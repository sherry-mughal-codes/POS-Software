"""
Warranty Claim Module Service Layer.
Encapsulates all business logic, validations, stock movements, double-entry accounting,
and reporting for Customer and Supplier Warranty Claims.
"""

import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.users.models import User
from apps.products.models import Product
from apps.contacts.models import Customer, Supplier
from apps.sales.models import Sale, SaleItem, SaleStatus
from apps.purchases.models import PurchaseItem, Purchase
from apps.inventory.models import StockMovement, MovementType
from apps.inventory.services import InventoryService
from apps.accounting.models import Account, AccountType, ReferenceType, JournalEntry
from apps.accounting.services import AccountingService
from apps.warranty.models import (
    CustomerWarrantyClaim,
    CustomerWarrantyClaimStatus,
    SupplierWarrantyClaim,
    SupplierWarrantyClaimStatus,
    SupplierWarrantyClaimItem,
)


class WarrantyService:
    """Authoritative service for all warranty processing operations."""

    @staticmethod
    def _generate_customer_claim_number() -> str:
        """Generates sequential customer claim number CLM-YYYY-XXXXX."""
        year = timezone.now().year
        prefix = f"CLM-{year}-"
        last_claim = (
            CustomerWarrantyClaim.objects.filter(claim_number__startswith=prefix)
            .order_by("-claim_number")
            .first()
        )
        if last_claim and last_claim.claim_number:
            try:
                seq = int(last_claim.claim_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:05d}"

    @staticmethod
    def _generate_supplier_claim_number() -> str:
        """Generates sequential supplier claim number SUP-CLM-YYYY-XXXXX."""
        year = timezone.now().year
        prefix = f"SUP-CLM-{year}-"
        last_claim = (
            SupplierWarrantyClaim.objects.filter(claim_number__startswith=prefix)
            .order_by("-claim_number")
            .first()
        )
        if last_claim and last_claim.claim_number:
            try:
                seq = int(last_claim.claim_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:05d}"

    @staticmethod
    def suggest_supplier_for_product(product_id: int) -> Optional[Dict[str, Any]]:
        """
        Finds the most recent purchase supplier for a product to provide a smart default.
        """
        latest_pi = (
            PurchaseItem.objects.filter(
                product_id=product_id,
                purchase__status="SUBMITTED",
            )
            .select_related("purchase__supplier")
            .order_by("-purchase__date", "-id")
            .first()
        )
        if latest_pi and latest_pi.purchase and latest_pi.purchase.supplier:
            sup = latest_pi.purchase.supplier
            return {
                "id": sup.id,
                "name": sup.name,
                "company_name": sup.company_name or sup.name,
                "phone": sup.phone,
            }
        return None

    @classmethod
    def search_sale_for_warranty(cls, query_str: str) -> List[Dict[str, Any]]:
        """
        Searches sales by invoice number or customer name and enriches each item
        with live warranty eligibility, already claimed quantity, and status.
        """
        if not query_str or not query_str.strip():
            return []

        q = query_str.strip()
        sales_qs = (
            Sale.objects.filter(status=SaleStatus.COMPLETED)
            .filter(
                models.Q(invoice_number__icontains=q)
                | models.Q(customer__name__icontains=q)
                | models.Q(customer__phone__icontains=q)
            )
            .select_related("customer", "created_by")
            .prefetch_related("items__product__unit", "items__customer_warranty_claims")
            .order_by("-date", "-id")[:20]
        )

        results = []
        today = timezone.now().date()

        for sale in sales_qs:
            sale_date = sale.date if isinstance(sale.date, datetime.date) else timezone.now().date()
            items_payload = []

            for item in sale.items.all():
                prod = item.product
                w_days = item.warranty_period_days_snapshot or prod.warranty_period_days
                
                # Expiry calculation
                if item.warranty_expiry_date:
                    w_expiry = item.warranty_expiry_date
                elif w_days and w_days > 0:
                    w_expiry = sale_date + datetime.timedelta(days=w_days)
                else:
                    w_expiry = None

                # Already claimed quantity
                claimed_qty = item.customer_warranty_claims.filter(
                    status=CustomerWarrantyClaimStatus.COMPLETED
                ).aggregate(tot=models.Sum("quantity"))["tot"] or Decimal("0.00")

                remaining_qty = max(Decimal("0.00"), item.quantity - claimed_qty)

                # Determine status
                if not w_days or w_days <= 0:
                    warranty_status = "NO_WARRANTY"
                    warranty_status_label = "No Warranty"
                    is_eligible = False
                elif remaining_qty <= Decimal("0.00"):
                    warranty_status = "ALREADY_CLAIMED"
                    warranty_status_label = "Already Claimed"
                    is_eligible = False
                elif w_expiry and w_expiry < today:
                    warranty_status = "EXPIRED"
                    warranty_status_label = "Warranty Expired"
                    is_eligible = False
                else:
                    warranty_status = "ACTIVE"
                    warranty_status_label = "Warranty Active"
                    is_eligible = True

                suggested_supplier = cls.suggest_supplier_for_product(prod.id)
                current_stock = float(InventoryService.get_product_stock(prod.id)) if prod.maintain_stock else 9999.0

                items_payload.append({
                    "id": item.id,
                    "product_id": prod.id,
                    "product_name": prod.name,
                    "product_sku": prod.sku,
                    "unit_name": prod.unit.name if prod.unit else "Piece",
                    "quantity_sold": float(item.quantity),
                    "unit_price": float(item.unit_price),
                    "unit_cost": float(item.unit_cost),
                    "warranty_period_days": w_days,
                    "warranty_expiry_date": str(w_expiry) if w_expiry else None,
                    "claimed_quantity": float(claimed_qty),
                    "remaining_claimable_quantity": float(remaining_qty),
                    "warranty_status": warranty_status,
                    "warranty_status_label": warranty_status_label,
                    "is_eligible": is_eligible,
                    "suggested_supplier": suggested_supplier,
                    "current_stock": current_stock,
                })

            results.append({
                "id": sale.id,
                "invoice_number": sale.invoice_number,
                "date": str(sale.date),
                "customer_id": sale.customer.id if sale.customer else None,
                "customer_name": sale.customer.name if sale.customer else "Walk-in Customer",
                "customer_phone": sale.customer.phone if sale.customer else "",
                "grand_total": float(sale.grand_total),
                "items": items_payload,
            })

        return results

    @classmethod
    @transaction.atomic
    def complete_customer_warranty_claim(
        cls,
        sale_id: int,
        sale_item_id: int,
        replacement_product_id: int,
        quantity: Decimal,
        supplier_id: int,
        notes: str = "",
        user: Optional[User] = None,
    ) -> CustomerWarrantyClaim:
        """
        Executes a complete customer warranty replacement transaction atomically:
        1. Validates sale, sale item, customer, warranty validity, claim quantity, and replacement stock.
        2. Deducts replacement product from normal inventory (MovementType.WARRANTY_REPLACEMENT).
        3. Holds defective product under Warranty Claim Asset.
        4. Creates double-entry JournalEntry: DR 1060 Warranty Claim Asset / CR 1040 Inventory Asset.
        5. Saves CustomerWarrantyClaim record.
        """
        try:
            sale = Sale.objects.select_for_update().get(id=sale_id, status=SaleStatus.COMPLETED)
        except Sale.DoesNotExist:
            raise ValidationError("Original sale invoice does not exist or is not completed.")

        try:
            sale_item = SaleItem.objects.select_for_update().get(id=sale_item_id, sale=sale)
        except SaleItem.DoesNotExist:
            raise ValidationError("Sale item line not found on this invoice.")

        customer = sale.customer
        if not customer:
            raise ValidationError("Customer record is required for warranty processing.")

        try:
            supplier = Supplier.objects.get(id=supplier_id, is_active=True)
        except Supplier.DoesNotExist:
            raise ValidationError("Authoritative supplier selection is required.")

        try:
            replacement_product = Product.objects.select_for_update().get(
                id=replacement_product_id, is_active=True
            )
        except Product.DoesNotExist:
            raise ValidationError("Replacement product does not exist or is inactive.")

        claimed_product = sale_item.product
        claim_qty = Decimal(str(quantity))
        if claim_qty <= Decimal("0.00"):
            raise ValidationError("Claim quantity must be greater than zero.")

        # Warranty validation
        today = timezone.now().date()
        sale_date = sale.date if isinstance(sale.date, datetime.date) else timezone.now().date()
        w_days = sale_item.warranty_period_days_snapshot or claimed_product.warranty_period_days

        if not w_days or w_days <= 0:
            raise ValidationError(f"Product '{claimed_product.name}' is not covered by a warranty.")

        w_expiry = sale_item.warranty_expiry_date or (sale_date + datetime.timedelta(days=w_days))
        if w_expiry < today:
            raise ValidationError(f"Warranty period for '{claimed_product.name}' expired on {w_expiry}.")

        # Concurrency / already-claimed quantity check
        already_claimed = sale_item.customer_warranty_claims.filter(
            status=CustomerWarrantyClaimStatus.COMPLETED
        ).aggregate(tot=models.Sum("quantity"))["tot"] or Decimal("0.00")

        remaining_claimable = sale_item.quantity - already_claimed
        if claim_qty > remaining_claimable:
            raise ValidationError(
                f"Claim quantity ({claim_qty}) exceeds remaining claimable quantity ({remaining_claimable})."
            )

        # Replacement product stock validation
        if replacement_product.maintain_stock:
            curr_stock = InventoryService.get_product_stock(replacement_product.id)
            if curr_stock < claim_qty:
                raise ValidationError(
                    f"Insufficient stock for replacement product '{replacement_product.name}'. "
                    f"Available: {curr_stock}, Required: {claim_qty}."
                )

        # Snapshots
        original_unit_cost = sale_item.unit_cost
        replacement_unit_cost = replacement_product.purchase_price

        claim_number = cls._generate_customer_claim_number()

        # 1. Stock Movement: Decrease replacement product stock
        if replacement_product.maintain_stock:
            curr_stock = InventoryService.get_product_stock(replacement_product.id)
            balance_after = curr_stock - claim_qty
            StockMovement.objects.create(
                product=replacement_product,
                movement_type=MovementType.WARRANTY_REPLACEMENT,
                quantity=-claim_qty,
                unit_cost=replacement_unit_cost,
                balance_after=balance_after,
                reference_type="CUSTOMER_WARRANTY_CLAIM",
                reference_id=claim_number,
                notes=f"Replacement issued for Customer Claim {claim_number} (Defective: {claimed_product.name})",
                created_by=user,
            )

        # 2. Accounting Double-Entry Journal Entry
        total_valuation = (claim_qty * replacement_unit_cost).quantize(Decimal("0.01"))
        journal_entry = None

        if total_valuation > Decimal("0.00"):
            try:
                warranty_asset_acc = (
                    Account.objects.filter(code="1060").first()
                    or Account.objects.filter(name__icontains="warranty claim asset").first()
                )
                inv_asset_acc = (
                    Account.objects.filter(code="1040").first()
                    or Account.objects.filter(name__icontains="inventory asset").first()
                )

                if warranty_asset_acc and inv_asset_acc:
                    journal_entry = AccountingService.create_journal_entry(
                        entry_date=today,
                        reference_type=ReferenceType.CUSTOMER_WARRANTY_CLAIM,
                        reference_id=claim_number,
                        lines=[
                            {
                                "account": warranty_asset_acc,
                                "debit": total_valuation,
                                "credit": Decimal("0.00"),
                                "description": f"Defective asset intake: {claimed_product.name} ({claim_qty} pcs @ Rs. {replacement_unit_cost:,.2f})",
                            },
                            {
                                "account": inv_asset_acc,
                                "debit": Decimal("0.00"),
                                "credit": total_valuation,
                                "description": f"Replacement inventory issued: {replacement_product.name} ({claim_qty} pcs @ Rs. {replacement_unit_cost:,.2f})",
                            },
                        ],
                        narration=f"Customer Warranty Claim: {claim_number} for {customer.name} (Invoice #{sale.invoice_number})",
                        created_by=user,
                    )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error creating journal entry for warranty claim {claim_number}: {e}")
                raise ValidationError(f"Accounting posting failed: {e}")

        # 3. Create CustomerWarrantyClaim record
        claim = CustomerWarrantyClaim.objects.create(
            claim_number=claim_number,
            original_sale=sale,
            sale_item=sale_item,
            customer=customer,
            claimed_product=claimed_product,
            supplier=supplier,
            replacement_product=replacement_product,
            quantity=claim_qty,
            claim_date=today,
            warranty_expiry_date=w_expiry,
            original_unit_cost=original_unit_cost,
            replacement_unit_cost=replacement_unit_cost,
            status=CustomerWarrantyClaimStatus.COMPLETED,
            journal_entry=journal_entry,
            notes=notes,
            created_by=user,
            completed_at=timezone.now(),
        )

        return claim

    @staticmethod
    def get_available_supplier_claim_items(supplier_id: int) -> List[Dict[str, Any]]:
        """
        Retrieves all completed customer warranty claims for a supplier that are currently
        held in Warranty Claim Asset and have not been fully processed into a supplier claim batch.
        """
        claims = (
            CustomerWarrantyClaim.objects.filter(
                supplier_id=supplier_id,
                status=CustomerWarrantyClaimStatus.COMPLETED,
            )
            .select_related("original_sale", "customer", "claimed_product", "replacement_product")
            .order_by("claim_date", "id")
        )

        available_items = []
        for c in claims:
            rem_qty = c.remaining_supplier_claimable_quantity
            if rem_qty > Decimal("0.00"):
                val = (rem_qty * c.replacement_unit_cost).quantize(Decimal("0.01"))
                available_items.append({
                    "customer_warranty_claim_id": c.id,
                    "claim_number": c.claim_number,
                    "invoice_number": c.original_sale.invoice_number,
                    "customer_name": c.customer.name,
                    "product_id": c.claimed_product.id,
                    "product_name": c.claimed_product.name,
                    "product_sku": c.claimed_product.sku,
                    "claim_date": str(c.claim_date),
                    "warranty_expiry_date": str(c.warranty_expiry_date) if c.warranty_expiry_date else None,
                    "total_claim_quantity": float(c.quantity),
                    "available_quantity": float(rem_qty),
                    "unit_cost": float(c.replacement_unit_cost),
                    "valuation": float(val),
                })

        return available_items

    @classmethod
    @transaction.atomic
    def process_supplier_warranty_claim(
        cls,
        supplier_id: int,
        items_data: List[Dict[str, Any]],
        notes: str = "",
        user: Optional[User] = None,
    ) -> SupplierWarrantyClaim:
        """
        Dispatches defective items from Warranty Claim Asset to Supplier Claim Asset:
        1. Validates selected claims and quantities against current held assets.
        2. Creates SupplierWarrantyClaim (IN_PROGRESS) and child line items.
        3. Double-entry JournalEntry: DR 1070 Supplier Claim Asset / CR 1060 Warranty Claim Asset.
        """
        try:
            supplier = Supplier.objects.get(id=supplier_id, is_active=True)
        except Supplier.DoesNotExist:
            raise ValidationError("Valid active supplier is required.")

        if not items_data:
            raise ValidationError("At least one warranty claim item must be selected for supplier dispatch.")

        claim_number = cls._generate_supplier_claim_number()
        today = timezone.now().date()

        total_quantity = Decimal("0.00")
        total_valuation = Decimal("0.00")
        validated_items = []

        for item in items_data:
            c_id = item.get("customer_warranty_claim_id")
            req_qty = Decimal(str(item.get("quantity", "0.00")))
            if req_qty <= Decimal("0.00"):
                continue

            try:
                cust_claim = (
                    CustomerWarrantyClaim.objects.select_for_update()
                    .select_related("claimed_product")
                    .get(id=c_id, supplier=supplier, status=CustomerWarrantyClaimStatus.COMPLETED)
                )
            except CustomerWarrantyClaim.DoesNotExist:
                raise ValidationError(f"Customer claim #{c_id} not found or does not belong to supplier {supplier.name}.")

            rem_qty = cust_claim.remaining_supplier_claimable_quantity
            if req_qty > rem_qty:
                raise ValidationError(
                    f"Selected quantity ({req_qty}) for claim {cust_claim.claim_number} exceeds available held quantity ({rem_qty})."
                )

            item_val = (req_qty * cust_claim.replacement_unit_cost).quantize(Decimal("0.01"))
            total_quantity += req_qty
            total_valuation += item_val

            validated_items.append({
                "cust_claim": cust_claim,
                "product": cust_claim.claimed_product,
                "quantity": req_qty,
                "unit_cost": cust_claim.replacement_unit_cost,
                "valuation": item_val,
            })

        if not validated_items:
            raise ValidationError("No valid item quantities to process.")

        # Create Header
        batch = SupplierWarrantyClaim.objects.create(
            claim_number=claim_number,
            supplier=supplier,
            date=today,
            status=SupplierWarrantyClaimStatus.IN_PROGRESS,
            total_quantity=total_quantity,
            total_valuation=total_valuation,
            notes=notes,
            created_by=user,
            processed_at=timezone.now(),
        )

        # Create Items
        for vi in validated_items:
            SupplierWarrantyClaimItem.objects.create(
                supplier_warranty_claim=batch,
                customer_warranty_claim=vi["cust_claim"],
                product=vi["product"],
                quantity=vi["quantity"],
                unit_cost=vi["unit_cost"],
                valuation=vi["valuation"],
            )

        # Accounting: Transfer from Warranty Claim Asset to Supplier Claim Asset
        if total_valuation > Decimal("0.00"):
            try:
                warranty_asset_acc = (
                    Account.objects.filter(code="1060").first()
                    or Account.objects.filter(name__icontains="warranty claim asset").first()
                )
                supplier_asset_acc = (
                    Account.objects.filter(code="1070").first()
                    or Account.objects.filter(name__icontains="supplier claim asset").first()
                )

                if warranty_asset_acc and supplier_asset_acc:
                    journal_entry = AccountingService.create_journal_entry(
                        entry_date=today,
                        reference_type=ReferenceType.SUPPLIER_WARRANTY_CLAIM,
                        reference_id=claim_number,
                        lines=[
                            {
                                "account": supplier_asset_acc,
                                "debit": total_valuation,
                                "credit": Decimal("0.00"),
                                "description": f"Warranty claim dispatched to supplier {supplier.name} ({total_quantity} pcs)",
                            },
                            {
                                "account": warranty_asset_acc,
                                "debit": Decimal("0.00"),
                                "credit": total_valuation,
                                "description": f"Warranty claim asset dispatched for batch {claim_number}",
                            },
                        ],
                        narration=f"Supplier Warranty Claim Dispatch: {claim_number} to {supplier.name}",
                        created_by=user,
                    )
                    batch.dispatch_journal_entry = journal_entry
                    batch.save(update_fields=["dispatch_journal_entry"])
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error creating journal entry for supplier dispatch {claim_number}: {e}")
                raise ValidationError(f"Accounting posting failed: {e}")

        return batch

    @classmethod
    @transaction.atomic
    def complete_supplier_warranty_claim(
        cls,
        claim_id: int,
        user: Optional[User] = None,
    ) -> SupplierWarrantyClaim:
        """
        Completes a supplier warranty claim when replacement goods are received:
        1. Restocks replacement goods into saleable inventory (MovementType.WARRANTY_SUPPLIER_RECEIPT).
        2. Double-entry JournalEntry: DR 1040 Inventory Asset / CR 1070 Supplier Claim Asset.
        3. Updates status to WARRANTY_COMPLETED.
        """
        try:
            batch = SupplierWarrantyClaim.objects.select_for_update().get(
                id=claim_id, status=SupplierWarrantyClaimStatus.IN_PROGRESS
            )
        except SupplierWarrantyClaim.DoesNotExist:
            raise ValidationError("Supplier warranty claim not found or is not currently in progress.")

        today = timezone.now().date()

        # 1. Stock In: Add replacement goods to inventory
        for item in batch.items.select_related("product").all():
            prod = item.product
            if prod.maintain_stock:
                curr_stock = InventoryService.get_product_stock(prod.id)
                balance_after = curr_stock + item.quantity
                StockMovement.objects.create(
                    product=prod,
                    movement_type=MovementType.WARRANTY_SUPPLIER_RECEIPT,
                    quantity=item.quantity,
                    unit_cost=item.unit_cost,
                    balance_after=balance_after,
                    reference_type="SUPPLIER_WARRANTY_CLAIM",
                    reference_id=batch.claim_number,
                    notes=f"Supplier replacement received for batch {batch.claim_number} from {batch.supplier.name}",
                    created_by=user,
                )

        # 2. Accounting: DR 1040 Inventory Asset / CR 1070 Supplier Claim Asset
        if batch.total_valuation > Decimal("0.00"):
            try:
                inv_asset_acc = (
                    Account.objects.filter(code="1040").first()
                    or Account.objects.filter(name__icontains="inventory asset").first()
                )
                supplier_asset_acc = (
                    Account.objects.filter(code="1070").first()
                    or Account.objects.filter(name__icontains="supplier claim asset").first()
                )

                if inv_asset_acc and supplier_asset_acc:
                    journal_entry = AccountingService.create_journal_entry(
                        entry_date=today,
                        reference_type=ReferenceType.SUPPLIER_WARRANTY_CLAIM,
                        reference_id=batch.claim_number,
                        lines=[
                            {
                                "account": inv_asset_acc,
                                "debit": batch.total_valuation,
                                "credit": Decimal("0.00"),
                                "description": f"Replacement merchandise received from supplier {batch.supplier.name} ({batch.total_quantity} pcs)",
                            },
                            {
                                "account": supplier_asset_acc,
                                "debit": Decimal("0.00"),
                                "credit": batch.total_valuation,
                                "description": f"Supplier claim asset settled upon replacement receipt ({batch.claim_number})",
                            },
                        ],
                        narration=f"Supplier Warranty Replacement Received: {batch.claim_number} from {batch.supplier.name}",
                        created_by=user,
                    )
                    batch.completion_journal_entry = journal_entry
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error creating journal entry for supplier completion {batch.claim_number}: {e}")
                raise ValidationError(f"Accounting posting failed: {e}")

        batch.status = SupplierWarrantyClaimStatus.WARRANTY_COMPLETED
        batch.completed_at = timezone.now()
        batch.save()

        return batch

    @staticmethod
    def get_warranty_dashboard_metrics() -> Dict[str, float]:
        """
        Computes authoritative warranty metrics for the dashboard cards:
        - warranty_claim_units: Total units currently held in Warranty Claim Asset.
        - warranty_claim_valuation: Total cost valuation of units currently held in Warranty Claim Asset.
        """
        completed_claims = CustomerWarrantyClaim.objects.filter(
            status=CustomerWarrantyClaimStatus.COMPLETED
        )

        total_held_units = Decimal("0.00")
        total_held_valuation = Decimal("0.00")

        for claim in completed_claims:
            rem = claim.remaining_supplier_claimable_quantity
            if rem > Decimal("0.00"):
                total_held_units += rem
                total_held_valuation += (rem * claim.replacement_unit_cost)

        return {
            "warranty_claim_units": float(total_held_units),
            "warranty_claim_valuation": float(total_held_valuation.quantize(Decimal("0.01"))),
        }
