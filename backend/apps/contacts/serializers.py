"""
Serializers for Customer and Supplier Master Data.
"""

from rest_framework import serializers
from apps.contacts.models import Customer, Supplier


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "customer_id",
            "name",
            "phone",
            "email",
            "address",
            "is_walkin",
            "credit_enabled",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]

    def validate_customer_id(self, value):
        value = value.strip().upper()
        qs = Customer.objects.filter(customer_id__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Customer ID '{value}' is already in use.")
        return value

    def validate(self, attrs):
        is_walkin = attrs.get("is_walkin", getattr(self.instance, "is_walkin", False))
        credit_enabled = attrs.get("credit_enabled", getattr(self.instance, "credit_enabled", False))

        if is_walkin and credit_enabled:
            raise serializers.ValidationError({"credit_enabled": "Credit purchases cannot be enabled for the Walk-in Customer."})

        return attrs


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "supplier_id",
            "name",
            "company_name",
            "phone",
            "email",
            "address",
            "tax_id",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]

    def validate_supplier_id(self, value):
        value = value.strip().upper()
        qs = Supplier.objects.filter(supplier_id__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Supplier ID '{value}' is already in use.")
        return value
