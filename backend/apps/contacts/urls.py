"""
URL routing for customers, suppliers, and customer payments master data.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.contacts.views import (
    CustomerViewSet,
    SupplierViewSet,
    CustomerPaymentViewSet,
    CustomerReceivablesReportView,
)

router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"suppliers", SupplierViewSet, basename="supplier")
router.register(r"payments", CustomerPaymentViewSet, basename="customer-payment")

urlpatterns = [
    path("receivables/report/", CustomerReceivablesReportView.as_view(), name="receivables-report"),
    path("", include(router.urls)),
]
