"""
Django management command to seed default POS roles and demo users.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType
from apps.users.models import PosPermissionRegistry


class Command(BaseCommand):
    help = "Seeds default POS roles (Groups), assign permissions, and creates initial test user accounts."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Seeding POS Roles, Permissions, and Initial Accounts ==="))

        # Ensure POS permissions are in DB
        content_type, _ = ContentType.objects.get_or_create(
            app_label="users",
            model="pospermissionregistry",
        )

        for codename, name in PosPermissionRegistry._meta.permissions:
            perm, created = Permission.objects.get_or_create(
                codename=codename,
                content_type=content_type,
                defaults={"name": name},
            )
            if created:
                self.stdout.write(f"  + Created permission: {codename}")

        # Define Roles & associated permission codenames
        roles_config = {
            "Administrator": {
                "all_permissions": True,
            },
            "Manager": {
                "permissions": [
                    "manage_users",
                    "view_audit_logs",
                    "access_pos_register",
                    "open_cash_drawer",
                    "close_register_z_report",
                    "apply_custom_discount",
                    "cancel_active_sale",
                    "process_sale_return",
                    "manage_products",
                    "view_cost_prices",
                    "create_stock_adjustment",
                    "approve_purchases",
                    "view_financial_reports",
                    "view_customer_warranty_claim",
                    "create_customer_warranty_claim",
                    "process_customer_warranty_claim",
                    "view_supplier_warranty_claim",
                    "create_supplier_warranty_claim",
                    "process_supplier_warranty_claim",
                    "complete_supplier_warranty_claim",
                    "add_user",
                    "change_user",
                    "view_user",
                ],
            },
            "Cashier": {
                "permissions": [
                    "access_pos_register",
                    "open_cash_drawer",
                    "apply_custom_discount",
                    "cancel_active_sale",
                ],
            },
            "Inventory Manager": {
                "permissions": [
                    "manage_products",
                    "view_cost_prices",
                    "create_stock_adjustment",
                    "approve_purchases",
                ],
            },
            "Accountant": {
                "permissions": [
                    "view_cost_prices",
                    "view_financial_reports",
                ],
            },
        }

        # Create or update Groups
        groups = {}
        for role_name, config in roles_config.items():
            group, created = Group.objects.get_or_create(name=role_name)
            groups[role_name] = group

            if config.get("all_permissions"):
                # Administrator gets all non-internal permissions
                perms = Permission.objects.exclude(
                    content_type__app_label__in=["admin", "sessions", "contenttypes"]
                )
                group.permissions.set(perms)
            else:
                codenames = config.get("permissions", [])
                perms = Permission.objects.filter(codename__in=codenames)
                group.permissions.set(perms)

            self.stdout.write(self.style.SUCCESS(f"✓ Configured role '{role_name}' with {group.permissions.count()} permissions."))

        # Create default test user accounts
        demo_users = [
            {
                "username": "admin",
                "email": "admin@apexpos.local",
                "first_name": "System",
                "last_name": "Administrator",
                "password": "admin123!",
                "is_staff": True,
                "is_superuser": True,
                "role": "Administrator",
                "phone": "+1 555-0100",
                "pin_code": "9999",
            },
            {
                "username": "manager",
                "email": "manager@apexpos.local",
                "first_name": "Store",
                "last_name": "Manager",
                "password": "manager123!",
                "is_staff": True,
                "is_superuser": False,
                "role": "Manager",
                "phone": "+1 555-0101",
                "pin_code": "1234",
            },
            {
                "username": "cashier",
                "email": "cashier@apexpos.local",
                "first_name": "Ahmed",
                "last_name": "Cashier",
                "password": "cashier123!",
                "is_staff": False,
                "is_superuser": False,
                "role": "Cashier",
                "phone": "+1 555-0102",
                "pin_code": "0000",
            },
        ]

        for u in demo_users:
            user, created = User.objects.get_or_create(
                username=u["username"],
                defaults={
                    "email": u["email"],
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "is_staff": u["is_staff"],
                    "is_superuser": u["is_superuser"],
                    "is_active": True,
                },
            )
            user.set_password(u["password"])
            user.is_staff = u["is_staff"]
            user.is_superuser = u["is_superuser"]
            user.is_active = True
            user.save()

            # Assign Role
            role_group = groups.get(u["role"])
            if role_group:
                user.groups.set([role_group])

            # Update Profile
            if hasattr(user, "profile"):
                user.profile.phone = u["phone"]
                user.profile.pin_code = u["pin_code"]
                user.profile.save()

            action_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"✓ {action_str} test user: '{u['username']}' (Role: {u['role']}, Password: '{u['password']}')"))

        self.stdout.write(self.style.SUCCESS("=== Seeding Completed Successfully! ==="))
