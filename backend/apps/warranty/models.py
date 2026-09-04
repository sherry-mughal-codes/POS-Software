"""
Warranty Claim Module Models: Customer Warranty Claim, Supplier Warranty Claim, and Supplier Warranty Claim Items.
"""

from decimal import Decimal
from django.db import models
from django.utils import timezone
from apps.users.models import User
from apps.products.models import Product
from apps.contacts.models import Customer, Supplier
from apps.sales.models import Sale, SaleItem
from apps.accounting.models import JournalEntry


class CustomerWarrantyClaimStatus(models.TextChoices):
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class CustomerWarrantyClaim(models.Model):
    """
    Authoritative record of a customer product replacement claim under warranty.
    Defective returned product is held in Warranty Claim Asset.
    Replacement product leaves normal inventory.
    """
    claim_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique claim number (e.g. CLM-2026-00001)",
    )
    original_sale = models.ForeignKey(
        Sale,
        on_delete=models.PROTECT,
        related_name="customer_warranty_claims",
        help_text="Original POS Sale Invoice",
    )
    sale_item = models.ForeignKey(
        SaleItem,
        on_delete=models.PROTECT,
        related_name="customer_warranty_claims",
        help_text="Exact sale item line claimed",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="customer_warranty_claims",
        help_text="Customer who claimed warranty",
    )
    claimed_product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="claimed_warranty_records",
        help_text="Defective product returned by customer",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="customer_warranty_claims",
        help_text="Authoritative supplier responsible for this warranty claim",
    )
    replacement_product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="replacement_warranty_records",
        help_text="Replacement product issued to customer",
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("1.00"),
        help_text="Claimed and replaced quantity",
    )
    claim_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        help_text="Date the claim was filed",
    )
    warranty_expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Calculated warranty expiry date at moment of claim",
    )
    original_unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Unit cost / WAC of original product snapshot",
    )
    replacement_unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Unit cost / WAC of replacement product snapshot",
    )
    status = models.CharField(
        max_length=30,
        choices=CustomerWarrantyClaimStatus.choices,
        default=CustomerWarrantyClaimStatus.COMPLETED,
        db_index=True,
    )
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_warranty_claims",
        help_text="Double-entry GL Journal Entry for this warranty transaction",
    )
    notes = models.TextField(blank=True, null=True, help_text="Defect description / notes")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_warranty_claims_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-claim_date", "-created_at", "-id"]
        verbose_name = "Customer Warranty Claim"
        verbose_name_plural = "Customer Warranty Claims"

    def __str__(self):
        return f"{self.claim_number} - {self.claimed_product.name} ({self.quantity} pcs)"

    @property
    def valuation(self) -> Decimal:
        """Total asset valuation of this claim based on replacement unit cost."""
        return self.quantity * self.replacement_unit_cost

    @property
    def supplier_claimed_quantity(self) -> Decimal:
        """Total quantity of this claim already assigned to active/completed supplier claim batches."""
        total = self.supplier_claim_items.exclude(
            supplier_warranty_claim__status=SupplierWarrantyClaimStatus.CANCELLED
        ).aggregate(tot=models.Sum("quantity"))["tot"] or Decimal("0.00")
        return total

    @property
    def remaining_supplier_claimable_quantity(self) -> Decimal:
        """Quantity still held in Warranty Claim Asset and available for supplier batching."""
        if self.status != CustomerWarrantyClaimStatus.COMPLETED:
            return Decimal("0.00")
        return max(Decimal("0.00"), self.quantity - self.supplier_claimed_quantity)


class SupplierWarrantyClaimStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    WARRANTY_COMPLETED = "WARRANTY_COMPLETED", "Warranty Completed (Replacement Received)"
    CANCELLED = "CANCELLED", "Cancelled"


class SupplierWarrantyClaim(models.Model):
    """
    Batch document for dispatching warranty-held items back to the supplier
    and subsequently receiving replacement goods.
    """
    claim_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique supplier claim batch number (e.g. SUP-CLM-2026-00001)",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="supplier_warranty_claims",
        help_text="Supplier to whom defective items are sent",
    )
    date = models.DateField(default=timezone.localdate, db_index=True)
    status = models.CharField(
        max_length=30,
        choices=SupplierWarrantyClaimStatus.choices,
        default=SupplierWarrantyClaimStatus.IN_PROGRESS,
        db_index=True,
    )
    total_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total items in this supplier claim batch",
    )
    total_valuation = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total cost valuation of batch",
    )
    dispatch_journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_warranty_dispatches",
        help_text="GL entry moving asset from Warranty Claim Asset to Supplier Claim Asset",
    )
    completion_journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_warranty_completions",
        help_text="GL entry moving asset from Supplier Claim Asset to Inventory Asset upon receipt",
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_warranty_claims_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date", "-created_at", "-id"]
        verbose_name = "Supplier Warranty Claim"
        verbose_name_plural = "Supplier Warranty Claims"

    def __str__(self):
        return f"{self.claim_number} - {self.supplier.name} ({self.status})"


class SupplierWarrantyClaimItem(models.Model):
    """
    Item line within a supplier warranty claim batch, referencing the original customer warranty claim.
    """
    supplier_warranty_claim = models.ForeignKey(
        SupplierWarrantyClaim,
        on_delete=models.CASCADE,
        related_name="items",
    )
    customer_warranty_claim = models.ForeignKey(
        CustomerWarrantyClaim,
        on_delete=models.PROTECT,
        related_name="supplier_claim_items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="supplier_warranty_claim_items",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    valuation = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        verbose_name = "Supplier Warranty Claim Item"
        verbose_name_plural = "Supplier Warranty Claim Items"

    def __str__(self):
        return f"{self.product.name} x {self.quantity} (Batch: {self.supplier_warranty_claim.claim_number})"
