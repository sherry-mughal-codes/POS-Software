"""
System Settings Test Suite.
Verifies GET, POST, persistence, audit logging, and logo storage in SystemSetting.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from apps.core.models import SystemSetting, AuditLog
from apps.core.views import SystemSettingsView

User = get_user_model()


def run_tests():
    print("=" * 70)
    print("RUNNING SYSTEM SETTINGS & DYNAMIC CONFIGURATION TEST SUITE")
    print("=" * 70)
    passed = 0
    total = 5

    admin_user = User.objects.filter(is_superuser=True).first()
    factory = APIRequestFactory()

    # -------------------------------------------------------------
    # Test 1: Fetch Default System Settings via GET
    # -------------------------------------------------------------
    print("\n[Test 1] Testing GET /api/v1/settings/...")
    req = factory.get("/api/v1/settings/")
    force_authenticate(req, user=admin_user)
    resp = SystemSettingsView.as_view()(req)
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    assert "settings" in resp.data, "Missing 'settings' key in response"
    assert "grouped" in resp.data, "Missing 'grouped' key in response"
    assert resp.data["settings"].get("currency_symbol") == "Rs.", "Default currency symbol mismatch"
    print(f"  -> Successfully fetched {len(resp.data['settings'])} configuration keys across {len(resp.data['grouped'])} groups.")
    passed += 1

    # -------------------------------------------------------------
    # Test 2: Update Store Name and Business Info via POST
    # -------------------------------------------------------------
    print("\n[Test 2] Testing POST /api/v1/settings/ to update store name...")
    dummy_logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    update_payload = {
        "settings": {
            "company_name": "Metro Cash & Carry Supermarket",
            "company_logo": dummy_logo,
            "company_address": "Sector G-9/4, Islamabad, Pakistan",
            "company_phone": "+92 51 2233445",
            "currency_symbol": "PKR",
            "receipt_header": "Premier Supermarket Discount Chain",
            "receipt_footer": "Thank you for visiting Metro! Free home delivery on 5000+ orders.",
        }
    }

    req_post = factory.post("/api/v1/settings/", data=update_payload, format="json")
    force_authenticate(req_post, user=admin_user)
    resp_post = SystemSettingsView.as_view()(req_post)
    assert resp_post.status_code == 200, f"Expected 200 OK, got {resp_post.status_code}"
    assert resp_post.data["settings"]["company_name"] == "Metro Cash & Carry Supermarket", "Store name not updated"
    assert resp_post.data["settings"]["company_logo"] == dummy_logo, "Logo base64 data not stored"
    assert resp_post.data["settings"]["currency_symbol"] == "PKR", "Currency symbol not updated"
    print("  -> Updated company_name, company_logo, address, and receipt texts successfully.")
    passed += 1

    # -------------------------------------------------------------
    # Test 3: Model Verification & Persistence
    # -------------------------------------------------------------
    print("\n[Test 3] Verifying Direct Database Persistence via SystemSetting.get_setting()...")
    saved_name = SystemSetting.get_setting("company_name")
    saved_logo = SystemSetting.get_setting("company_logo")
    assert saved_name == "Metro Cash & Carry Supermarket", f"DB value mismatch: {saved_name}"
    assert saved_logo == dummy_logo, "DB logo base64 mismatch"
    print(f"  -> Database verified: company_name = '{saved_name}', company_logo length = {len(saved_logo)} chars.")
    passed += 1

    # -------------------------------------------------------------
    # Test 4: Audit Trail Logging for Settings Update
    # -------------------------------------------------------------
    print("\n[Test 4] Verifying Audit Trail Logging for SETTINGS_UPDATED...")
    last_log = AuditLog.objects.filter(action="SETTINGS_UPDATED").first()
    assert last_log is not None, "AuditLog for SETTINGS_UPDATED not found"
    assert "company_name" in last_log.details.get("updated_keys", []), "AuditLog missing company_name in details"
    print(f"  -> AuditLog entry verified: id={last_log.id}, user={last_log.username}, keys={last_log.details.get('updated_keys')}")
    passed += 1

    # -------------------------------------------------------------
    # Test 5: Resetting Settings to Standard Store Defaults
    # -------------------------------------------------------------
    print("\n[Test 5] Resetting configuration to standard store defaults...")
    reset_payload = {
        "settings": {
            "company_name": "ApexPOS Supermarket",
            "company_logo": "",
            "company_address": "Main Boulevard, Gulberg III, Lahore, Pakistan",
            "company_phone": "+92 42 111 2653",
            "currency_symbol": "Rs.",
            "receipt_header": "ApexPOS Retail - Premier Supermarket",
            "receipt_footer": "Thank you for shopping with us! No return without receipt.",
        }
    }
    req_reset = factory.post("/api/v1/settings/", data=reset_payload, format="json")
    force_authenticate(req_reset, user=admin_user)
    resp_reset = SystemSettingsView.as_view()(req_reset)
    assert resp_reset.status_code == 200
    assert resp_reset.data["settings"]["company_name"] == "ApexPOS Supermarket"
    print("  -> Configuration reset to 'ApexPOS Supermarket' with Rs. currency symbol.")
    passed += 1
    assert resp_reset.data["settings"]["company_name"] == "ApexPOS Supermarket"
    print("  -> Configuration reset to 'ApexPOS Supermarket' with Rs. currency symbol.")
    passed += 1

    print("\n" + "=" * 70)
    print(f"SYSTEM SETTINGS SUITE RESULT: {passed}/{total} TESTS PASSED (100% SUCCESS)")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
