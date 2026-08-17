"""
Serializers for Stock Movement ledger, Stock Adjustments, and Inventory Valuation.
"""

from rest_framework import serializers
from apps.inventory.models import StockMovement, StockAdjustment, StockAdjustmentItem


class StockMovementSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    unit_name = serializers.CharField(source="product.unit.name", read_only=True, default="")
    unit_abbr = serializers.CharField(source="product.unit.short_code", read_only=True, default="")
    created_by_name = serializers.SerializerMethodField()
    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    balance_after = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "product",
            "product_sku",
            "product_name",
            "unit_name",
            "unit_abbr",
            "movement_type",
            "movement_type_display",
            "quantity",
            "unit_cost",
            "balance_after",
            "total_cost",
            "reference_type",
            "reference_id",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System"
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_balance_after(self, obj):
        if obj.balance_after and obj.balance_after > 0:
            return float(obj.balance_after)
        from django.db.models import Sum
        running = StockMovement.objects.filter(
            product_id=obj.product_id,
            id__lte=obj.id
        ).aggregate(t=Sum("quantity"))["t"]
        return float(running or obj.quantity or 0.0)

    def get_total_cost(self, obj):
        return float(abs(obj.quantity * obj.unit_cost))


class StockAdjustmentItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    unit_name = serializers.CharField(source="product.unit.name", read_only=True, default="")
    unit_abbr = serializers.CharField(source="product.unit.short_code", read_only=True, default="")
    system_stock = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    actual_stock = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    difference_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = StockAdjustmentItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "unit_name",
            "unit_abbr",
            "system_stock",
            "actual_stock",
            "difference_quantity",
            "unit_cost",
            "subtotal",
        ]


class StockAdjustmentSerializer(serializers.ModelSerializer):
    items = StockAdjustmentItemSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    adjustment_type_display = serializers.CharField(source="get_adjustment_type_display", read_only=True)
    reason_display = serializers.CharField(source="get_reason_display", read_only=True)
    total_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    total_cost_impact = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = StockAdjustment
        fields = [
            "id",
            "adjustment_number",
            "date",
            "adjustment_type",
            "adjustment_type_display",
            "reason",
            "reason_display",
            "notes",
            "total_quantity",
            "total_cost_impact",
            "created_by",
            "created_by_name",
            "created_at",
            "items",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System"
        return obj.created_by.get_full_name() or obj.created_by.username


class StockAdjustmentCreateItemSerializer(serializers.Serializer):
    product = serializers.IntegerField(required=True)
    difference_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    actual_stock = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class StockAdjustmentCreateSerializer(serializers.Serializer):
    adjustment_type = serializers.ChoiceField(choices=["IN", "OUT"], required=True)
    reason = serializers.CharField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    date = serializers.DateField(required=False)
    items = StockAdjustmentCreateItemSerializer(many=True, required=True)
