"""
Customers & Suppliers Master Data Models and Customer Payment Vouchers.
Single source of truth for all sales, purchases, receivables, and payables.
"""

from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounting.models import Account, JournalEntry


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
    opening_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Initial/Opening receivable balance at system setup",
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Customer"
        verbose_name_plural = "Customers"

    def __str__(self):
        return f"[{self.customer_id}] {self.name}{' (Walk-in)' if self.is_walkin else ''}"

    @classmethod
    def generate_customer_id(cls):
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("customer")

    def clean(self):
        # Enforce that Walk-in customer cannot have credit enabled
        if self.is_walkin:
            if self.credit_enabled:
                raise ValidationError("Credit purchases cannot be enabled for the default Walk-in Customer.")
            if not self.is_active:
                raise ValidationError("The default Walk-in Customer cannot be deactivated.")

    @property
    def outstanding_balance(self) -> Decimal:
        """
        Dynamically calculates customer's current outstanding accounts receivable balance.
        """
        if self.is_walkin:
            return Decimal("0.00")
        try:
            from apps.contacts.services import CustomerReceivableService
            info = CustomerReceivableService.get_customer_outstanding(self.id)
            return info.get("outstanding_balance", Decimal("0.00"))
        except Exception:
            return Decimal("0.00")

    @property
    def credit_limit(self) -> Decimal | None:
        """
        Optional customer credit limit. Defaults to None (no limit).
        """
        return getattr(self, "_credit_limit", None)

    @credit_limit.setter
    def credit_limit(self, value):
        self._credit_limit = value

    def save(self, *args, **kwargs):
        if self.is_walkin:
            self.credit_enabled = False
            self.is_active = True
        if not self.customer_id:
            self.customer_id = self.generate_customer_id()
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
    opening_balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Initial/Opening payable balance at system setup",
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"

    @classmethod
    def generate_supplier_id(cls):
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("supplier")

    def __str__(self):
        company = f" ({self.company_name})" if self.company_name else ""
        return f"[{self.supplier_id}] {self.name}{company}"


class CustomerPaymentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    CANCELLED = "CANCELLED", "Cancelled"


class CustomerPayment(models.Model):
    """
    Dedicated customer payment voucher reducing outstanding Accounts Receivable.
    """
    payment_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique payment receipt number (e.g. PAY-2026-00001)",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="payments",
        db_index=True,
        help_text="Customer making the payment",
    )
    date = models.DateField(default=timezone.localdate, db_index=True)
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        help_text="Payment amount reducing receivable",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=[("CASH", "Cash"), ("BANK", "Bank / Card"), ("CARD", "Card"), ("CHEQUE", "Cheque")],
        default="CASH",
        db_index=True,
    )
    payment_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="customer_payments",
        help_text="Debit Asset Account (e.g. Cash in Hand 1010, Bank 1020)",
    )
    cheque_number = models.CharField(max_length=50, blank=True, null=True, help_text="Cheque number")
    cheque_date = models.DateField(blank=True, null=True, help_text="Cheque date")
    cheque_bank = models.CharField(max_length=100, blank=True, null=True, help_text="Customer issuing bank")
    reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Cheque # / Online Deposit Slip / POS Transaction ID",
    )
    screenshot = models.ImageField(
        upload_to="customer_payments/",
        null=True,
        blank=True,
        help_text="Payment proof / deposit slip screenshot",
    )
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=CustomerPaymentStatus.choices,
        default=CustomerPaymentStatus.SUBMITTED,
        db_index=True,
    )

    # General Ledger links
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_payments",
        help_text="Double-entry journal posting for this payment",
    )
    reversal_journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_customer_payments",
        help_text="Reversal journal entry upon cancellation",
    )

    # Audit Trail
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_customer_payments",
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_customer_payments",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_customer_payments_by",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at", "-id"]
        verbose_name = "Customer Payment"
        verbose_name_plural = "Customer Payments"

    def __str__(self):
        return f"{self.payment_number} -> {self.customer.name}: Rs. {self.amount} [{self.status}]"

    @classmethod
    def generate_payment_number(cls, target_date=None):
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("customer_payment")
