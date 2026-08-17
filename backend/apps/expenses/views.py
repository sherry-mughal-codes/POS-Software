"""
API ViewSets and endpoints for Expenses and Cash/Bank Account Transfers.
"""

from django.db import models
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from .models import Expense, ExpenseStatus, AccountTransfer, TransferStatus
from .serializers import (
    ExpenseSerializer,
    ExpenseCreateSerializer,
    AccountTransferSerializer,
    AccountTransferCreateSerializer,
)
from .services import ExpenseService, TransferService


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    CRUD and workflow operations for Operational Expenses.
    """
    permission_classes = [IsAuthenticated]
    queryset = Expense.objects.all().select_related("expense_account", "payment_account", "created_by", "submitted_by", "cancelled_by")

    def get_serializer_class(self):
        if self.action == "create":
            return ExpenseCreateSerializer
        return ExpenseSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        expense_account = self.request.query_params.get("expense_account")
        payment_account = self.request.query_params.get("payment_account")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        search = self.request.query_params.get("search")

        if status_filter:
            qs = qs.filter(status=status_filter)
        if expense_account:
            qs = qs.filter(expense_account_id=expense_account)
        if payment_account:
            qs = qs.filter(payment_account_id=payment_account)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(
                models.Q(expense_number__icontains=search)
                | models.Q(description__icontains=search)
                | models.Q(reference_no__icontains=search)
                | models.Q(expense_account__name__icontains=search)
            )

        return qs

    def create(self, request, *args, **kwargs):
        serializer = ExpenseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submit_now = serializer.validated_data.pop("submit_now", False)

        try:
            expense = ExpenseService.create_expense(
                data=serializer.validated_data,
                user=request.user,
                submit_now=submit_now,
            )
            output_serializer = ExpenseSerializer(expense)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        expense = self.get_object()
        if expense.status != ExpenseStatus.DRAFT:
            return Response(
                {"detail": f"Cannot edit an expense in '{expense.status}' status. Only DRAFT expenses can be modified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        expense = self.get_object()
        if expense.status != ExpenseStatus.DRAFT:
            return Response(
                {"detail": "Cannot delete submitted or cancelled expenses. Use the Cancel workflow instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """Submits a draft expense and generates General Ledger double-entry postings."""
        expense = self.get_object()
        try:
            submitted_expense = ExpenseService.submit_expense(expense=expense, user=request.user)
            return Response(ExpenseSerializer(submitted_expense).data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancels an expense and posts General Ledger counter-reversal."""
        expense = self.get_object()
        reason = request.data.get("reason", "").strip()
        try:
            cancelled_expense = ExpenseService.cancel_expense(expense=expense, user=request.user, reason=reason)
            return Response(ExpenseSerializer(cancelled_expense).data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)


class AccountTransferViewSet(viewsets.ModelViewSet):
    """
    CRUD and cancellation for internal Cash/Bank Account Transfers.
    """
    permission_classes = [IsAuthenticated]
    queryset = AccountTransfer.objects.all().select_related("from_account", "to_account", "created_by", "cancelled_by")

    def get_serializer_class(self):
        if self.action == "create":
            return AccountTransferCreateSerializer
        return AccountTransferSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        from_account = self.request.query_params.get("from_account")
        to_account = self.request.query_params.get("to_account")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if status_filter:
            qs = qs.filter(status=status_filter)
        if from_account:
            qs = qs.filter(from_account_id=from_account)
        if to_account:
            qs = qs.filter(to_account_id=to_account)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = AccountTransferCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            transfer = TransferService.create_transfer(
                data=serializer.validated_data,
                user=request.user,
            )
            output_serializer = AccountTransferSerializer(transfer)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancels a transfer and posts General Ledger counter-reversal."""
        transfer = self.get_object()
        reason = request.data.get("reason", "").strip()
        try:
            cancelled_trf = TransferService.cancel_transfer(transfer=transfer, user=request.user, reason=reason)
            return Response(AccountTransferSerializer(cancelled_trf).data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)


class ExpenseReportView(APIView):
    """
    Comprehensive multi-dimensional report for operational expenses.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        expense_account_id = request.query_params.get("expense_account")
        payment_account_id = request.query_params.get("payment_account")
        user_id = request.query_params.get("user")
        status_param = request.query_params.get("status")

        report_data = ExpenseService.get_expense_report(
            start_date=start_date,
            end_date=end_date,
            expense_account_id=expense_account_id,
            payment_account_id=payment_account_id,
            user_id=user_id,
            status=status_param,
        )
        return Response(report_data, status=status.HTTP_200_OK)
