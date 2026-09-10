"""
Sales Agent and Commission Foundation Models.
Complete Commission Management lifecycle:
SalesAgent Master, CommissionRecord, CommissionPayment, and CommissionAdjustment.
"""

from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class CommissionMethod(models.TextChoices):
    FIXED_PERCENTAGE = "FIXED_PERCENTAGE", "Fixed Percentage"
    PROGRESSIVE = "PROGRESSIVE", "Progressive / Per-Money"


class SalesAgent(models.Model):
    """
    Independent Sales Agent Master Record.
    Stores agent identity, contact details, assigned commission rate, method, and active status.
    Historical transactions remain preserved regardless of active/inactive state.
    """
    name = models.CharField(max_length=150, db_index=True, help_text="Full name of sales agent")
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique Agent Identifier Code (e.g. AGT-0001)",
    )
    phone = models.CharField(max_length=30, blank=True, default="", db_index=True)
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    commission_method = models.CharField(
        max_length=25,
        choices=CommissionMethod.choices,
        default=CommissionMethod.FIXED_PERCENTAGE,
        db_index=True,
        help_text="Commission calculation method: Fixed Percentage (Level 1) or Progressive / Per-Money (Level 2)",
    )
    commission_amount_unit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal("0.01"), message="Commission amount unit must be greater than zero."),
        ],
        help_text="Money unit denominator for Progressive calculation (e.g. 100000.00 for every Rs. 100,000)",
    )
    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00"), message="Commission percentage cannot be negative."),
            MaxValueValidator(Decimal("100.00"), message="Commission percentage cannot exceed 100%."),
        ],
        help_text="Default commission percentage applied to sales (e.g. 5.00 for 5%)",
    )
    joining_date = models.DateField(default=timezone.localdate, help_text="Date agent joined organization")
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Active agents are available for new transactions; inactive agents remain accessible historically.",
    )
    notes = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_sales_agents",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Sales Agent"
        verbose_name_plural = "Sales Agents"

    def __str__(self):
        if self.commission_method == CommissionMethod.PROGRESSIVE and self.commission_amount_unit:
            return f"{self.code} - {self.name} ({self.commission_percentage}% per Rs. {self.commission_amount_unit:,.2f})"
        return f"{self.code} - {self.name} ({self.commission_percentage}%)"

    def save(self, *args, **kwargs):
        if not self.code or not self.code.strip():
            from apps.core.sequences import DocumentSequenceService
            self.code = DocumentSequenceService.generate_next_number("sales_agent")
        super().save(*args, **kwargs)


class CommissionStatus(models.TextChoices):
    UNPAID = "UNPAID", "Unpaid"
    PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
    PAID = "PAID", "Paid"
    ADJUSTED = "ADJUSTED", "Adjusted / Reversed"
    CANCELLED = "CANCELLED", "Cancelled"


