"""
URL configuration for Sales & POS Management.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.sales.views import (
    SaleViewSet,
    SalesReturnViewSet,
    SalesReportView,
    POSDaySessionViewSet,
    POSDaySessionsReportView,
)

router = DefaultRouter()
router.register(r"sessions", POSDaySessionViewSet, basename="day-sessions")
router.register(r"returns", SalesReturnViewSet, basename="sales-returns")
router.register(r"", SaleViewSet, basename="sales")

urlpatterns = [
    path("reports/summary/", SalesReportView.as_view(), name="sales-report-summary"),
    path("reports/sessions/", POSDaySessionsReportView.as_view(), name="day-sessions-report"),
    path("", include(router.urls)),
]
