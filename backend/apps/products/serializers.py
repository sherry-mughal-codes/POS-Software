"""
Serializers for Product Master, Categories, and Units of Measure.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.products.models import Category, Unit, Product


class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "code",
            "name",
            "parent",
            "parent_name",
            "description",
            "is_active",
            "product_count",
            "created_at",
            "updated_at",
        ]


class UnitSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Unit
        fields = [
            "id",
            "name",
            "short_code",
            "allow_decimal",
            "is_active",
            "product_count",
            "created_at",
        ]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_code = serializers.CharField(source="category.code", read_only=True)
    unit_name = serializers.CharField(source="unit.name", read_only=True)
    unit_code = serializers.CharField(source="unit.short_code", read_only=True)
    allow_decimal = serializers.BooleanField(source="unit.allow_decimal", read_only=True)
    purchase_price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    selling_price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    profit_margin_amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True)
    profit_margin_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "name",
            "barcode",
            "category",
            "category_name",
            "category_code",
            "unit",
            "unit_name",
            "unit_code",
            "allow_decimal",
            "purchase_price",
            "selling_price",
            "min_stock_level",
            "profit_margin_amount",
            "profit_margin_percentage",
            "image",
            "image_url",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def validate_barcode(self, value):
        if not value or value.strip() == "":
            return None
        value = value.strip()
        qs = Product.objects.filter(barcode=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A product with this barcode already exists.")
        return value

    def validate_sku(self, value):
        value = value.strip()
        qs = Product.objects.filter(sku__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A product with this SKU already exists.")
        return value
