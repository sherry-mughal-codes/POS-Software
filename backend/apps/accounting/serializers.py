"""
Serializers for double-entry accounts, journal entries, and financial reports.
"""

from rest_framework import serializers
from apps.accounting.models import (
    Account,
    AccountType,
    JournalEntry,
    JournalItem,
    PaymentMethod,
)


class AccountSerializer(serializers.ModelSerializer):
    parent_code = serializers.CharField(source="parent.code", read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    current_balance = serializers.SerializerMethodField()
    normal_balance = serializers.CharField(read_only=True)
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id",
            "code",
            "name",
            "account_type",
            "parent",
            "parent_code",
            "parent_name",
            "is_active",
            "is_system",
            "description",
            "normal_balance",
            "current_balance",
            "children_count",
            "created_at",
            "updated_at",
        ]

    def get_current_balance(self, obj):
        return float(obj.get_current_balance())

    def get_children_count(self, obj):
        return obj.children.count()


class JournalItemSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)
    account_type = serializers.CharField(source="account.account_type", read_only=True)

    class Meta:
        model = JournalItem
        fields = [
            "id",
            "account",
            "account_code",
            "account_name",
            "account_type",
            "debit",
            "credit",
            "description",
        ]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalItemSerializer(many=True, read_only=True)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.BooleanField(read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "entry_number",
            "entry_date",
            "posting_date",
            "reference_type",
            "reference_id",
            "status",
            "narration",
            "created_by",
            "created_by_username",
            "lines",
            "total_debit",
            "total_credit",
            "is_balanced",
            "created_at",
            "updated_at",
        ]

    def get_total_debit(self, obj):
        return float(obj.total_debit)

    def get_total_credit(self, obj):
        return float(obj.total_credit)


class PaymentMethodSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="linked_account.code", read_only=True)
    account_name = serializers.CharField(source="linked_account.name", read_only=True)

    class Meta:
        model = PaymentMethod
        fields = [
            "id",
            "name",
            "code",
            "linked_account",
            "account_code",
            "account_name",
            "is_active",
            "created_at",
        ]


class JournalItemCreateSerializer(serializers.Serializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())
    debit = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    credit = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class JournalEntryCreateSerializer(serializers.Serializer):
    entry_date = serializers.DateField(required=False)
    reference_type = serializers.CharField(required=False, default="MANUAL")
    purpose = serializers.CharField(required=False, default="")
    reference_id = serializers.CharField(required=False, allow_blank=True, default="")
    narration = serializers.CharField(required=True)
    lines = JournalItemCreateSerializer(many=True, required=True)

    def validate(self, attrs):
        from decimal import Decimal
        lines = attrs.get("lines", [])
        if len(lines) < 2:
            raise serializers.ValidationError({"lines": "A journal entry must contain at least two line items (Debit and Credit)."})

        total_debit = sum(Decimal(str(l.get("debit", 0) or 0)) for l in lines)
        total_credit = sum(Decimal(str(l.get("credit", 0) or 0)) for l in lines)

        if total_debit <= Decimal("0.00"):
            raise serializers.ValidationError({"lines": "Total debited amount must be greater than zero."})

        if total_debit != total_credit:
            raise serializers.ValidationError({
                "lines": f"Journal entry is out of balance. Total Debits (Rs. {total_debit:.2f}) must equal Total Credits (Rs. {total_credit:.2f}). Difference: Rs. {abs(total_debit - total_credit):.2f}"
            })

        if attrs.get("purpose") and not attrs.get("reference_type"):
            attrs["reference_type"] = attrs["purpose"]

        return attrs


class TransactionSimulationSerializer(serializers.Serializer):
    """
    Serializer for testing automatic accounting postings for various business scenarios.
    """
    transaction_type = serializers.ChoiceField(
        choices=["CASH_SALE", "CREDIT_SALE", "SALE_RETURN", "EXPENSE", "CUSTOMER_PAYMENT", "SUPPLIER_PURCHASE"]
    )
    reference_id = serializers.CharField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    payment_account_code = serializers.CharField(required=False, default="1010")
    secondary_account_code = serializers.CharField(required=False, allow_blank=True)
    cogs_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    customer_or_supplier_name = serializers.CharField(required=False, default="Test Party")
    narration = serializers.CharField(required=False, allow_blank=True)
