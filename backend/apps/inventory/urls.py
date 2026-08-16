from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.inventory.views import (
    StockMovementViewSet,
    StockAdjustmentViewSet,
    InventorySummaryView,
    ProductStockCardView,
    ComprehensiveInventoryReportView,
)

router = DefaultRouter()
router.register(r"movements", StockMovementViewSet, basename="inventory-movement")
router.register(r"adjustments", StockAdjustmentViewSet, basename="inventory-adjustment")

urlpatterns = [
    path("summary/", InventorySummaryView.as_view(), name="inventory-summary"),
    path("stock-card/<int:product_id>/", ProductStockCardView.as_view(), name="product-stock-card"),
    path("reports/comprehensive/", ComprehensiveInventoryReportView.as_view(), name="inventory-report-comprehensive"),
    path("", include(router.urls)),
]
