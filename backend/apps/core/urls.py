from django.urls import path
from apps.core.views import HealthCheckView, ApiRootView, DashboardView, SystemSettingsView

urlpatterns = [
    path("", ApiRootView.as_view(), name="api_root"),
    path("health/", HealthCheckView.as_view(), name="health_check"),
    path("dashboard/", DashboardView.as_view(), name="executive_dashboard"),
    path("core/dashboard/", DashboardView.as_view(), name="core_dashboard"),
    path("settings/", SystemSettingsView.as_view(), name="system_settings"),
    path("core/settings/", SystemSettingsView.as_view(), name="core_system_settings"),
]
