"""
Double-entry accounting models: Chart of Accounts, Journal Entries, Journal Items, and Payment Methods.
"""

from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError


class AccountType(models.TextChoices):
    ASSET = "ASSET", "Asset"
    LIABILITY = "LIABILITY", "Liability"
    EQUITY = "EQUITY", "Equity"
    INCOME = "INCOME", "Income"
    EXPENSE = "EXPENSE", "Expense"


class Account(models.Model):
    """
    Hierarchical general ledger account in the Chart of Accounts.
    """
    code = models.CharField(max_length=20, unique=True, db_index=True, help_text="Unique account code (e.g. 1010)")
    name = models.CharField(max_length=150)
    account_type = models.CharField(max_length=20, choices=AccountType.choices, db_index=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        help_text="Parent account for hierarchical aggregation",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    is_system = models.BooleanField(
        default=False,
        help_text="System default accounts required for core operations (cannot be deleted)",
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "Account"
        verbose_name_plural = "Accounts"

    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_account_type_display()})"

    @property
    def is_header(self):
        """Header account if it has sub-accounts."""
        return self.children.exists()

    @property
    def normal_balance(self):
        """Returns 'DEBIT' or 'CREDIT' based on account type."""
        if self.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
            return "DEBIT"
        return "CREDIT"

    def get_current_balance(self):
        """
        Calculates authoritative balance dynamically from posted journal items.
        Asset/Expense = Sum(Debit) - Sum(Credit)
        Liability/Equity/Income = Sum(Credit) - Sum(Debit)
        """
        totals = self.journal_items.filter(
            journal_entry__status=JournalEntryStatus.POSTED
        ).aggregate(
            total_debit=models.Sum("debit"),
            total_credit=models.Sum("credit"),
        )
        total_dr = totals["total_debit"] or Decimal("0.00")
        total_cr = totals["total_credit"] or Decimal("0.00")

        if self.normal_balance == "DEBIT":
            return total_dr - total_cr
        else:
            return total_cr - total_dr


class JournalEntryStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class ReferenceType(models.TextChoices):
    SALE = "SALE", "Sale / Receipt"
    SALE_RETURN = "SALE_RETURN", "Sale Return / Refund"
    PURCHASE = "PURCHASE", "Purchase Order"
    PURCHASE_RETURN = "PURCHASE_RETURN", "Purchase Return"
    STOCK_ADJUSTMENT = "STOCK_ADJUSTMENT", "Stock Adjustment"
    EXPENSE = "EXPENSE", "Operational Expense"
    CUSTOMER_PAYMENT = "CUSTOMER_PAYMENT", "Customer Receivable Payment"
    SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", "Supplier Payable Payment"
    OPENING_BALANCE = "OPENING_BALANCE", "Opening Balance"
    REGISTER_CLOSE = "REGISTER_CLOSE", "Cash Register Close (Z-Report)"
    MANUAL = "MANUAL", "Manual Journal Voucher"
    REVERSAL = "REVERSAL", "Reversal Counter-Entry"


class JournalEntry(models.Model):
    """
    Header for atomic double-entry accounting transactions.
    """
    entry_number = models.CharField(max_length=50, unique=True, db_index=True)
    entry_date = models.DateField(default=timezone.now, db_index=True)
    posting_date = models.DateTimeField(null=True, blank=True)
    reference_type = models.CharField(max_length=30, choices=ReferenceType.choices, default=ReferenceType.MANUAL, db_index=True)
    reference_id = models.CharField(max_length=100, blank=True, null=True, db_index=True, help_text="Original entity ID (e.g. INV-1001)")
    status = models.CharField(max_length=20, choices=JournalEntryStatus.choices, default=JournalEntryStatus.DRAFT, db_index=True)
    narration = models.TextField(blank=True, null=True, help_text="Explanation / description of entry")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_journal_entries")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-entry_date", "-id"]
        verbose_name = "Journal Entry"
        verbose_name_plural = "Journal Entries"

    def __str__(self):
        return f"{self.entry_number} [{self.reference_type}] - {self.entry_date} ({self.status})"

    @property
    def total_debit(self):
        return sum(line.debit for line in self.lines.all()) or Decimal("0.00")

    @property
    def total_credit(self):
        return sum(line.credit for line in self.lines.all()) or Decimal("0.00")

    @property
    def is_balanced(self):
        return abs(self.total_debit - self.total_credit) < Decimal("0.0001")

    def clean(self):
        """Validate double-entry balancing when posted."""
        if self.status == JournalEntryStatus.POSTED:
            if not self.is_balanced:
                raise ValidationError(
                    f"Journal entry is unbalanced: Total Debit ({self.total_debit}) != Total Credit ({self.total_credit})"
                )


class JournalItem(models.Model):
    """
    Individual debit/credit line item within a JournalEntry.
    """
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="journal_items")
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0.00"))
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0.00"))
    description = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        verbose_name = "Journal Item"
        verbose_name_plural = "Journal Items"

    def __str__(self):
        return f"{self.account.code} | DR: {self.debit} | CR: {self.credit}"

    def clean(self):
        if self.debit < 0 or self.credit < 0:
            raise ValidationError("Debit and Credit amounts must be non-negative.")
        if self.debit == 0 and self.credit == 0:
            raise ValidationError("Either Debit or Credit must be greater than zero.")
        if self.debit > 0 and self.credit > 0:
            raise ValidationError("A single journal line cannot have both Debit and Credit amounts.")


class PaymentMethod(models.Model):
    """
    Configurable payment methods linked to corresponding general ledger accounts.
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, unique=True, db_index=True)
    linked_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="payment_methods")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Payment Method"
        verbose_name_plural = "Payment Methods"

    def __str__(self):
        return f"{self.name} -> {self.linked_account.name}"
