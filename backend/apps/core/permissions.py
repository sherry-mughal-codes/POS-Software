"""
Reusable permission classes for Role-Based Access Control (RBAC).
"""

from rest_framework.permissions import BasePermission


class IsSuperUser(BasePermission):
    """Allows access only to superusers."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsAdminOrManager(BasePermission):
    """Allows access to Superusers, Administrators, or Managers."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        if request.user.is_superuser:
            return True
        user_groups = request.user.groups.values_list("name", flat=True)
        return "Administrator" in user_groups or "Manager" in user_groups


class HasPosPermission(BasePermission):
    """
    Granular permission checker for POS operations.
    Usage:
        permission_classes = [HasPosPermission]
        required_permission = 'auth.add_user' (or 'users.view_user')
    """
    def __init__(self, required_permission=None):
        self.required_permission = required_permission

    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        if request.user.is_superuser:
            return True

        # Check required permission from view or attribute
        required = getattr(view, "required_permission", self.required_permission)
        if not required:
            return True

        return request.user.has_perm(required)
