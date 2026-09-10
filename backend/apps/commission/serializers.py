"""
Serializers for Sales Agent Master, Commission Records, Payments, and Adjustments.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.commission.models import (
    SalesAgent,
    CommissionRecord,
    CommissionPayment,
    CommissionAdjustment,
    CommissionStatus,
)


class SalesAgentSerializer(serializers.ModelSerializer):
    """
    Serializer for full Sales Agent CRUD operations.
    """
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    code = serializers.CharField(required=False, allow_blank=True)
    outstanding_balance = serializers.SerializerMethodField()
    advance_credit_balance = serializers.SerializerMethodField()
    total_commission = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    total_adjusted = serializers.SerializerMethodField()

    class Meta:
        model = SalesAgent
        fields = [
            "id",
            "name",
            "code",
            "phone",
            "email",
            "address",
            "commission_method",
            "commission_amount_unit",
            "commission_percentage",
            "joining_date",
            "is_active",
            "notes",
            "outstanding_balance",
            "advance_credit_balance",
            "total_commission",
            "total_paid",
            "total_adjusted",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "outstanding_balance",
            "advance_credit_balance",
            "total_commission",
            "total_paid",
            "total_adjusted",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_outstanding_balance(self, obj):
        records = obj.commission_records.exclude(status=CommissionStatus.CANCELLED)
        total_comm = sum((r.net_payable_amount for r in records), Decimal("0.00"))
        total_paid = sum((r.paid_amount for r in records), Decimal("0.00"))
        return float(max(Decimal("0.00"), total_comm - total_paid))

    def get_advance_credit_balance(self, obj):
        records = obj.commission_records.exclude(status=CommissionStatus.CANCELLED)
        total_comm = sum((r.net_payable_amount for r in records), Decimal("0.00"))
        total_paid = sum((r.paid_amount for r in records), Decimal("0.00"))
        return float(max(Decimal("0.00"), total_paid - total_comm))

    def get_total_commission(self, obj):
        records = obj.commission_records.exclude(status=CommissionStatus.CANCELLED)
        return float(sum((r.net_payable_amount for r in records), Decimal("0.00")))

    def get_total_paid(self, obj):
        records = obj.commission_records.exclude(status=CommissionStatus.CANCELLED)
        return float(sum((r.paid_amount for r in records), Decimal("0.00")))

    def get_total_adjusted(self, obj):
        records = obj.commission_records.exclude(status=CommissionStatus.CANCELLED)
        return float(sum((r.adjusted_amount for r in records), Decimal("0.00")))

    def validate_commission_percentage(self, value):
        if value is not None:
            if value < Decimal("0.00"):
                raise serializers.ValidationError("Commission percentage cannot be negative.")
            if value > Decimal("100.00"):
                raise serializers.ValidationError("Commission percentage cannot exceed 100%.")
        return value

    def validate_commission_amount_unit(self, value):
        if value is not None and value <= Decimal("0.00"):
            raise serializers.ValidationError("Commission amount unit must be greater than zero.")
        return value

    def validate(self, attrs):
        method = attrs.get("commission_method") or (self.instance.commission_method if self.instance else "FIXED_PERCENTAGE")
        amount_unit = attrs.get("commission_amount_unit") if "commission_amount_unit" in attrs else (self.instance.commission_amount_unit if self.instance else None)
        pct = attrs.get("commission_percentage") if "commission_percentage" in attrs else (self.instance.commission_percentage if self.instance else Decimal("0.00"))

        if method == "PROGRESSIVE":
            if not amount_unit or amount_unit <= Decimal("0.00"):
                raise serializers.ValidationError({
                    "commission_amount_unit": "Commission amount unit is required and must be greater than zero for Progressive / Per-Money method (Level 2)."
                })
            if pct is None or pct < Decimal("0.00"):
                raise serializers.ValidationError({
                    "commission_percentage": "Commission percentage must be a valid non-negative number."
                })
        return attrs

    def validate_code(self, value):
        if value and value.strip():
            code = value.strip()
            qs = SalesAgent.objects.filter(code__iexact=code)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(f"An agent with code '{code}' already exists.")
            return code
        return value

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Agent name is required.")
        return value.strip()


class CommissionPaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for commission payment records.
    """
    payment_account_name = serializers.CharField(source="payment_account.name", read_only=True)
    payment_account_code = serializers.CharField(source="payment_account.code", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = CommissionPayment
        fields = [
            "id",
            "payment_number",
            "commission_record",
            "amount",
            "payment_date",
            "payment_account",
            "payment_account_name",
            "payment_account_code",
            "journal_entry",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "payment_number", "created_by", "created_by_name", "created_at"]


class CommissionAdjustmentSerializer(serializers.ModelSerializer):
    """
    Serializer for sales return commission adjustments.
    """
    return_number = serializers.CharField(source="sales_return.return_number", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    returned_base_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    reversal_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = CommissionAdjustment
        fields = [
            "id",
            "commission_record",
            "sales_return",
            "return_number",
            "returned_base_amount",
            "reversal_amount",
            "journal_entry",
            "date",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "created_at"]


class CommissionRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for Commission Records and Payables list & details.
    """
    invoice_number = serializers.CharField(source="sale.invoice_number", read_only=True)
    customer_name = serializers.CharField(source="sale.customer.name", read_only=True)
    customer_id = serializers.CharField(source="sale.customer.customer_id", read_only=True)
    sale_grand_total = serializers.DecimalField(source="sale.grand_total", max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)
    sales_agent_name = serializers.CharField(source="sales_agent.name", read_only=True)
    sales_agent_code = serializers.CharField(source="sales_agent.code", read_only=True)
    sales_agent_is_active = serializers.BooleanField(source="sales_agent.is_active", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    commission_percentage = serializers.DecimalField(source="commission_percentage_snapshot", max_digits=5, decimal_places=2, coerce_to_string=False, read_only=True)
    commission_method = serializers.CharField(source="commission_method_snapshot", read_only=True)
    commission_amount_unit = serializers.DecimalField(source="commission_amount_unit_snapshot", max_digits=14, decimal_places=2, coerce_to_string=False, read_only=True)
    effective_commission_percentage = serializers.DecimalField(max_digits=8, decimal_places=4, coerce_to_string=False, read_only=True)
    commission_base = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    commission_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    adjusted_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    net_payable_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)
    remaining_payable_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)
    advance_credit_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)

    payments = CommissionPaymentSerializer(many=True, read_only=True)
    adjustments = CommissionAdjustmentSerializer(many=True, read_only=True)

    class Meta:
        model = CommissionRecord
        fields = [
            "id",
            "commission_number",
            "sale",
            "invoice_number",
            "customer_name",
            "customer_id",
            "sale_grand_total",
            "sales_agent",
            "sales_agent_name",
            "sales_agent_code",
            "sales_agent_is_active",
            "agent_name_snapshot",
            "agent_code_snapshot",
            "commission_method",
            "commission_method_snapshot",
            "commission_amount_unit",
            "commission_amount_unit_snapshot",
            "commission_percentage",
            "effective_commission_percentage",
            "commission_base",
            "commission_amount",
            "adjusted_amount",
            "net_payable_amount",
            "paid_amount",
            "remaining_payable_amount",
            "advance_credit_amount",
            "status",
            "status_display",
            "date",
            "journal_entry",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
            "payments",
            "adjustments",
        ]
        read_only_fields = fields


class PayCommissionSerializer(serializers.Serializer):
    """
    Payload validation for paying a commission record.
    """
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"), required=True)
    payment_account = serializers.IntegerField(required=True)
    payment_date = serializers.DateField(required=False, allow_null=True)
    date = serializers.DateField(required=False, allow_null=True)
    payment_method = serializers.CharField(required=False, allow_blank=True, default="CASH")
    cheque_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cheque_date = serializers.DateField(required=False, allow_null=True)
    cheque_bank = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("payment_date") and attrs.get("date"):
            attrs["payment_date"] = attrs.get("date")
        return attrs


class SettleAgentCommissionSerializer(serializers.Serializer):
    """
    Payload validation for settling total commission payables for a sales agent across vouchers (FIFO).
    """
    sales_agent = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"), required=True)
    payment_account = serializers.IntegerField(required=True)
    payment_date = serializers.DateField(required=False, allow_null=True)
    date = serializers.DateField(required=False, allow_null=True)
    payment_method = serializers.CharField(required=False, allow_blank=True, default="CASH")
    cheque_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cheque_date = serializers.DateField(required=False, allow_null=True)
    cheque_bank = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("payment_date") and attrs.get("date"):
            attrs["payment_date"] = attrs.get("date")
        return attrs

