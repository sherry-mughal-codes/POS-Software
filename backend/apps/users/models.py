"""
User profile and POS-specific authorization models.
"""

from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """
    Extends standard Django User with POS-specific attributes, company branch affiliation, and data scope boundaries.
    """
    DATA_SCOPE_CHOICES = [
        ("ALL_COMPANY", "All Company Data"),
        ("OWN_DATA", "Own User / Terminal Data Only"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    company = models.CharField(max_length=150, default="ApexPOS Enterprise Store", blank=True, null=True, help_text="Assigned company or store branch")
    data_scope = models.CharField(max_length=50, default="ALL_COMPANY", choices=DATA_SCOPE_CHOICES, help_text="Data visibility boundary")
    phone = models.CharField(max_length=30, blank=True, null=True)
    pin_code = models.CharField(max_length=6, blank=True, null=True, help_text="Fast POS terminal unlock PIN")
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"Profile of {self.user.username}"


class PosPermissionRegistry(models.Model):
    """
    Registry for declaring granular POS business action permissions in Django's auth system.
    """
    class Meta:
        managed = False  # No DB table, used solely to register permissions in django_content_type/auth_permission
        default_permissions = ()
        permissions = [
            # User & Role permissions
            ("manage_roles", "Can create and modify roles and assign permissions"),
            ("manage_users", "Can create, update, and toggle active status of users"),
            ("view_audit_logs", "Can view system security audit logs"),

            # POS & Register business permissions (infrastructure pre-registration)
            ("access_pos_register", "Can access the POS terminal screen"),
            ("open_cash_drawer", "Can open cash drawer without sale"),
            ("close_register_z_report", "Can perform end-of-day register closure (Z-Report)"),
            ("apply_custom_discount", "Can apply manual percentage discount to sale"),
            ("cancel_active_sale", "Can void or cancel an active receipt"),
            ("process_sale_return", "Can process customer refunds and product returns"),

            # Catalog & Inventory permissions
            ("manage_products", "Can create, edit, and archive products"),
            ("view_cost_prices", "Can view purchase cost prices of inventory"),
            ("create_stock_adjustment", "Can create stock count write-offs or adjustments"),

            # Dashboard & Analytics
            ("view_dashboard", "Can access the main business overview dashboard"),
            ("view_dashboard_analytics", "Can view live revenue graphs, sales trends, and KPI summaries"),

            # Reports & Analytics
            ("view_reports", "Can access the business reports center"),
            ("view_sales_reports", "Can view sales performance and invoice analytical reports"),
            ("view_inventory_reports", "Can view stock valuation and inventory movement reports"),
            ("export_reports", "Can export system data and analytical reports to Excel/PDF"),

            # Purchasing & Accounting
            ("approve_purchases", "Can approve supplier purchase orders"),
            ("view_financial_reports", "Can access executive financial statements, profit & loss, and balance sheet"),

            # Warranty Claims Management
            ("view_customer_warranty_claim", "Can view customer warranty claim records"),
            ("create_customer_warranty_claim", "Can create customer warranty claim request"),
            ("process_customer_warranty_claim", "Can complete customer warranty replacement and issue items"),
            ("view_supplier_warranty_claim", "Can view supplier warranty claim batches"),
            ("create_supplier_warranty_claim", "Can create supplier warranty claim batch"),
            ("process_supplier_warranty_claim", "Can dispatch warranty claim batch to supplier (In Progress)"),
            ("complete_supplier_warranty_claim", "Can receive supplier replacement stock (Warranty Completed)"),
        ]


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """Automatically ensure a UserProfile exists for every User."""
    if created:
        UserProfile.objects.create(user=instance)
    else:
        if hasattr(instance, "profile"):
            instance.profile.save()
        else:
            UserProfile.objects.create(user=instance)
