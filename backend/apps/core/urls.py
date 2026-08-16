"""
URL routing for core application (health & system diagnostics).
"""

from django.urls import path
from apps.core.views import HealthCheckView, ApiRootView

urlpatterns = [
    path("", ApiRootView.as_view(), name="api_root"),
    path("health/", HealthCheckView.as_view(), name="health_check"),
]
