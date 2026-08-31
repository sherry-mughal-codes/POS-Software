"""
DRF Serializers for Employee Master Data, Attendance, Salary Slips, and Payroll Payments.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.accounting.models import Account
from .models import (
    Employee,
    Attendance,
    SalarySlip,
    SalaryPayment,
)


class EmployeeSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(required=False, allow_blank=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_id",
            "user",
            "user_username",
            "full_name",
            "phone",
            "email",
            "address",
            "job_title",
            "department",
            "date_of_joining",
            "basic_salary",
            "payment_method",
            "bank_name",
            "bank_account_title",
            "bank_account_number",
            "is_active",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        if not validated_data.get("employee_id"):
            validated_data["employee_id"] = Employee.generate_employee_id()
        return super().create(validated_data)

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_id", read_only=True)
    department = serializers.CharField(source="employee.department", read_only=True)
    job_title = serializers.CharField(source="employee.job_title", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    working_hours = serializers.FloatField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_code",
            "department",
            "job_title",
            "date",
            "check_in",
            "check_out",
            "status",
            "status_display",
            "working_hours",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "working_hours", "created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"


class AttendanceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = [
            "id",
            "employee",
            "date",
            "check_in",
            "check_out",
            "status",
            "notes",
        ]


class SalaryPaymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_id", read_only=True)
    slip_number = serializers.CharField(source="salary_slip.slip_number", read_only=True)
    payment_account_name = serializers.CharField(source="payment_account.name", read_only=True)
    payment_account_code = serializers.CharField(source="payment_account.code", read_only=True)
    journal_entry_number = serializers.CharField(source="journal_entry.entry_number", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SalaryPayment
        fields = [
            "id",
            "payment_number",
            "salary_slip",
            "slip_number",
            "employee",
            "employee_name",
            "employee_code",
            "date",
            "amount",
            "payment_method",
            "payment_account",
            "payment_account_name",
            "payment_account_code",
            "reference",
            "cheque_number",
            "cheque_date",
            "cheque_bank",
            "notes",
            "status",
            "journal_entry",
            "journal_entry_number",
            "created_by",
            "created_by_name",
            "cancelled_by",
            "cancelled_at",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "payment_number",
            "status",
            "journal_entry",
            "created_by",
            "cancelled_by",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"


class SalaryPaymentCreateSerializer(serializers.ModelSerializer):
    payment_account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False, allow_null=True)

    class Meta:
        model = SalaryPayment
        fields = [
            "id",
            "salary_slip",
            "date",
            "amount",
            "payment_method",
            "payment_account",
            "reference",
            "cheque_number",
            "cheque_date",
            "cheque_bank",
            "notes",
        ]

    def validate_amount(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value


class SalarySlipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_id", read_only=True)
    department = serializers.CharField(source="employee.department", read_only=True)
    job_title = serializers.CharField(source="employee.job_title", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payable_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    journal_entry_number = serializers.CharField(source="journal_entry.entry_number", read_only=True)
    payments = SalaryPaymentSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SalarySlip
        fields = [
            "id",
            "slip_number",
            "employee",
            "employee_name",
            "employee_code",
            "department",
            "job_title",
            "month",
            "year",
            "payroll_period",
            "date",
            "basic_salary",
            "allowances",
            "deductions",
            "net_salary",
            "paid_amount",
            "payable_amount",
            "is_fully_paid",
            "status",
            "status_display",
            "notes",
            "journal_entry",
            "journal_entry_number",
            "payments",
            "created_by",
            "created_by_name",
            "submitted_by",
            "submitted_by_name",
            "submitted_at",
            "cancelled_by",
            "cancelled_at",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slip_number",
            "payroll_period",
            "net_salary",
            "paid_amount",
            "payable_amount",
            "is_fully_paid",
            "status",
            "journal_entry",
            "created_by",
            "submitted_by",
            "submitted_at",
            "cancelled_by",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.username
        return None


class SalarySlipCreateSerializer(serializers.ModelSerializer):
    submit_now = serializers.BooleanField(default=True, write_only=True)

    class Meta:
        model = SalarySlip
        fields = [
            "id",
            "employee",
            "month",
            "year",
            "date",
            "basic_salary",
            "allowances",
            "deductions",
            "notes",
            "submit_now",
        ]
