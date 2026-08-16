"""
URL Configuration for Point of Sale (POS) backend.
All API endpoints are versioned under /api/v1/.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # API v1 Versioned Endpoints
    path("api/v1/", include([
        path("", include("apps.core.urls")),
        path("", include("apps.users.urls")),
        path("accounting/", include("apps.accounting.urls")),
        path("", include("apps.products.urls")),
        path("", include("apps.contacts.urls")),
        path("inventory/", include("apps.inventory.urls")),
        path("purchases/", include("apps.purchases.urls")),
        # Future domain apps:
        # path("sales/", include("apps.sales.urls")),
    ])),
]
