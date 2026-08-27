"""
Service layer for Expenses and Cash/Bank Account Transfers.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounting.models import Account, AccountType, JournalEntry, JournalEntryStatus, ReferenceType
from apps.accounting.services import AccountingService
from .models import Expense, ExpenseStatus, AccountTransfer, TransferStatus


class ExpenseService:
    """
    Business logic for managing operational expenses and double-entry integration.
    """

    @classmethod
    @transaction.atomic
    def create_expense(cls, data, user, submit_now=False):
        """
        Creates an operational expense transaction. If submit_now=True, automatically posts to General Ledger.
        """
        expense_account = data.get("expense_account")
        payment_account = data.get("payment_account")
        amount = Decimal(str(data.get("amount", "0")))
        date = data.get("date") or timezone.now().date()
        description = data.get("description", "").strip()

        if not expense_account:
            raise ValidationError("Expense account is required.")
        if not payment_account:
            raise ValidationError("Payment account (Paid From) is required.")
        if amount <= Decimal("0.00"):
            raise ValidationError("Expense amount must be greater than zero.")
        if not description:
            raise ValidationError("Expense description is required.")

        # Ensure correct account types
        if expense_account.account_type != AccountType.EXPENSE:
            raise ValidationError(f"Selected account '{expense_account.name}' is not an Expense account.")
        if payment_account.account_type != AccountType.ASSET:
            raise ValidationError(f"Selected payment account '{payment_account.name}' is not an Asset (Cash/Bank) account.")

        expense_number = Expense.generate_expense_number(date)

        expense = Expense.objects.create(
            expense_number=expense_number,
            date=date,
            expense_account=expense_account,
            description=description,
            amount=amount,
            payment_account=payment_account,
            reference_no=data.get("reference_no", ""),
            attachment=data.get("attachment", None),
            notes=data.get("notes", ""),
            status=ExpenseStatus.DRAFT,
            created_by=user,
        )

        if submit_now:
            cls.submit_expense(expense, user)

        return expense

    @classmethod
    @transaction.atomic
    def submit_expense(cls, expense, user):
        """
        Submits a draft expense and generates the authoritative General Ledger journal entry:
        Debit: Expense Account
        Credit: Payment Account (Cash/Bank)
        """
        if expense.status != ExpenseStatus.DRAFT:
            raise ValidationError(f"Cannot submit expense in '{expense.status}' status. Only DRAFT can be submitted.")

        # Create balanced Double-Entry Journal Entry
        entry_lines = [
            {
                "account": expense.expense_account,
                "debit": expense.amount,
                "credit": Decimal("0.00"),
                "description": f"Expense: {expense.description}",
            },
            {
                "account": expense.payment_account,
                "debit": Decimal("0.00"),
                "credit": expense.amount,
                "description": f"Paid via {expense.payment_account.name}",
            },
        ]

        journal_entry = AccountingService.create_journal_entry(
            entry_date=expense.date,
            reference_type=ReferenceType.EXPENSE,
            reference_id=expense.expense_number,
            narration=f"Expense Payment [{expense.expense_number}] - {expense.description}",
            lines=entry_lines,
            created_by=user,
            post_immediately=True,
        )

        expense.journal_entry = journal_entry
        expense.status = ExpenseStatus.SUBMITTED
        expense.submitted_by = user
        expense.submitted_at = timezone.now()
        expense.save(update_fields=["journal_entry", "status", "submitted_by", "submitted_at", "updated_at"])

        return expense

    @classmethod
    @transaction.atomic
    def cancel_expense(cls, expense, user, reason=""):
        """
        Cancels an expense. If already submitted, posts a counter-reversal journal entry.
        """
        if expense.status == ExpenseStatus.CANCELLED:
            raise ValidationError("Expense is already cancelled.")

        if expense.status == ExpenseStatus.SUBMITTED and expense.journal_entry:
            # Create counter-reversal entry
            reversal_lines = [
                {
                    "account": expense.payment_account,
                    "debit": expense.amount,
                    "credit": Decimal("0.00"),
                    "description": f"Reversal of {expense.expense_number} - {reason or 'Expense Cancelled'}",
                },
                {
                    "account": expense.expense_account,
                    "debit": Decimal("0.00"),
                    "credit": expense.amount,
                    "description": f"Reversal of {expense.expense_number}",
                },
            ]

            reversal_entry = AccountingService.create_journal_entry(
                entry_date=timezone.now().date(),
                reference_type=ReferenceType.REVERSAL,
                reference_id=f"REV-{expense.expense_number}",
                narration=f"Cancellation Reversal for Expense [{expense.expense_number}]: {reason or 'N/A'}",
                lines=reversal_lines,
                created_by=user,
                post_immediately=True,
            )
            expense.reversal_journal_entry = reversal_entry

        expense.status = ExpenseStatus.CANCELLED
        expense.cancelled_by = user
        expense.cancelled_at = timezone.now()
        expense.cancellation_reason = reason
        expense.save(update_fields=["status", "reversal_journal_entry", "cancelled_by", "cancelled_at", "cancellation_reason", "updated_at"])

        return expense

    @classmethod
    def get_expense_report(cls, start_date=None, end_date=None, expense_account_id=None, payment_account_id=None, user_id=None, status=None):
        """
        Comprehensive master analytical report for expenses.
        """
        qs = Expense.objects.all().select_related("expense_account", "payment_account", "created_by", "submitted_by")

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if expense_account_id:
            qs = qs.filter(expense_account_id=expense_account_id)
        if payment_account_id:
            qs = qs.filter(payment_account_id=payment_account_id)
        if user_id:
            qs = qs.filter(created_by_id=user_id)
        if status:
            qs = qs.filter(status=status)

        submitted_qs = qs.filter(status=ExpenseStatus.SUBMITTED)

        total_expenses = sum(e.amount for e in submitted_qs) or Decimal("0.00")
        cash_expenses = sum(
            e.amount for e in submitted_qs
            if e.payment_account and (
                (e.payment_account.code.startswith("101") or (e.payment_account.parent and e.payment_account.parent.code == "1010"))
                and not e.payment_account.code.startswith("102")
                and "jazz" not in e.payment_account.name.lower()
                and "easy" not in e.payment_account.name.lower()
            )
        ) or Decimal("0.00")

        bank_expenses = sum(
            e.amount for e in submitted_qs
            if e.payment_account and (
                e.payment_account.code.startswith("102")
                or (e.payment_account.parent and e.payment_account.parent.code == "1020")
                or "bank" in e.payment_account.name.lower()
                or "jazz" in e.payment_account.name.lower()
                or "easy" in e.payment_account.name.lower()
                or "card" in e.payment_account.name.lower()
                or "wallet" in e.payment_account.name.lower()
            )
        ) or Decimal("0.00")

        # Category/Account breakdown
        account_breakdown = {}
        for exp in submitted_qs:
            acc_name = exp.expense_account.name
            account_breakdown[acc_name] = account_breakdown.get(acc_name, Decimal("0.00")) + exp.amount

        rows = []
        for exp in qs:
            rows.append({
                "id": exp.id,
                "expense_number": exp.expense_number,
                "date": str(exp.date),
                "expense_account_id": exp.expense_account.id,
                "expense_account_name": exp.expense_account.name,
                "expense_account_code": exp.expense_account.code,
                "description": exp.description,
                "amount": float(exp.amount),
                "payment_account_id": exp.payment_account.id,
                "payment_account_name": exp.payment_account.name,
                "payment_account_code": exp.payment_account.code,
                "reference_no": exp.reference_no,
                "has_attachment": bool(exp.attachment),
                "attachment_url": exp.attachment.url if exp.attachment else None,
                "status": exp.status,
                "status_display": exp.get_status_display(),
                "created_by": exp.created_by.get_full_name() or exp.created_by.username if exp.created_by else "System",
                "submitted_by": exp.submitted_by.get_full_name() or exp.submitted_by.username if exp.submitted_by else None,
                "notes": exp.notes,
            })

        return {
            "summary": {
                "total_records": qs.count(),
                "submitted_count": submitted_qs.count(),
                "total_expenses": float(total_expenses),
                "cash_expenses": float(cash_expenses),
                "bank_expenses": float(bank_expenses),
                "account_breakdown": {k: float(v) for k, v in account_breakdown.items()},
            },
            "rows": rows,
        }


class TransferService:
    """
    Business logic for internal cash/bank money transfers.
    """

    @classmethod
    @transaction.atomic
    def create_transfer(cls, data, user):
        """
        Creates and executes an internal cash/bank money transfer:
        Debit: To Account (Destination)
        Credit: From Account (Source)
        """
        from_account = data.get("from_account")
        to_account = data.get("to_account")
        amount = Decimal(str(data.get("amount", "0")))
        date = data.get("date") or timezone.now().date()
        reference = data.get("reference", "").strip()
        notes = data.get("notes", "").strip()

        if not from_account:
            raise ValidationError("Source (From) account is required.")
        if not to_account:
            raise ValidationError("Destination (To) account is required.")
        if from_account.id == to_account.id:
            raise ValidationError("Source and Destination accounts cannot be the same account.")
        if amount <= Decimal("0.00"):
            raise ValidationError("Transfer amount must be greater than zero.")

        # Ensure both are asset accounts
        if from_account.account_type != AccountType.ASSET:
            raise ValidationError(f"Source account '{from_account.name}' is not an Asset/Cash account.")
        if to_account.account_type != AccountType.ASSET:
            raise ValidationError(f"Destination account '{to_account.name}' is not an Asset/Cash account.")

        transfer_number = AccountTransfer.generate_transfer_number(date)

        # Create balanced Double-Entry Journal Entry
        entry_lines = [
            {
                "account": to_account,
                "debit": amount,
                "credit": Decimal("0.00"),
                "description": f"Transfer in from {from_account.name}",
            },
            {
                "account": from_account,
                "debit": Decimal("0.00"),
                "credit": amount,
                "description": f"Transfer out to {to_account.name}",
            },
        ]

        journal_entry = AccountingService.create_journal_entry(
            entry_date=date,
            reference_type=ReferenceType.TRANSFER,
            reference_id=transfer_number,
            narration=f"Internal Account Transfer [{transfer_number}]: {from_account.name} -> {to_account.name} (Rs. {amount})",
            lines=entry_lines,
            created_by=user,
            post_immediately=True,
        )

        transfer = AccountTransfer.objects.create(
            transfer_number=transfer_number,
            date=date,
            from_account=from_account,
            to_account=to_account,
            amount=amount,
            reference=reference,
            notes=notes,
            status=TransferStatus.SUBMITTED,
            journal_entry=journal_entry,
            created_by=user,
        )

        return transfer

    @classmethod
    @transaction.atomic
    def cancel_transfer(cls, transfer, user, reason=""):
        """
        Cancels an account transfer and posts a counter-reversal journal entry:
        Debit: From Account
        Credit: To Account
        """
        if transfer.status == TransferStatus.CANCELLED:
            raise ValidationError("Transfer is already cancelled.")

        if transfer.journal_entry:
            reversal_lines = [
                {
                    "account": transfer.from_account,
                    "debit": transfer.amount,
                    "credit": Decimal("0.00"),
                    "description": f"Reversal of {transfer.transfer_number} - {reason or 'Transfer Cancelled'}",
                },
                {
                    "account": transfer.to_account,
                    "debit": Decimal("0.00"),
                    "credit": transfer.amount,
                    "description": f"Reversal of {transfer.transfer_number}",
                },
            ]

            reversal_entry = AccountingService.create_journal_entry(
                entry_date=timezone.now().date(),
                reference_type=ReferenceType.REVERSAL,
                reference_id=f"REV-{transfer.transfer_number}",
                narration=f"Cancellation Reversal for Transfer [{transfer.transfer_number}]: {reason or 'N/A'}",
                lines=reversal_lines,
                created_by=user,
                post_immediately=True,
            )
            transfer.reversal_journal_entry = reversal_entry

        transfer.status = TransferStatus.CANCELLED
        transfer.cancelled_by = user
        transfer.cancelled_at = timezone.now()
        transfer.cancellation_reason = reason
        transfer.save(update_fields=["status", "reversal_journal_entry", "cancelled_by", "cancelled_at", "cancellation_reason", "updated_at"])

        return transfer
