"""
Centralized Accounting Service Layer.
All business modules (Sales, Purchases, Returns, Expenses, Payments) route their accounting entries through this engine.
"""

from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import date
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.accounting.models import (
    Account,
    AccountType,
    JournalEntry,
    JournalItem,
    JournalEntryStatus,
    ReferenceType,
)


class AccountingService:
    """
    Authoritative double-entry accounting engine for the POS.
    """

    @staticmethod
    def generate_entry_number() -> str:
        """Generates sequential entry number based on system prefix and start sequence."""
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("journal_entry")

    @classmethod
    @transaction.atomic
    def create_journal_entry(
        cls,
        entry_date: date,
        reference_type: str,
        reference_id: Optional[str],
        lines: List[Dict[str, Any]],
        narration: str = "",
        created_by=None,
        post_immediately: bool = True,
    ) -> JournalEntry:
        """
        Creates an atomic double-entry JournalEntry and validates Total Debit == Total Credit.

        lines format:
        [
            {"account": Account or account_id, "debit": Decimal, "credit": Decimal, "description": "memo"},
            ...
        ]
        """
        if not lines or len(lines) < 2:
            raise ValidationError("A double-entry transaction must contain at least two line items.")

        entry_number = cls.generate_entry_number()
        journal_entry = JournalEntry(
            entry_number=entry_number,
            entry_date=entry_date,
            reference_type=reference_type,
            reference_id=reference_id,
            status=JournalEntryStatus.DRAFT,
            narration=narration,
            created_by=created_by,
        )
        journal_entry.save()

        total_dr = Decimal("0.00")
        total_cr = Decimal("0.00")

        for line in lines:
            account = line["account"]
            if isinstance(account, int):
                account = Account.objects.get(pk=account)

            # Safeguard: If an organizational parent header is passed, resolve to its active posting leaf child
            if account.children.exists() or getattr(account, "is_header", False):
                leaf_child = account.children.filter(is_active=True).first()
                if leaf_child:
                    account = leaf_child

            dr = Decimal(str(line.get("debit", 0)))
            cr = Decimal(str(line.get("credit", 0)))
            desc = line.get("description", "")

            if dr < 0 or cr < 0:
                raise ValidationError(f"Invalid negative amount in journal line for account {account.code}.")
            if dr > 0 and cr > 0:
                raise ValidationError(f"Journal line for {account.code} cannot contain both debit and credit.")
            if dr == 0 and cr == 0:
                continue

            total_dr += dr
            total_cr += cr

            JournalItem.objects.create(
                journal_entry=journal_entry,
                account=account,
                debit=dr,
                credit=cr,
                description=desc,
            )

        if abs(total_dr - total_cr) > Decimal("0.0001"):
            raise ValidationError(
                f"Double-entry transaction is unbalanced! Total Debit ({total_dr}) != Total Credit ({total_cr})"
            )

        if post_immediately:
            journal_entry.status = JournalEntryStatus.POSTED
            journal_entry.posting_date = timezone.now()
            journal_entry.save(update_fields=["status", "posting_date"])

        return journal_entry

    # -------------------------------------------------------------------------
    # High-Level Business Module Handlers
    # -------------------------------------------------------------------------

    @classmethod
    def record_sale(
        cls,
        sale_ref: str,
        total_amount: Decimal,
        paid_amount: Decimal,
        payment_account: Account,
        sales_revenue_account: Account,
        customer_receivable_account: Optional[Account] = None,
        cogs_amount: Decimal = Decimal("0.00"),
        cogs_account: Optional[Account] = None,
        inventory_account: Optional[Account] = None,
        created_by=None,
        entry_date: Optional[date] = None,
    ) -> JournalEntry:
        """
        Records standard POS sale transaction:
        - Debit Payment Account (Cash/Bank) for paid portion
        - Debit Accounts Receivable for credit portion (if any)
        - Credit Sales Revenue for total sale amount
        - (Optional Inventory Accounting): Debit COGS, Credit Inventory
        """
        if entry_date is None:
            entry_date = timezone.now().date()

        total = Decimal(str(total_amount))
        paid = Decimal(str(paid_amount))
        credit = total - paid

        lines = []

        # Paid portion (Debit Cash/Bank)
        if paid > 0:
            lines.append({
                "account": payment_account,
                "debit": paid,
                "credit": Decimal("0.00"),
                "description": f"Cash/Payment received for {sale_ref}",
            })

        # Credit portion (Debit Accounts Receivable)
        if credit > 0:
            if not customer_receivable_account:
                raise ValidationError("Customer Receivable account is required for credit sales.")
            lines.append({
                "account": customer_receivable_account,
                "debit": credit,
                "credit": Decimal("0.00"),
                "description": f"Customer credit on {sale_ref}",
            })

        # Sales Revenue (Credit Sales)
        lines.append({
            "account": sales_revenue_account,
            "debit": Decimal("0.00"),
            "credit": total,
            "description": f"Sales revenue from {sale_ref}",
        })

        # COGS & Inventory Asset movement (if provided)
        cogs = Decimal(str(cogs_amount))
        if cogs > 0 and cogs_account and inventory_account:
            lines.append({
                "account": cogs_account,
                "debit": cogs,
                "credit": Decimal("0.00"),
                "description": f"Cost of goods sold for {sale_ref}",
            })
            lines.append({
                "account": inventory_account,
                "debit": Decimal("0.00"),
                "credit": cogs,
                "description": f"Inventory reduction for {sale_ref}",
            })

        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.SALE,
            reference_id=sale_ref,
            lines=lines,
            narration=f"Sale Receipt: {sale_ref} (Total: {total}, Paid: {paid}, Credit: {credit})",
            created_by=created_by,
        )

    @classmethod
    def record_sale_return(
        cls,
        return_ref: str,
        total_amount: Decimal,
        refunded_amount: Decimal,
        payment_account: Account,
        sales_return_account: Account,
        customer_receivable_account: Optional[Account] = None,
        restocked_cost: Decimal = Decimal("0.00"),
        cogs_account: Optional[Account] = None,
        inventory_account: Optional[Account] = None,
        created_by=None,
        entry_date: Optional[date] = None,
    ) -> JournalEntry:
        """
        Records sales return:
        - Debit Sales Returns & Allowances
        - Credit Payment Account (refunded cash) or Accounts Receivable (credited back)
        - (Optional): Debit Inventory, Credit COGS
        """
        if entry_date is None:
            entry_date = timezone.now().date()

        total = Decimal(str(total_amount))
        refunded = Decimal(str(refunded_amount))
        credit_adj = total - refunded

        lines = [
            {
                "account": sales_return_account,
                "debit": total,
                "credit": Decimal("0.00"),
                "description": f"Sales return on {return_ref}",
            }
        ]

        if refunded > 0:
            lines.append({
                "account": payment_account,
                "debit": Decimal("0.00"),
                "credit": refunded,
                "description": f"Cash refund for {return_ref}",
            })

        if credit_adj > 0:
            if not customer_receivable_account:
                raise ValidationError("Customer Receivable account is required for credit adjustment.")
            lines.append({
                "account": customer_receivable_account,
                "debit": Decimal("0.00"),
                "credit": credit_adj,
                "description": f"Receivable balance credit on {return_ref}",
            })

        cost = Decimal(str(restocked_cost))
        if cost > 0 and cogs_account and inventory_account:
            lines.append({
                "account": inventory_account,
                "debit": cost,
                "credit": Decimal("0.00"),
                "description": f"Restocked inventory for {return_ref}",
            })
            lines.append({
                "account": cogs_account,
                "debit": Decimal("0.00"),
                "credit": cost,
                "description": f"COGS reversal for {return_ref}",
            })

        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.SALE_RETURN,
            reference_id=return_ref,
            lines=lines,
            narration=f"Sales Return: {return_ref} (Amount: {total})",
            created_by=created_by,
        )

    @classmethod
    def record_customer_payment(
        cls,
        payment_ref: str,
        customer_name: str,
        amount: Decimal,
        payment_account: Account,
        receivable_account: Account,
        created_by=None,
        entry_date: Optional[date] = None,
    ) -> JournalEntry:
        """
        Records customer payment against outstanding balance:
        - Debit Cash/Bank
        - Credit Accounts Receivable
        """
        if entry_date is None:
            entry_date = timezone.now().date()

        amt = Decimal(str(amount))
        lines = [
            {
                "account": payment_account,
                "debit": amt,
                "credit": Decimal("0.00"),
                "description": f"Payment received from {customer_name}",
            },
            {
                "account": receivable_account,
                "debit": Decimal("0.00"),
                "credit": amt,
                "description": f"Receivable reduction for {customer_name}",
            },
        ]
        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.CUSTOMER_PAYMENT,
            reference_id=payment_ref,
            lines=lines,
            narration=f"Customer Payment: {payment_ref} from {customer_name} (Amount: {amt})",
            created_by=created_by,
        )

    @classmethod
    def record_purchase(
        cls,
        purchase_ref: str,
        total_amount: Decimal,
        paid_amount: Decimal,
        payment_account: Account,
        inventory_account: Account,
        supplier_payable_account: Optional[Account] = None,
        created_by=None,
        entry_date: Optional[date] = None,
    ) -> JournalEntry:
        """
        Records supplier purchase:
        - Debit Inventory Asset (or Purchase Expense)
        - Credit Payment Account (Cash/Bank) for paid portion
        - Credit Accounts Payable for unpaid supplier balance
        """
        if entry_date is None:
            entry_date = timezone.now().date()

        total = Decimal(str(total_amount))
        paid = Decimal(str(paid_amount))
        credit = total - paid

        lines = [
            {
                "account": inventory_account,
                "debit": total,
                "credit": Decimal("0.00"),
                "description": f"Purchased inventory {purchase_ref}",
            }
        ]

        if paid > 0:
            lines.append({
                "account": payment_account,
                "debit": Decimal("0.00"),
                "credit": paid,
                "description": f"Payment to supplier on {purchase_ref}",
            })

        if credit > 0:
            if not supplier_payable_account:
                raise ValidationError("Supplier Payable account required for credit purchases.")
            lines.append({
                "account": supplier_payable_account,
                "debit": Decimal("0.00"),
                "credit": credit,
                "description": f"Payable credit on {purchase_ref}",
            })

        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.PURCHASE,
            reference_id=purchase_ref,
            lines=lines,
            narration=f"Purchase Order: {purchase_ref} (Total: {total})",
            created_by=created_by,
        )

    @classmethod
    def record_supplier_payment(
        cls,
        payment_ref: str,
        supplier_name: str,
        amount: Decimal,
        payment_account: Account,
        payable_account: Account,
        created_by=None,
        entry_date: Optional[date] = None,
    ) -> JournalEntry:
        """
        Records supplier bill payment:
        - Debit Accounts Payable
        - Credit Cash/Bank
        """
        if entry_date is None:
            entry_date = timezone.now().date()

        amt = Decimal(str(amount))
        lines = [
            {
                "account": payable_account,
                "debit": amt,
                "credit": Decimal("0.00"),
                "description": f"Payable clearance for {supplier_name}",
            },
            {
                "account": payment_account,
                "debit": Decimal("0.00"),
                "credit": amt,
                "description": f"Payment sent to {supplier_name}",
            },
        ]
        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.SUPPLIER_PAYMENT,
            reference_id=payment_ref,
            lines=lines,
            narration=f"Supplier Payment: {payment_ref} to {supplier_name} (Amount: {amt})",
            created_by=created_by,
        )

    @classmethod
    def record_expense(
        cls,
        expense_ref: str,
        expense_account: Account,
        payment_account: Account,
        amount: Decimal,
        narration: str = "",
        created_by=None,
        entry_date: Optional[date] = None,
    ) -> JournalEntry:
        """
        Records operational expense:
        - Debit Expense Account
        - Credit Cash/Bank Account
        """
        if entry_date is None:
            entry_date = timezone.now().date()

        amt = Decimal(str(amount))
        lines = [
            {
                "account": expense_account,
                "debit": amt,
                "credit": Decimal("0.00"),
                "description": narration or f"Expense: {expense_account.name}",
            },
            {
                "account": payment_account,
                "debit": Decimal("0.00"),
                "credit": amt,
                "description": f"Paid via {payment_account.name}",
            },
        ]
        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.EXPENSE,
            reference_id=expense_ref,
            lines=lines,
            narration=narration or f"Expense: {expense_ref}",
            created_by=created_by,
        )

    @classmethod
    def record_opening_balance(
        cls,
        entry_date: date,
        account_balances: List[Dict[str, Any]],
        equity_account: Account,
        created_by=None,
    ) -> JournalEntry:
        """
        Initializes system opening balances balancing against Owner's Equity.
        account_balances: [{"account": Account, "debit": Decimal, "credit": Decimal}]
        """
        lines = []
        total_dr = Decimal("0.00")
        total_cr = Decimal("0.00")

        for item in account_balances:
            acc = item["account"]
            dr = Decimal(str(item.get("debit", 0)))
            cr = Decimal(str(item.get("credit", 0)))
            if dr > 0:
                lines.append({"account": acc, "debit": dr, "credit": Decimal("0.00"), "description": "Opening Balance"})
                total_dr += dr
            elif cr > 0:
                lines.append({"account": acc, "debit": Decimal("0.00"), "credit": cr, "description": "Opening Balance"})
                total_cr += cr

        diff = total_dr - total_cr
        if diff > 0:
            lines.append({"account": equity_account, "debit": Decimal("0.00"), "credit": diff, "description": "Opening Balance Balancing Equity"})
        elif diff < 0:
            lines.append({"account": equity_account, "debit": abs(diff), "credit": Decimal("0.00"), "description": "Opening Balance Balancing Equity"})

        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.OPENING_BALANCE,
            reference_id="OP-001",
            lines=lines,
            narration="Initial System Opening Balance Setup",
            created_by=created_by,
        )

    @classmethod
    def record_customer_opening_balance(
        cls,
        customer,
        amount: Decimal,
        created_by=None,
        entry_date=None,
    ) -> Optional[JournalEntry]:
        """
        Records opening receivable balance for a customer:
        - Debit Accounts Receivable (1030)
        - Credit Owner's Equity (3010)
        """
        amt = Decimal(str(amount))
        if amt <= Decimal("0.00"):
            return None

        if entry_date is None:
            entry_date = timezone.now().date()

        ar_acc = Account.objects.filter(code="1030").first()
        equity_acc = Account.objects.filter(code="3010").first() or Account.objects.filter(code="3000").first()

        if not ar_acc or not equity_acc:
            return None

        # Clean existing opening entry if present
        ref_id = f"OP-CUS-{customer.customer_id}"
        existing = JournalEntry.objects.filter(reference_type=ReferenceType.OPENING_BALANCE, reference_id=ref_id).first()
        if existing:
            existing.delete()

        lines = [
            {
                "account": ar_acc,
                "debit": amt,
                "credit": Decimal("0.00"),
                "description": f"Opening receivable balance for [{customer.customer_id}] {customer.name}",
            },
            {
                "account": equity_acc,
                "debit": Decimal("0.00"),
                "credit": amt,
                "description": f"Opening balance equity for customer [{customer.customer_id}]",
            },
        ]

        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.OPENING_BALANCE,
            reference_id=ref_id,
            lines=lines,
            narration=f"Customer Opening Receivable Setup: [{customer.customer_id}] {customer.name} (Amount: Rs. {amt})",
            created_by=created_by,
        )

    @classmethod
    def record_supplier_opening_balance(
        cls,
        supplier,
        amount: Decimal,
        created_by=None,
        entry_date=None,
    ) -> Optional[JournalEntry]:
        """
        Records opening payable balance for a supplier:
        - Debit Owner's Equity (3010)
        - Credit Accounts Payable (2010)
        """
        amt = Decimal(str(amount))
        if amt <= Decimal("0.00"):
            return None

        if entry_date is None:
            entry_date = timezone.now().date()

        ap_acc = Account.objects.filter(code="2010").first()
        equity_acc = Account.objects.filter(code="3010").first() or Account.objects.filter(code="3000").first()

        if not ap_acc or not equity_acc:
            return None

        # Clean existing opening entry if present
        ref_id = f"OP-SUP-{supplier.supplier_id}"
        existing = JournalEntry.objects.filter(reference_type=ReferenceType.OPENING_BALANCE, reference_id=ref_id).first()
        if existing:
            existing.delete()

        lines = [
            {
                "account": equity_acc,
                "debit": amt,
                "credit": Decimal("0.00"),
                "description": f"Opening balance equity for supplier [{supplier.supplier_id}]",
            },
            {
                "account": ap_acc,
                "debit": Decimal("0.00"),
                "credit": amt,
                "description": f"Opening payable balance for [{supplier.supplier_id}] {supplier.company_name or supplier.name}",
            },
        ]

        return cls.create_journal_entry(
            entry_date=entry_date,
            reference_type=ReferenceType.OPENING_BALANCE,
            reference_id=ref_id,
            lines=lines,
            narration=f"Supplier Opening Payable Setup: [{supplier.supplier_id}] {supplier.company_name or supplier.name} (Amount: Rs. {amt})",
            created_by=created_by,
        )

    @classmethod
    @transaction.atomic
    def reverse_entry(cls, original_entry: JournalEntry, reason: str = "", created_by=None) -> JournalEntry:
        """
        Reverses a posted journal entry by creating an exact opposite counter-entry.
        """
        if original_entry.status != JournalEntryStatus.POSTED:
            raise ValidationError("Only POSTED journal entries can be reversed.")

        lines = []
        for item in original_entry.lines.all():
            # Invert debit and credit
            lines.append({
                "account": item.account,
                "debit": item.credit,
                "credit": item.debit,
                "description": f"Reversal of {original_entry.entry_number}: {item.description or ''}",
            })

        reversal_entry = cls.create_journal_entry(
            entry_date=timezone.now().date(),
            reference_type=ReferenceType.REVERSAL,
            reference_id=original_entry.entry_number,
            lines=lines,
            narration=f"Reversal of {original_entry.entry_number}. Reason: {reason}",
            created_by=created_by,
        )

        return reversal_entry

    # -------------------------------------------------------------------------
    # Financial Reports & Ledger Queries
    # -------------------------------------------------------------------------

    @staticmethod
    def get_account_ledger(account_id: int, start_date=None, end_date=None) -> Dict[str, Any]:
        """Returns chronological statement of account with running balance."""
        account = Account.objects.get(pk=account_id)
        qs = JournalItem.objects.filter(
            account=account,
            journal_entry__status=JournalEntryStatus.POSTED,
        ).select_related("journal_entry").order_by("journal_entry__entry_date", "id")

        if start_date:
            qs = qs.filter(journal_entry__entry_date__gte=start_date)
        if end_date:
            qs = qs.filter(journal_entry__entry_date__lte=end_date)

        running_balance = Decimal("0.00")
        ledger_rows = []

        for item in qs:
            dr = item.debit
            cr = item.credit
            if account.normal_balance == "DEBIT":
                running_balance += (dr - cr)
            else:
                running_balance += (cr - dr)

            ledger_rows.append({
                "id": item.id,
                "entry_number": item.journal_entry.entry_number,
                "entry_date": item.journal_entry.entry_date,
                "reference_type": item.journal_entry.reference_type,
                "reference_id": item.journal_entry.reference_id,
                "description": item.description or item.journal_entry.narration,
                "debit": float(dr),
                "credit": float(cr),
                "running_balance": float(running_balance),
            })

        return {
            "account": {
                "id": account.id,
                "code": account.code,
                "name": account.name,
                "type": account.account_type,
                "normal_balance": account.normal_balance,
            },
            "total_debit": float(sum(r["debit"] for r in ledger_rows)),
            "total_credit": float(sum(r["credit"] for r in ledger_rows)),
            "closing_balance": float(running_balance),
            "rows": ledger_rows,
        }

    @staticmethod
    def get_trial_balance(as_of_date=None) -> Dict[str, Any]:
        """
        Generates Trial Balance verifying Sum(Debit) == Sum(Credit).
        """
        accounts = Account.objects.filter(is_active=True).order_by("code")
        rows = []
        grand_total_debit = Decimal("0.00")
        grand_total_credit = Decimal("0.00")

        for acc in accounts:
            qs = JournalItem.objects.filter(
                account=acc,
                journal_entry__status=JournalEntryStatus.POSTED,
            )
            if as_of_date:
                qs = qs.filter(journal_entry__entry_date__lte=as_of_date)

            totals = qs.aggregate(dr=models.Sum("debit"), cr=models.Sum("credit"))
            total_dr = totals["dr"] or Decimal("0.00")
            total_cr = totals["cr"] or Decimal("0.00")

            if total_dr == 0 and total_cr == 0:
                continue

            net_balance = total_dr - total_cr
            dr_balance = net_balance if net_balance > 0 else Decimal("0.00")
            cr_balance = abs(net_balance) if net_balance < 0 else Decimal("0.00")

            grand_total_debit += dr_balance
            grand_total_credit += cr_balance

            rows.append({
                "account_id": acc.id,
                "account_code": acc.code,
                "account_name": acc.name,
                "account_type": acc.account_type,
                "debit": float(dr_balance),
                "credit": float(cr_balance),
            })

        return {
            "as_of_date": str(as_of_date or timezone.now().date()),
            "total_debit": float(grand_total_debit),
            "total_credit": float(grand_total_credit),
            "is_balanced": abs(grand_total_debit - grand_total_credit) < Decimal("0.0001"),
            "rows": rows,
        }

    @staticmethod
    def get_income_statement(start_date=None, end_date=None) -> Dict[str, Any]:
        """
        Generates Income Statement (Profit & Loss): Revenue - COGS - Operating Expenses = Net Profit.
        """
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = date(end_date.year, 1, 1)

        income_accounts = Account.objects.filter(account_type=AccountType.INCOME, is_active=True)
        expense_accounts = Account.objects.filter(account_type=AccountType.EXPENSE, is_active=True)

        def get_category_rows(acc_list, is_income=True):
            items = []
            category_total = Decimal("0.00")
            for acc in acc_list:
                qs = JournalItem.objects.filter(
                    account=acc,
                    journal_entry__status=JournalEntryStatus.POSTED,
                    journal_entry__entry_date__gte=start_date,
                    journal_entry__entry_date__lte=end_date,
                )
                totals = qs.aggregate(dr=models.Sum("debit"), cr=models.Sum("credit"))
                total_dr = totals["dr"] or Decimal("0.00")
                total_cr = totals["cr"] or Decimal("0.00")

                balance = (total_cr - total_dr) if is_income else (total_dr - total_cr)
                if balance != 0:
                    category_total += balance
                    items.append({
                        "code": acc.code,
                        "name": acc.name,
                        "amount": float(balance),
                    })
            return items, category_total

        revenue_rows, total_revenue = get_category_rows(income_accounts, is_income=True)
        expense_rows, total_expenses = get_category_rows(expense_accounts, is_income=False)

        net_profit = total_revenue - total_expenses

        return {
            "period": {"start_date": str(start_date), "end_date": str(end_date)},
            "revenue": {
                "rows": revenue_rows,
                "total": float(total_revenue),
            },
            "expenses": {
                "rows": expense_rows,
                "total": float(total_expenses),
            },
            "net_profit": float(net_profit),
        }

    @staticmethod
    def get_balance_sheet(as_of_date=None) -> Dict[str, Any]:
        """
        Generates Balance Sheet: Assets = Liabilities + Equity (including Net Income).
        """
        if not as_of_date:
            as_of_date = timezone.now().date()

        def get_type_rows(acc_type, is_asset=True):
            accounts = Account.objects.filter(account_type=acc_type, is_active=True)
            rows = []
            total = Decimal("0.00")
            for acc in accounts:
                qs = JournalItem.objects.filter(
                    account=acc,
                    journal_entry__status=JournalEntryStatus.POSTED,
                    journal_entry__entry_date__lte=as_of_date,
                )
                totals = qs.aggregate(dr=models.Sum("debit"), cr=models.Sum("credit"))
                dr = totals["dr"] or Decimal("0.00")
                cr = totals["cr"] or Decimal("0.00")
                bal = (dr - cr) if is_asset else (cr - dr)
                if bal != 0:
                    total += bal
                    rows.append({
                        "id": acc.id,
                        "code": acc.code,
                        "name": acc.name,
                        "amount": float(bal),
                    })
            return rows, total

        asset_rows, total_assets = get_type_rows(AccountType.ASSET, is_asset=True)
        liability_rows, total_liabilities = get_type_rows(AccountType.LIABILITY, is_asset=False)
        equity_rows, total_equity_base = get_type_rows(AccountType.EQUITY, is_asset=False)

        # Calculate Net Income to date for retained earnings
        inc_res = AccountingService.get_income_statement(start_date=date(2000, 1, 1), end_date=as_of_date)
        net_income = Decimal(str(inc_res["net_profit"]))
        total_equity = total_equity_base + net_income

        if net_income != 0:
            equity_rows.append({
                "id": 0,
                "code": "3999",
                "name": "Current Period Net Profit / (Loss)",
                "amount": float(net_income),
            })

        total_liabilities_and_equity = total_liabilities + total_equity

        return {
            "as_of_date": str(as_of_date),
            "assets": {
                "rows": asset_rows,
                "total": float(total_assets),
            },
            "liabilities": {
                "rows": liability_rows,
                "total": float(total_liabilities),
            },
            "equity": {
                "rows": equity_rows,
                "total": float(total_equity),
            },
            "total_liabilities_and_equity": float(total_liabilities_and_equity),
            "is_balanced": abs(total_assets - total_liabilities_and_equity) < Decimal("0.0001"),
        }
