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
)


class SalesAgentSerializer(serializers.ModelSerializer):
    """
    Serializer for full Sales Agent CRUD operations.
    """
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = SalesAgent
        fields = [
            "id",
            "name",
            "code",
            "phone",
            "email",
            "address",
            "commission_percentage",
            "joining_date",
            "is_active",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "created_at", "updated_at"]

    def validate_commission_percentage(self, value):
        if value is not None:
            if value < Decimal("0.00"):
                raise serializers.ValidationError("Commission percentage cannot be negative.")
            if value > Decimal("100.00"):
                raise serializers.ValidationError("Commission percentage cannot exceed 100%.")
        return value

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
            "commission_percentage",
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
    payment_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
