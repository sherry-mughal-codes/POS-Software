"""
URL routing for core application (health & system diagnostics).
"""

from django.urls import path
from apps.core.views import HealthCheckView, ApiRootView, DashboardView

urlpatterns = [
    path("", ApiRootView.as_view(), name="api_root"),
    path("health/", HealthCheckView.as_view(), name="health_check"),
    path("dashboard/", DashboardView.as_view(), name="executive_dashboard"),
    path("core/dashboard/", DashboardView.as_view(), name="core_dashboard"),
]
