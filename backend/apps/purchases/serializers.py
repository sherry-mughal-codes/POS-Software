"""
Serializers for Purchases, Purchase Items, Returns, and Supplier Payments.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.purchases.models import (
    Purchase,
    PurchaseItem,
    PurchaseReturn,
    PurchaseReturnItem,
    SupplierPayment,
)
from apps.contacts.models import Supplier
from apps.products.models import Product
from apps.accounting.models import PaymentMethod, Account


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    unit_name = serializers.CharField(source="product.unit.name", read_only=True)
    unit_code = serializers.CharField(source="product.unit.short_code", read_only=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    purchase_rate = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, coerce_to_string=False)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    returned_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    remaining_returnable_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)

    class Meta:
        model = PurchaseItem
        fields = [
            "id",
            "product",
            "product_sku",
            "product_name",
            "unit_name",
            "unit_code",
            "quantity",
            "purchase_rate",
            "tax_rate",
            "subtotal",
            "returned_quantity",
            "remaining_returnable_quantity",
        ]


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_company = serializers.CharField(source="supplier.company_name", read_only=True)
    payment_method_name = serializers.CharField(source="payment_method.name", read_only=True)
    payment_account_name = serializers.CharField(source="payment_account.name", read_only=True)
    payment_account_code = serializers.CharField(source="payment_account.code", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    grand_total = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    is_fully_paid = serializers.BooleanField(read_only=True)
    returned_amount = serializers.SerializerMethodField()
    returns_count = serializers.SerializerMethodField()

    def get_returned_amount(self, obj) -> float:
        total = sum((r.total_amount for r in obj.returns.all()), Decimal("0.00"))
        return float(total)

    def get_returns_count(self, obj) -> int:
        return obj.returns.count()

    class Meta:
        model = Purchase
        fields = [
            "id",
            "purchase_number",
            "supplier",
            "supplier_name",
            "supplier_company",
            "date",
            "status",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "grand_total",
            "paid_amount",
            "payable_amount",
            "is_fully_paid",
            "returned_amount",
            "returns_count",
            "payment_method",
            "payment_method_name",
            "payment_account",
            "payment_account_name",
            "payment_account_code",
            "cheque_number",
            "cheque_date",
            "cheque_bank",
            "supplier_invoice_number",
            "supplier_invoice_file",
            "notes",
            "created_by",
            "created_by_username",
            "items",
            "created_at",
            "updated_at",
        ]


class PurchaseCreateItemInputSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    purchase_rate = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)


class PurchaseCreateSerializer(serializers.Serializer):
    supplier = serializers.IntegerField(required=True)
    date = serializers.DateField(required=False)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    payment_method = serializers.IntegerField(required=False, allow_null=True)
    payment_account = serializers.IntegerField(required=False, allow_null=True)
    cheque_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    cheque_date = serializers.DateField(required=False, allow_null=True)
    cheque_bank = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    supplier_invoice_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    supplier_invoice_file = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    submit_immediately = serializers.BooleanField(required=False, default=True)
    items = PurchaseCreateItemInputSerializer(many=True, required=True)


class PurchaseReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    unit_rate = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = PurchaseReturnItem
        fields = [
            "id",
            "purchase_item",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_rate",
            "subtotal",
        ]


class PurchaseReturnSerializer(serializers.ModelSerializer):
    items = PurchaseReturnItemSerializer(many=True, read_only=True)
    original_purchase_number = serializers.CharField(source="original_purchase.purchase_number", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_company = serializers.CharField(source="supplier.company_name", read_only=True)
    payment_account_name = serializers.CharField(source="payment_account.name", read_only=True)
    payment_account_code = serializers.CharField(source="payment_account.code", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = PurchaseReturn
        fields = [
            "id",
            "return_number",
            "original_purchase",
            "original_purchase_number",
            "supplier",
            "supplier_name",
            "supplier_company",
            "date",
            "total_amount",
            "refund_method",
            "payment_account",
            "payment_account_name",
            "payment_account_code",
            "cheque_number",
            "cheque_date",
            "cheque_bank",
            "notes",
            "created_by_username",
            "items",
            "created_at",
        ]


class PurchaseReturnCreateSerializer(serializers.Serializer):
    purchase_id = serializers.IntegerField(required=True)
    refund_method = serializers.ChoiceField(
        choices=["PAYABLE_DEDUCTION", "CASH", "BANK", "CHEQUE", "CASH_REFUND"],
        default="PAYABLE_DEDUCTION",
    )
    payment_account = serializers.IntegerField(required=False, allow_null=True)
    cheque_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    cheque_date = serializers.DateField(required=False, allow_null=True)
    cheque_bank = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True)
    items = serializers.ListField(child=serializers.DictField(), required=True)


class SupplierPaymentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_company = serializers.CharField(source="supplier.company_name", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_account_name = serializers.CharField(source="payment_account.name", read_only=True)
    payment_account_code = serializers.CharField(source="payment_account.code", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    submitted_by_name = serializers.SerializerMethodField()
    cancelled_by_name = serializers.SerializerMethodField()
    journal_entry_number = serializers.CharField(source="journal_entry.entry_number", read_only=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = SupplierPayment
        fields = [
            "id",
            "payment_number",
            "supplier",
            "supplier_name",
            "supplier_company",
            "date",
            "amount",
            "payment_method",
            "payment_method_display",
            "payment_account",
            "payment_account_name",
            "payment_account_code",
            "cheque_number",
            "cheque_date",
            "cheque_bank",
            "reference",
            "notes",
            "status",
            "status_display",
            "journal_entry",
            "journal_entry_number",
            "reversal_journal_entry",
            "created_by",
            "created_by_username",
            "submitted_by",
            "submitted_by_name",
            "submitted_at",
            "cancelled_by",
            "cancelled_by_name",
            "cancelled_at",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "payment_number",
            "status",
            "journal_entry",
            "reversal_journal_entry",
            "created_by",
            "submitted_by",
            "submitted_at",
            "cancelled_by",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.username
        return None

    def get_cancelled_by_name(self, obj):
        if obj.cancelled_by:
            return obj.cancelled_by.get_full_name() or obj.cancelled_by.username
        return None


class SupplierPaymentCreateSerializer(serializers.Serializer):
    supplier = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=True)
    payment_method = serializers.ChoiceField(choices=["CASH", "BANK", "CHEQUE"], default="CASH")
    payment_account = serializers.IntegerField(required=True)
    cheque_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    cheque_date = serializers.DateField(required=False, allow_null=True)
    cheque_bank = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    date = serializers.DateField(required=False)
    reference = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    submit_now = serializers.BooleanField(required=False, default=True)

    def validate_amount(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

