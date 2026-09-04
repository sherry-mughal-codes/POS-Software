"""
Sales Service Layer.
Enforces business rules, row-level locking, stock availability, customer credit policies,
and atomic general ledger double-entry bookkeeping.
"""

from decimal import Decimal
from datetime import date
from typing import Dict, Any, List, Optional
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

from apps.sales.models import (
    Sale,
    SaleItem,
    SalePayment,
    SalesReturn,
    SalesReturnItem,
    SaleStatus,
    PaymentMethodType,
    POSDaySession,
    DaySessionStatus,
)
from apps.products.models import Product
from apps.contacts.models import Customer, CustomerPayment
from apps.purchases.models import SupplierPayment
from apps.expenses.models import Expense, AccountTransfer
from apps.employees.models import SalaryPayment
from apps.inventory.models import StockMovement, MovementType
from apps.inventory.services import InventoryService
from apps.accounting.models import Account, ReferenceType
from apps.accounting.services import AccountingService


class SalesService:
    """
    Central orchestration service for POS checkouts and Sales Returns.
    """

    @classmethod
    def generate_invoice_number(cls) -> str:
        """Generates consecutive invoice serial based on system prefix and start sequence."""
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("invoice")

    @classmethod
    def generate_return_number(cls) -> str:
        """Generates consecutive sales return serial based on system prefix and start sequence."""
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("sales_return")

    @classmethod
    @transaction.atomic
    def create_sale(
        cls,
        customer_id: int,
        items_data: List[Dict[str, Any]],
        payment_method: str = PaymentMethodType.CASH,
        payment_account_id: Optional[int] = None,
        discount_amount: Decimal = Decimal("0.00"),
        tax_amount: Decimal = Decimal("0.00"),
        paid_amount: Optional[Decimal] = None,
        payments_breakdown: Optional[List[Dict[str, Any]]] = None,
        cheque_number: Optional[str] = None,
        cheque_date: Optional[date] = None,
        cheque_bank: Optional[str] = None,
        notes: str = "",
        sale_date: Optional[date] = None,
        created_by: Optional[User] = None,
    ) -> Sale:
        """
        Atomically records a counter POS sale:
        1. Validates customer credit rules.
        2. Validates live inventory on-hand balances with row-level locks.
        3. Snapshots current product prices and costs (WAC).
        4. Writes Sale and SaleItems.
        5. Writes StockMovements (-Qty).
        6. Generates balanced General Ledger Journal Entries (Revenue & COGS).
        """
        # Validate that an active business day session is open
        from apps.sales.services import DaySessionService
        active_session = DaySessionService.get_active_session()
        if not active_session:
            raise ValidationError(
                "Cannot complete sale: Business Day / POS Session is CLOSED. Please open the register session with an opening cash drawer balance before processing sales."
            )

        if not items_data:
            raise ValidationError("Sale must contain at least one line item.")

        customer = Customer.objects.filter(pk=customer_id, is_active=True).first()
        if not customer:
            raise ValidationError(f"Customer with ID {customer_id} does not exist or is inactive.")

        if not sale_date:
            sale_date = timezone.localdate()

        payment_account = None
        if payment_account_id:
            payment_account = Account.objects.filter(pk=payment_account_id).first()

        # 1. Validate items, stock availability, and compute subtotal
        subtotal = Decimal("0.00")
        total_cogs = Decimal("0.00")
        validated_items = []

        for row in items_data:
            prod_id = row.get("product")
            qty = Decimal(str(row.get("quantity", 0)))
            if qty <= Decimal("0.00"):
                raise ValidationError("Item quantity must be greater than zero.")

            # Select for update to prevent race conditions during concurrent POS checkouts
            prod = Product.objects.select_for_update().filter(pk=prod_id, is_active=True).first()
            if not prod:
                raise ValidationError(f"Product ID {prod_id} is inactive or does not exist.")

            current_stock = prod.get_current_stock()
            if prod.maintain_stock and current_stock < qty:
                raise ValidationError(
                    f"Insufficient stock for '{prod.name}' (SKU: {prod.sku}). Available: {current_stock}, Requested: {qty}"
                )

            unit_price = Decimal(str(row.get("unit_price", prod.selling_price)))
            discount = Decimal(str(row.get("discount", "0.00")))
            line_subtotal = (qty * unit_price) - discount
            subtotal += line_subtotal

            # Cost of goods sold snapshot using current Weighted Average Cost
            unit_cogs = prod.cost_price or Decimal("0.00")
            line_cogs = qty * unit_cogs
            if prod.maintain_stock:
                total_cogs += line_cogs

            validated_items.append({
                "product": prod,
                "quantity": qty,
                "unit_price": unit_price,
                "unit_cost": unit_cogs,
                "discount": discount,
                "subtotal": line_subtotal,
                "current_stock": current_stock,
            })

        # 2. Compute Invoice Totals
        grand_total = subtotal - discount_amount + tax_amount

        # Validate paid vs due amount
        if paid_amount is None:
            if payment_method == PaymentMethodType.CREDIT:
                paid_amount = Decimal("0.00")
            else:
                paid_amount = grand_total

        if paid_amount > grand_total and payment_method != PaymentMethodType.CASH:
            # Non-cash payments cannot tender excess change
            paid_amount = grand_total

        change_amount = Decimal("0.00")
        if paid_amount > grand_total and payment_method == PaymentMethodType.CASH:
            change_amount = paid_amount - grand_total
            due_amount = Decimal("0.00")
        else:
            due_amount = max(Decimal("0.00"), grand_total - paid_amount)

        # 3. Credit Limit and Walk-in Customer Validation
        if due_amount > Decimal("0.00"):
            if customer.is_walkin:
                raise ValidationError(
                    "Credit / partial payment is not allowed for Walk-in Customer. Please assign a registered customer or tender full payment."
                )

            if not getattr(customer, "credit_enabled", True):
                raise ValidationError(
                    f"Credit purchases are disabled for customer '{customer.name}'."
                )

            current_outstanding = getattr(customer, "outstanding_balance", Decimal("0.00"))
            credit_limit = getattr(customer, "credit_limit", None)
            if credit_limit is not None and credit_limit > Decimal("0.00"):
                new_total_due = current_outstanding + due_amount
                if new_total_due > credit_limit:
                    raise ValidationError(
                        f"Sale exceeds customer credit limit! Current due: Rs. {current_outstanding}, "
                        f"New due: Rs. {due_amount}, Limit: Rs. {credit_limit}"
                    )

        invoice_number = cls.generate_invoice_number()

        # 4. Create Sale Header
        sale = Sale.objects.create(
            invoice_number=invoice_number,
            customer=customer,
            date=sale_date,
            status=SaleStatus.COMPLETED,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            grand_total=grand_total,
            paid_amount=paid_amount,
            change_amount=change_amount,
            due_amount=due_amount,
            payment_method=payment_method,
            payment_account=payment_account,
            cheque_number=cheque_number,
            cheque_date=cheque_date,
            cheque_bank=cheque_bank,
            notes=notes,
            created_by=created_by,
        )

        # 5. Create Sale Items and Stock Movements
        import datetime
        for v in validated_items:
            prod = v["product"]
            w_days = prod.warranty_period_days
            w_expiry = None
            if w_days and w_days > 0:
                sale_d = sale.date if isinstance(sale.date, datetime.date) else timezone.localdate()
                w_expiry = sale_d + datetime.timedelta(days=w_days)

            SaleItem.objects.create(
                sale=sale,
                product=prod,
                quantity=v["quantity"],
                unit_price=v["unit_price"],
                unit_cost=v["unit_cost"],
                discount=v["discount"],
                subtotal=v["subtotal"],
                warranty_period_days_snapshot=w_days,
                warranty_expiry_date=w_expiry,
            )

            # Record stock decrement movement if maintain_stock is True
            if v["product"].maintain_stock:
                balance_after = v["current_stock"] - v["quantity"]
                StockMovement.objects.create(
                    product=v["product"],
                    movement_type=MovementType.SALE,
                    quantity=-v["quantity"],
                    unit_cost=v["unit_cost"],
                    balance_after=balance_after,
                    reference_type="SALE",
                    reference_id=sale.invoice_number,
                    notes=f"POS Sale to {customer.name} ({sale.invoice_number})",
                    created_by=created_by,
                )

        # 6. Record Payment Breakdown
        if payments_breakdown:
            for p in payments_breakdown:
                p_amt = Decimal(str(p.get("amount", 0)))
                p_acc_id = p.get("payment_account")
                p_acc = Account.objects.filter(pk=p_acc_id).first() if p_acc_id else None
                if p_amt > Decimal("0.00"):
                    SalePayment.objects.create(
                        sale=sale,
                        payment_method=p.get("payment_method", PaymentMethodType.CASH),
                        payment_account=p_acc,
                        amount=p_amt,
                        cheque_number=p.get("cheque_number", ""),
                        cheque_date=p.get("cheque_date"),
                        cheque_bank=p.get("cheque_bank", ""),
                        notes=p.get("notes", ""),
                    )
        else:
            if paid_amount > Decimal("0.00"):
                effective_paid = min(paid_amount, grand_total)
                SalePayment.objects.create(
                    sale=sale,
                    payment_method=payment_method if payment_method != PaymentMethodType.CREDIT else PaymentMethodType.CASH,
                    payment_account=payment_account,
                    amount=effective_paid,
                    cheque_number=cheque_number,
                    cheque_date=cheque_date,
                    cheque_bank=cheque_bank,
                )
            if due_amount > Decimal("0.00"):
                SalePayment.objects.create(
                    sale=sale,
                    payment_method=PaymentMethodType.CREDIT,
                    amount=due_amount,
                )

        # 7. Post General Ledger Accounting Entries
        cls._post_sale_accounting(sale, total_cogs, created_by)

        return sale

    @classmethod
    def _post_sale_accounting(cls, sale: Sale, total_cogs: Decimal, created_by=None):
        """
        Creates balanced double-entry General Ledger journal entries for a completed sale:
        1. Sales Revenue & Receivables / Cash Journal Entry
        2. COGS & Merchandise Inventory Journal Entry
        """
        cash_acc = sale.payment_account or Account.objects.filter(code="1011").first() or Account.objects.filter(parent__code="1010").first() or Account.objects.filter(code="1010").first()
        bank_acc = sale.payment_account or Account.objects.filter(code="1021").first() or Account.objects.filter(parent__code="1020").first() or Account.objects.filter(code="1020").first()
        ar_acc = Account.objects.filter(code="1030").first() or Account.objects.get(code="1030")
        inventory_acc = Account.objects.filter(code="1040").first() or Account.objects.get(code="1040")
        sales_rev_acc = Account.objects.filter(code="4010").first() or Account.objects.get(code="4010")
        sales_disc_acc = Account.objects.filter(code="4020").first() or sales_rev_acc
        cogs_acc = Account.objects.filter(code="5010").first() or Account.objects.get(code="5010")

        # --- A. Revenue Entry ---
        revenue_lines = []

        # Effective cash/bank received (capped at grand total for ledger balancing)
        effective_received = min(sale.paid_amount, sale.grand_total)

        if sale.payment_method == PaymentMethodType.SPLIT and sale.payments.exists():
            for sp in sale.payments.all():
                if sp.payment_method == PaymentMethodType.CREDIT:
                    continue
                if sp.amount > Decimal("0.00"):
                    if sp.payment_account:
                        acc = sp.payment_account
                    elif sp.payment_method in [PaymentMethodType.CARD, PaymentMethodType.CHEQUE]:
                        acc = bank_acc
                    else:
                        acc = cash_acc
                    desc = f"Payment received ({acc.name}) for {sale.invoice_number}"
                    if sp.payment_method == PaymentMethodType.CHEQUE and sp.cheque_number:
                        desc += f" [Cheque #{sp.cheque_number}]"
                    revenue_lines.append({
                        "account": acc,
                        "debit": sp.amount,
                        "credit": Decimal("0.00"),
                        "description": desc,
                    })
        else:
            if sale.payment_account:
                received_acc = sale.payment_account
            elif sale.payment_method in [PaymentMethodType.CARD, PaymentMethodType.CHEQUE]:
                received_acc = bank_acc
            else:
                received_acc = cash_acc

            if effective_received > Decimal("0.00"):
                desc = f"Payment received ({received_acc.name}) for {sale.invoice_number}"
                if sale.payment_method == PaymentMethodType.CHEQUE and sale.cheque_number:
                    desc += f" [Cheque #{sale.cheque_number}]"
                revenue_lines.append({
                    "account": received_acc,
                    "debit": effective_received,
                    "credit": Decimal("0.00"),
                    "description": desc,
                })

        if sale.due_amount > Decimal("0.00"):
            revenue_lines.append({
                "account": ar_acc,
                "debit": sale.due_amount,
                "credit": Decimal("0.00"),
                "description": f"Customer Receivable ({sale.customer.name}) - {sale.invoice_number}",
            })

        if sale.discount_amount > Decimal("0.00"):
            revenue_lines.append({
                "account": sales_disc_acc,
                "debit": sale.discount_amount,
                "credit": Decimal("0.00"),
                "description": f"Discount allowed on {sale.invoice_number}",
            })

        # Sales Revenue Credit = Gross subtotal
        revenue_lines.append({
            "account": sales_rev_acc,
            "debit": Decimal("0.00"),
            "credit": sale.subtotal,
            "description": f"Sales Revenue for {sale.invoice_number}",
        })

        # Sales Tax Liability Credit = Output Tax collected from customer
        if sale.tax_amount > Decimal("0.00"):
            tax_payable_acc = Account.objects.filter(code="2020").first() or Account.objects.filter(parent__code="2000", name__icontains="tax").first()
            if tax_payable_acc:
                revenue_lines.append({
                    "account": tax_payable_acc,
                    "debit": Decimal("0.00"),
                    "credit": sale.tax_amount,
                    "description": f"Sales Tax collected on {sale.invoice_number}",
                })

        AccountingService.create_journal_entry(
            entry_date=sale.date,
            reference_type=ReferenceType.SALE if hasattr(ReferenceType, "SALE") else ReferenceType.JOURNAL,
            reference_id=sale.invoice_number,
            lines=revenue_lines,
            narration=f"POS Sale Invoice: {sale.invoice_number} ({sale.customer.name})",
            created_by=created_by,
        )

        # --- B. COGS & Inventory Reduction Entry ---
        if total_cogs > Decimal("0.00"):
            cogs_lines = [
                {
                    "account": cogs_acc,
                    "debit": total_cogs,
                    "credit": Decimal("0.00"),
                    "description": f"Cost of Goods Sold for {sale.invoice_number}",
                },
                {
                    "account": inventory_acc,
                    "debit": Decimal("0.00"),
                    "credit": total_cogs,
                    "description": f"Inventory reduction for {sale.invoice_number}",
                },
            ]

            AccountingService.create_journal_entry(
                entry_date=sale.date,
                reference_type=ReferenceType.SALE if hasattr(ReferenceType, "SALE") else ReferenceType.JOURNAL,
                reference_id=sale.invoice_number,
                lines=cogs_lines,
                narration=f"COGS recognition for POS Sale: {sale.invoice_number}",
                created_by=created_by,
            )

    @classmethod
    @transaction.atomic
    def process_sales_return(
        cls,
        sale_id: int,
        items_data: list,
        reason: str,
        refund_method: str = PaymentMethodType.CASH,
        payment_account_id=None,
        cheque_number: Optional[str] = None,
        cheque_date: Optional[date] = None,
        cheque_bank: Optional[str] = None,
        notes: str = "",
        return_date=None,
        created_by=None,
    ) -> SalesReturn:
        """
        Processes sales return for items from a completed sale:
        1. Validates return quantity against returnable limit per line.
        2. Increments returned_quantity on SaleItem.
        3. Creates SalesReturn and SalesReturnItems.
        4. Re-increases inventory (+Qty) in StockMovement.
        5. Posts General Ledger Reversal entries (paying out immediate cash to customer on the spot).
        """
        # Validate that an active business day session is open
        active_session = DaySessionService.get_active_session()
        if not active_session:
            raise ValidationError(
                "Cannot process sales return/refund: Business Day / POS Session is CLOSED. Please open the day session first."
            )

        sale = Sale.objects.select_for_update().get(pk=sale_id)
        if sale.status != SaleStatus.COMPLETED:
            raise ValidationError(f"Returns can only be processed on completed sales (Status is {sale.status}).")

        if return_date is None:
            return_date = timezone.localdate()

        if not items_data:
            raise ValidationError("At least one return item must be selected.")

        total_refund = Decimal("0.00")
        total_returned_cogs = Decimal("0.00")
        validated_returns = []

        for row in items_data:
            sale_item_id = row.get("sale_item_id")
            sale_item = SaleItem.objects.select_for_update().get(pk=sale_item_id, sale=sale)
            return_qty = Decimal(str(row.get("quantity", 0)))

            if return_qty <= Decimal("0.00"):
                continue

            if return_qty > sale_item.returnable_quantity:
                raise ValidationError(
                    f"Return quantity {return_qty} exceeds eligible return limit ({sale_item.returnable_quantity}) for '{sale_item.product.name}'."
                )

            # Line refund amount
            unit_price = sale_item.unit_price
            line_refund = return_qty * unit_price
            line_cogs = return_qty * sale_item.unit_cost

            total_refund += line_refund
            if sale_item.product.maintain_stock:
                total_returned_cogs += line_cogs

            validated_returns.append({
                "sale_item": sale_item,
                "product": sale_item.product,
                "quantity": return_qty,
                "unit_price": unit_price,
                "unit_cost": sale_item.unit_cost,
                "subtotal": line_refund,
            })

        if not validated_returns:
            raise ValidationError("No items with valid return quantities were provided.")

        return_number = cls.generate_return_number()

        payout_acc = None
        if payment_account_id:
            payout_acc = Account.objects.filter(pk=payment_account_id).first()
        if not payout_acc:
            payout_acc = Account.objects.filter(code="1011").first() or Account.objects.filter(parent__code="1010").first() or Account.objects.filter(code="1010").first()

        sales_return = SalesReturn.objects.create(
            return_number=return_number,
            original_sale=sale,
            date=return_date,
            refund_amount=total_refund,
            reason=reason,
            refund_method=refund_method,
            payment_account=payout_acc,
            cheque_number=cheque_number,
            cheque_date=cheque_date,
            cheque_bank=cheque_bank,
            notes=notes,
            created_by=created_by,
        )

        for v in validated_returns:
            item = v["sale_item"]
            item.returned_quantity += v["quantity"]
            item.save(update_fields=["returned_quantity"])

            SalesReturnItem.objects.create(
                return_order=sales_return,
                sale_item=item,
                product=v["product"],
                quantity=v["quantity"],
                unit_price=v["unit_price"],
                unit_cost=v["unit_cost"],
                subtotal=v["subtotal"],
            )

            # Stock return movement (+Qty) if maintain_stock is True
            if v["product"].maintain_stock:
                current_stock = InventoryService.get_product_stock(v["product"].id)
                StockMovement.objects.create(
                    product=v["product"],
                    movement_type=MovementType.SALE_RETURN,
                    quantity=v["quantity"],
                    unit_cost=v["unit_cost"],
                    balance_after=current_stock + v["quantity"],
                    reference_type="SALE_RETURN",
                    reference_id=sales_return.return_number,
                    notes=f"Sales Return: {sales_return.return_number} (Orig: {sale.invoice_number})",
                    created_by=created_by,
                )

        # General Ledger Accounting Reversal (Immediate Payout on Return)
        cls._post_sales_return_accounting(sales_return, total_refund, total_returned_cogs, payment_account_id, created_by)

        # Reallocate customer payments
        if not sale.customer.is_walkin:
            from apps.contacts.services import CustomerReceivableService
            CustomerReceivableService.reallocate_customer_payments(sale.customer)

        return sales_return

    @classmethod
    def _post_sales_return_accounting(
        cls,
        sales_return: SalesReturn,
        total_refund: Decimal,
        total_cogs: Decimal,
        payment_account_id=None,
        created_by=None,
    ):
        """
        Posts reversal journal entries for sales return:
        1. DR Sales Returns (4020) / CR Cash/Bank Payout (1010/1011/1020) or Accounts Receivable (1030)
        2. DR Merchandise Inventory (1040) / CR COGS (5010)
        """
        payout_acc = None
        if payment_account_id:
            payout_acc = Account.objects.filter(pk=payment_account_id).first()
        if not payout_acc:
            payout_acc = Account.objects.filter(code="1011").first() or Account.objects.filter(parent__code="1010").first() or Account.objects.filter(code="1010").first()

        ar_acc = Account.objects.filter(code="1030").first() or Account.objects.get(code="1030")
        inventory_acc = Account.objects.filter(code="1040").first() or Account.objects.get(code="1040")
        sales_ret_acc = Account.objects.filter(code="4020").first() or Account.objects.get(code="4010")
        cogs_acc = Account.objects.filter(code="5010").first() or Account.objects.get(code="5010")

        orig_sale = sales_return.original_sale
        # If the original sale was a credit sale with remaining open AR balance, credit AR (reduce receivable)
        # Drop the "paid_amount == 0" check: reallocation updates paid_amount but may still leave due_amount open
        if orig_sale.payment_method == PaymentMethodType.CREDIT and orig_sale.due_amount >= total_refund:
            refund_credit_acc = ar_acc
            orig_sale.due_amount = max(Decimal("0.00"), orig_sale.due_amount - total_refund)
            orig_sale.save(update_fields=["due_amount"])
        else:
            # Immediate Cash / Bank Payout to customer on the spot
            refund_credit_acc = payout_acc

        if total_refund > Decimal("0.00"):
            rev_lines = [
                {
                    "account": sales_ret_acc,
                    "debit": total_refund,
                    "credit": Decimal("0.00"),
                    "description": f"Sales Return for {orig_sale.invoice_number} ({sales_return.return_number})",
                },
                {
                    "account": refund_credit_acc,
                    "debit": Decimal("0.00"),
                    "credit": total_refund,
                    "description": f"Immediate refund payout for {sales_return.return_number}",
                },
            ]
            AccountingService.create_journal_entry(
                entry_date=sales_return.date,
                reference_type=ReferenceType.SALE_RETURN if hasattr(ReferenceType, "SALE_RETURN") else ReferenceType.JOURNAL,
                reference_id=sales_return.return_number,
                lines=rev_lines,
                narration=f"Customer Sales Return Payout: {sales_return.return_number} (Ref: {orig_sale.invoice_number})",
                created_by=created_by,
            )

        if total_cogs > Decimal("0.00"):
            inv_lines = [
                {
                    "account": inventory_acc,
                    "debit": total_cogs,
                    "credit": Decimal("0.00"),
                    "description": f"Inventory restock from Sales Return {sales_return.return_number}",
                },
                {
                    "account": cogs_acc,
                    "debit": Decimal("0.00"),
                    "credit": total_cogs,
                    "description": f"COGS reversal for {sales_return.return_number}",
                },
            ]
            AccountingService.create_journal_entry(
                entry_date=sales_return.date,
                reference_type=ReferenceType.SALE_RETURN if hasattr(ReferenceType, "SALE_RETURN") else ReferenceType.JOURNAL,
                reference_id=sales_return.return_number,
                lines=inv_lines,
                narration=f"COGS Reversal for Sales Return: {sales_return.return_number}",
                created_by=created_by,
            )

    @classmethod
    def get_sales_report(
        cls,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        customer_id: Optional[int] = None,
        cashier_id: Optional[int] = None,
        payment_method: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Consolidated master sales report.
        """
        qs = Sale.objects.select_related("customer", "created_by").prefetch_related("items__product", "returns")

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if cashier_id:
            qs = qs.filter(created_by_id=cashier_id)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        if status:
            qs = qs.filter(status=status)

        total_gross = Decimal("0.00")
        total_discount = Decimal("0.00")
        total_net = Decimal("0.00")
        total_paid = Decimal("0.00")
        total_due = Decimal("0.00")
        total_returns = Decimal("0.00")

        cash_sales = Decimal("0.00")
        card_sales = Decimal("0.00")
        credit_sales = Decimal("0.00")

        rows = []
        for s in qs:
            ret_amt = s.returned_amount
            total_gross += s.subtotal
            total_discount += s.discount_amount
            total_net += (s.grand_total - ret_amt)
            total_paid += s.paid_amount
            total_due += s.due_amount
            total_returns += ret_amt

            if s.payment_method == PaymentMethodType.CASH:
                cash_sales += s.grand_total
            elif s.payment_method == PaymentMethodType.CARD:
                card_sales += s.grand_total
            elif s.payment_method == PaymentMethodType.CREDIT:
                credit_sales += s.grand_total
            else:
                cash_sales += s.paid_amount
                credit_sales += s.due_amount

            rows.append({
                "id": s.id,
                "invoice_number": s.invoice_number,
                "date": str(s.date),
                "customer_name": s.customer.name,
                "customer_id": s.customer.id,
                "cashier_name": s.created_by.get_full_name() or s.created_by.username if s.created_by else "System",
                "payment_method": s.payment_method,
                "payment_method_display": s.get_payment_method_display(),
                "status": s.status,
                "items_count": s.items.count(),
                "subtotal": float(s.subtotal),
                "discount": float(s.discount_amount),
                "grand_total": float(s.grand_total),
                "returned_amount": float(ret_amt),
                "net_amount": float(s.grand_total - ret_amt),
                "paid_amount": float(s.paid_amount),
                "due_amount": float(s.due_amount),
            })

        return {
            "summary": {
                "total_invoices": len(rows),
                "gross_sales": float(total_gross),
                "total_discounts": float(total_discount),
                "total_returns": float(total_returns),
                "net_sales": float(total_net),
                "total_paid": float(total_paid),
                "total_due": float(total_due),
                "cash_sales": float(cash_sales),
                "card_sales": float(card_sales),
                "credit_sales": float(credit_sales),
            },
            "rows": rows,
        }


class DaySessionService:
    """
    Central orchestration service for POS Business Day Sessions, X-Report snapshots, and Z-Report closing audits.
    """

    @classmethod
    def get_active_session(cls) -> Optional[POSDaySession]:
        """Returns the currently active open day session if any."""
        return POSDaySession.objects.filter(status=DaySessionStatus.OPEN).select_related("opened_by").first()

    @classmethod
    @transaction.atomic
    def open_day(
        cls,
        opening_cash: Decimal,
        opened_by: User,
        opening_notes: str = "",
        session_date: Optional[date] = None,
    ) -> POSDaySession:
        """
        Opens a new business day session:
        1. Enforces only ONE active open session at a time.
        2. Sets initial physical opening cash drawer balance.
        """
        active_session = cls.get_active_session()
        if active_session:
            raise ValidationError(
                f"A business day session [{active_session.session_number}] is already open (Opened on {active_session.date} by {active_session.opened_by.username}). Please close it before opening a new day."
            )

        opening_cash = Decimal(str(opening_cash or 0))
        if opening_cash < Decimal("0.00"):
            raise ValidationError("Opening cash cannot be negative.")

        if session_date is None:
            session_date = timezone.localdate()

        session_number = POSDaySession.generate_session_number(session_date)

        session = POSDaySession.objects.create(
            session_number=session_number,
            date=session_date,
            status=DaySessionStatus.OPEN,
            opening_cash=opening_cash,
            opened_by=opened_by,
            opened_at=timezone.now(),
            opening_notes=opening_notes.strip() if opening_notes else None,
        )
        return session

    @classmethod
    def calculate_session_metrics(cls, session: POSDaySession) -> Dict[str, Any]:
        """
        Authoritatively calculates real-time operational financials and expected physical cash
        from transaction records without duplicating data.
        """
        s_date = session.date
        opened_at = session.opened_at
        closed_at = session.closed_at

        # Helper time-range filter
        def apply_session_filter(qs):
            if opened_at and closed_at:
                return qs.filter(created_at__gte=opened_at, created_at__lte=closed_at)
            elif opened_at:
                return qs.filter(created_at__gte=opened_at)
            else:
                return qs.filter(date=s_date)

        # 1. Sales Invoices
        sales_qs = apply_session_filter(Sale.objects.filter(status=SaleStatus.COMPLETED)).prefetch_related("payments", "returns")

        total_gross_sales = Decimal("0.00")
        total_discounts = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_invoiced = Decimal("0.00")
        cash_sales = Decimal("0.00")
        card_sales = Decimal("0.00")
        cheque_sales = Decimal("0.00")
        credit_sales = Decimal("0.00")

        for s in sales_qs:
            total_gross_sales += s.subtotal
            total_discounts += s.discount_amount
            total_tax += s.tax_amount
            total_invoiced += s.grand_total

            # Categorize payment streams collected at POS checkout
            if s.payment_method == PaymentMethodType.CASH:
                cash_sales += s.grand_total
            elif s.payment_method == PaymentMethodType.CARD:
                card_sales += s.grand_total
            elif s.payment_method == PaymentMethodType.CHEQUE:
                cheque_sales += s.grand_total
            elif s.payment_method == PaymentMethodType.CREDIT:
                credit_sales += s.grand_total
            elif s.payment_method == PaymentMethodType.SPLIT:
                if s.payments.exists():
                    for p in s.payments.all():
                        if p.payment_method == PaymentMethodType.CASH:
                            cash_sales += p.amount
                        elif p.payment_method == PaymentMethodType.CARD:
                            card_sales += p.amount
                        elif p.payment_method == PaymentMethodType.CHEQUE:
                            cheque_sales += p.amount
                        elif p.payment_method == PaymentMethodType.CREDIT:
                            credit_sales += p.amount
                else:
                    cash_sales += s.paid_amount
                    credit_sales += s.due_amount
            else:
                cash_sales += s.grand_total

        # 2. Sales Returns / Refunds
        returns_qs = apply_session_filter(SalesReturn.objects.all()).select_related("original_sale", "payment_account")

        total_returns_amount = Decimal("0.00")
        cash_refunds = Decimal("0.00")
        bank_refunds = Decimal("0.00")
        credit_refunds = Decimal("0.00")

        for r in returns_qs:
            total_returns_amount += r.refund_amount
            # Check if this return was refunded via cash drawer or bank account
            is_cash = False
            if r.payment_account:
                is_cash = r.payment_account.code.startswith("101") or r.payment_account.code == "1010"
            else:
                je = JournalEntry.objects.filter(reference_id=r.return_number).first()
                if je:
                    cr_line = je.lines.filter(credit__gt=Decimal("0.00")).first()
                    is_cash = bool(cr_line and (cr_line.account.code.startswith("101") or cr_line.account.code == "1010"))
                else:
                    orig_sale = r.original_sale
                    is_cash = bool(orig_sale and (orig_sale.payment_method == PaymentMethodType.CASH or (orig_sale.payment_account and (orig_sale.payment_account.code.startswith("101") or orig_sale.payment_account.code == "1010"))))

            if is_cash:
                cash_refunds += r.refund_amount
            else:
                bank_refunds += r.refund_amount

        # Net Sales = Total Invoiced - Returns
        total_net_sales = max(Decimal("0.00"), total_invoiced - total_returns_amount)

        # Net Cash & Card Sales breakdown on Net Sale KPI card
        net_cash_sales = max(Decimal("0.00"), cash_sales - cash_refunds)
        net_card_sales = max(Decimal("0.00"), card_sales - bank_refunds)

        # 3. Customer Payments (Receivables collections)
        customer_pay_qs = apply_session_filter(CustomerPayment.objects.filter(status="SUBMITTED"))

        customer_payments_cash = Decimal("0.00")
        customer_payments_bank = Decimal("0.00")

        for cp in customer_pay_qs:
            is_cash = cp.payment_method == "CASH" or (cp.payment_account and (cp.payment_account.code.startswith("101") or cp.payment_account.code == "1010"))
            if is_cash:
                customer_payments_cash += cp.amount
            else:
                customer_payments_bank += cp.amount

        # 4. Operational Expenses
        expense_qs = apply_session_filter(Expense.objects.filter(status="SUBMITTED"))

        cash_expenses = Decimal("0.00")
        bank_expenses = Decimal("0.00")

        for exp in expense_qs:
            is_cash = exp.payment_account and (
                (exp.payment_account.code.startswith("101") or (exp.payment_account.parent and exp.payment_account.parent.code == "1010"))
                and not exp.payment_account.code.startswith("102")
                and "jazz" not in exp.payment_account.name.lower()
                and "easy" not in exp.payment_account.name.lower()
            )
            if is_cash:
                cash_expenses += exp.amount
            else:
                bank_expenses += exp.amount

        # 5. Supplier Payments (Purchases Payables disbursements)
        supplier_pay_qs = apply_session_filter(SupplierPayment.objects.filter(status="SUBMITTED")).select_related("payment_account")

        supplier_payments_cash = Decimal("0.00")
        supplier_payments_bank = Decimal("0.00")

        for sp in supplier_pay_qs:
            is_cash_method = sp.payment_method == "CASH" or (hasattr(sp.payment_method, "code") and sp.payment_method.code == "CASH")
            is_cash_account = sp.payment_account and (sp.payment_account.code.startswith("101") or sp.payment_account.code == "1010")
            if is_cash_method or is_cash_account:
                supplier_payments_cash += sp.amount
            else:
                supplier_payments_bank += sp.amount

        # 6. Salary Disbursements
        salary_pay_qs = apply_session_filter(SalaryPayment.objects.filter(status="SUBMITTED"))

        salary_payments_cash = Decimal("0.00")
        salary_payments_bank = Decimal("0.00")

        for sal in salary_pay_qs:
            is_cash = sal.payment_account and (sal.payment_account.code.startswith("101") or sal.payment_account.code == "1010")
            if is_cash:
                salary_payments_cash += sal.amount
            else:
                salary_payments_bank += sal.amount

        # 7. Cash Drawer Transfers In & Out
        transfer_qs = apply_session_filter(AccountTransfer.objects.filter(status="COMPLETED"))

        cash_transfers_in = Decimal("0.00")
        cash_transfers_out = Decimal("0.00")

        for trf in transfer_qs:
            if trf.to_account and (trf.to_account.code.startswith("101") or trf.to_account.code == "1010"):
                cash_transfers_in += trf.amount
            if trf.from_account and (trf.from_account.code.startswith("101") or trf.from_account.code == "1010"):
                cash_transfers_out += trf.amount

        # --- Expected Physical Cash in Drawer (POS Terminal Only) ---
        total_cash_in = cash_sales + customer_payments_cash
        total_cash_out = cash_refunds
        expected_cash = session.opening_cash + total_cash_in - total_cash_out

        return {
            "session_id": session.id,
            "session_number": session.session_number,
            "date": str(session.date),
            "status": session.status,
            "opened_by": session.opened_by.get_full_name() or session.opened_by.username,
            "opened_at": session.opened_at.isoformat() if session.opened_at else None,
            "closed_by": (session.closed_by.get_full_name() or session.closed_by.username) if session.closed_by else None,
            "closed_at": session.closed_at.isoformat() if session.closed_at else None,
            "opening_cash": float(session.opening_cash),
            "sales": {
                "invoices_count": sales_qs.count(),
                "gross_sales": float(total_gross_sales),
                "discounts": float(total_discounts),
                "tax": float(total_tax),
                "net_sales": float(total_net_sales),
                "cash_sales": float(net_cash_sales),
                "card_sales": float(net_card_sales),
                "cheque_sales": float(cheque_sales),
                "credit_sales": float(credit_sales),
            },
            "returns": {
                "returns_count": returns_qs.count(),
                "total_returns": float(total_returns_amount),
                "cash_refunds": float(cash_refunds),
                "bank_refunds": float(bank_refunds),
                "credit_refunds": float(credit_refunds),
            },
            "customer_payments": {
                "count": customer_pay_qs.count(),
                "total": float(customer_payments_cash + customer_payments_bank),
                "cash": float(customer_payments_cash),
                "bank": float(customer_payments_bank),
            },
            "expenses": {
                "count": expense_qs.count(),
                "total": float(cash_expenses + bank_expenses),
                "cash": float(cash_expenses),
                "bank": float(bank_expenses),
            },
            "supplier_payments": {
                "count": supplier_pay_qs.count(),
                "total": float(supplier_payments_cash + supplier_payments_bank),
                "cash": float(supplier_payments_cash),
                "bank": float(supplier_payments_bank),
            },
            "salary_payments": {
                "count": salary_pay_qs.count(),
                "total": float(salary_payments_cash + salary_payments_bank),
                "cash": float(salary_payments_cash),
                "bank": float(salary_payments_bank),
            },
            "transfers": {
                "cash_transfers_in": float(cash_transfers_in),
                "cash_transfers_out": float(cash_transfers_out),
            },
            "cash_drawer": {
                "opening_cash": float(session.opening_cash),
                "total_cash_in": float(total_cash_in),
                "total_cash_out": float(total_cash_out),
                "expected_cash": float(expected_cash),
            },
        }

    @classmethod
    def get_x_report(cls, session_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Generates an instantaneous, read-only X-Report snapshot without closing the session.
        """
        if session_id:
            session = POSDaySession.objects.select_related("opened_by").get(pk=session_id)
        else:
            session = cls.get_active_session()
            if not session:
                raise ValidationError("No active business day session is currently open. Please open a day session first.")

        metrics = cls.calculate_session_metrics(session)
        metrics["report_type"] = "X_REPORT"
        metrics["generated_at"] = timezone.now().isoformat()
        return metrics

    @classmethod
    @transaction.atomic
    def close_day(
        cls,
        actual_cash: Decimal,
        closed_by: User,
        difference_reason: str = "",
        closing_notes: str = "",
        session_id: Optional[int] = None,
    ) -> POSDaySession:
        """
        Closes the active business day, compares counted cash vs expected cash,
        requires discrepancy rationale if difference != 0, and records immutable Z-Report snapshot.
        """
        if session_id:
            session = POSDaySession.objects.select_for_update().get(pk=session_id)
        else:
            session = POSDaySession.objects.select_for_update().filter(status=DaySessionStatus.OPEN).first()
            if not session:
                raise ValidationError("No active business day session is currently open to close.")

        if session.status == DaySessionStatus.CLOSED:
            raise ValidationError(f"Business day session [{session.session_number}] is already closed.")

        actual_cash = Decimal(str(actual_cash or 0))
        if actual_cash < Decimal("0.00"):
            raise ValidationError("Counted actual cash cannot be negative.")

        metrics = cls.calculate_session_metrics(session)
        expected_cash = Decimal(str(metrics["cash_drawer"]["expected_cash"]))
        cash_difference = actual_cash - expected_cash

        if abs(cash_difference) > Decimal("0.00") and not difference_reason.strip():
            diff_label = "Shortage" if cash_difference < Decimal("0.00") else "Excess"
            raise ValidationError(
                f"A reason is required for cash discrepancy ({diff_label} of Rs. {abs(cash_difference):,.2f})."
            )

        # Snapshot full Z Report
        metrics["report_type"] = "Z_REPORT"
        metrics["generated_at"] = timezone.now().isoformat()
        metrics["closing_audit"] = {
            "expected_cash": float(expected_cash),
            "actual_cash": float(actual_cash),
            "cash_difference": float(cash_difference),
            "difference_type": "EXACT" if cash_difference == Decimal("0.00") else ("SHORTAGE" if cash_difference < Decimal("0.00") else "EXCESS"),
            "difference_reason": difference_reason.strip() if difference_reason else None,
            "closing_notes": closing_notes.strip() if closing_notes else None,
            "closed_by": closed_by.get_full_name() or closed_by.username,
            "closed_at": timezone.now().isoformat(),
        }

        session.status = DaySessionStatus.CLOSED
        session.closed_by = closed_by
        session.closed_at = timezone.now()
        session.expected_cash = expected_cash
        session.actual_cash = actual_cash
        session.cash_difference = cash_difference
        session.difference_reason = difference_reason.strip() if difference_reason else None
        session.closing_notes = closing_notes.strip() if closing_notes else None
        session.z_report_snapshot = metrics
        session.save()

        return session

    @classmethod
    def get_z_report(cls, session_id: int) -> Dict[str, Any]:
        """
        Retrieves the immutable finalized Z-Report for a closed business day session.
        """
        session = POSDaySession.objects.select_related("opened_by", "closed_by").get(pk=session_id)
        if session.status != DaySessionStatus.CLOSED or not session.z_report_snapshot:
            raise ValidationError(f"Z-Report is only available for closed business days (Session status: {session.status}).")
        return session.z_report_snapshot

    @classmethod
    def get_day_sessions_report(
        cls,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Consolidated master report of all POS Day Sessions.
        """
        qs = POSDaySession.objects.all().select_related("opened_by", "closed_by")
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if status:
            qs = qs.filter(status=status)

        rows = []
        total_opening = Decimal("0.00")
        total_expected = Decimal("0.00")
        total_actual = Decimal("0.00")
        total_difference = Decimal("0.00")

        for s in qs:
            total_opening += s.opening_cash
            if s.expected_cash is not None:
                total_expected += s.expected_cash
            if s.actual_cash is not None:
                total_actual += s.actual_cash
            if s.cash_difference is not None:
                total_difference += s.cash_difference

            rows.append({
                "id": s.id,
                "session_number": s.session_number,
                "date": str(s.date),
                "status": s.status,
                "opening_cash": float(s.opening_cash),
                "expected_cash": float(s.expected_cash) if s.expected_cash is not None else None,
                "actual_cash": float(s.actual_cash) if s.actual_cash is not None else None,
                "cash_difference": float(s.cash_difference) if s.cash_difference is not None else None,
                "difference_reason": s.difference_reason,
                "opened_by": s.opened_by.get_full_name() or s.opened_by.username,
                "opened_at": s.opened_at.isoformat() if s.opened_at else None,
                "closed_by": (s.closed_by.get_full_name() or s.closed_by.username) if s.closed_by else None,
                "closed_at": s.closed_at.isoformat() if s.closed_at else None,
            })

        return {
            "summary": {
                "total_sessions": len(rows),
                "open_sessions": qs.filter(status=DaySessionStatus.OPEN).count(),
                "closed_sessions": qs.filter(status=DaySessionStatus.CLOSED).count(),
                "total_opening_cash": float(total_opening),
                "total_expected_cash": float(total_expected),
                "total_actual_cash": float(total_actual),
                "total_cash_difference": float(total_difference),
            },
            "rows": rows,
        }

