"""
Serializers for Customer and Supplier Master Data and Customer Payments.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.accounting.models import Account, AccountType
from apps.contacts.models import Customer, Supplier, CustomerPayment, CustomerPaymentStatus


class CustomerSerializer(serializers.ModelSerializer):
    outstanding_balance = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "customer_id",
            "name",
            "phone",
            "email",
            "address",
            "is_walkin",
            "credit_enabled",
            "is_active",
            "opening_balance",
            "outstanding_balance",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_outstanding_balance(self, obj) -> float:
        if obj.is_walkin:
            return 0.0
        from apps.contacts.services import CustomerReceivableService
        info = CustomerReceivableService.get_customer_outstanding(obj.id)
        return float(info["outstanding_balance"])

    def validate_customer_id(self, value):
        value = value.strip().upper()
        qs = Customer.objects.filter(customer_id__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Customer ID '{value}' is already in use.")
        return value

    def validate(self, attrs):
        is_walkin = attrs.get("is_walkin", getattr(self.instance, "is_walkin", False))
        credit_enabled = attrs.get("credit_enabled", getattr(self.instance, "credit_enabled", False))

        if is_walkin and credit_enabled:
            raise serializers.ValidationError({"credit_enabled": "Credit purchases cannot be enabled for the Walk-in Customer."})

        return attrs


class SupplierSerializer(serializers.ModelSerializer):
    outstanding_payable = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            "id",
            "supplier_id",
            "name",
            "company_name",
            "phone",
            "email",
            "address",
            "tax_id",
            "is_active",
            "opening_balance",
            "outstanding_payable",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_outstanding_payable(self, obj) -> float:
        from apps.purchases.services import PurchaseService
        return float(PurchaseService.get_supplier_outstanding(obj.id))

    def validate_supplier_id(self, value):
        value = value.strip().upper()
        qs = Supplier.objects.filter(supplier_id__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Supplier ID '{value}' is already in use.")
        return value


class CustomerPaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_code = serializers.CharField(source="customer.customer_id", read_only=True)
    payment_account_name = serializers.CharField(source="payment_account.name", read_only=True)
    payment_account_code = serializers.CharField(source="payment_account.code", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()
    cancelled_by_name = serializers.SerializerMethodField()
    journal_entry_number = serializers.CharField(source="journal_entry.entry_number", read_only=True)

    class Meta:
        model = CustomerPayment
        fields = [
            "id",
            "payment_number",
            "customer",
            "customer_name",
            "customer_code",
            "date",
            "amount",
            "payment_method",
            "payment_method_display",
            "payment_account",
            "payment_account_name",
            "payment_account_code",
            "reference",
            "screenshot",
            "notes",
            "status",
            "status_display",
            "journal_entry",
            "journal_entry_number",
            "created_by",
            "created_by_name",
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
            "created_by",
            "submitted_by",
            "submitted_at",
            "cancelled_by",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.username
        return None

    def get_cancelled_by_name(self, obj):
        if obj.cancelled_by:
            return obj.cancelled_by.get_full_name() or obj.cancelled_by.username
        return None


class CustomerPaymentCreateSerializer(serializers.ModelSerializer):
    payment_account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False, allow_null=True)
    submit_now = serializers.BooleanField(default=True, write_only=True)

    class Meta:
        model = CustomerPayment
        fields = [
            "id",
            "customer",
            "date",
            "amount",
            "payment_method",
            "payment_account",
            "reference",
            "notes",
            "submit_now",
        ]

    def validate_amount(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

    def validate_customer(self, value):
        if value.is_walkin:
            raise serializers.ValidationError("Cannot record payments for the Walk-in Customer.")
        return value
