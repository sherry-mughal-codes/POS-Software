from django.contrib import admin
from apps.warranty.models import (
    CustomerWarrantyClaim,
    SupplierWarrantyClaim,
    SupplierWarrantyClaimItem,
)


@admin.register(CustomerWarrantyClaim)
class CustomerWarrantyClaimAdmin(admin.ModelAdmin):
    list_display = [
        "claim_number",
        "original_sale",
        "customer",
        "claimed_product",
        "replacement_product",
        "quantity",
        "supplier",
        "status",
        "claim_date",
    ]
    list_filter = ["status", "claim_date", "supplier"]
    search_fields = ["claim_number", "original_sale__invoice_number", "customer__name", "claimed_product__name"]


class SupplierWarrantyClaimItemInline(admin.TabularInline):
    model = SupplierWarrantyClaimItem
    extra = 0


@admin.register(SupplierWarrantyClaim)
class SupplierWarrantyClaimAdmin(admin.ModelAdmin):
    list_display = [
        "claim_number",
        "supplier",
        "date",
        "status",
        "total_quantity",
        "total_valuation",
    ]
    list_filter = ["status", "date", "supplier"]
    search_fields = ["claim_number", "supplier__name", "supplier__company_name"]
    inlines = [SupplierWarrantyClaimItemInline]
