"""
URL routing for Employee Master, Attendance, Salary Slips, and Payroll.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet,
    AttendanceViewSet,
    SalarySlipViewSet,
    SalaryPaymentViewSet,
    EmployeeReportView,
    AttendanceReportView,
    PayrollReportView,
)

router = DefaultRouter()
router.register(r"records", EmployeeViewSet, basename="employee-records")
router.register(r"attendance", AttendanceViewSet, basename="employee-attendance")
router.register(r"slips", SalarySlipViewSet, basename="employee-salary-slips")
router.register(r"payments", SalaryPaymentViewSet, basename="employee-salary-payments")

urlpatterns = [
    path("reports/employees/", EmployeeReportView.as_view(), name="employee-report"),
    path("reports/attendance/", AttendanceReportView.as_view(), name="attendance-report"),
    path("reports/payroll/", PayrollReportView.as_view(), name="payroll-report"),
    path("", include(router.urls)),
]
