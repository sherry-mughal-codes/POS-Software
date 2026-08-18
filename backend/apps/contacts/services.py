"""
Business logic service for Customer Receivables, Statements, and Payment Vouchers.
"""

from decimal import Decimal
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounting.models import Account, AccountType, JournalEntry, ReferenceType
from apps.accounting.services import AccountingService
from apps.sales.models import Sale, SaleStatus, SalesReturn, PaymentMethodType
from .models import Customer, CustomerPayment, CustomerPaymentStatus


class CustomerReceivableService:
    """
    Authoritative calculation engine for customer credit receivables, statements, and payments.
    """

    @classmethod
    def reallocate_customer_payments(cls, customer: Customer):
        """
        Allocates all submitted CustomerPayment records across the customer's completed credit sales in FIFO order.
        Updates each Sale's paid_amount and due_amount so that the Sales Invoices list stays 100% in sync with Customer Payments.
        """
        if customer.is_walkin:
            return

        sales = list(Sale.objects.filter(customer=customer, status=SaleStatus.COMPLETED).order_by("date", "id"))
        payments = list(CustomerPayment.objects.filter(customer=customer, status=CustomerPaymentStatus.SUBMITTED).order_by("date", "id"))

        total_payment_pool = sum(p.amount for p in payments)

        # 1. Reset each sale's initial paid and due amounts based on upfront payment (at checkout)
        for s in sales:
            upfront_paid = Decimal("0.00")
            if s.payment_method in [PaymentMethodType.CASH, PaymentMethodType.CARD]:
                upfront_paid = s.grand_total
            elif s.payments.exists():
                upfront_paid = sum(
                    p.amount for p in s.payments.filter(
                        payment_method__in=[PaymentMethodType.CASH, PaymentMethodType.CARD]
                    )
                )
            else:
                if s.payment_method != PaymentMethodType.CREDIT:
                    upfront_paid = min(s.paid_amount, s.grand_total)

            returns_amt = sum(r.refund_amount for r in s.returns.all())
            effective_grand_total = max(Decimal("0.00"), s.grand_total - returns_amt)

            s.paid_amount = min(upfront_paid, effective_grand_total)
            s.due_amount = max(Decimal("0.00"), effective_grand_total - s.paid_amount)

        # 2. Allocate CustomerPayment pool across sales in FIFO order
        for s in sales:
            if s.due_amount > Decimal("0.00") and total_payment_pool > Decimal("0.00"):
                alloc = min(total_payment_pool, s.due_amount)
                s.paid_amount += alloc
                s.due_amount -= alloc
                total_payment_pool -= alloc

            s.save(update_fields=["paid_amount", "due_amount", "updated_at"])

    @classmethod
    def get_customer_outstanding(cls, customer_id: int) -> dict:
        """
        Calculates authoritative outstanding receivable balance for a customer.
        Formula: Total Credit Sales Due - Total Payments - Total Sales Returns.
        """
        customer = Customer.objects.get(pk=customer_id)
        if customer.is_walkin:
            return {
                "customer_id": customer.id,
                "customer_code": customer.customer_id,
                "customer_name": customer.name,
                "is_walkin": True,
                "credit_enabled": False,
                "total_credit_sales": Decimal("0.00"),
                "total_payments": Decimal("0.00"),
                "total_returns": Decimal("0.00"),
                "outstanding_balance": Decimal("0.00"),
            }

        sales = list(Sale.objects.filter(customer=customer, status=SaleStatus.COMPLETED))
        
        # Calculate total credit value granted
        total_credit_sales = Decimal("0.00")
        for s in sales:
            if s.payment_method == PaymentMethodType.CREDIT:
                total_credit_sales += s.grand_total
            elif s.payments.exists():
                credit_part = sum(p.amount for p in s.payments.filter(payment_method=PaymentMethodType.CREDIT))
                total_credit_sales += credit_part

        payments_total = CustomerPayment.objects.filter(
            customer=customer,
            status=CustomerPaymentStatus.SUBMITTED,
        ).aggregate(total_paid=models.Sum("amount"))["total_paid"] or Decimal("0.00")

        returns_total = SalesReturn.objects.filter(
            original_sale__customer=customer,
            original_sale__status=SaleStatus.COMPLETED,
        ).aggregate(total_refund=models.Sum("refund_amount"))["total_refund"] or Decimal("0.00")

        # Sum of actual due_amount on sales
        outstanding = sum(s.due_amount for s in sales)

        return {
            "customer_id": customer.id,
            "customer_code": customer.customer_id,
            "customer_name": customer.name,
            "is_walkin": False,
            "credit_enabled": customer.credit_enabled,
            "total_credit_sales": total_credit_sales,
            "total_payments": payments_total,
            "total_returns": returns_total,
            "outstanding_balance": outstanding,
        }

    @classmethod
    @transaction.atomic
    def create_payment(cls, data: dict, user, submit_now: bool = True) -> CustomerPayment:
        """
        Creates and executes a Customer Payment transaction.
        Enforces overpayment prevention and posts double-entry accounting entries.
        """
        customer = data.get("customer")
        if isinstance(customer, int):
            customer = Customer.objects.get(pk=customer)

        if customer.is_walkin:
            raise ValidationError("Cannot record payments for the default Walk-in Customer.")

        amount = Decimal(str(data.get("amount", "0")))
        date = data.get("date") or timezone.now().date()
        payment_method = data.get("payment_method", "CASH")
        payment_account = data.get("payment_account")
        reference = data.get("reference", "").strip()
        notes = data.get("notes", "").strip()

        if amount <= Decimal("0.00"):
            raise ValidationError("Payment amount must be greater than zero.")

        # Resolve payment account if not provided
        if not payment_account:
            if payment_method == "BANK":
                payment_account = Account.objects.filter(code="1020").first() or Account.objects.get(code="1020")
            elif payment_method == "CARD":
                payment_account = Account.objects.filter(code="1025").first() or Account.objects.filter(code="1020").first()
            else:
                payment_account = Account.objects.filter(code="1010").first() or Account.objects.get(code="1010")

        if payment_account.account_type != AccountType.ASSET:
            raise ValidationError(f"Payment account '{payment_account.name}' must be an Asset (Cash/Bank) account.")

        # Overpayment check
        balance_info = cls.get_customer_outstanding(customer.id)
        current_outstanding = balance_info["outstanding_balance"]

        if amount > current_outstanding:
            raise ValidationError(
                f"Payment amount (Rs. {amount:,.2f}) exceeds customer's outstanding receivable (Rs. {current_outstanding:,.2f}). Overpayment is not allowed."
            )

        payment_number = CustomerPayment.generate_payment_number(date)

        payment = CustomerPayment.objects.create(
            payment_number=payment_number,
            customer=customer,
            date=date,
            amount=amount,
            payment_method=payment_method,
            payment_account=payment_account,
            reference=reference,
            notes=notes,
            status=CustomerPaymentStatus.DRAFT,
            created_by=user,
        )

        if submit_now:
            cls.submit_payment(payment, user)

        return payment

    @classmethod
    @transaction.atomic
    def submit_payment(cls, payment: CustomerPayment, user) -> CustomerPayment:
        """
        Submits a draft payment voucher and creates the balanced accounting entry:
        Debit: Payment Account (1010 Cash / 1020 Bank)
        Credit: Accounts Receivable (1030)
        """
        if payment.status != CustomerPaymentStatus.DRAFT:
            raise ValidationError(f"Cannot submit payment in '{payment.status}' status. Only DRAFT can be submitted.")

        # Accounts Receivable account
        ar_account = Account.objects.filter(code="1030").first() or Account.objects.get(code="1030")

        entry_lines = [
            {
                "account": payment.payment_account,
                "debit": payment.amount,
                "credit": Decimal("0.00"),
                "description": f"Payment received from {payment.customer.name} ({payment.payment_number})",
            },
            {
                "account": ar_account,
                "debit": Decimal("0.00"),
                "credit": payment.amount,
                "description": f"Receivable settlement for {payment.customer.name}",
            },
        ]

        journal_entry = AccountingService.create_journal_entry(
            entry_date=payment.date,
            reference_type=ReferenceType.CUSTOMER_PAYMENT,
            reference_id=payment.payment_number,
            narration=f"Customer Payment [{payment.payment_number}] - {payment.customer.name} (Amount: Rs. {payment.amount:,.2f})",
            lines=entry_lines,
            created_by=user,
            post_immediately=True,
        )

        payment.journal_entry = journal_entry
        payment.status = CustomerPaymentStatus.SUBMITTED
        payment.submitted_by = user
        payment.submitted_at = timezone.now()
        payment.save(update_fields=["journal_entry", "status", "submitted_by", "submitted_at", "updated_at"])

        # Reallocate customer payments across invoices in FIFO order
        cls.reallocate_customer_payments(payment.customer)

        return payment

    @classmethod
    @transaction.atomic
    def cancel_payment(cls, payment: CustomerPayment, user, reason: str = "") -> CustomerPayment:
        """
        Cancels a customer payment and generates a counter-reversal journal entry:
        Debit: Accounts Receivable (1030)
        Credit: Payment Account (1010 Cash / 1020 Bank)
        """
        if payment.status == CustomerPaymentStatus.CANCELLED:
            raise ValidationError("Payment is already cancelled.")

        if payment.status == CustomerPaymentStatus.SUBMITTED and payment.journal_entry:
            ar_account = Account.objects.filter(code="1030").first() or Account.objects.get(code="1030")

            reversal_lines = [
                {
                    "account": ar_account,
                    "debit": payment.amount,
                    "credit": Decimal("0.00"),
                    "description": f"Reversal of payment {payment.payment_number} - {reason or 'Payment Cancelled'}",
                },
                {
                    "account": payment.payment_account,
                    "debit": Decimal("0.00"),
                    "credit": payment.amount,
                    "description": f"Reversal of payment {payment.payment_number}",
                },
            ]

            reversal_entry = AccountingService.create_journal_entry(
                entry_date=timezone.now().date(),
                reference_type=ReferenceType.REVERSAL,
                reference_id=f"REV-{payment.payment_number}",
                narration=f"Cancellation Reversal for Customer Payment [{payment.payment_number}]: {reason or 'N/A'}",
                lines=reversal_lines,
                created_by=user,
                post_immediately=True,
            )
            payment.reversal_journal_entry = reversal_entry

        payment.status = CustomerPaymentStatus.CANCELLED
        payment.cancelled_by = user
        payment.cancelled_at = timezone.now()
        payment.cancellation_reason = reason
        payment.save(update_fields=["status", "reversal_journal_entry", "cancelled_by", "cancelled_at", "cancellation_reason", "updated_at"])

        # Reallocate customer payments across invoices
        cls.reallocate_customer_payments(payment.customer)

        return payment

    @classmethod
    def get_customer_statement(cls, customer_id: int, start_date=None, end_date=None) -> dict:
        """
        Generates comprehensive chronological statement of account for a customer:
        Opening Balance + Credit Sales (Debit) - Payments (Credit) - Sales Returns (Credit) = Closing Balance.
        """
        customer = Customer.objects.get(pk=customer_id)

        # Collect all transactional items
        events = []

        # 1. Credit Sales
        sales_qs = Sale.objects.filter(customer=customer, status=SaleStatus.COMPLETED)
        if start_date:
            sales_qs = sales_qs.filter(date__gte=start_date)
        if end_date:
            sales_qs = sales_qs.filter(date__lte=end_date)

        for sale in sales_qs:
            if sale.due_amount > 0 or sale.payment_method == "CREDIT":
                events.append({
                    "date": sale.date,
                    "created_at": sale.created_at,
                    "type": "SALE",
                    "type_display": "Credit Sale",
                    "reference": sale.invoice_number,
                    "description": f"POS Sale ({sale.items.count()} items)",
                    "debit": float(sale.due_amount if sale.due_amount > 0 else sale.grand_total),
                    "credit": 0.0,
                })

        # 2. Customer Payments
        payments_qs = CustomerPayment.objects.filter(customer=customer, status=CustomerPaymentStatus.SUBMITTED)
        if start_date:
            payments_qs = payments_qs.filter(date__gte=start_date)
        if end_date:
            payments_qs = payments_qs.filter(date__lte=end_date)

        for pay in payments_qs:
            events.append({
                "date": pay.date,
                "created_at": pay.created_at,
                "type": "PAYMENT",
                "type_display": f"Payment ({pay.get_payment_method_display()})",
                "reference": pay.payment_number,
                "description": pay.notes or f"Receipt via {pay.payment_account.name}",
                "debit": 0.0,
                "credit": float(pay.amount),
            })

        # 3. Sales Returns
        returns_qs = SalesReturn.objects.filter(original_sale__customer=customer)
        if start_date:
            returns_qs = returns_qs.filter(date__gte=start_date)
        if end_date:
            returns_qs = returns_qs.filter(date__lte=end_date)

        for ret in returns_qs:
            events.append({
                "date": ret.date,
                "created_at": ret.created_at,
                "type": "RETURN",
                "type_display": "Sales Return",
                "reference": ret.return_number,
                "description": f"Refund against {ret.original_sale.invoice_number}: {ret.reason}",
                "debit": 0.0,
                "credit": float(ret.refund_amount),
            })

        # Sort chronologically
        events.sort(key=lambda x: (x["date"], x["created_at"]))

        running_balance = Decimal("0.00")
        ledger_rows = []
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for ev in events:
            dr = Decimal(str(ev["debit"]))
            cr = Decimal(str(ev["credit"]))
            running_balance += (dr - cr)
            total_debit += dr
            total_credit += cr

            ledger_rows.append({
                "date": str(ev["date"]),
                "type": ev["type"],
                "type_display": ev["type_display"],
                "reference": ev["reference"],
                "description": ev["description"],
                "debit": float(dr),
                "credit": float(cr),
                "running_balance": float(running_balance),
            })

        return {
            "customer": {
                "id": customer.id,
                "customer_id": customer.customer_id,
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email,
                "address": customer.address,
                "credit_enabled": customer.credit_enabled,
                "is_walkin": customer.is_walkin,
            },
            "period": {
                "start_date": str(start_date) if start_date else None,
                "end_date": str(end_date) if end_date else None,
            },
            "summary": {
                "total_debit": float(total_debit),
                "total_credit": float(total_credit),
                "closing_balance": float(running_balance),
            },
            "rows": ledger_rows,
        }

    @classmethod
    def get_receivables_report(cls, start_date=None, end_date=None, customer_id=None, status=None) -> dict:
        """
        Master analytical report for Customer Accounts Receivable and Outstanding aging.
        """
        customers_qs = Customer.objects.filter(is_walkin=False, is_active=True)
        if customer_id:
            customers_qs = customers_qs.filter(id=customer_id)

        rows = []
        grand_total_sales = Decimal("0.00")
        grand_total_returns = Decimal("0.00")
        grand_total_payments = Decimal("0.00")
        grand_total_outstanding = Decimal("0.00")

        for cust in customers_qs:
            info = cls.get_customer_outstanding(cust.id)
            sales = info["total_credit_sales"]
            returns = info.get("total_returns", Decimal("0.00"))
            payments = info["total_payments"]
            outstanding = info["outstanding_balance"]

            grand_total_sales += sales
            grand_total_returns += returns
            grand_total_payments += payments
            grand_total_outstanding += outstanding

            rows.append({
                "customer_id": cust.id,
                "customer_code": cust.customer_id,
                "name": cust.name,
                "phone": cust.phone or "-",
                "credit_enabled": cust.credit_enabled,
                "total_credit_sales": float(sales),
                "total_returns": float(returns),
                "total_payments": float(payments),
                "outstanding_balance": float(outstanding),
                "status": "Paid" if outstanding == 0 else "Outstanding",
            })

        return {
            "summary": {
                "total_registered_customers": customers_qs.count(),
                "total_credit_sales": float(grand_total_sales),
                "total_sales_returns": float(grand_total_returns),
                "net_credit_invoiced": float(grand_total_sales - grand_total_returns),
                "total_payments_collected": float(grand_total_payments),
                "total_outstanding_receivables": float(grand_total_outstanding),
            },
            "rows": rows,
        }
