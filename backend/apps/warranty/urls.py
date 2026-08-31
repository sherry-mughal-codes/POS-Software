"""
Warranty Claim Module URL Routing.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.warranty.views import (
    CustomerWarrantyClaimViewSet,
    SupplierWarrantyClaimViewSet,
    WarrantyMetricsViewSet,
)

router = DefaultRouter()
router.register(r"customer-claims", CustomerWarrantyClaimViewSet, basename="customer-warranty-claims")
router.register(r"supplier-claims", SupplierWarrantyClaimViewSet, basename="supplier-warranty-claims")
router.register(r"metrics", WarrantyMetricsViewSet, basename="warranty-metrics")

urlpatterns = [
    path("", include(router.urls)),
]
