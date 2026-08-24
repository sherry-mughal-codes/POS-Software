"""
Sales and POS Transaction Models.
Encapsulates Sale Invoices, Line Items, Multi-Payment Transactions, and Sales Returns.
"""

from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.products.models import Product
from apps.contacts.models import Customer


class SaleStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft / Holding"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentMethodType(models.TextChoices):
    CASH = "CASH", "Cash"
    CARD = "CARD", "Debit/Credit Card"
    CREDIT = "CREDIT", "Customer Credit / Receivable"
    SPLIT = "SPLIT", "Split / Multi-Payment"


class Sale(models.Model):
    """
    Sale invoice header representing a counter / POS transaction.
    """
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique invoice identifier (e.g. INV-2026-00001)",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="sales",
        help_text="Customer record (defaults to Walk-in Customer)",
    )
    date = models.DateField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=SaleStatus.choices,
        default=SaleStatus.COMPLETED,
        db_index=True,
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Sum of line item totals before invoice-level discount",
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Invoice-level discount applied",
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Sales tax / GST if applicable",
    )
    grand_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Final payable amount (subtotal - discount + tax)",
    )
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total amount tendered / received",
    )
    change_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Change returned to customer for cash payments",
    )
    due_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Remaining credit receivable from registered customer",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethodType.choices,
        default=PaymentMethodType.CASH,
        db_index=True,
    )
    payment_account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_payments_received",
        help_text="Specific cash drawer or bank ledger account debited for this transaction",
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_recorded",
        help_text="Cashier / operator who recorded the sale",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Sale"
        verbose_name_plural = "Sales"

    def __str__(self):
        return f"{self.invoice_number} | {self.customer.name} | Rs. {self.grand_total} ({self.status})"

    @property
    def total_items_count(self) -> int:
        return self.items.count()

    @property
    def total_quantity(self) -> Decimal:
        return sum((item.quantity for item in self.items.all()), Decimal("0.00"))

    @property
    def returned_amount(self) -> Decimal:
        return sum((ret.refund_amount for ret in self.returns.all()), Decimal("0.00"))


class SaleItem(models.Model):
    """
    Individual product line on a sale invoice with historical price/cost snapshot.
    """
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="sale_items")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, help_text="Quantity sold")
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Historical selling price snapshot at the moment of sale",
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Historical unit cost / WAC at the moment of sale for COGS tracking",
    )
    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Line item specific discount",
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Line total: (quantity * unit_price) - discount",
    )
    returned_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total quantity returned against this line",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sale Item"
        verbose_name_plural = "Sale Items"

    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ Rs. {self.unit_price}"

    @property
    def returnable_quantity(self) -> Decimal:
        """Maximum quantity that can still be returned."""
        return max(Decimal("0.00"), self.quantity - self.returned_quantity)

    @property
    def line_cogs(self) -> Decimal:
        """Total Cost of Goods Sold for this item line."""
        return self.quantity * self.unit_cost

    @property
    def line_gross_profit(self) -> Decimal:
        """Gross margin for this item line."""
        return self.subtotal - self.line_cogs


class SalePayment(models.Model):
    """
    Detailed payment breakdown for sales (e.g. split payment cash + card).
    """
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="payments")
    payment_method = models.CharField(max_length=20, choices=PaymentMethodType.choices)
    payment_account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sale_split_payments_received",
        help_text="Specific cash or bank ledger account debited for this payment",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Sale Payment"
        verbose_name_plural = "Sale Payments"

    def __str__(self):
        return f"{self.payment_method}: Rs. {self.amount}"


class SalesReturn(models.Model):
    """
    Customer sales return document referencing an original completed sale.
    """
    return_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique return identifier (e.g. RET-2026-00001)",
    )
    original_sale = models.ForeignKey(
        Sale,
        on_delete=models.PROTECT,
        related_name="returns",
        help_text="Original sale invoice being returned",
    )
    date = models.DateField(default=timezone.now, db_index=True)
    refund_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total refund / credit issued to customer",
    )
    reason = models.CharField(max_length=200, help_text="Reason for customer return")
    payment_account = models.ForeignKey(
        "accounting.Account",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_returns_paid",
        help_text="Cash drawer or bank account from which refund was paid",
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_returns_recorded",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Sales Return"
        verbose_name_plural = "Sales Returns"

    def __str__(self):
        return f"{self.return_number} (Ref: {self.original_sale.invoice_number}) | Rs. {self.refund_amount}"


class SalesReturnItem(models.Model):
    """
    Itemized returned product line.
    """
    return_order = models.ForeignKey(SalesReturn, on_delete=models.CASCADE, related_name="items")
    sale_item = models.ForeignKey(SaleItem, on_delete=models.PROTECT, related_name="return_items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="sales_return_items")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sales Return Item"
        verbose_name_plural = "Sales Return Items"

    def __str__(self):
        return f"Return: {self.product.name} x {self.quantity} (Rs. {self.subtotal})"


class DaySessionStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"


class POSDaySession(models.Model):
    """
    Authoritative Business Day POS Session for drawer opening cash, daily cash transactions, and Z-report closing audit.
    """
    session_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique daily session serial (e.g. DAY-2026-08-17)",
    )
    date = models.DateField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=DaySessionStatus.choices,
        default=DaySessionStatus.OPEN,
        db_index=True,
    )
    opening_cash = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Initial physical cash present in drawer at opening",
    )
    opened_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="opened_pos_sessions",
    )
    opened_at = models.DateTimeField(default=timezone.now, db_index=True)
    opening_notes = models.TextField(blank=True, null=True)

    # Closing & Z Report fields
    closed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="closed_pos_sessions",
    )
    closed_at = models.DateTimeField(null=True, blank=True, db_index=True)
    expected_cash = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Expected physical cash calculated automatically from all cash-affecting transactions",
    )
    actual_cash = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Physical counted cash in drawer at closing",
    )
    cash_difference = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Difference between actual and expected cash (Actual - Expected)",
    )
    difference_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Explanation required if cash difference is non-zero",
    )
    closing_notes = models.TextField(blank=True, null=True)
    z_report_snapshot = models.JSONField(
        null=True,
        blank=True,
        help_text="Immutable JSON snapshot of all final daily sales, returns, expenses, payments, and cash metrics at closing",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-opened_at", "-id"]
        verbose_name = "POS Day Session"
        verbose_name_plural = "POS Day Sessions"

    def __str__(self):
        return f"{self.session_number} [{self.date}] ({self.status}) - Opened: Rs. {self.opening_cash}"

    @classmethod
    def generate_session_number(cls, session_date=None) -> str:
        s_date = session_date or timezone.now().date()
        date_str = s_date.strftime("%Y-%m-%d")
        prefix = f"DAY-{date_str}"
        existing = cls.objects.filter(session_number__startswith=prefix).count()
        if existing == 0:
            return prefix
        return f"{prefix}-{existing + 1:02d}"

