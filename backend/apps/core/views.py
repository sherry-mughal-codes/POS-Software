"""
Core views providing health check and system diagnostic endpoints.
"""

import time
import sys
import django
from django.db import connection
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class HealthCheckView(APIView):
    """
    Health check endpoint verifying:
    1. Django REST Framework status
    2. PostgreSQL database connection & latency
    3. System time & environment status
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        start_time = time.time()
        db_status = "unknown"
        db_latency_ms = None
        db_error = None
        http_status = status.HTTP_200_OK

        # Verify PostgreSQL database connection
        try:
            db_start = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
            db_latency_ms = round((time.time() - db_start) * 1000, 2)
            db_status = "connected"
        except Exception as exc:
            db_status = "disconnected"
            db_error = str(exc)
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        total_latency_ms = round((time.time() - start_time) * 1000, 2)

        health_data = {
            "status": "healthy" if db_status == "connected" else "degraded",
            "timestamp": timezone.now().isoformat(),
            "environment": {
                "django_version": django.get_version(),
                "python_version": sys.version.split()[0],
                "debug": connection.settings_dict.get("DEBUG", False),
            },
            "services": {
                "backend": {
                    "status": "online",
                    "framework": "Django REST Framework",
                },
                "database": {
                    "status": db_status,
                    "engine": connection.settings_dict.get("ENGINE", "").split(".")[-1],
                    "name": connection.settings_dict.get("NAME", ""),
                    "host": connection.settings_dict.get("HOST", ""),
                    "latency_ms": db_latency_ms,
                    "error": db_error,
                },
            },
            "total_latency_ms": total_latency_ms,
        }

        return Response(health_data, status=http_status)


class ApiRootView(APIView):
    """
    Root API v1 endpoint providing API metadata and discovery.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        return Response({
            "name": "ApexPOS API",
            "version": "v1",
            "phase": "Phase 13 - Reports & Business Dashboard",
            "endpoints": {
                "health": request.build_absolute_uri("health/"),
                "dashboard": request.build_absolute_uri("dashboard/"),
            },
            "timestamp": timezone.now().isoformat(),
        })


class DashboardView(APIView):
    """
    Executive Business Management Dashboard API.
    Provides single-pass aggregated KPIs, profit analytics, sales trends,
    cash position, customer receivables, supplier payables, inventory health,
    and cashier performance.
    """
    def get(self, request, *args, **kwargs):
        from apps.core.services import DashboardService

        period = request.query_params.get("period", "this_month")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        cashier_id_param = request.query_params.get("cashier_id")

        cashier_id = None
        if cashier_id_param and cashier_id_param.isdigit():
            cashier_id = int(cashier_id_param)

        data = DashboardService.get_executive_dashboard(
            period=period,
            start_date=start_date,
            end_date=end_date,
            cashier_id=cashier_id,
            user=request.user,
        )

        return Response(data, status=status.HTTP_200_OK)


