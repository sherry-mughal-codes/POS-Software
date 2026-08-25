from django.urls import path
from apps.core.views import (
    HealthCheckView,
    ApiRootView,
    DashboardView,
    SystemSettingsView,
    BackupListView,
    BackupDownloadView,
    BackupDeleteView,
    BackupRestoreView,
    BackupDropboxSyncView,
    DropboxTestConnectionView,
)

urlpatterns = [
    path("", ApiRootView.as_view(), name="api_root"),
    path("health/", HealthCheckView.as_view(), name="health_check"),
    path("dashboard/", DashboardView.as_view(), name="executive_dashboard"),
    path("core/dashboard/", DashboardView.as_view(), name="core_dashboard"),
    path("settings/", SystemSettingsView.as_view(), name="system_settings"),
    path("core/settings/", SystemSettingsView.as_view(), name="core_system_settings"),
    # Backup & Disaster Recovery endpoints
    path("backups/", BackupListView.as_view(), name="backup_list"),
    path("core/backups/", BackupListView.as_view(), name="core_backup_list"),
    path("backups/download/<int:backup_id>/", BackupDownloadView.as_view(), name="backup_download"),
    path("core/backups/download/<int:backup_id>/", BackupDownloadView.as_view(), name="core_backup_download"),
    path("backups/<int:backup_id>/", BackupDeleteView.as_view(), name="backup_delete"),
    path("core/backups/<int:backup_id>/", BackupDeleteView.as_view(), name="core_backup_delete"),
    path("backups/<int:backup_id>/sync-dropbox/", BackupDropboxSyncView.as_view(), name="backup_sync_dropbox"),
    path("core/backups/<int:backup_id>/sync-dropbox/", BackupDropboxSyncView.as_view(), name="core_backup_sync_dropbox"),
    path("backups/restore/", BackupRestoreView.as_view(), name="backup_restore"),
    path("core/backups/restore/", BackupRestoreView.as_view(), name="core_backup_restore"),
    path("backups/test-dropbox/", DropboxTestConnectionView.as_view(), name="backup_test_dropbox"),
    path("core/backups/test-dropbox/", DropboxTestConnectionView.as_view(), name="core_backup_test_dropbox"),
]


