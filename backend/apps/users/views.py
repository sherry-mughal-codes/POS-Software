"""
API views for authentication, user management, RBAC, and audit logs.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.models import User, Group, Permission
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import AuditLog
from apps.core.permissions import IsAdminOrManager
from apps.users.serializers import (
    AuditLogSerializer,
    LoginSerializer,
    PermissionSerializer,
    RoleSerializer,
    UserCreateUpdateSerializer,
    UserSerializer,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


class LoginView(APIView):
    """
    Authenticates user, verifies active status, issues JWT tokens, and logs security audit trail.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        ip = get_client_ip(request)

        user = authenticate(request, username=username, password=password)

        if user is None:
            # Check if user exists but inactive or wrong password
            existing_user = User.objects.filter(username=username).first()
            if existing_user and not existing_user.is_active:
                AuditLog.objects.create(
                    user=existing_user,
                    username=username,
                    action="LOGIN_FAILED",
                    ip_address=ip,
                    details={"reason": "Account is deactivated"},
                )
                return Response(
                    {"detail": "This account has been deactivated. Please contact an administrator."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            AuditLog.objects.create(
                username=username,
                action="LOGIN_FAILED",
                ip_address=ip,
                details={"reason": "Invalid credentials"},
            )
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Generate JWT Tokens
        refresh = RefreshToken.for_user(user)
        user_serializer = UserSerializer(user)

        # Record Audit Log
        AuditLog.objects.create(
            user=user,
            username=user.username,
            action="LOGIN",
            ip_address=ip,
            details={"roles": list(user.groups.values_list("name", flat=True))},
        )

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user_serializer.data,
        }, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    Returns current authenticated user profile, assigned roles, and effective permissions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class LogoutView(APIView):
    """
    Logs out user and records audit trail.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        AuditLog.objects.create(
            user=request.user,
            username=request.user.username,
            action="LOGOUT",
            ip_address=get_client_ip(request),
        )
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """
    User management API with RBAC protection (Admins & Managers only).
    """
    queryset = User.objects.all().select_related("profile").prefetch_related("groups", "user_permissions")
    permission_classes = [IsAdminOrManager]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return UserCreateUpdateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action="USER_CREATED",
            resource="User",
            resource_id=str(user.id),
            ip_address=get_client_ip(self.request),
            details={"created_username": user.username, "roles": list(user.groups.values_list("name", flat=True))},
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action="USER_UPDATED",
            resource="User",
            resource_id=str(user.id),
            ip_address=get_client_ip(self.request),
            details={"updated_username": user.username, "is_active": user.is_active},
        )
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        """Toggle user active/inactive status (Soft delete / deactivate strategy)."""
        user = self.get_object()
        if user == request.user:
            return Response(
                {"detail": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])

        action_type = "USER_ACTIVATED" if user.is_active else "USER_DEACTIVATED"
        AuditLog.objects.create(
            user=request.user,
            username=request.user.username,
            action=action_type,
            resource="User",
            resource_id=str(user.id),
            ip_address=get_client_ip(request),
            details={"target_username": user.username, "new_active_status": user.is_active},
        )

        return Response({
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "detail": f"User successfully {'activated' if user.is_active else 'deactivated'}.",
        })


class RoleViewSet(viewsets.ModelViewSet):
    """
    Role & Permission Management API (Group wrapper).
    """
    queryset = Group.objects.all().prefetch_related("permissions", "user_set")
    serializer_class = RoleSerializer
    permission_classes = [IsAdminOrManager]

    def perform_create(self, serializer):
        role = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action="ROLE_MODIFIED",
            resource="Role",
            resource_id=str(role.id),
            ip_address=get_client_ip(self.request),
            details={"role_name": role.name, "operation": "create"},
        )

    def perform_update(self, serializer):
        role = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action="ROLE_MODIFIED",
            resource="Role",
            resource_id=str(role.id),
            ip_address=get_client_ip(self.request),
            details={"role_name": role.name, "operation": "update"},
        )


class PermissionListView(APIView):
    """
    Lists all available system permissions categorized for role matrix configuration.
    """
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        permissions = Permission.objects.exclude(
            content_type__app_label__in=["admin", "sessions", "contenttypes"]
        ).select_related("content_type")
        serializer = PermissionSerializer(permissions, many=True)
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only security audit log viewer.
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrManager]
