"""
URL routing for purchases, returns, supplier payments, and reports.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.purchases.views import (
    PurchaseViewSet,
    PurchaseReturnViewSet,
    SupplierPaymentViewSet,
    SupplierStatementView,
    PurchaseReportView,
)

router = DefaultRouter()
router.register(r"orders", PurchaseViewSet, basename="purchase-order")
router.register(r"returns", PurchaseReturnViewSet, basename="purchase-return")
router.register(r"payments", SupplierPaymentViewSet, basename="supplier-payment")

urlpatterns = [
    # Supplier running statement
    path("supplier-statement/<int:supplier_id>/", SupplierStatementView.as_view(), name="supplier_statement"),

    # Master Purchase Report
    path("reports/summary/", PurchaseReportView.as_view(), name="purchase_report"),

    # Viewsets
    path("", include(router.urls)),
]
