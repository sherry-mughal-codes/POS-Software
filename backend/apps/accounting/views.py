"""
API views for double-entry accounts, journal ledger, financial reports, and transaction simulations.
"""

from decimal import Decimal
from datetime import datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.accounting.models import Account, JournalEntry, PaymentMethod, JournalEntryStatus
from apps.accounting.serializers import (
    AccountSerializer,
    JournalEntrySerializer,
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
            qs = qs.filter(models.Q(name__icontains=search) | models.Q(code__icontains=search))
        return qs

    def perform_destroy(self, instance):
        if instance.is_system:
            return Response(
                {"detail": "System accounts cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if instance.journal_items.exists():
            return Response(
                {"detail": "Cannot delete account with existing journal transactions. Deactivate it instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()

    @action(detail=True, methods=["get"])
    def ledger(self, request, pk=None):
        """Returns statement of account with running balance."""
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        ledger_data = AccountingService.get_account_ledger(pk, start_date, end_date)
        return Response(ledger_data)


class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Immutable Journal Entries transaction viewer with reversal action.
    """
    queryset = JournalEntry.objects.all().select_related("created_by").prefetch_related("lines__account")
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

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
        return qs

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
