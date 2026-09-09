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
        agent_name = record.agent_name_snapshot or (record.sales_agent.name if record.sales_agent else "Sales Agent")
        journal_entry = AccountingService.record_commission_payment(
            payment_ref=payment.payment_number,
            commission_ref=record.commission_number,
            agent_name=agent_name,
            amount=payment.amount,
            payment_account=payment.payment_account,
            created_by=created_by,
            entry_date=payment.payment_date,
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

        # Calculate returned base from returned items or refund amount
        returned_base = Decimal("0.00")
        for ret_item in sales_return.items.all():
            returned_base += getattr(ret_item, "subtotal", Decimal("0.00"))

        if returned_base <= Decimal("0.00") and getattr(sales_return, "refund_amount", None):
            returned_base = Decimal(str(sales_return.refund_amount))

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
        agent_name = record.agent_name_snapshot or (record.sales_agent.name if record.sales_agent else "Sales Agent")
        journal_entry = AccountingService.record_commission_reversal(
            adjustment_ref=f"ADJ-{adjustment.id}",
            commission_ref=record.commission_number,
            agent_name=agent_name,
            reversal_amount=reversal_amount,
            return_ref=sales_return.return_number if hasattr(sales_return, 'return_number') else str(sales_return.id),
            created_by=created_by,
            entry_date=adjustment.date,
        )
        if journal_entry:
            adjustment.journal_entry = journal_entry
            adjustment.save(update_fields=["journal_entry"])

        # Update CommissionRecord
        record.adjusted_amount += reversal_amount
        record.update_status()
        record.save(update_fields=["adjusted_amount", "status", "updated_at"])

        return adjustment

    @classmethod
    @transaction.atomic
    def settle_agent_commissions(
        cls,
        sales_agent_id: int,
        amount: Decimal,
        payment_account_id: int,
        payment_date: Optional[date] = None,
        notes: str = "",
        created_by: Optional[User] = None,
    ) -> Dict[str, Any]:
        """
        Settles total outstanding commission payables for a sales agent across open records (FIFO),
        automatically offsetting any past excess credits/reversals from sales returns.
        """
        if not cls.is_commission_module_enabled():
            raise ValidationError("Commission Management module is currently disabled by Super Admin.")

        agent = SalesAgent.objects.filter(pk=sales_agent_id).first()
        if not agent:
            raise ValidationError("Sales agent not found.")

        pay_amount = Decimal(str(amount)).quantize(Decimal("0.01"))
        if pay_amount <= Decimal("0.00"):
            raise ValidationError("Payment amount must be greater than zero.")

        # Calculate live global net balance across ALL records for this agent
        all_records = list(
            CommissionRecord.objects.select_for_update()
            .filter(sales_agent=agent)
            .exclude(status=CommissionStatus.CANCELLED)
            .order_by("date", "created_at")
        )

        total_net_comm = sum((r.net_payable_amount for r in all_records), Decimal("0.00"))
        total_paid_comm = sum((r.paid_amount for r in all_records), Decimal("0.00"))
        net_outstanding = max(Decimal("0.00"), total_net_comm - total_paid_comm)

        if net_outstanding <= Decimal("0.00"):
            raise ValidationError(f"Sales Agent '{agent.name}' has no outstanding commission payables due.")

        if pay_amount > net_outstanding:
            raise ValidationError(
                f"Payment amount (Rs. {pay_amount}) exceeds total net outstanding payable (Rs. {net_outstanding}) for {agent.name}."
            )

        payment_account = Account.objects.filter(pk=payment_account_id, is_active=True).first()
        if not payment_account:
            raise ValidationError("Please select a valid, active payment account.")

        if payment_date is None:
            payment_date = timezone.localdate()

        # 1. First, automatically absorb any existing advance credits from overpaid records into open records
        excess_records = [r for r in all_records if r.advance_credit_amount > Decimal("0.00")]
        open_records = [r for r in all_records if r.remaining_payable_amount > Decimal("0.00")]

        for exc in excess_records:
            excess_avail = exc.advance_credit_amount
            for op in open_records:
                if excess_avail <= Decimal("0.00"):
                    break
                needed = op.remaining_payable_amount
                if needed <= Decimal("0.00"):
                    continue
                absorb = min(excess_avail, needed)
                exc.paid_amount -= absorb
                exc.update_status()
                exc.save(update_fields=["paid_amount", "status", "updated_at"])

                op.paid_amount += absorb
                op.update_status()
                op.save(update_fields=["paid_amount", "status", "updated_at"])

                excess_avail -= absorb

        # 2. Re-fetch open records that still have remaining balance to pay with the new cash/bank disbursement
        open_records_to_pay = [r for r in all_records if r.remaining_payable_amount > Decimal("0.00")]

        remaining_to_distribute = pay_amount
        created_payments = []

        for record in open_records_to_pay:
            if remaining_to_distribute <= Decimal("0.00"):
                break

            record_due = record.remaining_payable_amount
            if record_due <= Decimal("0.00"):
                continue

            pay_this_record = min(remaining_to_distribute, record_due)
            pmt = cls.pay_commission(
                commission_record_id=record.id,
                amount=pay_this_record,
                payment_account_id=payment_account_id,
                payment_date=payment_date,
                notes=notes or f"Agent bulk commission settlement ({agent.name})",
                created_by=created_by,
            )
            created_payments.append(pmt)
            remaining_to_distribute -= pay_this_record

        return {
            "sales_agent": agent.name,
            "agent_code": agent.code,
            "total_settled": str(pay_amount),
            "payments_count": len(created_payments),
            "payments": created_payments,
        }