class CommissionRecord(models.Model):
    """
    Authoritative Commission Record generated from a completed POS Sale.
    Linked 1-to-1 with the original Sale/Invoice.
    Stores immutable snapshots of agent rate, commissionable base (Subtotal - Discount),
    calculated commission amount, settlement/paid tracking, and general ledger journal entry reference.
    """
    commission_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique commission reference (e.g. COM-00001)",
    )
    sale = models.OneToOneField(
        "sales.Sale",
        on_delete=models.PROTECT,
        related_name="commission_record",
        help_text="Original qualifying Sale / Invoice",
    )
    sales_agent = models.ForeignKey(
        SalesAgent,
        on_delete=models.PROTECT,
        related_name="commission_records",
        help_text="Sales agent receiving commission",
    )
    agent_name_snapshot = models.CharField(max_length=150, help_text="Snapshot of agent name at moment of sale")
    agent_code_snapshot = models.CharField(max_length=50, help_text="Snapshot of agent code at moment of sale")
    commission_method_snapshot = models.CharField(
        max_length=25,
        choices=CommissionMethod.choices,
        default=CommissionMethod.FIXED_PERCENTAGE,
        db_index=True,
        help_text="Snapshot of commission method applied at moment of sale",
    )
    commission_amount_unit_snapshot = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Snapshot of commission amount unit for Progressive calculation at moment of sale",
    )
    commission_percentage_snapshot = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Snapshot of configured commission percentage at moment of sale",
    )
    effective_commission_percentage = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=Decimal("0.0000"),
        help_text="Calculated effective commission percentage applied to sale (e.g. 3.5000%)",
    )
    commission_base = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Net commission base (Sale Subtotal - Discount Amount, excluding tax)",
    )
    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Initial calculated commission amount (Base * % / 100)",
    )
    adjusted_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total cumulative commission amount reversed due to sales returns",
    )
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total cumulative amount paid out to sales agent",
    )
    status = models.CharField(
        max_length=25,
        choices=CommissionStatus.choices,
        default=CommissionStatus.UNPAID,
        db_index=True,
    )
    date = models.DateField(default=timezone.localdate, db_index=True)
    journal_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commission_accruals",
        help_text="GL journal entry for commission accrual (DR Expense / CR Payable)",
    )
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_commissions",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at", "-id"]
        verbose_name = "Commission Record"
        verbose_name_plural = "Commission Records"
        indexes = [
            models.Index(fields=["status", "date"]),
            models.Index(fields=["sales_agent", "status"]),
        ]

    def __str__(self):
        return f"{self.commission_number} ({self.sale.invoice_number}) - {self.agent_name_snapshot} (Rs. {self.net_payable_amount})"

    @property
    def record_number(self) -> str:
        return self.commission_number

    @property
    def commission_rate_percentage(self) -> Decimal:
        if self.effective_commission_percentage and self.effective_commission_percentage > Decimal("0.0000"):
            return self.effective_commission_percentage
        return self.commission_percentage_snapshot

    @property
    def commission_base_amount(self) -> Decimal:
        return self.commission_base

    @property
    def balance_due(self) -> Decimal:
        return self.remaining_payable_amount

    @property
    def advance_credit(self) -> Decimal:
        return self.advance_credit_amount

    @property
    def net_commission_amount(self) -> Decimal:
        """Net commission amount after subtracting return reversals."""
        return max(Decimal("0.00"), self.commission_amount - self.adjusted_amount)

    @property
    def net_payable_amount(self) -> Decimal:
        """Authoritative net payable amount."""
        return self.net_commission_amount

    @property
    def remaining_payable_amount(self) -> Decimal:
        """Remaining unpaid amount payable to agent."""
        return max(Decimal("0.00"), self.net_payable_amount - self.paid_amount)

    @property
    def advance_credit_amount(self) -> Decimal:
        """If commission was already paid before a return reversal, returns the advance/credit excess."""
        if self.paid_amount > self.net_payable_amount:
            return self.paid_amount - self.net_payable_amount
        return Decimal("0.00")

    def update_status(self):
        """Authoritatively calculates status based on net payable, adjusted amounts, and payments."""
        if self.net_payable_amount <= Decimal("0.00") and self.adjusted_amount > Decimal("0.00"):
            self.status = CommissionStatus.ADJUSTED
        elif self.paid_amount >= self.net_payable_amount and self.net_payable_amount > Decimal("0.00"):
            self.status = CommissionStatus.PAID
        elif self.paid_amount > Decimal("0.00"):
            self.status = CommissionStatus.PARTIALLY_PAID
        elif self.adjusted_amount > Decimal("0.00") and self.net_payable_amount > Decimal("0.00"):
            self.status = CommissionStatus.UNPAID
        else:
            self.status = CommissionStatus.UNPAID


class CommissionPayment(models.Model):
    """
    Settlement payment voucher paid against a Commission Record.
    Updates the paid amount and status of the Commission Record and posts
    GL entry (DR Sales Agent Commission Payable / CR Cash or Bank).
    """
    payment_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique settlement payment voucher number (e.g. CPMT-00001)",
    )
    commission_record = models.ForeignKey(
        CommissionRecord,
        on_delete=models.PROTECT,
        related_name="payments",
        help_text="Target commission record being settled",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"), message="Payment amount must be greater than zero.")],
        help_text="Amount disbursed to sales agent",
    )
    payment_date = models.DateField(default=timezone.localdate, db_index=True)
    payment_account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.PROTECT,
        related_name="commission_payouts",
        help_text="Cash drawer or Bank account used for disbursement",
    )
    journal_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commission_payments",
        help_text="GL journal entry for payment (DR Payable / CR Cash/Bank)",
    )
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_commission_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def date(self):
        return self.payment_date

    @property
    def sales_agent(self):
        return self.commission_record.sales_agent if self.commission_record else None

    class Meta:
        ordering = ["-payment_date", "-created_at"]
        verbose_name = "Commission Payment"
        verbose_name_plural = "Commission Payments"

    def __str__(self):
        return f"{self.payment_number} ({self.commission_record.commission_number}) - Rs. {self.amount}"


class CommissionAdjustment(models.Model):
    """
    Auditable history of commission adjustments / reversals caused by Sales Returns.
    """
    commission_record = models.ForeignKey(
        CommissionRecord,
        on_delete=models.PROTECT,
        related_name="adjustments",
    )
    sales_return = models.ForeignKey(
        "sales.SalesReturn",
        on_delete=models.PROTECT,
        related_name="commission_adjustments",
    )
    returned_base_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Portion of commission base returned",
    )
    reversal_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Commission amount reversed (Returned Base * Snapshotted % / 100)",
    )
    journal_entry = models.ForeignKey(
        "accounting.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commission_reversals",
        help_text="GL journal entry for reversal (DR Payable / CR Expense)",
    )
    date = models.DateField(default=timezone.localdate)
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_commission_adjustments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def adjusted_amount(self) -> Decimal:
        return self.reversal_amount

    @property
    def returned_subtotal(self) -> Decimal:
        return self.returned_base_amount

    class Meta:
        ordering = ["-date", "-created_at"]
        verbose_name = "Commission Adjustment"
        verbose_name_plural = "Commission Adjustments"

    def __str__(self):
        return f"Adjustment {self.commission_record.commission_number} (Return {self.sales_return.return_number}) - Rs. {self.reversal_amount}"
