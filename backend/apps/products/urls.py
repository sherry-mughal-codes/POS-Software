"""
URL routing for products, categories, and units of measure.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.products.views import CategoryViewSet, UnitViewSet, ProductViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"units", UnitViewSet, basename="unit")
router.register(r"products", ProductViewSet, basename="product")

urlpatterns = [
    path("", include(router.urls)),
]
