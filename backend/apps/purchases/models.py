"""
Purchases, Purchase Items, Purchase Returns, and Supplier Payments models.
"""

from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.contacts.models import Supplier
from apps.products.models import Product
from apps.accounting.models import Account, PaymentMethod


class PurchaseStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft Order"
    SUBMITTED = "SUBMITTED", "Submitted & Received"
    CANCELLED = "CANCELLED", "Cancelled"


class Purchase(models.Model):
    """
    Purchase Order header linking supplier, pricing, and accounting.
    """
    purchase_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique purchase order identifier (e.g. PUR-2026-00001)",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchases",
        db_index=True,
    )
    date = models.DateField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=PurchaseStatus.choices,
        default=PurchaseStatus.DRAFT,
        db_index=True,
    )
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    initial_paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"), help_text="Amount paid upfront at checkout")
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"), help_text="Total cumulative amount paid toward this purchase")
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchases",
    )
    payment_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_payments",
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_purchases",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Purchase Order"
        verbose_name_plural = "Purchase Orders"

    def __str__(self):
        return f"{self.purchase_number} - {self.supplier.company_name or self.supplier.name} (Rs. {self.grand_total})"

    @property
    def payable_amount(self) -> Decimal:
        """Unpaid balance on this purchase."""
        return max(Decimal("0.00"), self.grand_total - self.paid_amount)

    @property
    def is_fully_paid(self) -> bool:
        return self.paid_amount >= self.grand_total


class PurchaseItem(models.Model):
    """
    Individual line items within a purchase order storing actual historical transaction rate.
    """
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="purchase_items")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_rate = models.DecimalField(max_digits=12, decimal_places=2, help_text="Actual transaction cost rate")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    returned_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        verbose_name = "Purchase Item"
        verbose_name_plural = "Purchase Items"

    def __str__(self):
        return f"{self.product.name} ({self.quantity} x Rs. {self.purchase_rate})"

    @property
    def remaining_returnable_quantity(self) -> Decimal:
        return max(Decimal("0.00"), self.quantity - self.returned_quantity)


class RefundMethod(models.TextChoices):
    PAYABLE_DEDUCTION = "PAYABLE_DEDUCTION", "Deduct from Supplier Payable"
    CASH_REFUND = "CASH_REFUND", "Immediate Cash / Bank Refund"


class PurchaseReturn(models.Model):
    """
    Purchase return document referencing an original purchase.
    """
    return_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique return number (e.g. PRTN-2026-00001)",
    )
    original_purchase = models.ForeignKey(
        Purchase,
        on_delete=models.PROTECT,
        related_name="returns",
        db_index=True,
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_returns",
    )
    date = models.DateField(default=timezone.now, db_index=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    refund_method = models.CharField(
        max_length=30,
        choices=RefundMethod.choices,
        default=RefundMethod.PAYABLE_DEDUCTION,
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_purchase_returns",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Purchase Return"
        verbose_name_plural = "Purchase Returns"

    def __str__(self):
        return f"{self.return_number} (Ref: {self.original_purchase.purchase_number}) - Rs. {self.total_amount}"


class PurchaseReturnItem(models.Model):
    """
    Line item for returned merchandise.
    """
    purchase_return = models.ForeignKey(PurchaseReturn, on_delete=models.CASCADE, related_name="items")
    purchase_item = models.ForeignKey(PurchaseItem, on_delete=models.PROTECT, related_name="return_items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_rate = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        verbose_name = "Purchase Return Item"
        verbose_name_plural = "Purchase Return Items"


class SupplierPayment(models.Model):
    """
    Standalone payment voucher reducing outstanding supplier payables.
    """
    payment_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique supplier payment voucher (e.g. SPAY-2026-00001)",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="payments",
        db_index=True,
    )
    date = models.DateField(default=timezone.now, db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.PROTECT,
        related_name="supplier_payments",
    )
    payment_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="supplier_payment_accounts",
    )
    reference = models.CharField(max_length=100, blank=True, null=True, help_text="Cheque # / Online Bank Reference")
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_supplier_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Supplier Payment"
        verbose_name_plural = "Supplier Payments"

    def __str__(self):
        return f"{self.payment_number} -> {self.supplier.company_name or self.supplier.name}: Rs. {self.amount}"
