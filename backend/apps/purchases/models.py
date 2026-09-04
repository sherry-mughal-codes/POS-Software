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
    date = models.DateField(default=timezone.localdate, db_index=True)
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
    cheque_number = models.CharField(max_length=50, blank=True, null=True, help_text="Cheque number if paid by cheque")
    cheque_date = models.DateField(blank=True, null=True, help_text="Cheque issue or clearance date")
    cheque_bank = models.CharField(max_length=100, blank=True, null=True, help_text="Bank on which cheque is drawn")
    supplier_invoice_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text="Supplier's original invoice/bill number",
    )
    supplier_invoice_file = models.TextField(
        blank=True,
        null=True,
        help_text="Scanned invoice / bill document or image base64 data URL",
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
        ordering = ["-date", "-created_at", "-id"]
        verbose_name = "Purchase Order"
        verbose_name_plural = "Purchase Orders"
        indexes = [
            models.Index(fields=["date", "status"]),
            models.Index(fields=["supplier", "status"]),
        ]

    def __str__(self):
        return f"{self.purchase_number} - {self.supplier.company_name or self.supplier.name} (Rs. {self.grand_total})"

    @property
    def payable_amount(self) -> Decimal:
        """Unpaid balance on this purchase taking returns into account."""
        returns_deducted = sum(r.total_amount for r in self.returns.filter(refund_method="PAYABLE_DEDUCTION")) or Decimal("0.00")
        return max(Decimal("0.00"), self.grand_total - returns_deducted - self.paid_amount)

    @property
    def is_fully_paid(self) -> bool:
        return self.payable_amount <= Decimal("0.00")


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
    CASH = "CASH", "Cash Refund"
    BANK = "BANK", "Bank Transfer Refund"
    CHEQUE = "CHEQUE", "Cheque Refund"
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
    date = models.DateField(default=timezone.localdate, db_index=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    refund_method = models.CharField(
        max_length=30,
        choices=RefundMethod.choices,
        default=RefundMethod.PAYABLE_DEDUCTION,
    )
    payment_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_returns",
        help_text="Receiving Cash/Bank Asset Account if refund taken in cash or bank transfer",
    )
    cheque_number = models.CharField(max_length=50, blank=True, null=True, help_text="Refund cheque number")
    cheque_date = models.DateField(blank=True, null=True, help_text="Refund cheque date")
    cheque_bank = models.CharField(max_length=100, blank=True, null=True, help_text="Refund issuing bank")
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
        ordering = ["-date", "-created_at", "-id"]
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


class SupplierPaymentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    CANCELLED = "CANCELLED", "Cancelled"


class SupplierPaymentMethodType(models.TextChoices):
    CASH = "CASH", "Cash"
    BANK = "BANK", "Bank / Card"
    CHEQUE = "CHEQUE", "Cheque"


class SupplierPayment(models.Model):
    """
    Standalone payment voucher reducing outstanding supplier payables.
    """
    payment_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique supplier payment voucher (e.g. SUP-PAY-2026-00001)",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="payments",
        db_index=True,
    )
    date = models.DateField(default=timezone.localdate, db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=SupplierPaymentMethodType.choices,
        default=SupplierPaymentMethodType.CASH,
        db_index=True,
    )
    payment_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="supplier_payment_accounts",
    )
    cheque_number = models.CharField(max_length=50, blank=True, null=True, help_text="Cheque number")
    cheque_date = models.DateField(blank=True, null=True, help_text="Cheque issue / clearance date")
    cheque_bank = models.CharField(max_length=100, blank=True, null=True, help_text="Drawn on bank name")
    reference = models.CharField(max_length=100, blank=True, null=True, help_text="Cheque # / Online Bank Reference")
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=SupplierPaymentStatus.choices,
        default=SupplierPaymentStatus.SUBMITTED,
        db_index=True,
    )

    # General Ledger links
    journal_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_payments",
        help_text="Double-entry journal posting for this payment",
    )
    reversal_journal_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversed_supplier_payments",
        help_text="Reversal journal entry upon cancellation",
    )

    # Audit Trail
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_supplier_payments",
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_supplier_payments",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_supplier_payments",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at", "-id"]
        verbose_name = "Supplier Payment"
        verbose_name_plural = "Supplier Payments"

    def __str__(self):
        return f"{self.payment_number} -> {self.supplier.company_name or self.supplier.name}: Rs. {self.amount} [{self.status}]"

    @classmethod
    def generate_payment_number(cls, target_date=None) -> str:
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("supplier_payment")

