"""
Database Backup & Disaster Recovery Service.
Handles automated pg_dump generation (.sql), local host storage,
Dropbox Cloud Sync via API v2, database restoration / import, and retention cleanup.
"""

import os
import subprocess
import glob
import logging
from datetime import datetime, date, time
from decimal import Decimal
from typing import Dict, Any, List, Optional
import requests

from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import connection

from apps.core.models import SystemSetting, BackupLog, AuditLog

logger = logging.getLogger(__name__)
User = get_user_model()


class BackupService:
    """
    Authoritative service for managing POS database dumps, cloud sync, and disaster recovery imports.
    """

    BACKUP_DIR = os.path.join(settings.BASE_DIR, "backups")

    @classmethod
    def get_backup_directory(cls) -> str:
        """Ensures backup directory exists and returns absolute path."""
        if not os.path.exists(cls.BACKUP_DIR):
            os.makedirs(cls.BACKUP_DIR, exist_ok=True)
        return cls.BACKUP_DIR

    @classmethod
    def get_db_credentials(cls) -> Dict[str, str]:
        """Retrieves PostgreSQL connection parameters from Django settings or environment."""
        db_conf = settings.DATABASES["default"]
        return {
            "name": db_conf.get("NAME", os.environ.get("POSTGRES_DB", "pos_db")),
            "user": db_conf.get("USER", os.environ.get("POSTGRES_USER", "pos_user")),
            "password": db_conf.get("PASSWORD", os.environ.get("POSTGRES_PASSWORD", "pos_secure_password_123!")),
            "host": db_conf.get("HOST", os.environ.get("POSTGRES_HOST", "db")),
            "port": str(db_conf.get("PORT", os.environ.get("POSTGRES_PORT", "5432")) or "5432"),
        }

    @classmethod
    def create_database_backup(
        cls,
        backup_type: str = "MANUAL",
        user: Optional[Any] = None,
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Executes pg_dump to produce a clean, self-contained .sql dump of the PostgreSQL database,
        saves it locally to the host backup folder, and optionally uploads to Dropbox.
        """
        backup_dir = cls.get_backup_directory()
        now = timezone.now()
        timestamp_str = now.strftime("%Y_%m_%d_%H%M%S")
        filename = f"apexpos_backup_{timestamp_str}.sql"
        filepath = os.path.join(backup_dir, filename)

        creds = cls.get_db_credentials()
        env = os.environ.copy()
        env["PGPASSWORD"] = creds["password"]

        # 1. Run pg_dump command with clean drops & insert statements for broad compatibility
        cmd = [
            "pg_dump",
            "-h", creds["host"],
            "-p", creds["port"],
            "-U", creds["user"],
            "-d", creds["name"],
            "--clean",
            "--if-exists",
            "--inserts",
            "-f", filepath,
        ]

        try:
            res = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=120,
            )
            if res.returncode != 0:
                err_msg = f"pg_dump failed (code {res.returncode}): {res.stderr}"
                logger.error(err_msg)
                
                # Log failed attempt
                log_entry = BackupLog.objects.create(
                    filename=filename,
                    file_path=filepath,
                    file_size_bytes=0,
                    backup_type=backup_type,
                    status="FAILED",
                    error_message=err_msg,
                    created_by=user if user and user.is_authenticated else None,
                )
                return {
                    "success": False,
                    "error": err_msg,
                    "backup_id": log_entry.id,
                }
        except Exception as e:
            err_msg = f"pg_dump execution exception: {str(e)}"
            logger.exception(err_msg)
            log_entry = BackupLog.objects.create(
                filename=filename,
                file_path=filepath,
                file_size_bytes=0,
                backup_type=backup_type,
                status="FAILED",
                error_message=err_msg,
                created_by=user if user and user.is_authenticated else None,
            )
            return {
                "success": False,
                "error": err_msg,
                "backup_id": log_entry.id,
            }

        # 2. Check generated file size
        file_size = os.path.getsize(filepath) if os.path.exists(filepath) else 0

        # 3. Attempt Dropbox cloud sync if configured
        status = "LOCAL_ONLY"
        dropbox_path = None
        dropbox_err = None

        is_dropbox_enabled = SystemSetting.get_setting("dropbox_backup_enabled", "false").lower() == "true"
        dropbox_token = SystemSetting.get_setting("dropbox_access_token", "").strip()

        if is_dropbox_enabled and dropbox_token:
            dbx_res = cls.upload_to_dropbox(filepath, filename)
            if dbx_res.get("success"):
                status = "DROPBOX_SYNCED"
                dropbox_path = dbx_res.get("path")
            else:
                dropbox_err = dbx_res.get("error")
                status = "LOCAL_ONLY"

        # 4. Create database record
        log_entry = BackupLog.objects.create(
            filename=filename,
            file_path=filepath,
            file_size_bytes=file_size,
            backup_type=backup_type,
            status=status,
            dropbox_path=dropbox_path,
            error_message=f"Dropbox warning: {dropbox_err}" if dropbox_err else None,
            created_by=user if user and user.is_authenticated else None,
        )

        # 5. Audit Logging
        username = user.username if user and user.is_authenticated else "System Scheduler"
        AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            username=username,
            action="BACKUP_CREATED",
            resource="DatabaseBackup",
            resource_id=str(log_entry.id),
            details={
                "filename": filename,
                "file_size": file_size,
                "status": status,
                "backup_type": backup_type,
            }
        )

        # 6. Apply retention cleanup
        retention_days = int(SystemSetting.get_setting("backup_retention_days", "30") or "30")
        cls.cleanup_old_backups(retention_days)

        return {
            "success": True,
            "backup_id": log_entry.id,
            "filename": filename,
            "file_size_bytes": file_size,
            "file_size_formatted": cls.format_file_size(file_size),
            "status": status,
            "dropbox_path": dropbox_path,
            "created_at": log_entry.created_at.isoformat(),
            "dropbox_error": dropbox_err,
        }

    @classmethod
    def restore_database(cls, file_content_or_path: Any, user: Optional[Any] = None) -> Dict[str, Any]:
        """
        Restores the full PostgreSQL database from an uploaded or local .sql dump file using psql.
        """
        backup_dir = cls.get_backup_directory()
        filepath = ""

        if isinstance(file_content_or_path, str):
            filepath = file_content_or_path
        else:
            # Handle uploaded InMemoryUploadedFile / TemporaryUploadedFile
            upload_filename = getattr(file_content_or_path, "name", "imported_backup.sql")
            now_str = timezone.now().strftime("%Y_%m_%d_%H%M%S")
            safe_name = f"imported_{now_str}_{os.path.basename(upload_filename)}"
            filepath = os.path.join(backup_dir, safe_name)

            with open(filepath, "wb+") as destination:
                for chunk in file_content_or_path.chunks():
                    destination.write(chunk)

        if not os.path.exists(filepath):
            return {"success": False, "error": "Backup .sql file not found on disk."}

        creds = cls.get_db_credentials()
        env = os.environ.copy()
        env["PGPASSWORD"] = creds["password"]

        # Run psql import
        cmd = [
            "psql",
            "-h", creds["host"],
            "-p", creds["port"],
            "-U", creds["user"],
            "-d", creds["name"],
            "-f", filepath,
        ]

        try:
            res = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=180,
            )
            # psql may return non-zero on minor notice/warnings, check output
            if res.returncode != 0 and "ERROR" in res.stderr:
                logger.error(f"psql restore error: {res.stderr}")
                return {
                    "success": False,
                    "error": f"Database restore failed: {res.stderr[:500]}",
                }
        except Exception as e:
            logger.exception(f"psql execution exception during restore: {str(e)}")
            return {"success": False, "error": f"Restore execution error: {str(e)}"}

        # Record Restore in Backup Log & Audit
        file_size = os.path.getsize(filepath) if os.path.exists(filepath) else 0
        filename = os.path.basename(filepath)

        log_entry = BackupLog.objects.create(
            filename=filename,
            file_path=filepath,
            file_size_bytes=file_size,
            backup_type="IMPORT_RESTORE",
            status="RESTORED",
            created_by=user if user and user.is_authenticated else None,
        )

        username = user.username if user and user.is_authenticated else "admin"
        AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            username=username,
            action="DATABASE_RESTORED",
            resource="DatabaseBackup",
            resource_id=str(log_entry.id),
            details={"filename": filename, "file_size": file_size}
        )

        return {
            "success": True,
            "message": "Database successfully restored from backup .SQL dump.",
            "filename": filename,
            "restored_at": timezone.now().isoformat(),
        }

    @classmethod
    def restore_database_batch(cls, files_or_zip: List[Any], user: Optional[Any] = None) -> Dict[str, Any]:
        """
        Restores data from a whole folder of multiple .sql files or a .zip archive of backups.
        Processes each file in chronological order and restores tables and records.
        """
        import zipfile
        import shutil

        backup_dir = cls.get_backup_directory()
        temp_batch_dir = os.path.join(backup_dir, f"batch_restore_{timezone.now().strftime('%Y%m%d_%H%M%S')}")
        os.makedirs(temp_batch_dir, exist_ok=True)

        extracted_sql_paths = []

        try:
            for item in files_or_zip:
                filename = getattr(item, "name", "file.sql")
                if filename.lower().endswith(".zip"):
                    # Save zip temporarily and extract
                    zip_path = os.path.join(temp_batch_dir, filename)
                    with open(zip_path, "wb+") as f:
                        for chunk in item.chunks():
                            f.write(chunk)
                    
                    with zipfile.ZipFile(zip_path, "r") as zip_ref:
                        zip_ref.extractall(temp_batch_dir)
                    
                    # Find all .sql files inside zip
                    for root, _, files in os.walk(temp_batch_dir):
                        for f_name in files:
                            if f_name.lower().endswith(".sql") or f_name.lower().endswith(".dump"):
                                extracted_sql_paths.append(os.path.join(root, f_name))
                elif filename.lower().endswith(".sql") or filename.lower().endswith(".dump"):
                    # Save individual SQL file
                    save_path = os.path.join(temp_batch_dir, filename)
                    with open(save_path, "wb+") as f:
                        for chunk in item.chunks():
                            f.write(chunk)
                    extracted_sql_paths.append(save_path)

            if not extracted_sql_paths:
                return {
                    "success": False,
                    "error": "No valid .SQL or .DUMP files found in the uploaded batch or folder."
                }

            # Sort files chronologically by filename
            extracted_sql_paths.sort()

            restored_files = []
            errors = []

            for sql_path in extracted_sql_paths:
                f_basename = os.path.basename(sql_path)
                logger.info(f"Batch restoring file: {f_basename}")
                res = cls.restore_database(sql_path, user=user)
                if res.get("success"):
                    restored_files.append(f_basename)
                else:
                    errors.append(f"{f_basename}: {res.get('error')}")

            if not restored_files and errors:
                return {
                    "success": False,
                    "error": f"Failed to restore files: {'; '.join(errors)}",
                    "restored_count": 0,
                    "errors": errors,
                }

            return {
                "success": True,
                "message": f"Successfully restored {len(restored_files)} backup file(s) from folder/batch.",
                "restored_files": restored_files,
                "restored_count": len(restored_files),
                "warnings": errors if errors else None,
                "restored_at": timezone.now().isoformat(),
            }

        finally:
            # Clean up batch temp directory
            try:
                if os.path.exists(temp_batch_dir):
                    shutil.rmtree(temp_batch_dir, ignore_errors=True)
            except Exception:
                pass

    @classmethod
    def sync_single_backup_to_dropbox(cls, backup_id: int) -> Dict[str, Any]:
        """
        Manually syncs or re-syncs a specific local backup to Dropbox.
        """
        try:
            log_entry = BackupLog.objects.get(pk=backup_id)
        except BackupLog.DoesNotExist:
            return {"success": False, "error": "Backup record not found."}

        if not os.path.exists(log_entry.file_path):
            return {"success": False, "error": f"Physical backup file not found on disk: {log_entry.filename}"}

        dbx_res = cls.upload_to_dropbox(log_entry.file_path, log_entry.filename)
        if dbx_res.get("success"):
            log_entry.status = "DROPBOX_SYNCED"
            log_entry.dropbox_path = dbx_res.get("path")
            log_entry.error_message = None
            log_entry.save(update_fields=["status", "dropbox_path", "error_message"])
            return {
                "success": True,
                "message": f"Backup {log_entry.filename} successfully synced to Dropbox ({dbx_res.get('path')})",
                "dropbox_path": dbx_res.get("path"),
            }
        else:
            return {
                "success": False,
                "error": dbx_res.get("error") or "Failed to upload file to Dropbox.",
            }


    @classmethod
    def upload_to_dropbox(cls, local_filepath: str, remote_filename: str) -> Dict[str, Any]:
        """
        Uploads a local .sql file to Dropbox using Dropbox REST API v2 (/2/files/upload).
        """
        token = SystemSetting.get_setting("dropbox_access_token", "").strip()
        folder = SystemSetting.get_setting("dropbox_folder_path", "/ApexPOS_Backups").strip() or "/ApexPOS_Backups"
        if not folder.startswith("/"):
            folder = f"/{folder}"

        if not token:
            return {"success": False, "error": "Dropbox access token is missing or empty."}

        if not os.path.exists(local_filepath):
            return {"success": False, "error": f"Local file not found at: {local_filepath}"}

        remote_path = f"{folder.rstrip('/')}/{remote_filename}"
        url = "https://content.dropboxapi.com/2/files/upload"

        headers = {
            "Authorization": f"Bearer {token}",
            "Dropbox-API-Arg": f'{{"path": "{remote_path}", "mode": "overwrite", "autorename": false, "mute": false, "strict_conflict": false}}',
            "Content-Type": "application/octet-stream",
        }

        try:
            with open(local_filepath, "rb") as f:
                response = requests.post(url, headers=headers, data=f, timeout=120)

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "path": data.get("path_display", remote_path),
                    "id": data.get("id"),
                    "size": data.get("size"),
                }
            else:
                err_body = response.text
                return {
                    "success": False,
                    "error": f"Dropbox upload HTTP {response.status_code}: {err_body[:300]}",
                }
        except Exception as e:
            return {"success": False, "error": f"Dropbox network error: {str(e)}"}

    @classmethod
    def test_dropbox_connection(cls, token: Optional[str] = None) -> Dict[str, Any]:
        """
        Tests Dropbox token validity and returns account & space information.
        """
        access_token = token or SystemSetting.get_setting("dropbox_access_token", "").strip()
        if not access_token:
            return {"success": False, "error": "No Dropbox access token provided."}

        url_account = "https://api.dropboxapi.com/2/users/get_current_account"
        url_space = "https://api.dropboxapi.com/2/users/get_space_usage"
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            resp = requests.post(url_account, headers=headers, timeout=15)
            if resp.status_code != 200:
                return {
                    "success": False,
                    "error": f"Dropbox authentication failed (HTTP {resp.status_code}): {resp.text[:200]}",
                }
            acc_data = resp.json()

            # Space usage
            space_resp = requests.post(url_space, headers=headers, timeout=15)
            space_used_mb = 0
            space_total_mb = 0
            if space_resp.status_code == 200:
                s_data = space_resp.json()
                space_used_mb = round(s_data.get("used", 0) / (1024 * 1024), 2)
                alloc = s_data.get("allocation", {})
                if alloc.get(".tag") == "individual":
                    space_total_mb = round(alloc.get("allocated", 0) / (1024 * 1024), 2)

            return {
                "success": True,
                "account_id": acc_data.get("account_id"),
                "name": acc_data.get("name", {}).get("display_name", "Dropbox User"),
                "email": acc_data.get("email"),
                "space_used_mb": space_used_mb,
                "space_total_mb": space_total_mb,
            }
        except Exception as e:
            return {"success": False, "error": f"Dropbox connection error: {str(e)}"}

    @classmethod
    def cleanup_old_backups(cls, retention_days: int = 30) -> int:
        """
        Deletes local .sql backup files older than retention_days.
        """
        if retention_days <= 0:
            return 0

        cutoff = timezone.now() - timezone.timedelta(days=retention_days)
        deleted_count = 0

        old_logs = BackupLog.objects.filter(created_at__lt=cutoff)
        for b in old_logs:
            if os.path.exists(b.file_path):
                try:
                    os.remove(b.file_path)
                except OSError:
                    pass
            b.delete()
            deleted_count += 1

        return deleted_count

    @classmethod
    def get_backup_history(cls) -> List[Dict[str, Any]]:
        """
        Returns all database backup logs and physical files available on disk.
        """
        backup_dir = cls.get_backup_directory()
        logs = BackupLog.objects.all().select_related("created_by")
        results = []

        for log in logs:
            file_exists = os.path.exists(log.file_path)
            actual_size = os.path.getsize(log.file_path) if file_exists else log.file_size_bytes
            results.append({
                "id": log.id,
                "filename": log.filename,
                "file_path": log.file_path,
                "file_size_bytes": actual_size,
                "file_size_formatted": cls.format_file_size(actual_size),
                "backup_type": log.backup_type,
                "status": log.status,
                "dropbox_path": log.dropbox_path,
                "error_message": log.error_message,
                "created_by": log.created_by.get_full_name() or log.created_by.username if log.created_by else "System",
                "created_at": log.created_at.isoformat(),
                "file_exists": file_exists,
            })

        return results

    @classmethod
    def check_and_run_daily_auto_backup(cls) -> Optional[Dict[str, Any]]:
        """
        Checks if automated daily backup is enabled and if 02:00 AM scheduled time is reached.
        """
        is_enabled = SystemSetting.get_setting("auto_backup_enabled", "true").lower() == "true"
        if not is_enabled:
            return None

        scheduled_time_str = SystemSetting.get_setting("auto_backup_time", "02:00").strip() or "02:00"
        try:
            sched_hour, sched_min = map(int, scheduled_time_str.split(":"))
        except (ValueError, IndexError):
            sched_hour, sched_min = 2, 0

        now = timezone.localtime(timezone.now())
        today = now.date()

        # Check if an automated daily backup was already created today
        already_run = BackupLog.objects.filter(
            backup_type="AUTOMATIC_DAILY",
            created_at__date=today,
            status__in=["LOCAL_ONLY", "DROPBOX_SYNCED"],
        ).exists()

        if already_run:
            return None

        # Check if current time is >= scheduled time
        scheduled_dt = now.replace(hour=sched_hour, minute=sched_min, second=0, microsecond=0)
        if now >= scheduled_dt:
            logger.info(f"Triggering scheduled daily database backup for {today} at {now.strftime('%H:%M:%S')}")
            return cls.create_database_backup(backup_type="AUTOMATIC_DAILY")

        return None

    @staticmethod
    def format_file_size(bytes_val: int) -> str:
        """Converts raw byte count to readable KB / MB / GB format."""
        if not bytes_val or bytes_val <= 0:
            return "0 KB"
        kb = bytes_val / 1024
        if kb < 1024:
            return f"{kb:.1f} KB"
        mb = kb / 1024
        if mb < 1024:
            return f"{mb:.2f} MB"
        gb = mb / 1024
        return f"{gb:.2f} GB"
