"""
API views for double-entry accounts, journal ledger, financial reports, and transaction simulations.
"""

from decimal import Decimal
from datetime import datetime
from django.db import models
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.accounting.models import Account, JournalEntry, PaymentMethod, JournalEntryStatus
from apps.accounting.serializers import (
    AccountSerializer,
    JournalEntrySerializer,
    JournalEntryCreateSerializer,
    PaymentMethodSerializer,
    TransactionSimulationSerializer,
)
from apps.accounting.services import AccountingService
from apps.core.permissions import IsAdminOrManager


class AccountViewSet(viewsets.ModelViewSet):
    """
    Chart of Accounts management API.
    """
    queryset = Account.objects.all().select_related("parent").prefetch_related("children")
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        acc_type = self.request.query_params.get("account_type")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")

        if acc_type:
            qs = qs.filter(account_type=acc_type)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        
        leaf_only = self.request.query_params.get("leaf_only") or self.request.query_params.get("is_leaf")
        if leaf_only is not None and leaf_only.lower() == "true":
            qs = qs.filter(children__isnull=True)
        elif leaf_only is not None and leaf_only.lower() == "false":
            qs = qs.filter(children__isnull=False).distinct()

        parent_code = self.request.query_params.get("parent_code")
        if parent_code:
            qs = qs.filter(parent__code=parent_code)

        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {"detail": f"Cannot delete account [{instance.code}] {instance.name} because it is a core system default account required for automated accounting operations."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if instance.children.exists():
            return Response(
                {"detail": f"Cannot delete parent group [{instance.code}] {instance.name} because it contains {instance.children.count()} child sub-account(s). Please delete or reassign its sub-accounts first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        journal_items_count = instance.journal_items.count()
        if journal_items_count > 0:
            return Response(
                {"detail": f"Cannot delete account [{instance.code}] {instance.name} because it contains {journal_items_count} recorded transaction entry(ies) in the General Ledger. To preserve financial audit integrity, accounts with transaction history cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.expenses.models import Expense
        from apps.accounting.models import PaymentMethod
        if PaymentMethod.objects.filter(linked_account=instance).exists():
            return Response(
                {"detail": f"Cannot delete account [{instance.code}] {instance.name} because it is currently configured as the linked account for a Payment Method."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Expense.objects.filter(models.Q(payment_account=instance) | models.Q(expense_account=instance)).exists():
            return Response(
                {"detail": f"Cannot delete account [{instance.code}] {instance.name} because it is referenced by existing expense vouchers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": f"Cannot delete account [{instance.code}] {instance.name}: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"])
    def ledger(self, request, pk=None):
        """Returns statement of account with running balance."""
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        ledger_data = AccountingService.get_account_ledger(pk, start_date, end_date)
        return Response(ledger_data)

    @action(detail=True, methods=["post"], url_path="set-opening-balance", permission_classes=[IsAdminOrManager])
    def set_opening_balance(self, request, pk=None):
        """
        Sets or adjusts the account opening balance against Owner's Capital / Equity (3010).
        Automatically creates balanced double-entry.
        """
        from apps.accounting.models import ReferenceType
        from django.utils import timezone
        account = self.get_object()
        amount_raw = request.data.get("amount", "0.00")
        try:
            amount = Decimal(str(amount_raw))
        except Exception:
            return Response({"detail": "Invalid amount specified."}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= Decimal("0.00"):
            return Response({"detail": "Opening balance amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        date_val = request.data.get("date") or timezone.localdate()
        narration = request.data.get("narration") or f"Opening balance setup for [{account.code}] {account.name}"

        equity_acc = Account.objects.get(code="3010")

        # If Asset or Expense account (Normal Debit balance)
        if account.normal_balance == "DEBIT":
            lines = [
                {"account": account, "debit": amount, "credit": Decimal("0.00"), "description": f"Opening balance for {account.name}"},
                {"account": equity_acc, "debit": Decimal("0.00"), "credit": amount, "description": f"Opening capital equity from [{account.code}] {account.name}"},
            ]
        else:
            lines = [
                {"account": equity_acc, "debit": amount, "credit": Decimal("0.00"), "description": f"Opening capital equity offset for [{account.code}] {account.name}"},
                {"account": account, "debit": Decimal("0.00"), "credit": amount, "description": f"Opening balance for {account.name}"},
            ]

        je = AccountingService.create_journal_entry(
            entry_date=date_val,
            reference_type=ReferenceType.OPENING_BALANCE,
            reference_id=f"OB-{account.code}",
            lines=lines,
            narration=narration,
            created_by=request.user,
        )

        return Response({
            "message": f"Opening balance of Rs. {amount:,.2f} recorded for {account.name}.",
            "journal_entry": JournalEntrySerializer(je).data,
            "new_balance": float(account.get_current_balance()),
            "equity_balance": float(equity_acc.get_current_balance()),
        })


class JournalEntryViewSet(viewsets.ModelViewSet):
    """
    Journal Entries general ledger transaction manager with manual creation and reversal.
    """
    queryset = JournalEntry.objects.all().select_related("created_by").prefetch_related("lines__account")
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "reverse", "destroy", "update", "partial_update"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        ref_type = self.request.query_params.get("reference_type")
        ref_id = self.request.query_params.get("reference_id")
        status_val = self.request.query_params.get("status")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if ref_type:
            qs = qs.filter(reference_type=ref_type)
        if ref_id:
            qs = qs.filter(reference_id__icontains=ref_id)
        if status_val:
            qs = qs.filter(status=status_val)
        if start_date:
            qs = qs.filter(entry_date__gte=start_date)
        if end_date:
            qs = qs.filter(entry_date__lte=end_date)

        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(entry_number__icontains=search)
                | models.Q(reference_id__icontains=search)
                | models.Q(narration__icontains=search)
                | models.Q(lines__account__name__icontains=search)
                | models.Q(lines__account__code__icontains=search)
            ).distinct()

        return qs

    def create(self, request, *args, **kwargs):
        serializer = JournalEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        lines_data = []
        for line in data["lines"]:
            lines_data.append({
                "account": line["account"],
                "debit": line.get("debit", Decimal("0.00")),
                "credit": line.get("credit", Decimal("0.00")),
                "description": line.get("description", ""),
            })

        ref_type = data.get("reference_type") or data.get("purpose") or "MANUAL"

        try:
            entry = AccountingService.create_journal_entry(
                entry_date=data.get("entry_date"),
                reference_type=ref_type,
                reference_id=data.get("reference_id") or "",
                lines=lines_data,
                narration=data["narration"],
                created_by=request.user,
            )
            return Response(JournalEntrySerializer(entry).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminOrManager])
    def reverse(self, request, pk=None):
        """Generates an exact counter-entry to reverse a posted transaction."""
        entry = self.get_object()
        reason = request.data.get("reason", "Manual Reversal")
        try:
            reversal = AccountingService.reverse_entry(entry, reason, created_by=request.user)
            return Response(JournalEntrySerializer(reversal).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    Configurable payment methods API.
    """
    queryset = PaymentMethod.objects.all().select_related("linked_account")
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]


class TrialBalanceView(APIView):
    """
    Trial balance report verifying Sum(Debit) == Sum(Credit).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        as_of_date = request.query_params.get("as_of_date")
        data = AccountingService.get_trial_balance(as_of_date)
        return Response(data)


class IncomeStatementView(APIView):
    """
    Profit & Loss / Income Statement report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        data = AccountingService.get_income_statement(start_date, end_date)
        return Response(data)


class BalanceSheetView(APIView):
    """
    Balance Sheet report: Assets = Liabilities + Equity.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        as_of_date = request.query_params.get("as_of_date")
        data = AccountingService.get_balance_sheet(as_of_date)
        return Response(data)


class TransactionSimulationView(APIView):
    """
    Interactive test harness for simulating business transactions and verifying double-entry creation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransactionSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tx_type = data["transaction_type"]
        ref_id = data["reference_id"]
        amount = data["amount"]
        paid_amount = data.get("paid_amount", amount)
        payment_code = data.get("payment_account_code", "1010")
        cogs_amount = data.get("cogs_amount", Decimal("0.00"))
        party = data.get("customer_or_supplier_name", "Test Party")
        narration = data.get("narration", "")

        # Lookup standard accounts
        payment_acc = Account.objects.filter(code=payment_code).first() or Account.objects.get(code="1010")
        sales_acc = Account.objects.filter(code="4010").first()
        receivable_acc = Account.objects.filter(code="1030").first()
        payable_acc = Account.objects.filter(code="2010").first()
        inventory_acc = Account.objects.filter(code="1040").first()
        cogs_acc = Account.objects.filter(code="5010").first()
        return_acc = Account.objects.filter(code="4020").first() or sales_acc

        try:
            if tx_type == "CASH_SALE":
                entry = AccountingService.record_sale(
                    sale_ref=ref_id,
                    total_amount=amount,
                    paid_amount=amount,
                    payment_account=payment_acc,
                    sales_revenue_account=sales_acc,
                    cogs_amount=cogs_amount,
                    cogs_account=cogs_acc,
                    inventory_account=inventory_acc,
                    created_by=request.user,
                )
            elif tx_type == "CREDIT_SALE":
                entry = AccountingService.record_sale(
                    sale_ref=ref_id,
                    total_amount=amount,
                    paid_amount=paid_amount,
                    payment_account=payment_acc,
                    sales_revenue_account=sales_acc,
                    customer_receivable_account=receivable_acc,
                    cogs_amount=cogs_amount,
                    cogs_account=cogs_acc,
                    inventory_account=inventory_acc,
                    created_by=request.user,
                )
            elif tx_type == "SALE_RETURN":
                entry = AccountingService.record_sale_return(
                    return_ref=ref_id,
                    total_amount=amount,
                    refunded_amount=paid_amount,
                    payment_account=payment_acc,
                    sales_return_account=return_acc,
                    customer_receivable_account=receivable_acc,
                    restocked_cost=cogs_amount,
                    cogs_account=cogs_acc,
                    inventory_account=inventory_acc,
                    created_by=request.user,
                )
            elif tx_type == "CUSTOMER_PAYMENT":
                entry = AccountingService.record_customer_payment(
                    payment_ref=ref_id,
                    customer_name=party,
                    amount=amount,
                    payment_account=payment_acc,
                    receivable_account=receivable_acc,
                    created_by=request.user,
                )
            elif tx_type == "SUPPLIER_PURCHASE":
                entry = AccountingService.record_purchase(
                    purchase_ref=ref_id,
                    total_amount=amount,
                    paid_amount=paid_amount,
                    payment_account=payment_acc,
                    inventory_account=inventory_acc,
                    supplier_payable_account=payable_acc,
                    created_by=request.user,
                )
            elif tx_type == "EXPENSE":
                expense_code = data.get("secondary_account_code", "5040") # Utilities default
                expense_acc = Account.objects.filter(code=expense_code).first() or Account.objects.get(code="5040")
                entry = AccountingService.record_expense(
                    expense_ref=ref_id,
                    expense_account=expense_acc,
                    payment_account=payment_acc,
                    amount=amount,
                    narration=narration or f"Simulated Expense for {expense_acc.name}",
                    created_by=request.user,
                )
            else:
                return Response({"detail": "Unknown transaction type."}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                "message": f"Successfully posted {tx_type} transaction.",
                "journal_entry": JournalEntrySerializer(entry).data,
            }, status=status.HTTP_201_CREATED)

        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
