"""
URL routing for auth, user management, roles, and audit logs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import (
    AuditLogViewSet,
    CurrentUserView,
    LoginView,
    LogoutView,
    PermissionListView,
    RoleViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"audit-logs", AuditLogViewSet, basename="audit-log")

urlpatterns = [
    # Authentication endpoints
    path("auth/login/", LoginView.as_view(), name="auth_login"),
    path("auth/logout/", LogoutView.as_view(), name="auth_logout"),
    path("auth/me/", CurrentUserView.as_view(), name="auth_me"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth_token_refresh"),

    # Permissions catalog
    path("permissions/", PermissionListView.as_view(), name="permission_list"),

    # ViewSet CRUD routes
    path("", include(router.urls)),
]
