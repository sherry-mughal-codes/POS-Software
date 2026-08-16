"""
Core models including security and audit logging foundation.
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class AuditLog(models.Model):
    """
    Lightweight audit trail recording critical security and administrative actions.
    """
    ACTION_CHOICES = [
        ("LOGIN", "User Login"),
        ("LOGOUT", "User Logout"),
        ("LOGIN_FAILED", "Failed Login Attempt"),
        ("USER_CREATED", "User Created"),
        ("USER_UPDATED", "User Updated"),
        ("USER_DEACTIVATED", "User Deactivated"),
        ("USER_ACTIVATED", "User Activated"),
        ("ROLE_ASSIGNED", "Role Assigned"),
        ("ROLE_MODIFIED", "Role Modified"),
        ("PERMISSION_CHANGED", "Permission Changed"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    username = models.CharField(max_length=150, help_text="Captured username even if user is deleted")
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource = models.CharField(max_length=100, blank=True, null=True, help_text="Target resource or entity")
    resource_id = models.CharField(max_length=50, blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.username} - {self.action}"
