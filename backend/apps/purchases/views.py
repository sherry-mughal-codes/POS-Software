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
                notes=data.get("notes", ""),
                created_by=request.user,
                submit_immediately=data.get("submit_immediately", True),
            )
            return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)
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
    queryset = SupplierPayment.objects.all().select_related("supplier", "payment_method", "created_by")
    serializer_class = SupplierPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        supplier_id = request.data.get("supplier")
        amount = request.data.get("amount")
        method_id = request.data.get("payment_method")
        account_id = request.data.get("payment_account")
        reference = request.data.get("reference", "")
        notes = request.data.get("notes", "")

        if not supplier_id or not amount or not method_id:
            return Response({"detail": "Supplier, Amount, and Payment Method are required."}, status=status.HTTP_400_BAD_REQUEST)

        supplier = Supplier.objects.get(pk=supplier_id)
        pm = PaymentMethod.objects.get(pk=method_id)
        
        acc = None
        if account_id:
            candidate = Account.objects.filter(pk=account_id).first()
            if candidate and candidate.code != "1000":
                acc = candidate
        if not acc:
            acc = pm.linked_account or Account.objects.filter(code="1010").first()

        try:
            payment = PurchaseService.record_supplier_payment(
                supplier=supplier,
                amount=amount,
                payment_method=pm,
                payment_account=acc,
                reference=reference,
                notes=notes,
                created_by=request.user,
            )
            return Response(SupplierPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class SupplierStatementView(APIView):
    """
    Returns running balance, total purchases, payments, and returns for a supplier.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, supplier_id):
        try:
            statement = PurchaseService.get_supplier_statement(supplier_id)
            return Response(statement)
        except Supplier.DoesNotExist:
            return Response({"detail": "Supplier not found."}, status=status.HTTP_404_NOT_FOUND)


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
