"""
URL routing for Expenses and Cash/Bank Account Transfers.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpenseViewSet, AccountTransferViewSet, ExpenseReportView

router = DefaultRouter()
router.register(r"records", ExpenseViewSet, basename="expense")
router.register(r"transfers", AccountTransferViewSet, basename="account-transfer")

urlpatterns = [
    path("reports/summary/", ExpenseReportView.as_view(), name="expense-report"),
    path("", include(router.urls)),
]
