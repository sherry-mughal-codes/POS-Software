"""
Customers & Suppliers Master Data Models.
Single source of truth for all sales, purchases, receivables, and payables.
"""

from django.db import models
from django.core.exceptions import ValidationError


class Customer(models.Model):
    """
    Customer Master Record (Registered and Default Walk-in Customer).
    """
    customer_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique customer identifier (e.g. CUS-000001)",
    )
    name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=30, blank=True, null=True, db_index=True)
    email = models.EmailField(max_length=120, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    is_walkin = models.BooleanField(
        default=False,
        help_text="System flag for the single default Walk-in customer record",
    )
    credit_enabled = models.BooleanField(
        default=True,
        help_text="Whether customer is eligible for credit purchases (always False for Walk-in)",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Customer"
        verbose_name_plural = "Customers"

    def __str__(self):
        return f"[{self.customer_id}] {self.name}{' (Walk-in)' if self.is_walkin else ''}"

    def clean(self):
        # Enforce that Walk-in customer cannot have credit enabled
        if self.is_walkin:
            if self.credit_enabled:
                raise ValidationError("Credit purchases cannot be enabled for the default Walk-in Customer.")
            if not self.is_active:
                raise ValidationError("The default Walk-in Customer cannot be deactivated.")

    def save(self, *args, **kwargs):
        if self.is_walkin:
            self.credit_enabled = False
            self.is_active = True
        super().save(*args, **kwargs)


class Supplier(models.Model):
    """
    Supplier Master Record for purchasing, inventory vendor attribution, and payables.
    """
    supplier_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique supplier identifier (e.g. SUP-000001)",
    )
    name = models.CharField(max_length=150, db_index=True, help_text="Contact person / Representative name")
    company_name = models.CharField(max_length=150, blank=True, null=True, db_index=True)
    phone = models.CharField(max_length=30, blank=True, null=True, db_index=True)
    email = models.EmailField(max_length=120, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True, help_text="NTN / STRN / Tax Registration Number")
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"

    def __str__(self):
        company = f" ({self.company_name})" if self.company_name else ""
        return f"[{self.supplier_id}] {self.name}{company}"
