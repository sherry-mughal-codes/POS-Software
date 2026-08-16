"""
URL routing for accounting, Chart of Accounts, journal ledger, and financial reports.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.accounting.views import (
    AccountViewSet,
    BalanceSheetView,
    IncomeStatementView,
    JournalEntryViewSet,
    PaymentMethodViewSet,
    TransactionSimulationView,
    TrialBalanceView,
)

router = DefaultRouter()
router.register(r"accounts", AccountViewSet, basename="account")
router.register(r"journal-entries", JournalEntryViewSet, basename="journal-entry")
router.register(r"payment-methods", PaymentMethodViewSet, basename="payment-method")

urlpatterns = [
    # Reports
    path("reports/trial-balance/", TrialBalanceView.as_view(), name="trial_balance"),
    path("reports/income-statement/", IncomeStatementView.as_view(), name="income_statement"),
    path("reports/balance-sheet/", BalanceSheetView.as_view(), name="balance_sheet"),

    # Transaction test simulator
    path("simulate-transaction/", TransactionSimulationView.as_view(), name="simulate_transaction"),

    # Standard CRUD viewsets
    path("", include(router.urls)),
]
