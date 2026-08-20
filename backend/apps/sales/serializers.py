"""
Serializers for Sales, Sale Items, Returns, and Checkout payloads.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.sales.models import (
    Sale,
    SaleItem,
    SalePayment,
    SalesReturn,
    SalesReturnItem,
    PaymentMethodType,
    POSDaySession,
)


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_barcode = serializers.CharField(source="product.barcode", read_only=True, default="")
    unit_name = serializers.CharField(source="product.unit.name", read_only=True, default="")
    unit_abbr = serializers.CharField(source="product.unit.short_code", read_only=True, default="")
    returnable_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    returned_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "product_barcode",
            "unit_name",
            "unit_abbr",
            "quantity",
            "unit_price",
            "unit_cost",
            "discount",
            "subtotal",
            "returned_quantity",
            "returnable_quantity",
        ]


class SalePaymentSerializer(serializers.ModelSerializer):
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = SalePayment
        fields = [
            "id",
            "payment_method",
            "payment_method_display",
            "amount",
            "notes",
            "created_at",
        ]


class SalesReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = SalesReturnItem
        fields = [
            "id",
            "sale_item",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_price",
            "subtotal",
        ]


class SalesReturnSerializer(serializers.ModelSerializer):
    items = SalesReturnItemSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    original_invoice_number = serializers.CharField(source="original_sale.invoice_number", read_only=True)
    refund_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = SalesReturn
        fields = [
            "id",
            "return_number",
            "original_sale",
            "original_invoice_number",
            "date",
            "refund_amount",
            "reason",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "items",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System"
        return obj.created_by.get_full_name() or obj.created_by.username


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    payments = SalePaymentSerializer(many=True, read_only=True)
    returns = SalesReturnSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_code = serializers.CharField(source="customer.customer_id", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True, default="")
    customer_is_walkin = serializers.BooleanField(source="customer.is_walkin", read_only=True)
    cashier_name = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_account_name = serializers.CharField(source="payment_account.name", read_only=True, default="")
    payment_account_code = serializers.CharField(source="payment_account.code", read_only=True, default="")
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status = serializers.SerializerMethodField()
    payment_status_display = serializers.SerializerMethodField()

    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    grand_total = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    change_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    due_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    returned_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "invoice_number",
            "customer",
            "customer_name",
            "customer_code",
            "customer_phone",
            "customer_is_walkin",
            "date",
            "status",
            "status_display",
            "payment_method",
            "payment_method_display",
            "payment_account",
            "payment_account_name",
            "payment_account_code",
            "payment_status",
            "payment_status_display",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "grand_total",
            "paid_amount",
            "change_amount",
            "due_amount",
            "returned_amount",
            "notes",
            "created_by",
            "cashier_name",
            "created_at",
            "updated_at",
            "items",
            "payments",
            "returns",
        ]

    def get_payment_status(self, obj) -> str:
        if obj.due_amount <= Decimal("0.00"):
            return "PAID"
        elif obj.paid_amount > Decimal("0.00"):
            return "PARTIAL"
        return "UNPAID"

    def get_payment_status_display(self, obj) -> str:
        if obj.payment_method == PaymentMethodType.CREDIT:
            if obj.due_amount <= Decimal("0.00"):
                return "Credit (Paid)"
            elif obj.paid_amount > Decimal("0.00"):
                return "Credit (Partial)"
            return "Credit (Unpaid AR)"
        elif obj.payment_method == PaymentMethodType.SPLIT:
            if obj.due_amount <= Decimal("0.00"):
                return "Split (Paid)"
            return "Split (Due)"
        return obj.get_payment_method_display()

    def get_cashier_name(self, obj):
        if not obj.created_by:
            return "System"
        return obj.created_by.get_full_name() or obj.created_by.username


# Payload serializers for checkout and returns
class SaleCheckoutItemSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))


class SalePaymentItemSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=PaymentMethodType.choices, required=True)
    payment_account = serializers.IntegerField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class SaleCheckoutSerializer(serializers.Serializer):
    customer = serializers.IntegerField(required=True)
    items = SaleCheckoutItemSerializer(many=True, required=True)
    payment_method = serializers.ChoiceField(choices=PaymentMethodType.choices, default=PaymentMethodType.CASH)
    payment_account = serializers.IntegerField(required=False, allow_null=True)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    payments_breakdown = SalePaymentItemSerializer(many=True, required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    date = serializers.DateField(required=False)


class SalesReturnItemInputSerializer(serializers.Serializer):
    sale_item_id = serializers.IntegerField(required=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)


class SalesReturnCreateSerializer(serializers.Serializer):
    sale_id = serializers.IntegerField(required=True)
    items = SalesReturnItemInputSerializer(many=True, required=True)
    reason = serializers.CharField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    date = serializers.DateField(required=False)


class POSDaySessionSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.SerializerMethodField()
    closed_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = POSDaySession
        fields = [
            "id",
            "session_number",
            "date",
            "status",
            "status_display",
            "opening_cash",
            "opened_by",
            "opened_by_name",
            "opened_at",
            "opening_notes",
            "closed_by",
            "closed_by_name",
            "closed_at",
            "expected_cash",
            "actual_cash",
            "cash_difference",
            "difference_reason",
            "closing_notes",
            "z_report_snapshot",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "session_number",
            "status",
            "opened_by",
            "opened_at",
            "closed_by",
            "closed_at",
            "expected_cash",
            "actual_cash",
            "cash_difference",
            "z_report_snapshot",
            "created_at",
            "updated_at",
        ]

    def get_opened_by_name(self, obj):
        if obj.opened_by:
            return obj.opened_by.get_full_name() or obj.opened_by.username
        return "System"

    def get_closed_by_name(self, obj):
        if obj.closed_by:
            return obj.closed_by.get_full_name() or obj.closed_by.username
        return None


class POSDaySessionOpenSerializer(serializers.Serializer):
    opening_cash = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    opening_notes = serializers.CharField(required=False, allow_blank=True, default="")
    date = serializers.DateField(required=False)

    def validate_opening_cash(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Opening cash cannot be negative.")
        return value


class POSDaySessionCloseSerializer(serializers.Serializer):
    actual_cash = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    difference_reason = serializers.CharField(required=False, allow_blank=True, default="")
    closing_notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_actual_cash(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Counted actual cash cannot be negative.")
        return value

