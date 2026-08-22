"""
Serializers for authentication, users, roles, and permissions.
"""

from django.contrib.auth.models import User, Group, Permission
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from apps.users.models import UserProfile
from apps.core.models import AuditLog


class PermissionSerializer(serializers.ModelSerializer):
    app_label = serializers.CharField(source="content_type.app_label", read_only=True)

    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "app_label"]


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializes Django Groups as system Roles.
    """
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        write_only=True,
        source="permissions",
        required=False,
    )
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ["id", "name", "permissions", "permission_ids", "user_count"]

    def get_user_count(self, obj):
        return obj.user_set.count()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["company", "data_scope", "phone", "pin_code", "notes", "created_at", "updated_at"]


class UserSerializer(serializers.ModelSerializer):
    """
    Safe User representation omitting password.
    """
    profile = UserProfileSerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    role_ids = serializers.SerializerMethodField()
    effective_permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
            "profile",
            "roles",
            "role_ids",
            "effective_permissions",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "is_superuser"]

    def get_roles(self, obj):
        return list(obj.groups.values_list("name", flat=True))

    def get_role_ids(self, obj):
        return list(obj.groups.values_list("id", flat=True))

    def get_effective_permissions(self, obj):
        if obj.is_superuser:
            perms = set(Permission.objects.values_list("codename", flat=True))
            for ct_app, codename in Permission.objects.values_list("content_type__app_label", "codename"):
                perms.add(f"{ct_app}.{codename}")
            return list(perms)
        perms = set()
        for p in obj.get_all_permissions():
            perms.add(p)
            if "." in p:
                perms.add(p.split(".", 1)[1])
        return list(perms)


import re

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating users with password handling, company scope, and role assignment.
    """
    username = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=False, min_length=4)
    company = serializers.CharField(write_only=True, required=False, allow_blank=True)
    data_scope = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    pin_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    roles = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Group.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "is_active",
            "is_staff",
            "company",
            "data_scope",
            "phone",
            "pin_code",
            "roles",
        ]

    def validate_username(self, value):
        if value:
            # Clean and sanitize username by replacing whitespace with underscore
            cleaned = re.sub(r"\s+", "_", value.strip().lower())
            instance = getattr(self, "instance", None)
            qs = User.objects.filter(username__iexact=cleaned)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError(f"The username '{cleaned}' is already taken.")
            return cleaned
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        company = validated_data.pop("company", "ApexPOS Enterprise Store")
        data_scope = validated_data.pop("data_scope", "ALL_COMPANY")
        phone = validated_data.pop("phone", "")
        pin_code = validated_data.pop("pin_code", "")
        roles = validated_data.pop("roles", [])

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=validated_data.get("is_active", True),
            is_staff=validated_data.get("is_staff", False),
        )

        if password:
            user.set_password(password)
            user.save()

        if roles:
            user.groups.set(roles)

        # Update profile
        if hasattr(user, "profile"):
            user.profile.company = company
            user.profile.data_scope = data_scope
            user.profile.phone = phone
            user.profile.pin_code = pin_code
            user.profile.save()

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        company = validated_data.pop("company", None)
        data_scope = validated_data.pop("data_scope", None)
        phone = validated_data.pop("phone", None)
        pin_code = validated_data.pop("pin_code", None)
        roles = validated_data.pop("roles", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        if roles is not None:
            instance.groups.set(roles)

        # Update profile
        if hasattr(instance, "profile"):
            if company is not None:
                instance.profile.company = company
            if data_scope is not None:
                instance.profile.data_scope = data_scope
            if phone is not None:
                instance.profile.phone = phone
            if pin_code is not None:
                instance.profile.pin_code = pin_code
            instance.profile.save()

        return instance


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "username",
            "action",
            "resource",
            "resource_id",
            "ip_address",
            "details",
            "timestamp",
        ]
        read_only_fields = fields
