"""
API views for Product Master, Categories, and Units of Measure.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models

from apps.products.models import Category, Unit, Product
from apps.products.serializers import (
    CategorySerializer,
    UnitSerializer,
    ProductSerializer,
)
from apps.core.permissions import IsAdminOrManager


class CategoryViewSet(viewsets.ModelViewSet):
    """
    Product Category Management API.
    """
    queryset = Category.objects.all().select_related("parent").prefetch_related("products", "children")
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.products.exists():
            return Response(
                {"detail": f"Cannot delete category '{instance.name}' because it contains {instance.products.count()} associated products. Reassign or deactivate them first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if instance.children.exists():
            return Response(
                {"detail": f"Cannot delete category '{instance.name}' because it has subcategories."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UnitViewSet(viewsets.ModelViewSet):
    """
    Units of Measurement Management API.
    """
    queryset = Unit.objects.all().prefetch_related("products")
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.products.exists():
            return Response(
                {"detail": f"Cannot delete unit '{instance.name}' because it is assigned to {instance.products.count()} products."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductViewSet(viewsets.ModelViewSet):
    """
    Product Master Catalog API with search, barcode lookup, category filtering, and soft-deactivation.
    """
    queryset = Product.objects.all().select_related("category", "unit")
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "toggle_status"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        category_id = self.request.query_params.get("category")
        unit_id = self.request.query_params.get("unit")
        is_active = self.request.query_params.get("is_active")

        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(name__icontains=search)
                | models.Q(sku__icontains=search)
                | models.Q(barcode__iexact=search)
            )
        if category_id:
            qs = qs.filter(category_id=category_id)
        if unit_id:
            qs = qs.filter(unit_id=unit_id)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs

    @action(detail=False, methods=["get"], url_path="lookup-barcode")
    def lookup_barcode(self, request):
        """Instant exact barcode lookup for POS scanner input."""
        barcode = request.query_params.get("barcode", "").strip()
        if not barcode:
            return Response({"detail": "Barcode parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        product = Product.objects.filter(barcode=barcode).first()
        if not product:
            return Response({"detail": f"No product found for barcode '{barcode}'."}, status=status.HTTP_404_NOT_FOUND)

        return Response(ProductSerializer(product).data)

    @action(detail=False, methods=["get"], url_path="next-sku")
    def next_sku(self, request):
        """Generates the next sequential recommended SKU (e.g. PRD-00029)."""
        prefix = "PRD-"
        last_product = Product.objects.filter(sku__startswith=prefix).order_by("-id").first()
        if last_product:
            try:
                seq = int(last_product.sku.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = Product.objects.count() + 1
        else:
            seq = Product.objects.count() + 1

        next_code = f"{prefix}{seq:05d}"
        return Response({"next_sku": next_code})

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        """Soft-deactivates or reactivates a product without deleting historical records."""
        product = self.get_object()
        product.is_active = not product.is_active
        product.save(update_fields=["is_active", "updated_at"])

        return Response({
            "id": product.id,
            "name": product.name,
            "is_active": product.is_active,
            "detail": f"Product '{product.name}' is now {'active' if product.is_active else 'inactive'}.",
        })
