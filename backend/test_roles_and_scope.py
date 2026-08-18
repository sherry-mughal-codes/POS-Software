"""
Test Suite for Roles Creation, Module Permissions, and User Company/Data Scope.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.users.views import RoleViewSet, UserViewSet

User = get_user_model()


def run_tests():
    print("=" * 70)
    print("RUNNING ROLES CREATION & USER COMPANY SCOPE TEST SUITE")
    print("=" * 70)
    passed = 0
    total = 4

    admin_user = User.objects.filter(is_superuser=True).first()
    factory = APIRequestFactory()

    # -------------------------------------------------------------
    # Test 1: Create New Role with Granular Permissions
    # -------------------------------------------------------------
    print("\n[Test 1] Testing POST /api/v1/roles/ to create a new role 'Store Supervisor'...")
    perms = list(Permission.objects.filter(codename__in=["access_pos_register", "process_sale_return", "approve_purchases"]))
    perm_ids = [p.id for p in perms]

    # Delete if exists from previous run
    Group.objects.filter(name="Store Supervisor").delete()

    req = factory.post("/api/v1/roles/", data={"name": "Store Supervisor", "permission_ids": perm_ids}, format="json")
    force_authenticate(req, user=admin_user)
    resp = RoleViewSet.as_view({"post": "create"})(req)
    assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.data}"
    created_role_id = resp.data["id"]
    assert resp.data["name"] == "Store Supervisor"
    print(f"  -> Successfully created role 'Store Supervisor' (ID: {created_role_id}) with {len(perm_ids)} permissions.")
    passed += 1

    # -------------------------------------------------------------
    # Test 2: Verify Role Listing and Permissions
    # -------------------------------------------------------------
    print("\n[Test 2] Testing GET /api/v1/roles/ to verify 'Store Supervisor' in list...")
    req_list = factory.get("/api/v1/roles/")
    force_authenticate(req_list, user=admin_user)
    resp_list = RoleViewSet.as_view({"get": "list"})(req_list)
    assert resp_list.status_code == 200
    role_names = [r["name"] for r in resp_list.data]
    assert "Store Supervisor" in role_names, "'Store Supervisor' not found in roles list"
    print(f"  -> Verified 'Store Supervisor' in roles list: {role_names}")
    passed += 1

    # -------------------------------------------------------------
    # Test 3: Create User with Company Scope & Role
    # -------------------------------------------------------------
    print("\n[Test 3] Testing POST /api/v1/users/ with company='Islamabad Superstore Branch'...")
    User.objects.filter(username="supervisor_isb").delete()

    user_payload = {
        "username": "supervisor_isb",
        "password": "Password123!",
        "first_name": "Hamza",
        "last_name": "Khan",
        "email": "hamza.khan@apexpos.com",
        "company": "Islamabad Superstore Branch",
        "data_scope": "OWN_DATA",
        "phone": "+92 51 9988776",
        "pin_code": "4321",
        "roles": [created_role_id],
    }

    req_user = factory.post("/api/v1/users/", data=user_payload, format="json")
    force_authenticate(req_user, user=admin_user)
    resp_user = UserViewSet.as_view({"post": "create"})(req_user)
    assert resp_user.status_code == 201, f"Expected 201, got {resp_user.status_code}: {resp_user.data}"
    new_user_id = resp_user.data["id"]
    assert resp_user.data["profile"]["company"] == "Islamabad Superstore Branch", "Company scope not assigned"
    assert resp_user.data["profile"]["data_scope"] == "OWN_DATA", "Data scope not assigned"
    print(f"  -> Created user 'supervisor_isb' with company='{resp_user.data['profile']['company']}' and scope='{resp_user.data['profile']['data_scope']}'.")
    passed += 1

    # -------------------------------------------------------------
    # Test 4: Update User Company Scope via PATCH
    # -------------------------------------------------------------
    print("\n[Test 4] Testing PATCH /api/v1/users/{id}/ to update company scope...")
    update_payload = {
        "company": "Gulberg Mega Branch - Lahore",
        "data_scope": "ALL_COMPANY",
    }
    req_patch = factory.patch(f"/api/v1/users/{new_user_id}/", data=update_payload, format="json")
    force_authenticate(req_patch, user=admin_user)
    resp_patch = UserViewSet.as_view({"patch": "partial_update"})(req_patch, pk=new_user_id)
    assert resp_patch.status_code == 200
    assert resp_patch.data["profile"]["company"] == "Gulberg Mega Branch - Lahore"
    assert resp_patch.data["profile"]["data_scope"] == "ALL_COMPANY"
    print(f"  -> Successfully updated company to '{resp_patch.data['profile']['company']}' and scope to '{resp_patch.data['profile']['data_scope']}'.")
    passed += 1

    print("\n" + "=" * 70)
    print(f"ROLES & SCOPE SUITE RESULT: {passed}/{total} TESTS PASSED (100% SUCCESS)")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
