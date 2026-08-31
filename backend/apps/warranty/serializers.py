"""
Warranty Claim Module DRF Serializers.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.warranty.models import (
    CustomerWarrantyClaim,
    SupplierWarrantyClaim,
    SupplierWarrantyClaimItem,
)


class CustomerWarrantyClaimSerializer(serializers.ModelSerializer):
    sale_invoice_number = serializers.CharField(source="original_sale.invoice_number", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    claimed_product_name = serializers.CharField(source="claimed_product.name", read_only=True)
    claimed_product_sku = serializers.CharField(source="claimed_product.sku", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_company = serializers.CharField(source="supplier.company_name", read_only=True)
    replacement_product_name = serializers.CharField(source="replacement_product.name", read_only=True)
    replacement_product_sku = serializers.CharField(source="replacement_product.sku", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    valuation = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False, read_only=True)
    remaining_supplier_claimable_quantity = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )
    supplier_claimed_quantity = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )

    class Meta:
        model = CustomerWarrantyClaim
        fields = [
            "id",
            "claim_number",
            "original_sale",
            "sale_invoice_number",
            "sale_item",
            "customer",
            "customer_name",
            "customer_phone",
            "claimed_product",
            "claimed_product_name",
            "claimed_product_sku",
            "supplier",
            "supplier_name",
            "supplier_company",
            "replacement_product",
            "replacement_product_name",
            "replacement_product_sku",
            "quantity",
            "claim_date",
            "warranty_expiry_date",
            "original_unit_cost",
            "replacement_unit_cost",
            "valuation",
            "status",
            "journal_entry",
            "notes",
            "created_by",
            "created_by_username",
            "created_at",
            "completed_at",
            "remaining_supplier_claimable_quantity",
            "supplier_claimed_quantity",
        ]


class CustomerWarrantyClaimCreateSerializer(serializers.Serializer):
    sale_id = serializers.IntegerField(required=True)
    sale_item_id = serializers.IntegerField(required=True)
    replacement_product_id = serializers.IntegerField(required=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    supplier_id = serializers.IntegerField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class SupplierWarrantyClaimItemSerializer(serializers.ModelSerializer):
    customer_claim_number = serializers.CharField(source="customer_warranty_claim.claim_number", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    valuation = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = SupplierWarrantyClaimItem
        fields = [
            "id",
            "customer_warranty_claim",
            "customer_claim_number",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_cost",
            "valuation",
        ]


class SupplierWarrantyClaimSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_company = serializers.CharField(source="supplier.company_name", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    items = SupplierWarrantyClaimItemSerializer(many=True, read_only=True)
    total_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    total_valuation = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = SupplierWarrantyClaim
        fields = [
            "id",
            "claim_number",
            "supplier",
            "supplier_name",
            "supplier_company",
            "date",
            "status",
            "total_quantity",
            "total_valuation",
            "dispatch_journal_entry",
            "completion_journal_entry",
            "notes",
            "created_by",
            "created_by_username",
            "created_at",
            "processed_at",
            "completed_at",
            "items",
        ]


class SupplierClaimItemInputSerializer(serializers.Serializer):
    customer_warranty_claim_id = serializers.IntegerField(required=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)


class SupplierWarrantyClaimCreateSerializer(serializers.Serializer):
    supplier_id = serializers.IntegerField(required=True)
    items = SupplierClaimItemInputSerializer(many=True, required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
