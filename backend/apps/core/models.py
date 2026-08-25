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


class SystemSetting(models.Model):
    """
    Key-Value System and Store Configuration Storage.
    """
    key = models.CharField(max_length=100, unique=True, db_index=True)
    value = models.TextField(blank=True, default="")
    description = models.CharField(max_length=255, blank=True, default="")
    group = models.CharField(max_length=50, default="GENERAL", db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["group", "key"]
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"

    def __str__(self):
        return f"{self.key} = {self.value[:30]}"

    @classmethod
    def get_setting(cls, key: str, default: str = "") -> str:
        item = cls.objects.filter(key=key).first()
        return item.value if item else default

    @classmethod
    def set_setting(cls, key: str, value: str, group: str = "GENERAL", description: str = ""):
        cls.objects.update_or_create(
            key=key,
            defaults={"value": str(value), "group": group, "description": description},
        )


class BackupLog(models.Model):
    """
    Tracks all local and cloud database backup operations and restores.
    """
    TYPE_CHOICES = [
        ("MANUAL", "Manual Backup"),
        ("AUTOMATIC_DAILY", "Daily Scheduled Backup"),
        ("IMPORT_RESTORE", "Imported / Restored Backup"),
    ]
    STATUS_CHOICES = [
        ("LOCAL_ONLY", "Saved Locally (.sql)"),
        ("DROPBOX_SYNCED", "Saved Locally & Synced to Dropbox"),
        ("FAILED", "Backup Failed"),
        ("RESTORED", "Database Restored from Backup"),
    ]

    filename = models.CharField(max_length=255, db_index=True)
    file_path = models.CharField(max_length=500)
    file_size_bytes = models.BigIntegerField(default=0)
    backup_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default="MANUAL")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="LOCAL_ONLY")
    dropbox_path = models.CharField(max_length=500, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="backups_created",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Backup Log"
        verbose_name_plural = "Backup Logs"

    def __str__(self):
        return f"{self.filename} ({self.status}) - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


