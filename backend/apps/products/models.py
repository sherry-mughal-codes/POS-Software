"""
Product Catalog, Category Hierarchy, and Units of Measurement models.
"""

from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError


class Category(models.Model):
    """
    Hierarchical product categories (e.g. Beverages -> Soft Drinks).
    """
    code = models.CharField(max_length=30, unique=True, db_index=True, help_text="Category code (e.g. BEV)")
    name = models.CharField(max_length=150)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        help_text="Parent category for hierarchical grouping",
    )
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name

    @property
    def product_count(self):
        return self.products.count()


class Unit(models.Model):
    """
    Standard unit of measurement (e.g. Piece, Box, Kg, Liter).
    """
    name = models.CharField(max_length=50, unique=True)
    short_code = models.CharField(max_length=15, unique=True, help_text="Abbreviation (e.g. pcs, kg, btl, box)")
    allow_decimal = models.BooleanField(
        default=False,
        help_text="Whether fractional quantities (e.g. 1.75 kg) are supported",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Unit of Measure"
        verbose_name_plural = "Units of Measure"

    def __str__(self):
        return f"{self.name} ({self.short_code})"

    @property
    def product_count(self):
        return self.products.count()


class Product(models.Model):
    """
    Canonical Product Master definition. Single source of truth across all modules.
    """
    sku = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique Stock Keeping Unit (e.g. PRD-00001)",
    )
    name = models.CharField(max_length=200, db_index=True)
    barcode = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional physical barcode / EAN for scanner",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
        help_text="Category assignment",
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        related_name="products",
        help_text="Unit of measurement",
    )
    purchase_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Default/reference cost price",
    )
    selling_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Standard default retail selling price",
    )
    min_stock_level = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("10.00"),
        help_text="Minimum threshold level for low-stock alerts",
    )
    maintain_stock = models.BooleanField(
        default=True,
        db_index=True,
        help_text="When unchecked (Do not maintain stock), this product is stock-free/service and stock levels are not restricted.",
    )
    image = models.ImageField(upload_to="products/", null=True, blank=True)
    image_url = models.URLField(max_length=500, null=True, blank=True, help_text="External / fallback image URL")
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return f"[{self.sku}] {self.name} (Rs. {self.selling_price})"

    def clean(self):
        if self.selling_price < Decimal("0.00"):
            raise ValidationError("Selling price cannot be negative.")
        if self.purchase_price < Decimal("0.00"):
            raise ValidationError("Purchase price cannot be negative.")
        # If barcode is empty string, convert to None to avoid unique constraint collisions
        if self.barcode == "":
            self.barcode = None

    def save(self, *args, **kwargs):
        if self.barcode == "":
            self.barcode = None
        super().save(*args, **kwargs)

    @property
    def cost_price(self) -> Decimal:
        """Alias for purchase_price."""
        return self.purchase_price

    def get_current_stock(self) -> Decimal:
        """Calculates current stock dynamically from stock movements."""
        if not self.maintain_stock:
            return Decimal("0.00")
        from apps.inventory.services import InventoryService
        return InventoryService.get_product_stock(self.id)

    @property
    def profit_margin_amount(self) -> Decimal:
        """Returns gross margin per unit: Selling Price - Purchase Price."""
        return Decimal(str(self.selling_price)) - Decimal(str(self.purchase_price))

    @property
    def profit_margin_percentage(self) -> float:
        """Returns markup/margin percentage."""
        sp = Decimal(str(self.selling_price))
        if sp > Decimal("0.00"):
            margin = (self.profit_margin_amount / sp) * Decimal("100.0")
            return round(float(margin), 1)
        return 0.0
