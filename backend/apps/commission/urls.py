"""
URL routing for commission app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.commission.views import SalesAgentViewSet, CommissionRecordViewSet

router = DefaultRouter()
router.register("agents", SalesAgentViewSet, basename="sales_agents")
router.register("payables", CommissionRecordViewSet, basename="commission_payables")

urlpatterns = [
    path("", include(router.urls)),
]
