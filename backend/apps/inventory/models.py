"""
Inventory Stock Movement Ledger & Stock Adjustments.
Single source of truth for stock quantities, stock history, and inventory valuation.
"""

from decimal import Decimal
from django.db import models
from django.utils import timezone
from apps.products.models import Product
from apps.users.models import User


class MovementType(models.TextChoices):
    PURCHASE = "PURCHASE", "Purchase Stock In"
    PURCHASE_RETURN = "PURCHASE_RETURN", "Purchase Return Stock Out"
    SALE = "SALE", "Sale Stock Out"
    SALE_RETURN = "SALE_RETURN", "Sale Return Stock In"
    ADJUSTMENT_IN = "ADJUSTMENT_IN", "Stock Adjustment In"
    ADJUSTMENT_OUT = "ADJUSTMENT_OUT", "Stock Adjustment Out"
    OPENING_STOCK = "OPENING_STOCK", "Initial Opening Stock"
    WARRANTY_REPLACEMENT = "WARRANTY_REPLACEMENT", "Warranty Replacement Stock Out"
    WARRANTY_SUPPLIER_RECEIPT = "WARRANTY_SUPPLIER_RECEIPT", "Warranty Supplier Replacement Stock In"


class AdjustmentReason(models.TextChoices):
    DAMAGED = "DAMAGED", "Damaged Goods"
    LOST = "LOST", "Lost / Missing"
    FOUND = "FOUND", "Found / Discovered Stock"
    COUNTING_ERROR = "COUNTING_ERROR", "Counting / Physical Audit Mistake"
    OPENING_STOCK = "OPENING_STOCK", "Opening Stock Entry"
    EXPIRED = "EXPIRED", "Expired / Spoiled"
    OTHER = "OTHER", "Other (Requires Notes)"


class AdjustmentType(models.TextChoices):
    IN = "IN", "Increase Stock (+)"
    OUT = "OUT", "Decrease Stock (-)"


class StockMovement(models.Model):
    """
    Immutable stock ledger movement entry.
    Positive quantity represents stock IN (+).
    Negative quantity represents stock OUT (-).
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="stock_movements",
        db_index=True,
    )
    movement_type = models.CharField(max_length=30, choices=MovementType.choices, db_index=True)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Signed quantity (+ for in, - for out)",
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Transaction cost rate per unit",
    )
    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Snapshot on-hand balance after this movement",
    )
    reference_type = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    reference_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements_recorded",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"
        indexes = [
            models.Index(fields=["product", "created_at"]),
            models.Index(fields=["movement_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.product.sku} | {self.movement_type} | {self.quantity} @ Rs. {self.unit_cost}"

    def save(self, *args, **kwargs):
        if self.pk is None and (self.balance_after is None or self.balance_after == Decimal("0.00")):
            current_total = StockMovement.objects.filter(product=self.product).aggregate(t=models.Sum("quantity"))["t"] or Decimal("0.00")
            self.balance_after = current_total + self.quantity
        super().save(*args, **kwargs)

    @classmethod
    def get_current_stock(cls, product_id: int) -> float:
        """Returns total on-hand stock for a product."""
        totals = cls.objects.filter(product_id=product_id).aggregate(total=models.Sum("quantity"))
        return float(totals["total"] or 0.0)

    @classmethod
    def get_weighted_average_cost(cls, product_id: int) -> float:
        """
        Calculates Weighted Average Cost (WAC) based on positive stock incoming movements.
        """
        in_movements = cls.objects.filter(product_id=product_id, quantity__gt=0)
        total_qty = Decimal("0.00")
        total_val = Decimal("0.00")

        for m in in_movements:
            total_qty += m.quantity
            total_val += (m.quantity * m.unit_cost)

        if total_qty > Decimal("0.00"):
            return float(total_val / total_qty)

        # Fallback to product's reference purchase price
        prod = Product.objects.filter(pk=product_id).first()
        return float(prod.purchase_price) if prod else 0.0


class StockAdjustment(models.Model):
    """
    Stock adjustment header document with audit trail and mandatory reason.
    """
    adjustment_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique adjustment identifier (e.g. ADJ-2026-00001)",
    )
    date = models.DateField(default=timezone.localdate, db_index=True)
    adjustment_type = models.CharField(
        max_length=10,
        choices=AdjustmentType.choices,
        default=AdjustmentType.OUT,
        db_index=True,
    )
    reason = models.CharField(
        max_length=30,
        choices=AdjustmentReason.choices,
        default=AdjustmentReason.DAMAGED,
        db_index=True,
    )
    notes = models.TextField(blank=True, null=True)
    total_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_cost_impact = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_stock_adjustments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at", "-id"]
        verbose_name = "Stock Adjustment"
        verbose_name_plural = "Stock Adjustments"

    def __str__(self):
        return f"{self.adjustment_number} | {self.adjustment_type} | {self.reason} ({self.total_quantity} units)"


class StockAdjustmentItem(models.Model):
    """
    Line item for stock adjustment recording system vs actual count.
    """
    adjustment = models.ForeignKey(StockAdjustment, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="adjustment_items")
    system_stock = models.DecimalField(max_digits=12, decimal_places=2, help_text="System on-hand stock before adjustment")
    actual_stock = models.DecimalField(max_digits=12, decimal_places=2, help_text="Physical counted stock")
    difference_quantity = models.DecimalField(max_digits=12, decimal_places=2, help_text="Signed adjustment quantity")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        verbose_name = "Stock Adjustment Item"
        verbose_name_plural = "Stock Adjustment Items"

    def __str__(self):
        return f"{self.product.name} | Diff: {self.difference_quantity} units @ Rs. {self.unit_cost}"
