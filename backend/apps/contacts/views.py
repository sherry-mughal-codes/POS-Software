"""
API views for Customers, Suppliers, and Customer Payments.
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.contacts.models import Customer, Supplier, CustomerPayment, CustomerPaymentStatus
from apps.contacts.serializers import (
    CustomerSerializer,
    SupplierSerializer,
    CustomerPaymentSerializer,
    CustomerPaymentCreateSerializer,
)
from apps.contacts.services import CustomerReceivableService
from apps.core.permissions import IsAdminOrManager


class CustomerViewSet(viewsets.ModelViewSet):
    """
    Customer Master Data API with phone search, credit eligibility, and auto-ID generator.
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["destroy", "toggle_status"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        credit_enabled = self.request.query_params.get("credit_enabled")
        is_active = self.request.query_params.get("is_active")

        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(name__icontains=search)
                | models.Q(phone__icontains=search)
                | models.Q(customer_id__icontains=search)
            )
        if credit_enabled is not None:
            qs = qs.filter(credit_enabled=credit_enabled.lower() == "true")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs

    def destroy(self, request, *args, **kwargs):
        customer = self.get_object()
        if customer.is_walkin:
            return Response(
                {"detail": "The default system Walk-in Customer cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(customer)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="next-id")
    def next_id(self, request):
        """Generates the next sequential customer identifier (e.g. CUS-0001, CUS-0002)."""
        return Response({"next_id": Customer.generate_customer_id()})

    @action(detail=False, methods=["get"], url_path="walkin")
    def walkin(self, request):
        """Retrieves the default Walk-in Customer record for anonymous POS checkouts."""
        walkin = Customer.objects.filter(is_walkin=True).first()
        if not walkin:
            walkin = Customer.objects.create(
                customer_id="CUS-000001",
                name="Walk-in Customer",
                is_walkin=True,
                credit_enabled=False,
                is_active=True,
                notes="Default system record for anonymous counter sales",
            )
        return Response(CustomerSerializer(walkin).data)

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        """Soft-deactivates or reactivates a registered customer."""
        customer = self.get_object()
        if customer.is_walkin:
            return Response(
                {"detail": "The Walk-in Customer must always remain active."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        customer.is_active = not customer.is_active
        customer.save(update_fields=["is_active", "updated_at"])
        return Response({
            "id": customer.id,
            "name": customer.name,
            "is_active": customer.is_active,
            "detail": f"Customer '{customer.name}' is now {'active' if customer.is_active else 'inactive'}.",
        })

    @action(detail=True, methods=["get"], url_path="statement")
    def statement(self, request, pk=None):
        """Generates comprehensive chronological statement of account for customer."""
        customer = self.get_object()
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        statement_data = CustomerReceivableService.get_customer_statement(
            customer_id=customer.id,
            start_date=start_date,
            end_date=end_date,
        )
        return Response(statement_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="outstanding")
    def outstanding(self, request, pk=None):
        """Returns authoritative current outstanding receivable balance calculation."""
        customer = self.get_object()
        data = CustomerReceivableService.get_customer_outstanding(customer.id)
        return Response(data, status=status.HTTP_200_OK)


class SupplierViewSet(viewsets.ModelViewSet):
    """
    Supplier Master Data API for purchasing and payables.
    """
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "toggle_status"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")

        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(name__icontains=search)
                | models.Q(company_name__icontains=search)
                | models.Q(phone__icontains=search)
                | models.Q(supplier_id__icontains=search)
            )
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs

    @action(detail=False, methods=["get"], url_path="next-id")
    def next_id(self, request):
        """Generates the next sequential supplier identifier (e.g. SUP-000001)."""
        return Response({"next_id": Supplier.generate_supplier_id()})

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        """Soft-deactivates or reactivates a supplier."""
        supplier = self.get_object()
        supplier.is_active = not supplier.is_active
        supplier.save(update_fields=["is_active", "updated_at"])
        return Response({
            "id": supplier.id,
            "name": supplier.name,
            "is_active": supplier.is_active,
            "detail": f"Supplier '{supplier.name}' is now {'active' if supplier.is_active else 'inactive'}.",
        })


class CustomerPaymentViewSet(viewsets.ModelViewSet):
    """
    CRUD and workflow operations for Customer Payments against Accounts Receivable.
    """
    queryset = CustomerPayment.objects.all().select_related("customer", "payment_account", "created_by", "submitted_by", "cancelled_by")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return CustomerPaymentCreateSerializer
        return CustomerPaymentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        customer_id = self.request.query_params.get("customer")
        status_filter = self.request.query_params.get("status")
        payment_method = self.request.query_params.get("payment_method")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        search = self.request.query_params.get("search")

        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(
                models.Q(payment_number__icontains=search)
                | models.Q(customer__name__icontains=search)
                | models.Q(reference__icontains=search)
            )

        return qs

    def create(self, request, *args, **kwargs):
        serializer = CustomerPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submit_now = serializer.validated_data.pop("submit_now", True)

        try:
            payment = CustomerReceivableService.create_payment(
                data=serializer.validated_data,
                user=request.user,
                submit_now=submit_now,
            )
            output_serializer = CustomerPaymentSerializer(payment)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """Submits a draft payment voucher and creates Accounts Receivable journal entry."""
        payment = self.get_object()
        try:
            submitted_payment = CustomerReceivableService.submit_payment(payment=payment, user=request.user)
            return Response(CustomerPaymentSerializer(submitted_payment).data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancels a payment voucher and posts Accounts Receivable counter-reversal."""
        payment = self.get_object()
        reason = request.data.get("reason", "").strip()
        try:
            cancelled_payment = CustomerReceivableService.cancel_payment(payment=payment, user=request.user, reason=reason)
            return Response(CustomerPaymentSerializer(cancelled_payment).data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)


class CustomerReceivablesReportView(APIView):
    """
    Master analytical report for Customer Accounts Receivable and Outstanding balances.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        customer_id = request.query_params.get("customer")
        status_param = request.query_params.get("status")

        report_data = CustomerReceivableService.get_receivables_report(
            start_date=start_date,
            end_date=end_date,
            customer_id=int(customer_id) if customer_id else None,
            status=status_param,
        )
        return Response(report_data, status=status.HTTP_200_OK)
