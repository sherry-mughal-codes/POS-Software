"""
Warranty Claim Module API Views & ViewSets.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.db.models import Q

from apps.warranty.models import (
    CustomerWarrantyClaim,
    SupplierWarrantyClaim,
)
from apps.warranty.serializers import (
    CustomerWarrantyClaimSerializer,
    CustomerWarrantyClaimCreateSerializer,
    SupplierWarrantyClaimSerializer,
    SupplierWarrantyClaimCreateSerializer,
)
from apps.warranty.services import WarrantyService


class CustomerWarrantyClaimViewSet(viewsets.ModelViewSet):
    """
    CRUD and actions for Customer Warranty Claims.
    """
    queryset = (
        CustomerWarrantyClaim.objects.all()
        .select_related(
            "original_sale",
            "sale_item",
            "customer",
            "claimed_product",
            "supplier",
            "replacement_product",
            "created_by",
        )
        .prefetch_related("supplier_claim_items")
    )
    serializer_class = CustomerWarrantyClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status", "").strip()
        supplier_id = self.request.query_params.get("supplier_id")
        customer_id = self.request.query_params.get("customer_id")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if search:
            qs = qs.filter(
                Q(claim_number__icontains=search)
                | Q(original_sale__invoice_number__icontains=search)
                | Q(customer__name__icontains=search)
                | Q(claimed_product__name__icontains=search)
                | Q(claimed_product__sku__icontains=search)
                | Q(supplier__name__icontains=search)
                | Q(supplier__company_name__icontains=search)
            )

        if status_filter:
            qs = qs.filter(status=status_filter)
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if start_date:
            qs = qs.filter(claim_date__gte=start_date)
        if end_date:
            qs = qs.filter(claim_date__lte=end_date)

        return qs.order_by("-id")

    @action(detail=False, methods=["get"], url_path="search-invoice")
    def search_invoice(self, request):
        """
        Searches sales by invoice number or customer query and returns items annotated with warranty eligibility.
        """
        query = request.query_params.get("query", "").strip()
        if not query:
            return Response([])
        results = WarrantyService.search_sale_for_warranty(query)
        return Response(results)

    @action(detail=False, methods=["post"], url_path="complete-claim")
    def complete_claim(self, request):
        """
        Processes and completes a customer warranty replacement claim atomically.
        """
        serializer = CustomerWarrantyClaimCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            claim = WarrantyService.complete_customer_warranty_claim(
                sale_id=data["sale_id"],
                sale_item_id=data["sale_item_id"],
                replacement_product_id=data["replacement_product_id"],
                quantity=data["quantity"],
                supplier_id=data["supplier_id"],
                notes=data.get("notes", ""),
                user=request.user if request.user.is_authenticated else None,
            )
            out_serializer = CustomerWarrantyClaimSerializer(claim)
            return Response(out_serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(
                {"detail": e.messages if hasattr(e, "messages") else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": f"Processing failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SupplierWarrantyClaimViewSet(viewsets.ModelViewSet):
    """
    CRUD and workflow actions for Supplier Warranty Claims.
    """
    queryset = (
        SupplierWarrantyClaim.objects.all()
        .select_related("supplier", "created_by", "dispatch_journal_entry", "completion_journal_entry")
        .prefetch_related("items__product", "items__customer_warranty_claim")
    )
    serializer_class = SupplierWarrantyClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status", "").strip()
        supplier_id = self.request.query_params.get("supplier_id")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if search:
            qs = qs.filter(
                Q(claim_number__icontains=search)
                | Q(supplier__name__icontains=search)
                | Q(supplier__company_name__icontains=search)
                | Q(items__product__name__icontains=search)
                | Q(items__product__sku__icontains=search)
            ).distinct()

        if status_filter:
            qs = qs.filter(status=status_filter)
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)

        return qs.order_by("-id")

    @action(detail=False, methods=["get"], url_path="available-items")
    def available_items(self, request):
        """
        Returns all warranty claim items belonging to a supplier that are currently held in Warranty Claim Asset.
        """
        supplier_id = request.query_params.get("supplier_id")
        if not supplier_id:
            return Response(
                {"detail": "supplier_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            items = WarrantyService.get_available_supplier_claim_items(int(supplier_id))
            return Response(items)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="process-dispatch")
    def process_dispatch(self, request):
        """
        Dispatches selected held items to the supplier (Status: IN_PROGRESS).
        """
        serializer = SupplierWarrantyClaimCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            batch = WarrantyService.process_supplier_warranty_claim(
                supplier_id=data["supplier_id"],
                items_data=data["items"],
                notes=data.get("notes", ""),
                user=request.user if request.user.is_authenticated else None,
            )
            out_serializer = SupplierWarrantyClaimSerializer(batch)
            return Response(out_serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(
                {"detail": e.messages if hasattr(e, "messages") else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": f"Processing failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], url_path="complete-receipt")
    def complete_receipt(self, request, pk=None):
        """
        Completes a supplier claim batch upon receiving replacement goods (Status: WARRANTY_COMPLETED).
        """
        try:
            batch = WarrantyService.complete_supplier_warranty_claim(
                claim_id=int(pk),
                user=request.user if request.user.is_authenticated else None,
            )
            out_serializer = SupplierWarrantyClaimSerializer(batch)
            return Response(out_serializer.data)
        except ValidationError as e:
            return Response(
                {"detail": e.messages if hasattr(e, "messages") else str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": f"Completion failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WarrantyMetricsViewSet(viewsets.ViewSet):
    """
    Authoritative metrics for warranty dashboard cards.
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        metrics = WarrantyService.get_warranty_dashboard_metrics()
        return Response(metrics)
