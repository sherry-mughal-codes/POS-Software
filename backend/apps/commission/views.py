"""
Views and ViewSets for Sales Agents and Commission Management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from django.core.exceptions import ValidationError

from apps.commission.models import (
    SalesAgent,
    CommissionRecord,
    CommissionPayment,
    CommissionAdjustment,
    CommissionStatus,
)
from apps.commission.serializers import (
    SalesAgentSerializer,
    CommissionRecordSerializer,
    CommissionPaymentSerializer,
    CommissionAdjustmentSerializer,
    PayCommissionSerializer,
)
from apps.commission.services import CommissionService
from apps.core.permissions import IsAdminOrManager, IsModuleEnabled
from apps.core.models import AuditLog, SystemSetting


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class SalesAgentViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Sales Agents.
    Protected by global Commission Management module switch and user permissions.
    """
    queryset = SalesAgent.objects.all().select_related("created_by")
    serializer_class = SalesAgentSerializer
    permission_classes = [IsAdminOrManager, IsModuleEnabled]
    module_key = "commission_management"

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        is_active_param = self.request.query_params.get("is_active")

        if is_active_param is not None:
            qs = qs.filter(is_active=is_active_param.lower() in ["true", "1"])
        elif status_param is not None:
            if status_param.lower() in ["active", "true", "1"]:
                qs = qs.filter(is_active=True)
            elif status_param.lower() in ["inactive", "false", "0"]:
                qs = qs.filter(is_active=False)

        search_term = self.request.query_params.get("search")
        if search_term:
            q = search_term.strip()
            qs = qs.filter(
                models.Q(name__icontains=q)
                | models.Q(code__icontains=q)
                | models.Q(phone__icontains=q)
                | models.Q(email__icontains=q)
            )

        ordering = self.request.query_params.get("ordering", "-created_at")
        valid_orderings = ["name", "-name", "code", "-code", "commission_percentage", "-commission_percentage", "joining_date", "-joining_date", "created_at", "-created_at"]
        if ordering in valid_orderings:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("-created_at")

        return qs

    def perform_create(self, serializer):
        agent = serializer.save(created_by=self.request.user)
        AuditLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action="USER_CREATED",
            resource="SalesAgent",
            resource_id=str(agent.id),
            ip_address=get_client_ip(self.request),
            details={
                "agent_name": agent.name,
                "agent_code": agent.code,
                "commission_percentage": str(agent.commission_percentage),
            },
        )

    def perform_update(self, serializer):
        agent = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action="USER_UPDATED",
            resource="SalesAgent",
            resource_id=str(agent.id),
            ip_address=get_client_ip(self.request),
            details={
                "agent_name": agent.name,
                "agent_code": agent.code,
                "commission_percentage": str(agent.commission_percentage),
                "is_active": agent.is_active,
            },
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        AuditLog.objects.create(
            user=request.user,
            username=request.user.username,
            action="USER_DEACTIVATED",
            resource="SalesAgent",
            resource_id=str(instance.id),
            ip_address=get_client_ip(request),
            details={"deleted_agent": instance.name, "agent_code": instance.code},
        )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        """Toggle active / inactive status for sales agent."""
        agent = self.get_object()
        agent.is_active = not agent.is_active
        agent.save(update_fields=["is_active", "updated_at"])

        AuditLog.objects.create(
            user=request.user,
            username=request.user.username,
            action="USER_ACTIVATED" if agent.is_active else "USER_DEACTIVATED",
            resource="SalesAgent",
            resource_id=str(agent.id),
            ip_address=get_client_ip(request),
            details={"agent_code": agent.code, "new_active_status": agent.is_active},
        )

        return Response({
            "id": agent.id,
            "name": agent.name,
            "code": agent.code,
            "is_active": agent.is_active,
            "detail": f"Sales agent '{agent.name}' ({agent.code}) is now {'active' if agent.is_active else 'inactive'}.",
        }, status=status.HTTP_200_OK)


class CommissionRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet for inspecting Commission Records, Commission Payables, and issuing payments.
    """
    queryset = (
        CommissionRecord.objects.all()
        .select_related("sale__customer", "sales_agent", "created_by", "journal_entry")
        .prefetch_related("payments__payment_account", "adjustments__sales_return")
    )
    serializer_class = CommissionRecordSerializer
    permission_classes = [IsAdminOrManager, IsModuleEnabled]
    module_key = "commission_management"

    def get_queryset(self):
        qs = super().get_queryset()
        agent_id = self.request.query_params.get("agent") or self.request.query_params.get("sales_agent")
        status_param = self.request.query_params.get("status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        search = self.request.query_params.get("search")

        if agent_id:
            qs = qs.filter(sales_agent_id=agent_id)
        if status_param and status_param.upper() != "ALL":
            qs = qs.filter(status=status_param.upper())
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            q = search.strip()
            qs = qs.filter(
                models.Q(commission_number__icontains=q)
                | models.Q(sale__invoice_number__icontains=q)
                | models.Q(agent_name_snapshot__icontains=q)
                | models.Q(agent_code_snapshot__icontains=q)
                | models.Q(sale__customer__name__icontains=q)
            )

        return qs.order_by("-date", "-created_at")

    @action(detail=True, methods=["post"], url_path="pay")
    def pay(self, request, pk=None):
        """
        Disburses payment for a commission payable record.
        """
        serializer = PayCommissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            payment = CommissionService.pay_commission(
                commission_record_id=int(pk),
                amount=data["amount"],
                payment_account_id=data["payment_account"],
                payment_date=data.get("payment_date"),
                notes=data.get("notes", ""),
                created_by=request.user,
            )

            record = CommissionRecord.objects.get(pk=pk)

            AuditLog.objects.create(
                user=request.user,
                username=request.user.username,
                action="SETTINGS_UPDATED",
                resource="CommissionPayment",
                resource_id=payment.payment_number,
                ip_address=get_client_ip(request),
                details={
                    "commission_number": record.commission_number,
                    "payment_number": payment.payment_number,
                    "paid_amount": str(payment.amount),
                    "sales_agent": record.agent_name_snapshot,
                },
            )

            return Response({
                "detail": f"Commission payment {payment.payment_number} of Rs. {payment.amount} recorded successfully.",
                "payment": CommissionPaymentSerializer(payment).data,
                "record": CommissionRecordSerializer(record).data,
            }, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response(
                {"detail": e.message if hasattr(e, "message") else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"], url_path="slip")
    def slip(self, request, pk=None):
        """
        Retrieves complete structured printable commission settlement slip metadata.
        """
        record = self.get_object()
        company_name = SystemSetting.get_setting("company_name", "ApexPOS Store")
        company_phone = SystemSetting.get_setting("company_phone", "")
        company_address = SystemSetting.get_setting("company_address", "")
        currency_symbol = SystemSetting.get_setting("currency_symbol", "Rs.")

        slip_data = {
            "business": {
                "name": company_name,
                "phone": company_phone,
                "address": company_address,
                "currency_symbol": currency_symbol,
            },
            "commission": {
                "id": record.id,
                "commission_number": record.commission_number,
                "date": str(record.date),
                "status": record.status,
                "status_display": record.get_status_display(),
                "invoice_number": record.sale.invoice_number,
                "sale_date": str(record.sale.date),
                "sale_grand_total": float(record.sale.grand_total),
                "customer_name": record.sale.customer.name,
                "sales_agent_name": record.agent_name_snapshot,
                "sales_agent_code": record.agent_code_snapshot,
                "commission_percentage": float(record.commission_percentage_snapshot),
                "commission_base": float(record.commission_base),
                "commission_amount": float(record.commission_amount),
                "adjusted_amount": float(record.adjusted_amount),
                "net_payable_amount": float(record.net_payable_amount),
                "paid_amount": float(record.paid_amount),
                "remaining_payable_amount": float(record.remaining_payable_amount),
                "advance_credit_amount": float(record.advance_credit_amount),
            },
            "payments": [
                {
                    "payment_number": p.payment_number,
                    "date": str(p.payment_date),
                    "amount": float(p.amount),
                    "payment_account": p.payment_account.name if p.payment_account else "",
                    "notes": p.notes,
                }
                for p in record.payments.all()
            ],
            "adjustments": [
                {
                    "return_number": a.sales_return.return_number,
                    "date": str(a.date),
                    "returned_base": float(a.returned_base_amount),
                    "reversal_amount": float(a.reversal_amount),
                    "notes": a.notes,
                }
                for a in record.adjustments.all()
            ],
        }

        return Response(slip_data, status=status.HTTP_200_OK)
