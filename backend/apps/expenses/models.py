"""
Expense and Cash/Bank Account Transfer models for Phase 8.
"""

from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.accounting.models import Account, JournalEntry


class ExpenseStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    CANCELLED = "CANCELLED", "Cancelled"


class Expense(models.Model):
    """
    Operational Expense transaction referencing Chart of Accounts and Payment Accounts.
    """
    expense_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateField(default=timezone.now, db_index=True)
    expense_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="expenses",
        help_text="Debit Expense Account from Chart of Accounts (e.g. Rent, Utilities)",
    )
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="payment_expenses",
        help_text="Credit Asset Account (e.g. Cash in Hand, Bank Account)",
    )
    reference_no = models.CharField(max_length=100, blank=True, null=True, help_text="Bill/Receipt/Voucher number")
    attachment = models.FileField(upload_to="expenses/attachments/", blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=ExpenseStatus.choices, default=ExpenseStatus.DRAFT, db_index=True)

    # Linked Accounting Journal Entries
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
        help_text="General ledger entry generated upon submission",
    )
    reversal_journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_expenses",
        help_text="Reversal journal entry generated upon cancellation",
    )

    # Audit Trail
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_expenses")
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="submitted_expenses")
    submitted_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cancelled_expenses_by")
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"
        indexes = [
            models.Index(fields=["date", "status"]),
            models.Index(fields=["status", "date"]),
        ]

    def __str__(self):
        return f"{self.expense_number} - {self.expense_account.name} (Rs. {self.amount}) [{self.status}]"

    @classmethod
    def generate_expense_number(cls, target_date=None):
        """Generates sequential format: EXP-YYYY-XXXXX"""
        year = target_date.year if target_date else timezone.now().year
        prefix = f"EXP-{year}-"
        last_exp = cls.objects.filter(expense_number__startswith=prefix).order_by("-expense_number").first()
        if last_exp:
            try:
                last_seq = int(last_exp.expense_number.split("-")[-1])
                new_seq = last_seq + 1
            except (ValueError, IndexError):
                new_seq = 1
        else:
            new_seq = 1
        return f"{prefix}{new_seq:05d}"


class TransferStatus(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Submitted"
    CANCELLED = "CANCELLED", "Cancelled"


class AccountTransfer(models.Model):
    """
    Internal cash/bank transfer moving funds between accounts without affecting expenses.
    """
    transfer_number = models.CharField(max_length=50, unique=True, db_index=True)
    date = models.DateField(default=timezone.now, db_index=True)
    from_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="transfers_out",
        help_text="Source liquid asset account (Credit)",
    )
    to_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="transfers_in",
        help_text="Destination liquid asset account (Debit)",
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, null=True, help_text="Deposit slip or bank transaction ref")
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=TransferStatus.choices, default=TransferStatus.SUBMITTED, db_index=True)

    # Linked Accounting Journal Entries
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers",
        help_text="Transfer journal entry (Debit To Account / Credit From Account)",
    )
    reversal_journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_transfers",
    )

    # Audit Trail
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_transfers")
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cancelled_transfers_by")
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Account Transfer"
        verbose_name_plural = "Account Transfers"

    def __str__(self):
        return f"{self.transfer_number}: {self.from_account.name} -> {self.to_account.name} (Rs. {self.amount})"

    @classmethod
    def generate_transfer_number(cls, target_date=None):
        """Generates sequential format: TRF-YYYY-XXXXX"""
        year = target_date.year if target_date else timezone.now().year
        prefix = f"TRF-{year}-"
        last_trf = cls.objects.filter(transfer_number__startswith=prefix).order_by("-transfer_number").first()
        if last_trf:
            try:
                last_seq = int(last_trf.transfer_number.split("-")[-1])
                new_seq = last_seq + 1
            except (ValueError, IndexError):
                new_seq = 1
        else:
            new_seq = 1
        return f"{prefix}{new_seq:05d}"
