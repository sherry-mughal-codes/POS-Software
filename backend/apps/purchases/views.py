"""
API views for Purchases, Returns, Supplier Payments, and Reports.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import models

from apps.purchases.models import Purchase, PurchaseReturn, SupplierPayment
from apps.purchases.serializers import (
    PurchaseSerializer,
    PurchaseCreateSerializer,
    PurchaseReturnSerializer,
    PurchaseReturnCreateSerializer,
    SupplierPaymentSerializer,
    SupplierPaymentCreateSerializer,
)
from apps.purchases.services import PurchaseService
from apps.contacts.models import Supplier
from apps.accounting.models import PaymentMethod, Account
from apps.core.permissions import IsAdminOrManager


class PurchaseViewSet(viewsets.ModelViewSet):
    """
    Purchase Orders Management API.
    """
    queryset = Purchase.objects.all().select_related("supplier", "payment_method", "created_by").prefetch_related("items__product", "items__product__unit")
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "submit", "cancel"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        supplier_id = self.request.query_params.get("supplier")
        status_val = self.request.query_params.get("status")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(purchase_number__icontains=search)
                | models.Q(supplier__name__icontains=search)
                | models.Q(supplier__company_name__icontains=search)
            )
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if status_val:
            qs = qs.filter(status=status_val)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = PurchaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        supplier = Supplier.objects.get(pk=data["supplier"])
        pay_method = PaymentMethod.objects.filter(pk=data.get("payment_method")).first() if data.get("payment_method") else None
        pay_acc = Account.objects.filter(pk=data.get("payment_account")).first() if data.get("payment_account") else None

        try:
            purchase = PurchaseService.create_purchase(
                supplier=supplier,
                items_data=data["items"],
                purchase_date=data.get("date"),
                discount_amount=data.get("discount_amount", 0),
                tax_amount=data.get("tax_amount", 0),
                paid_amount=data.get("paid_amount", 0),
                payment_method=pay_method,
                payment_account=pay_acc,
                supplier_invoice_number=data.get("supplier_invoice_number"),
                supplier_invoice_file=data.get("supplier_invoice_file"),
                notes=data.get("notes", ""),
                created_by=request.user,
                submit_immediately=data.get("submit_immediately", True),
            )
            return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        purchase = self.get_object()
        if purchase.status != "DRAFT":
            return Response({"detail": "Only DRAFT purchase orders can be edited."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PurchaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        supplier = Supplier.objects.get(pk=data["supplier"])
        pay_method = PaymentMethod.objects.filter(pk=data.get("payment_method")).first() if data.get("payment_method") else None
        pay_acc = Account.objects.filter(pk=data.get("payment_account")).first() if data.get("payment_account") else None

        try:
            updated = PurchaseService.update_purchase(
                purchase=purchase,
                supplier=supplier,
                items_data=data["items"],
                purchase_date=data.get("date"),
                discount_amount=data.get("discount_amount", 0),
                tax_amount=data.get("tax_amount", 0),
                paid_amount=data.get("paid_amount", 0),
                payment_method=pay_method,
                payment_account=pay_acc,
                supplier_invoice_number=data.get("supplier_invoice_number"),
                supplier_invoice_file=data.get("supplier_invoice_file"),
                notes=data.get("notes", ""),
                submit_immediately=data.get("submit_immediately", False),
                created_by=request.user,
            )
            return Response(PurchaseSerializer(updated).data)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """Submits a draft purchase order."""
        purchase = self.get_object()
        try:
            submitted = PurchaseService.submit_purchase(purchase, created_by=request.user)
            return Response(PurchaseSerializer(submitted).data)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancels a submitted purchase order, reversing stock movements and accounting."""
        purchase = self.get_object()
        reason = request.data.get("reason", "Cancelled by user")
        try:
            cancelled = PurchaseService.cancel_purchase(purchase, reason=reason, created_by=request.user)
            return Response(PurchaseSerializer(cancelled).data)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class PurchaseReturnViewSet(viewsets.ModelViewSet):
    """
    Purchase Returns Management API.
    """
    queryset = PurchaseReturn.objects.all().select_related("original_purchase", "supplier", "created_by").prefetch_related("items__product")
    serializer_class = PurchaseReturnSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = PurchaseReturnCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        purchase = Purchase.objects.get(pk=data["purchase_id"])
        try:
            p_return = PurchaseService.process_purchase_return(
                purchase=purchase,
                items_to_return=data["items"],
                refund_method=data.get("refund_method", "PAYABLE_DEDUCTION"),
                notes=data.get("notes", ""),
                created_by=request.user,
            )
            return Response(PurchaseReturnSerializer(p_return).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class SupplierPaymentViewSet(viewsets.ModelViewSet):
    """
    Supplier Standalone Payments API.
    """
    queryset = SupplierPayment.objects.all().select_related("supplier", "payment_account", "journal_entry", "reversal_journal_entry", "created_by", "submitted_by", "cancelled_by")
    serializer_class = SupplierPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "submit", "cancel"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        supplier_id = self.request.query_params.get("supplier")
        status_filter = self.request.query_params.get("status")
        payment_method = self.request.query_params.get("payment_method")
        payment_account_id = self.request.query_params.get("payment_account")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        if payment_account_id:
            qs = qs.filter(payment_account_id=payment_account_id)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = SupplierPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            supplier = Supplier.objects.get(pk=data["supplier"])
            acc = Account.objects.get(pk=data["payment_account"])

            payment = PurchaseService.record_supplier_payment(
                supplier=supplier,
                amount=data["amount"],
                payment_method=data.get("payment_method", "CASH"),
                payment_account=acc,
                payment_date=data.get("date"),
                reference=data.get("reference", ""),
                notes=data.get("notes", ""),
                submit_now=data.get("submit_now", True),
                created_by=request.user,
            )
            return Response(SupplierPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        payment = self.get_object()
        try:
            updated = PurchaseService.submit_supplier_payment(payment, user=request.user)
            return Response(SupplierPaymentSerializer(updated).data)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        payment = self.get_object()
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response({"detail": "Cancellation reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated = PurchaseService.cancel_supplier_payment(payment, user=request.user, reason=reason)
            return Response(SupplierPaymentSerializer(updated).data)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="report")
    def report(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        supplier_id = request.query_params.get("supplier")
        payment_account_id = request.query_params.get("payment_account")
        status_val = request.query_params.get("status")

        report_data = PurchaseService.get_supplier_payables_report(
            start_date=start_date,
            end_date=end_date,
            supplier_id=supplier_id,
            payment_account_id=payment_account_id,
            status_filter=status_val,
        )
        return Response(report_data)


class SupplierStatementView(APIView):
    """
    Returns running balance, total purchases, payments, and returns for a supplier.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, supplier_id):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        try:
            statement = PurchaseService.get_supplier_statement(
                supplier_id=supplier_id,
                start_date=start_date,
                end_date=end_date,
            )
            return Response(statement)
        except Supplier.DoesNotExist:
            return Response({"detail": "Supplier not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class SupplierPayablesReportView(APIView):
    """
    Consolidated Master Supplier Payables & Payments Report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        supplier_id = request.query_params.get("supplier")
        payment_account_id = request.query_params.get("payment_account")
        status_val = request.query_params.get("status")

        report = PurchaseService.get_supplier_payables_report(
            start_date=start_date,
            end_date=end_date,
            supplier_id=supplier_id,
            payment_account_id=payment_account_id,
            status_filter=status_val,
        )
        return Response(report)


class PurchaseReportView(APIView):
    """
    Consolidated Purchase and Payables report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        supplier_id = request.query_params.get("supplier")
        status_val = request.query_params.get("status")

        report = PurchaseService.get_purchase_report(
            start_date=start_date,
            end_date=end_date,
            supplier_id=supplier_id,
            status_filter=status_val,
        )
        return Response(report)

