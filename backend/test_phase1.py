"""
Verification script for Phase 1 backend implementation.
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User
from apps.core.models import SystemModule, AuditLog
from apps.commission.models import SalesAgent
from apps.core.sequences import DocumentSequenceService
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.commission.views import SalesAgentViewSet
from apps.core.views import SystemModuleListView, SystemModuleToggleView
from apps.users.views import UserViewSet


def run_tests():
    print("=== STARTING PHASE 1 BACKEND VERIFICATION ===")
    factory = APIRequestFactory()

    # 1. Verify Super Admin User exists
    superadmin = User.objects.filter(is_superuser=True).first()
    if not superadmin:
        superadmin = User.objects.create_superuser("admin", "admin@apexpos.local", "Admin@123")
        print("Created default superadmin.")
    else:
        print(f"Verified superadmin user: @{superadmin.username} (id={superadmin.id})")

    # 2. Test Super Admin Protection (Cannot delete or deactivate)
    print("\n--- Testing Super Admin Protection ---")
    user_view = UserViewSet.as_view({"delete": "destroy", "post": "toggle_status"})

    # Try to delete Super Admin
    req_del = factory.delete(f"/api/v1/users/users/{superadmin.id}/")
    force_authenticate(req_del, user=superadmin)
    res_del = user_view(req_del, pk=superadmin.id)
    assert res_del.status_code == 400, f"Expected 400 when deleting superadmin, got {res_del.status_code}: {res_del.data}"
    print(f"PASSED: Super Admin deletion blocked with 400: {res_del.data.get('detail')}")

    # Try to toggle status (deactivate) Super Admin
    req_toggle = factory.post(f"/api/v1/users/users/{superadmin.id}/toggle-status/")
    force_authenticate(req_toggle, user=superadmin)
    res_toggle = user_view(req_toggle, pk=superadmin.id)
    assert res_toggle.status_code == 400, f"Expected 400 when deactivating superadmin, got {res_toggle.status_code}: {res_toggle.data}"
    print(f"PASSED: Super Admin deactivation blocked with 400: {res_toggle.data.get('detail')}")

    # 3. Test System Modules
    print("\n--- Testing System Modules Management ---")
    mod_list_view = SystemModuleListView.as_view()
    mod_toggle_view = SystemModuleToggleView.as_view()

    # Get module list
    req_list = factory.get("/api/v1/core/modules/")
    force_authenticate(req_list, user=superadmin)
    res_list = mod_list_view(req_list)
    assert res_list.status_code == 200
    modules = res_list.data["modules"]
    print(f"PASSED: Module list retrieved ({len(modules)} modules).")

    # Verify core modules cannot be toggled
    req_toggle_core = factory.post("/api/v1/core/modules/pos_register/toggle/", {"is_enabled": False}, format="json")
    force_authenticate(req_toggle_core, user=superadmin)
    res_toggle_core = mod_toggle_view(req_toggle_core, key="pos_register")
    assert res_toggle_core.status_code == 400
    print(f"PASSED: Core module disabling blocked: {res_toggle_core.data.get('detail')}")

    # Toggle commission_management optional module
    req_toggle_comm = factory.post("/api/v1/core/modules/commission_management/toggle/", {"is_enabled": True}, format="json")
    force_authenticate(req_toggle_comm, user=superadmin)
    res_toggle_comm = mod_toggle_view(req_toggle_comm, key="commission_management")
    assert res_toggle_comm.status_code == 200
    print(f"PASSED: Optional module enabled: {res_toggle_comm.data.get('detail')}")

    # 4. Test Sales Agent CRUD
    print("\n--- Testing Sales Agent Master ---")
    agent_view = SalesAgentViewSet.as_view({
        "get": "list",
        "post": "create",
    })
    agent_detail_view = SalesAgentViewSet.as_view({
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
        "post": "toggle_status",
    })

    # Auto sequence generation test
    next_code = DocumentSequenceService.generate_next_number("sales_agent")
    print(f"DocumentSequenceService generated code: {next_code}")

    # Create agent
    agent_payload = {
        "name": "Tariq Mahmood",
        "phone": "+92 300 1234567",
        "email": "tariq@agents.local",
        "address": "Office 4B, Blue Area, Islamabad",
        "commission_percentage": "5.50",
        "joining_date": "2026-01-15",
        "notes": "Top performing retail sales agent",
    }
    req_create = factory.post("/api/v1/commission/agents/", agent_payload, format="json")
    force_authenticate(req_create, user=superadmin)
    res_create = agent_view(req_create)
    assert res_create.status_code == 201, f"Failed to create agent: {res_create.data}"
    created_agent_id = res_create.data["id"]
    agent_code = res_create.data["code"]
    print(f"PASSED: Created Sales Agent: {res_create.data['name']} (Code: {agent_code}, Commission: {res_create.data['commission_percentage']}%)")

    # Test invalid commission percentage (> 100)
    req_invalid_pct = factory.post("/api/v1/commission/agents/", {
        "name": "Invalid Agent",
        "commission_percentage": "105.00",
    }, format="json")
    force_authenticate(req_invalid_pct, user=superadmin)
    res_invalid_pct = agent_view(req_invalid_pct)
    assert res_invalid_pct.status_code == 400
    print(f"PASSED: Invalid commission percentage rejected (400): {res_invalid_pct.data}")

    # Test agent status toggle
    req_toggle_agent = factory.post(f"/api/v1/commission/agents/{created_agent_id}/toggle-status/")
    force_authenticate(req_toggle_agent, user=superadmin)
    res_toggle_agent = agent_detail_view(req_toggle_agent, pk=created_agent_id)
    assert res_toggle_agent.status_code == 200
    assert res_toggle_agent.data["is_active"] is False
    print(f"PASSED: Agent deactivated: {res_toggle_agent.data['detail']}")

    # Reactivate agent
    req_toggle_agent2 = factory.post(f"/api/v1/commission/agents/{created_agent_id}/toggle-status/")
    force_authenticate(req_toggle_agent2, user=superadmin)
    res_toggle_agent2 = agent_detail_view(req_toggle_agent2, pk=created_agent_id)
    assert res_toggle_agent2.status_code == 200
    assert res_toggle_agent2.data["is_active"] is True
    print(f"PASSED: Agent reactivated: {res_toggle_agent2.data['detail']}")

    # 5. Test Module Disabling Guard (IsModuleEnabled)
    print("\n--- Testing Module Disabling Enforcement ---")
    # Disable commission_management
    req_disable = factory.post("/api/v1/core/modules/commission_management/toggle/", {"is_enabled": False}, format="json")
    force_authenticate(req_disable, user=superadmin)
    res_disable = mod_toggle_view(req_disable, key="commission_management")
    assert res_disable.status_code == 200

    # Try to access SalesAgent API while module is disabled
    req_agent_list = factory.get("/api/v1/commission/agents/")
    force_authenticate(req_agent_list, user=superadmin)
    res_agent_list = agent_view(req_agent_list)
    assert res_agent_list.status_code == 403, f"Expected 403 Forbidden when module is disabled, got {res_agent_list.status_code}"
    print(f"PASSED: API request blocked with 403 Forbidden when module is disabled: {res_agent_list.data.get('detail')}")

    # Re-enable module
    req_enable = factory.post("/api/v1/core/modules/commission_management/toggle/", {"is_enabled": True}, format="json")
    force_authenticate(req_enable, user=superadmin)
    res_enable = mod_toggle_view(req_enable, key="commission_management")
    assert res_enable.status_code == 200
    print("PASSED: Commission management re-enabled successfully.")

    print("\n=== ALL PHASE 1 BACKEND CHECKS PASSED PERFECTLY ===")

if __name__ == "__main__":
    run_tests()
