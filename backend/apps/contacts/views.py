"""
API views for Customers and Suppliers Master Data.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models

from apps.contacts.models import Customer, Supplier
from apps.contacts.serializers import CustomerSerializer, SupplierSerializer
from apps.core.permissions import IsAdminOrManager


class CustomerViewSet(viewsets.ModelViewSet):
    """
    Customer Master Data API with phone search, credit eligibility, and auto-ID generator.
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Allow Cashiers to view and register new customers at checkout
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
        """Generates the next sequential customer identifier (e.g. CUS-000005)."""
        prefix = "CUS-"
        last = Customer.objects.filter(customer_id__startswith=prefix).order_by("-id").first()
        if last:
            try:
                seq = int(last.customer_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = Customer.objects.count() + 1
        else:
            seq = Customer.objects.count() + 1
        return Response({"next_id": f"{prefix}{seq:06d}"})

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
        """Generates the next sequential supplier identifier (e.g. SUP-000006)."""
        prefix = "SUP-"
        last = Supplier.objects.filter(supplier_id__startswith=prefix).order_by("-id").first()
        if last:
            try:
                seq = int(last.supplier_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = Supplier.objects.count() + 1
        else:
            seq = Supplier.objects.count() + 1
        return Response({"next_id": f"{prefix}{seq:06d}"})

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
