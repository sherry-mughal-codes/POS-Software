"""
Reusable permission classes for Role-Based Access Control (RBAC).
Supports superusers, role groups, granular model permissions, and module-level permissions.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsSuperUser(BasePermission):
    """Allows access only to superusers."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsAdminOrManager(BasePermission):
    """
    Allows access to:
    1. Superusers & Staff
    2. Users in Administrator, Manager, Owner, or Supervisor roles
    3. Users possessing specific action/model permissions or module-level permissions for the view
    """
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_active):
            return False
        if user.is_superuser or user.is_staff:
            return True

        # Check role group names (case-insensitive check for admin/manager/owner/supervisor)
        user_groups = [g.lower() for g in user.groups.values_list("name", flat=True)]
        if any(role_word in g for g in user_groups for role_word in ["admin", "manager", "owner", "supervisor"]):
            return True

        # Check model/module permissions if view has a queryset/model
        model_cls = getattr(view, "model", None)
        if not model_cls and hasattr(view, "queryset") and view.queryset is not None:
            model_cls = view.queryset.model
        if not model_cls and hasattr(view, "get_queryset"):
            try:
                qs = view.get_queryset()
                if qs is not None:
                    model_cls = qs.model
            except Exception:
                pass

        if model_cls:
            app_label = model_cls._meta.app_label
            model_name = model_cls._meta.model_name
            action = getattr(view, "action", None) or request.method.lower()

            action_map = {
                "create": f"{app_label}.add_{model_name}",
                "post": f"{app_label}.add_{model_name}",
                "update": f"{app_label}.change_{model_name}",
                "partial_update": f"{app_label}.change_{model_name}",
                "put": f"{app_label}.change_{model_name}",
                "patch": f"{app_label}.change_{model_name}",
                "destroy": f"{app_label}.delete_{model_name}",
                "delete": f"{app_label}.delete_{model_name}",
                "list": f"{app_label}.view_{model_name}",
                "retrieve": f"{app_label}.view_{model_name}",
                "get": f"{app_label}.view_{model_name}",
                "submit": f"{app_label}.change_{model_name}",
                "cancel": f"{app_label}.change_{model_name}",
                "approve": f"{app_label}.change_{model_name}",
            }

            perm_needed = action_map.get(action)
            if perm_needed and user.has_perm(perm_needed):
                return True

            # Custom business action permissions (e.g. approve_purchases)
            if app_label == "purchases" and user.has_perm("users.approve_purchases"):
                return True
            if app_label == "inventory" and user.has_perm("users.create_stock_adjustment"):
                return True
            if app_label == "products" and (user.has_perm("users.manage_products") or user.has_perm("users.view_cost_prices")):
                return True
            if app_label == "sales" and (user.has_perm("users.access_pos_register") or user.has_perm("users.process_sale_return")):
                return True

            # If user has ANY permission for this app label or model
            user_perms = user.get_all_permissions()
            if any(p.startswith(f"{app_label}.") for p in user_perms):
                if action in ["list", "retrieve", "get"] or request.method in SAFE_METHODS:
                    return True
                if any(p.startswith(f"{app_label}.add_") or p.startswith(f"{app_label}.change_") for p in user_perms):
                    return True

        return False


class HasModuleOrActionPermission(BasePermission):
    """
    Granular permission checker evaluating action and module permissions.
    """
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_active):
            return False
        if user.is_superuser or user.is_staff:
            return True

        user_groups = [g.lower() for g in user.groups.values_list("name", flat=True)]
        if any(role_word in g for g in user_groups for role_word in ["admin", "manager", "owner", "supervisor"]):
            return True

        model_cls = getattr(view, "model", None)
        if not model_cls and hasattr(view, "queryset") and view.queryset is not None:
            model_cls = view.queryset.model
        if not model_cls and hasattr(view, "get_queryset"):
            try:
                qs = view.get_queryset()
                if qs is not None:
                    model_cls = qs.model
            except Exception:
                pass

        if not model_cls:
            return True

        app_label = model_cls._meta.app_label
        model_name = model_cls._meta.model_name
        action = getattr(view, "action", None) or request.method.lower()

        if action in ["list", "retrieve", "get"] or request.method in SAFE_METHODS:
            return (
                user.has_perm(f"{app_label}.view_{model_name}")
                or user.has_perm(f"{app_label}.change_{model_name}")
                or user.has_perm(f"{app_label}.add_{model_name}")
                or any(p.startswith(f"{app_label}.") for p in user.get_all_permissions())
            )

        if action in ["create", "post"]:
            return (
                user.has_perm(f"{app_label}.add_{model_name}")
                or any(p.startswith(f"{app_label}.add_") for p in user.get_all_permissions())
            )

        if action in ["update", "partial_update", "put", "patch", "submit", "cancel", "approve"]:
            return (
                user.has_perm(f"{app_label}.change_{model_name}")
                or user.has_perm(f"{app_label}.add_{model_name}")
                or user.has_perm("users.approve_purchases")
                or any(p.startswith(f"{app_label}.change_") for p in user.get_all_permissions())
            )

        if action in ["destroy", "delete"]:
            return (
                user.has_perm(f"{app_label}.delete_{model_name}")
                or any(p.startswith(f"{app_label}.delete_") for p in user.get_all_permissions())
            )

        return user.has_perm(f"{app_label}.view_{model_name}")


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
        if request.user.is_superuser or request.user.is_staff:
            return True

        user_groups = [g.lower() for g in request.user.groups.values_list("name", flat=True)]
        if any(role_word in g for g in user_groups for role_word in ["admin", "manager", "owner"]):
            return True

        required = getattr(view, "required_permission", self.required_permission)
        if not required:
            return True

        return request.user.has_perm(required)
