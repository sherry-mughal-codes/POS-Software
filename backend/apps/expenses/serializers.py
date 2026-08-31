"""
DRF Serializers for Expenses and Cash/Bank Account Transfers.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.accounting.models import Account, AccountType
from .models import Expense, ExpenseStatus, AccountTransfer, TransferStatus


class ExpenseSerializer(serializers.ModelSerializer):
    expense_account_name = serializers.CharField(source="expense_account.name", read_only=True)
    expense_account_code = serializers.CharField(source="expense_account.code", read_only=True)
    payment_account_name = serializers.CharField(source="payment_account.name", read_only=True)
    payment_account_code = serializers.CharField(source="payment_account.code", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()
    cancelled_by_name = serializers.SerializerMethodField()
    journal_entry_number = serializers.CharField(source="journal_entry.entry_number", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_number",
            "date",
            "expense_account",
            "expense_account_name",
            "expense_account_code",
            "description",
            "amount",
            "payment_method",
            "payment_account",
            "payment_account_name",
            "payment_account_code",
            "cheque_number",
            "cheque_date",
            "cheque_bank",
            "reference_no",
            "attachment",
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
            "expense_number",
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


class ExpenseCreateSerializer(serializers.ModelSerializer):
    submit_now = serializers.BooleanField(default=False, write_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "date",
            "expense_account",
            "description",
            "amount",
            "payment_method",
            "payment_account",
            "cheque_number",
            "cheque_date",
            "cheque_bank",
            "reference_no",
            "attachment",
            "notes",
            "submit_now",
        ]

    def validate_amount(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate_expense_account(self, value):
        if value.account_type != AccountType.EXPENSE:
            raise serializers.ValidationError(f"Selected account '{value.name}' is not an Expense account.")
        
        name_lower = value.name.lower()
        if value.code in ["5000", "5100"] or (value.parent is None and not value.code.startswith("50")):
            raise serializers.ValidationError(
                f"Account [{value.code}] {value.name} is a parent header group. Direct or indirect expenses cannot be recorded to a parent group. Please select a specific expense sub-account."
            )

        if (
            value.code in ["5000", "5010", "5080"]
            or "cogs" in name_lower
            or "cost of goods" in name_lower
            or (value.parent and value.parent.code == "5000")
        ):
            raise serializers.ValidationError(
                f"Account [{value.code}] {value.name} is a Direct Expense (COGS / Inventory adjustments) and cannot be recorded manually. Please select an Indirect Expense account."
            )
        return value

    def validate_payment_account(self, value):
        if value.account_type != AccountType.ASSET:
            raise serializers.ValidationError(f"Selected payment account '{value.name}' is not an Asset (Cash/Bank) account.")
        return value


class AccountTransferSerializer(serializers.ModelSerializer):
    from_account_name = serializers.CharField(source="from_account.name", read_only=True)
    from_account_code = serializers.CharField(source="from_account.code", read_only=True)
    to_account_name = serializers.CharField(source="to_account.name", read_only=True)
    to_account_code = serializers.CharField(source="to_account.code", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    cancelled_by_name = serializers.SerializerMethodField()
    journal_entry_number = serializers.CharField(source="journal_entry.entry_number", read_only=True)

    class Meta:
        model = AccountTransfer
        fields = [
            "id",
            "transfer_number",
            "date",
            "from_account",
            "from_account_name",
            "from_account_code",
            "to_account",
            "to_account_name",
            "to_account_code",
            "amount",
            "reference",
            "notes",
            "status",
            "status_display",
            "journal_entry",
            "journal_entry_number",
            "created_by",
            "created_by_name",
            "cancelled_by",
            "cancelled_by_name",
            "cancelled_at",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "transfer_number",
            "status",
            "journal_entry",
            "created_by",
            "cancelled_by",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"

    def get_cancelled_by_name(self, obj):
        if obj.cancelled_by:
            return obj.cancelled_by.get_full_name() or obj.cancelled_by.username
        return None


class AccountTransferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountTransfer
        fields = [
            "id",
            "date",
            "from_account",
            "to_account",
            "amount",
            "reference",
            "notes",
        ]

    def validate(self, attrs):
        from_acc = attrs.get("from_account")
        to_acc = attrs.get("to_account")
        amount = attrs.get("amount")

        if from_acc and to_acc and from_acc.id == to_acc.id:
            raise serializers.ValidationError("Source (From) and Destination (To) accounts cannot be the same account.")
        if amount and amount <= Decimal("0.00"):
            raise serializers.ValidationError("Transfer amount must be greater than zero.")
        if from_acc and from_acc.account_type != AccountType.ASSET:
            raise serializers.ValidationError(f"Source account '{from_acc.name}' must be an Asset (Cash/Bank) account.")
        if to_acc and to_acc.account_type != AccountType.ASSET:
            raise serializers.ValidationError(f"Destination account '{to_acc.name}' must be an Asset (Cash/Bank) account.")
        return attrs
