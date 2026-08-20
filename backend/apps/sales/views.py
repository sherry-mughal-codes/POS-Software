"""
REST API Views and ViewSets for POS Sales, Returns, and Sales Analytics.
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.core.exceptions import ValidationError

from apps.sales.models import Sale, SalesReturn, POSDaySession
from apps.sales.serializers import (
    SaleSerializer,
    SaleCheckoutSerializer,
    SalesReturnSerializer,
    SalesReturnCreateSerializer,
    POSDaySessionSerializer,
    POSDaySessionOpenSerializer,
    POSDaySessionCloseSerializer,
)
from apps.sales.services import SalesService, DaySessionService


class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving sales invoices, with a custom checkout action.
    """
    queryset = (
        Sale.objects.all()
        .select_related("customer", "created_by")
        .prefetch_related("items__product__unit", "payments", "returns__items__product")
    )
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        customer = self.request.query_params.get("customer")
        status_filter = self.request.query_params.get("status")
        payment_method = self.request.query_params.get("payment_method")
        search = self.request.query_params.get("search")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if customer:
            qs = qs.filter(customer_id=customer)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if search:
            qs = qs.filter(invoice_number__icontains=search) | qs.filter(customer__name__icontains=search)
        return qs

    @action(detail=False, methods=["post"], url_path="checkout")
    def checkout(self, request):
        """
        Processes a complete counter POS sale with atomic stock deduction and accounting entries.
        """
        serializer = SaleCheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            sale = SalesService.create_sale(
                customer_id=data["customer"],
                items_data=data["items"],
                payment_method=data.get("payment_method", "CASH"),
                payment_account_id=data.get("payment_account"),
                discount_amount=data.get("discount_amount", 0),
                tax_amount=data.get("tax_amount", 0),
                paid_amount=data.get("paid_amount"),
                payments_breakdown=data.get("payments_breakdown"),
                notes=data.get("notes", ""),
                sale_date=data.get("date"),
                created_by=request.user,
            )
            return Response(
                SaleSerializer(sale).data,
                status=status.HTTP_201_CREATED,
            )
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


class SalesReturnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for processing and inspecting customer sales returns.
    """
    queryset = (
        SalesReturn.objects.all()
        .select_related("original_sale__customer", "created_by")
        .prefetch_related("items__product")
    )
    serializer_class = SalesReturnSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        serializer = SalesReturnCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            sales_return = SalesService.process_sales_return(
                sale_id=data["sale_id"],
                items_data=data["items"],
                reason=data["reason"],
                notes=data.get("notes", ""),
                return_date=data.get("date"),
                created_by=request.user,
            )
            return Response(
                SalesReturnSerializer(sales_return).data,
                status=status.HTTP_201_CREATED,
            )
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


class SalesReportView(APIView):
    """
    Consolidated master sales report matrix with multi-filter dimensions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        customer_id = request.query_params.get("customer")
        cashier_id = request.query_params.get("cashier")
        payment_method = request.query_params.get("payment_method")
        status_filter = request.query_params.get("status")

        report = SalesService.get_sales_report(
            start_date=start_date or None,
            end_date=end_date or None,
            customer_id=int(customer_id) if customer_id else None,
            cashier_id=int(cashier_id) if cashier_id else None,
            payment_method=payment_method or None,
            status=status_filter or None,
        )
        return Response(report, status=status.HTTP_200_OK)


class POSDaySessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    CRUD and operational endpoints for POS Business Day Sessions, X-Report, and Z-Report closing audits.
    """
    queryset = POSDaySession.objects.all().select_related("opened_by", "closed_by")
    serializer_class = POSDaySessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if status_filter:
            qs = qs.filter(status=status_filter)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    @action(detail=False, methods=["get"], url_path="current")
    def current(self, request):
        """Returns the currently active open day session and live X-report snapshot, or active: false."""
        active = DaySessionService.get_active_session()
        if not active:
            return Response({"active": False, "detail": "No business day is currently open."}, status=status.HTTP_200_OK)

        x_report = DaySessionService.get_x_report(active.id)
        return Response({
            "active": True,
            "session": POSDaySessionSerializer(active).data,
            "x_report": x_report,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="open-day")
    def open_day(self, request):
        """Opens a new business day session with opening cash drawer amount."""
        serializer = POSDaySessionOpenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            session = DaySessionService.open_day(
                opening_cash=data["opening_cash"],
                opened_by=request.user,
                opening_notes=data.get("opening_notes", ""),
                session_date=data.get("date"),
            )
            return Response(POSDaySessionSerializer(session).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"detail": e.message if hasattr(e, "message") else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="x-report")
    def x_report(self, request):
        """Generates real-time instantaneous X-Report snapshot for currently active day session."""
        try:
            report_data = DaySessionService.get_x_report()
            return Response(report_data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": e.message if hasattr(e, "message") else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="close-day")
    def close_day(self, request):
        """Closes the currently active business day session and generates immutable Z-Report."""
        serializer = POSDaySessionCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            closed_session = DaySessionService.close_day(
                actual_cash=data["actual_cash"],
                difference_reason=data.get("difference_reason", ""),
                closing_notes=data.get("closing_notes", ""),
                closed_by=request.user,
            )
            return Response({
                "session": POSDaySessionSerializer(closed_session).data,
                "z_report": closed_session.z_report_snapshot,
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": e.message if hasattr(e, "message") else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"], url_path="z-report")
    def z_report(self, request, pk=None):
        """Retrieves the finalized immutable Z-Report for a closed business day session."""
        try:
            z_data = DaySessionService.get_z_report(session_id=int(pk))
            return Response(z_data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": e.message if hasattr(e, "message") else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class POSDaySessionsReportView(APIView):
    """
    Consolidated analytical report of all POS Day Sessions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        status_param = request.query_params.get("status")

        report = DaySessionService.get_day_sessions_report(
            start_date=start_date or None,
            end_date=end_date or None,
            status=status_param or None,
        )
        return Response(report, status=status.HTTP_200_OK)