class SystemSettingsView(APIView):
    """
    Enterprise System & Store Configuration API.
    GET: Returns all system settings as key-value pairs, grouped categories, and dynamic document sequences.
    POST / PUT: Updates configuration values.
    """
    def get(self, request, *args, **kwargs):
        from apps.core.models import SystemSetting
        from apps.core.sequences import DocumentSequenceService
        settings_qs = SystemSetting.objects.all()

        settings_dict = {}
        grouped = {}
        for s in settings_qs:
            settings_dict[s.key] = s.value
            if s.group not in grouped:
                grouped[s.group] = []
            grouped[s.group].append({
                "key": s.key,
                "value": s.value,
                "description": s.description,
                "group": s.group,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            })

        document_sequences = DocumentSequenceService.get_all_sequences_info()

        return Response({
            "settings": settings_dict,
            "grouped": grouped,
            "document_sequences": document_sequences,
        }, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        from apps.core.models import SystemSetting, AuditLog
        payload = request.data.get("settings", request.data)

        if not isinstance(payload, dict):
            return Response({"detail": "Settings payload must be a JSON object."}, status=status.HTTP_400_BAD_REQUEST)

        updated_keys = []
        for key, val in payload.items():
            if val is not None:
                SystemSetting.objects.update_or_create(
                    key=key,
                    defaults={"value": str(val), "updated_at": timezone.now()}
                )
                updated_keys.append(key)

        # Audit logging
        username = request.user.username if request.user and request.user.is_authenticated else "admin"
        AuditLog.objects.create(
            user=request.user if request.user and request.user.is_authenticated else None,
            username=username,
            action="SETTINGS_UPDATED",
            resource="SystemSettings",
            details={"updated_keys": updated_keys},
        )

        # Return updated settings
        return self.get(request, *args, **kwargs)


class BackupListView(APIView):
    """
    Database Backup Management API.
    GET: Returns all backup history logs, local files, and auto-backup state.
    POST: Triggers on-demand pg_dump database backup and Dropbox sync.
    """
    def get(self, request, *args, **kwargs):
        from apps.core.backup_service import BackupService
        from apps.core.models import SystemSetting

        # Check and trigger daily auto backup if due
        BackupService.check_and_run_daily_auto_backup()

        history = BackupService.get_backup_history()
        return Response({
            "backups": history,
            "auto_backup_enabled": SystemSetting.get_setting("auto_backup_enabled", "true").lower() == "true",
            "auto_backup_time": SystemSetting.get_setting("auto_backup_time", "02:00"),
            "backup_retention_days": int(SystemSetting.get_setting("backup_retention_days", "30") or "30"),
            "dropbox_backup_enabled": SystemSetting.get_setting("dropbox_backup_enabled", "false").lower() == "true",
            "dropbox_access_token_set": bool(SystemSetting.get_setting("dropbox_access_token", "").strip()),
            "dropbox_folder_path": SystemSetting.get_setting("dropbox_folder_path", "/ApexPOS_Backups"),
        }, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        from apps.core.backup_service import BackupService
        notes = request.data.get("notes", "")
        res = BackupService.create_database_backup(
            backup_type="MANUAL",
            user=request.user if request.user and request.user.is_authenticated else None,
            notes=notes,
        )
        if res.get("success"):
            return Response(res, status=status.HTTP_201_CREATED)
        return Response(res, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackupDownloadView(APIView):
    """
    Directly streams and downloads a .sql backup file to the client browser.
    """
    def get(self, request, backup_id, *args, **kwargs):
        import os
        from django.http import FileResponse, Http404
        from apps.core.models import BackupLog

        try:
            log_entry = BackupLog.objects.get(pk=backup_id)
        except BackupLog.DoesNotExist:
            raise Http404("Backup record not found.")

        if not os.path.exists(log_entry.file_path):
            return Response({"detail": "Physical backup file not found on server disk."}, status=status.HTTP_404_NOT_FOUND)

        response = FileResponse(open(log_entry.file_path, "rb"), content_type="application/sql")
        response["Content-Disposition"] = f'attachment; filename="{log_entry.filename}"'
        return response


class BackupDeleteView(APIView):
    """
    Deletes a local backup .sql file and its log record.
    """
    def delete(self, request, backup_id, *args, **kwargs):
        import os
        from apps.core.models import BackupLog, AuditLog

        try:
            log_entry = BackupLog.objects.get(pk=backup_id)
        except BackupLog.DoesNotExist:
            return Response({"detail": "Backup not found."}, status=status.HTTP_404_NOT_FOUND)

        filename = log_entry.filename
        if os.path.exists(log_entry.file_path):
            try:
                os.remove(log_entry.file_path)
            except OSError:
                pass

        log_entry.delete()

        username = request.user.username if request.user and request.user.is_authenticated else "admin"
        AuditLog.objects.create(
            user=request.user if request.user and request.user.is_authenticated else None,
            username=username,
            action="BACKUP_DELETED",
            resource="DatabaseBackup",
            details={"filename": filename}
        )

        return Response({"success": True, "detail": f"Backup {filename} deleted successfully."}, status=status.HTTP_200_OK)


class BackupRestoreView(APIView):
    """
    Database Disaster Recovery / Import Endpoint.
    Accepts single .sql, multiple .sql files, .zip archive, or backup_id and executes restore.
    """
    def post(self, request, *args, **kwargs):
        from apps.core.backup_service import BackupService
        from apps.core.models import BackupLog

        uploaded_files = request.FILES.getlist("files")
        single_file = request.FILES.get("file")
        backup_id = request.data.get("backup_id")

        if uploaded_files and len(uploaded_files) > 1:
            res = BackupService.restore_database_batch(
                files_or_zip=uploaded_files,
                user=request.user if request.user and request.user.is_authenticated else None,
            )
            if res.get("success"):
                return Response(res, status=status.HTTP_200_OK)
            return Response(res, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        target = single_file or (uploaded_files[0] if uploaded_files else None)
        if not target and not backup_id:
            return Response({"detail": "Please provide .sql backup file(s) or a backup_id."}, status=status.HTTP_400_BAD_REQUEST)

        if not target and backup_id:
            try:
                log_entry = BackupLog.objects.get(pk=backup_id)
                target = log_entry.file_path
            except BackupLog.DoesNotExist:
                return Response({"detail": "Specified backup record does not exist."}, status=status.HTTP_404_NOT_FOUND)

        if target and hasattr(target, "name") and target.name.lower().endswith(".zip"):
            res = BackupService.restore_database_batch(
                files_or_zip=[target],
                user=request.user if request.user and request.user.is_authenticated else None,
            )
        else:
            res = BackupService.restore_database(
                file_content_or_path=target,
                user=request.user if request.user and request.user.is_authenticated else None,
            )

        if res.get("success"):
            return Response(res, status=status.HTTP_200_OK)
        return Response(res, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackupDropboxSyncView(APIView):
    """
    Manually syncs a specific local backup to Dropbox cloud storage.
    """
    def post(self, request, backup_id, *args, **kwargs):
        from apps.core.backup_service import BackupService
        res = BackupService.sync_single_backup_to_dropbox(backup_id)
        if res.get("success"):
            return Response(res, status=status.HTTP_200_OK)
        return Response(res, status=status.HTTP_400_BAD_REQUEST)


class DropboxTestConnectionView(APIView):
    """
    Tests Dropbox API connection and retrieves account/space information.
    """
    def post(self, request, *args, **kwargs):
        from apps.core.backup_service import BackupService
        token = request.data.get("access_token")
        res = BackupService.test_dropbox_connection(token=token)
        if res.get("success"):
            return Response(res, status=status.HTTP_200_OK)
        return Response(res, status=status.HTTP_400_BAD_REQUEST)




