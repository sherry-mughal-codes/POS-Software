"""
Commission Service Layer.
Encapsulates commission calculation, snapshotting, GL accrual, partial/full settlements,
and sales return reversals.
"""

from decimal import Decimal
from datetime import date
from typing import Optional, Dict, Any
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

from apps.commission.models import (
    SalesAgent,
    CommissionRecord,
    CommissionPayment,
    CommissionAdjustment,
    CommissionStatus,
)
from apps.accounting.models import Account
from apps.accounting.services import AccountingService
from apps.core.sequences import DocumentSequenceService
from apps.core.models import SystemModule


class CommissionService:
    """
    Central orchestration service for Sales Agent Commissions.
    """

    @classmethod
    def is_commission_module_enabled(cls) -> bool:
        """Checks if the Commission Management module is globally enabled by Super Admin."""
        return SystemModule.is_module_enabled("commission_management")

    @classmethod
    def generate_commission_number(cls) -> str:
        """Generates consecutive commission record identifier (e.g. COM-00001)."""
        return DocumentSequenceService.generate_next_number("commission_record")

    @classmethod
    def generate_payment_number(cls) -> str:
        """Generates consecutive commission settlement voucher number (e.g. CPMT-00001)."""
        return DocumentSequenceService.generate_next_number("commission_payment")

    @classmethod
    @transaction.atomic
    def create_commission_for_sale(
        cls,
        sale,
        agent: Optional[SalesAgent] = None,
        created_by: Optional[User] = None,
    ) -> Optional[CommissionRecord]:
        """
        Creates an authoritative Commission Record linked 1-to-1 with a completed Sale.
        1. Validates agent is provided and commission module is active.
        2. Calculates commission on net base: Subtotal - Discount Amount (excluding tax).
        3. Snapshots agent percentage and rate.
        4. Prevents duplicate commission records per invoice.
        5. Posts General Ledger double-entry accrual (DR 5090 Commission Expense / CR 2040 Commission Payable).
        """
        if not cls.is_commission_module_enabled():
            return None

        if not agent:
            if not getattr(sale, "sales_agent", None):
                return None
            agent = sale.sales_agent

        # Prevent duplicate commission records for the same sale
        existing = CommissionRecord.objects.filter(sale=sale).first()
        if existing:
            return existing

        commission_pct = agent.commission_percentage or Decimal("0.00")
        if commission_pct <= Decimal("0.00"):
            # 0% commission agent -> No financial accrual needed, or record with 0 amount
            pass

        # Commission Base = Subtotal - Discount Amount (strictly before tax)
        subtotal = sale.subtotal or Decimal("0.00")
        discount = sale.discount_amount or Decimal("0.00")
        commission_base = max(Decimal("0.00"), subtotal - discount)

        # Commission Amount = Base * (pct / 100)
        commission_amount = (commission_base * (commission_pct / Decimal("100.00"))).quantize(Decimal("0.01"))

        commission_number = cls.generate_commission_number()

        # Create Commission Record
        commission_record = CommissionRecord.objects.create(
            commission_number=commission_number,
            sale=sale,
            sales_agent=agent,
            agent_name_snapshot=agent.name,
            agent_code_snapshot=agent.code,
            commission_percentage_snapshot=commission_pct,
            commission_base=commission_base,
            commission_amount=commission_amount,
            adjusted_amount=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            status=CommissionStatus.UNPAID,
            date=sale.date or timezone.localdate(),
            notes=f"Commission generated from Sale Invoice {sale.invoice_number}",
            created_by=created_by,
        )

        # Post General Ledger double-entry accrual if amount > 0
        if commission_amount > Decimal("0.00"):
            journal_entry = AccountingService.record_commission_accrual(
                sale=sale,
                commission_record=commission_record,
                created_by=created_by,
            )
            if journal_entry:
                commission_record.journal_entry = journal_entry
                commission_record.save(update_fields=["journal_entry"])

        return commission_record

    @classmethod
    @transaction.atomic
    def pay_commission(
        cls,
        commission_record_id: int,
        amount: Decimal,
        payment_account_id: int,
        payment_date: Optional[date] = None,
        notes: str = "",
        created_by: Optional[User] = None,
    ) -> CommissionPayment:
        """
        Disburses commission settlement to sales agent:
        1. Validates record and remaining payable balance.
        2. Prevents overpayment and duplicate payments.
        3. Updates paid amount and status on CommissionRecord.
        4. Posts General Ledger entry (DR 2040 Commission Payable / CR Cash or Bank).
        """
        if not cls.is_commission_module_enabled():
            raise ValidationError("Commission Management module is currently disabled by Super Admin.")

        # Lock record to prevent concurrent double payments
        record = CommissionRecord.objects.select_for_update().get(pk=commission_record_id)

        pay_amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        if pay_amount <= Decimal("0.00"):
            raise ValidationError("Payment amount must be greater than zero.")

        remaining = record.remaining_payable_amount
        if remaining <= Decimal("0.00"):
            raise ValidationError(
                f"Commission {record.commission_number} is already fully settled (Remaining: Rs. 0.00)."
            )

        if pay_amount > remaining:
            raise ValidationError(
                f"Payment amount (Rs. {pay_amount}) exceeds remaining payable balance (Rs. {remaining})."
            )

        payment_account = Account.objects.filter(pk=payment_account_id, is_active=True).first()
        if not payment_account:
            raise ValidationError("Please select a valid, active cash or bank payment account.")

        if payment_date is None:
            payment_date = timezone.localdate()

        payment_number = cls.generate_payment_number()

        payment = CommissionPayment.objects.create(
            payment_number=payment_number,
            commission_record=record,
            amount=pay_amount,
            payment_date=payment_date,
            payment_account=payment_account,
            notes=notes.strip() if notes else f"Commission payment against {record.commission_number}",
            created_by=created_by,
        )

        # Post GL Payment Entry (DR 2040 Payable / CR Cash/Bank)
        journal_entry = AccountingService.record_commission_payment(
            commission_payment=payment,
            created_by=created_by,
        )
        if journal_entry:
            payment.journal_entry = journal_entry
            payment.save(update_fields=["journal_entry"])

        # Update Commission Record state
        record.paid_amount += pay_amount
        record.update_status()
        record.save(update_fields=["paid_amount", "status", "updated_at"])

        return payment

    @classmethod
    @transaction.atomic
    def adjust_commission_for_return(
        cls,
        sales_return,
        created_by: Optional[User] = None,
    ) -> Optional[CommissionAdjustment]:
        """
        Adjusts/reverses commission when items from a qualifying sale are returned:
        1. Identifies linked CommissionRecord.
        2. Computes returned commissionable base and reverses commission using original snapshotted rate.
        3. Updates adjusted_amount and status on CommissionRecord.
        4. Posts GL Reversal (DR 2040 Commission Payable / CR 5090 Commission Expense).
        5. If already paid, the excess is preserved safely as advance credit without corrupting payment records.
        """
        if not cls.is_commission_module_enabled():
            return None

        orig_sale = sales_return.original_sale
        record = CommissionRecord.objects.select_for_update().filter(sale=orig_sale).first()
        if not record:
            return None

        # Calculate returned base from returned items
        returned_base = Decimal("0.00")
        for ret_item in sales_return.items.all():
            returned_base += ret_item.subtotal

        if returned_base <= Decimal("0.00"):
            return None

        # Reversal calculated using original snapshotted percentage
        pct = record.commission_percentage_snapshot
        reversal_amount = (returned_base * (pct / Decimal("100.00"))).quantize(Decimal("0.01"))

        if reversal_amount <= Decimal("0.00"):
            return None

        # Cap reversal to remaining initial commission
        reversal_amount = min(reversal_amount, max(Decimal("0.00"), record.commission_amount - record.adjusted_amount))
        if reversal_amount <= Decimal("0.00"):
            return None

        adjustment = CommissionAdjustment.objects.create(
            commission_record=record,
            sales_return=sales_return,
            returned_base_amount=returned_base,
            reversal_amount=reversal_amount,
            date=sales_return.date or timezone.localdate(),
            notes=f"Commission reversed due to Sales Return {sales_return.return_number}",
            created_by=created_by,
        )

        # Post GL Reversal Entry (DR 2040 Payable / CR 5090 Expense)
        journal_entry = AccountingService.record_commission_reversal(
            commission_adjustment=adjustment,
            created_by=created_by,
        )
        if journal_entry:
            adjustment.journal_entry = journal_entry
            adjustment.save(update_fields=["journal_entry"])

        # Update CommissionRecord
        record.adjusted_amount += reversal_amount
        record.update_status()
        record.save(update_fields=["adjusted_amount", "status", "updated_at"])

        return adjustment
