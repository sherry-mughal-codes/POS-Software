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

