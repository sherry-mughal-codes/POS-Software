"""
DRF Views and ViewSets for Employee Master Data, Attendance, Payroll Slips, and Disbursement Payments.
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from .models import (
    Employee,
    Attendance,
    SalarySlip,
    SalarySlipStatus,
    SalaryPayment,
    SalaryPaymentStatus,
)
from .serializers import (
    EmployeeSerializer,
    AttendanceSerializer,
    AttendanceCreateSerializer,
    SalarySlipSerializer,
    SalarySlipCreateSerializer,
    SalaryPaymentSerializer,
    SalaryPaymentCreateSerializer,
)
from .services import (
    EmployeeService,
    AttendanceService,
    PayrollService,
)
from apps.core.permissions import IsAdminOrManager


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    CRUD for Employee Master Data.
    """
    queryset = Employee.objects.all().select_related("user", "created_by")
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "toggle_status"]:
            return [IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        department = self.request.query_params.get("department")
        job_title = self.request.query_params.get("job_title")
        is_active = self.request.query_params.get("is_active")

        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(full_name__icontains=search)
                | models.Q(employee_id__icontains=search)
                | models.Q(phone__icontains=search)
                | models.Q(email__icontains=search)
            )
        if department:
            qs = qs.filter(department__icontains=department)
        if job_title:
            qs = qs.filter(job_title__icontains=job_title)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="next-id")
    def next_id(self, request):
        """Generates the next sequential employee ID (e.g. EMP-00006)."""
        return Response({"next_id": Employee.generate_employee_id()})

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        """Toggles active/inactive status without deleting historical records."""
        employee = self.get_object()
        employee.is_active = not employee.is_active
        employee.save(update_fields=["is_active", "updated_at"])
        return Response({
            "id": employee.id,
            "full_name": employee.full_name,
            "is_active": employee.is_active,
            "detail": f"Employee '{employee.full_name}' is now {'active' if employee.is_active else 'inactive'}.",
        })


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    CRUD for Daily Attendance Records with duplicate prevention.
    """
    queryset = Attendance.objects.all().select_related("employee", "created_by")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return AttendanceCreateSerializer
        return AttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get("employee") or self.request.query_params.get("employee_id")
        date_param = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        status_param = self.request.query_params.get("status")

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if date_param:
            qs = qs.filter(date=date_param)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = AttendanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            att = AttendanceService.record_attendance(data=serializer.validated_data, user=request.user)
            return Response(AttendanceSerializer(att).data, status=status.HTTP_201_CREATED)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)


class SalarySlipViewSet(viewsets.ModelViewSet):
    """
    Payroll generation, calculation, and General Ledger accrual workflows.
    """
    queryset = (
        SalarySlip.objects.all()
        .select_related("employee", "created_by", "submitted_by")
        .prefetch_related("payments")
    )
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return SalarySlipCreateSerializer
        return SalarySlipSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get("employee")
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        status_param = self.request.query_params.get("status")

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = SalarySlipCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submit_now = serializer.validated_data.pop("submit_now", True)
        try:
            slip = PayrollService.create_salary_slip(
                data=serializer.validated_data,
                user=request.user,
                submit_now=submit_now,
            )
            return Response(SalarySlipSerializer(slip).data, status=status.HTTP_201_CREATED)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """Submits draft slip and posts General Ledger accrual entry."""
        slip = self.get_object()
        try:
            submitted = PayrollService.submit_salary_slip(slip=slip, user=request.user)
            return Response(SalarySlipSerializer(submitted).data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancels salary slip and generates counter-reversal General Ledger entry."""
        slip = self.get_object()
        reason = request.data.get("reason", "").strip()
        try:
            cancelled = PayrollService.cancel_salary_slip(slip=slip, user=request.user, reason=reason)
            return Response(SalarySlipSerializer(cancelled).data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)


class SalaryPaymentViewSet(viewsets.ModelViewSet):
    """
    Disbursement vouchers reducing Accrued Salaries Payable.
    """
    queryset = (
        SalaryPayment.objects.all()
        .select_related("salary_slip", "employee", "payment_account", "created_by", "cancelled_by")
    )
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return SalaryPaymentCreateSerializer
        return SalaryPaymentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get("employee")
        slip_id = self.request.query_params.get("salary_slip")
        status_param = self.request.query_params.get("status")

        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if slip_id:
            qs = qs.filter(salary_slip_id=slip_id)
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = SalaryPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = PayrollService.disburse_salary_payment(
                data=serializer.validated_data,
                user=request.user,
            )
            return Response(SalaryPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancels a salary payment and reverses General Ledger disbursement."""
        payment = self.get_object()
        reason = request.data.get("reason", "").strip()
        try:
            cancelled = PayrollService.cancel_salary_payment(payment=payment, user=request.user, reason=reason)
            return Response(SalaryPaymentSerializer(cancelled).data, status=status.HTTP_200_OK)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"detail": str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeReportView(APIView):
    """
    Master Employee Directory Report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        department = request.query_params.get("department")
        job_title = request.query_params.get("job_title")
        is_active_param = request.query_params.get("is_active")
        is_active = is_active_param.lower() == "true" if is_active_param is not None else None

        report = EmployeeService.get_employee_report(
            department=department,
            job_title=job_title,
            is_active=is_active,
        )
        return Response(report, status=status.HTTP_200_OK)


class AttendanceReportView(APIView):
    """
    Master Attendance and Working Hours Report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        employee_id = request.query_params.get("employee")
        department = request.query_params.get("department")
        status_param = request.query_params.get("status")

        report = AttendanceService.get_attendance_report(
            start_date=start_date,
            end_date=end_date,
            employee_id=int(employee_id) if employee_id else None,
            department=department,
            status=status_param,
        )
        return Response(report, status=status.HTTP_200_OK)


class PayrollReportView(APIView):
    """
    Master Payroll, Accruals, and Disbursed Salaries Report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        month = request.query_params.get("month")
        year = request.query_params.get("year")
        employee_id = request.query_params.get("employee")
        department = request.query_params.get("department")
        status_param = request.query_params.get("status")

        report = PayrollService.get_payroll_report(
            start_date=start_date,
            end_date=end_date,
            month=int(month) if month else None,
            year=int(year) if year else None,
            employee_id=int(employee_id) if employee_id else None,
            department=department,
            status=status_param,
        )
        return Response(report, status=status.HTTP_200_OK)
