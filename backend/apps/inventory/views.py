"""
Inventory ViewSets and API Views.
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsAdminOrManager
from apps.inventory.models import StockMovement, StockAdjustment
from apps.inventory.serializers import (
    StockMovementSerializer,
    StockAdjustmentSerializer,
    StockAdjustmentCreateSerializer,
)
from apps.inventory.services import InventoryService


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit ledger of all stock movements across products.
    """
    queryset = StockMovement.objects.all().select_related("product", "product__unit", "created_by")
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        prod_id = self.request.query_params.get("product")
        m_type = self.request.query_params.get("movement_type")
        ref_id = self.request.query_params.get("reference_id")
        ref_type = self.request.query_params.get("reference_type")

        if prod_id:
            qs = qs.filter(product_id=prod_id)
        if m_type:
            qs = qs.filter(movement_type=m_type)
        if ref_id:
            qs = qs.filter(reference_id=ref_id)
        if ref_type:
            qs = qs.filter(reference_type=ref_type)

        return qs


class StockAdjustmentViewSet(viewsets.ModelViewSet):
    """
    Stock Adjustments API.
    Viewing: Allowed for authenticated users.
    Creating: Restricted to Admin / Manager (Cashier blocked).
    """
    queryset = StockAdjustment.objects.all().select_related("created_by").prefetch_related("items__product", "items__product__unit")
    serializer_class = StockAdjustmentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = StockAdjustmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            adjustment = InventoryService.record_stock_adjustment(
                adjustment_type=data["adjustment_type"],
                reason=data["reason"],
                items_data=data["items"],
                notes=data.get("notes", ""),
                adjustment_date=data.get("date"),
                created_by=request.user,
            )
            return Response(StockAdjustmentSerializer(adjustment).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class InventorySummaryView(APIView):
    """
    Returns real-time stock catalog, valuations, and stock statuses for all products.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = InventoryService.get_inventory_summary()
        return Response(summary)


class ProductStockCardView(APIView):
    """
    Returns the complete chronological stock history ledger for a single product.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, product_id):
        try:
            card = InventoryService.get_product_stock_card(product_id)
            return Response(card)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)


class ComprehensiveInventoryReportView(APIView):
    """
    Master filterable inventory report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        prod_id = request.query_params.get("product")
        cat_id = request.query_params.get("category")
        m_type = request.query_params.get("movement_type")
        s_status = request.query_params.get("stock_status")

        report = InventoryService.get_comprehensive_inventory_report(
            start_date=start_date,
            end_date=end_date,
            product_id=int(prod_id) if prod_id else None,
            category_id=int(cat_id) if cat_id else None,
            movement_type=m_type,
            stock_status=s_status,
        )
        return Response(report)
