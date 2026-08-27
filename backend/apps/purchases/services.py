"""
Centralized Purchase Service Layer.
Coordinates atomic purchase workflows, stock movements, supplier payables, returns, and accounting entries.
"""

from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import date
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.purchases.models import (
    Purchase,
    PurchaseItem,
    PurchaseStatus,
    PurchaseReturn,
    PurchaseReturnItem,
    RefundMethod,
    SupplierPayment,
    SupplierPaymentStatus,
    SupplierPaymentMethodType,
)
from apps.contacts.models import Supplier
from apps.products.models import Product
from apps.inventory.models import StockMovement, MovementType
from apps.accounting.models import Account, ReferenceType, PaymentMethod
from apps.accounting.services import AccountingService


class PurchaseService:
    """
    Authoritative domain service for all purchasing, payables, returns, and stock-in movements.
    """

    @staticmethod
    def generate_purchase_number() -> str:
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("purchase_order")

    @staticmethod
    def generate_return_number() -> str:
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("purchase_return")

    @staticmethod
    def generate_payment_number() -> str:
        from apps.core.sequences import DocumentSequenceService
        return DocumentSequenceService.generate_next_number("supplier_payment")

    @classmethod
    @transaction.atomic
    def create_purchase(
        cls,
        supplier: Supplier,
        items_data: List[Dict[str, Any]],
        purchase_date: Optional[date] = None,
        discount_amount: Decimal = Decimal("0.00"),
        tax_amount: Decimal = Decimal("0.00"),
        paid_amount: Decimal = Decimal("0.00"),
        payment_method: Optional[PaymentMethod] = None,
        payment_account: Optional[Account] = None,
        supplier_invoice_number: Optional[str] = None,
        supplier_invoice_file: Optional[str] = None,
        notes: str = "",
        created_by=None,
        submit_immediately: bool = True,
    ) -> Purchase:
        """
        Creates a purchase order and atomically posts stock movements and accounting if submitted.
        """
        if not items_data:
            raise ValidationError("A purchase order must contain at least one product item.")

        if purchase_date is None:
            purchase_date = timezone.now().date()

        purchase_number = cls.generate_purchase_number()

        # Calculate totals
        subtotal = Decimal("0.00")
        for item in items_data:
            qty = Decimal(str(item["quantity"]))
            rate = Decimal(str(item["purchase_rate"]))
            if qty <= 0:
                raise ValidationError("Product quantity must be greater than zero.")
            if rate < 0:
                raise ValidationError("Purchase rate cannot be negative.")
            subtotal += (qty * rate)

        grand_total = subtotal - Decimal(str(discount_amount)) + Decimal(str(tax_amount))
        paid = Decimal(str(paid_amount))

        if paid > grand_total:
            raise ValidationError("Paid amount cannot exceed grand total.")

        purchase = Purchase.objects.create(
            purchase_number=purchase_number,
            supplier=supplier,
            date=purchase_date,
            status=PurchaseStatus.DRAFT,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            grand_total=grand_total,
            initial_paid_amount=paid,
            paid_amount=paid,
            payment_method=payment_method,
            payment_account=payment_account,
            supplier_invoice_number=supplier_invoice_number or "",
            supplier_invoice_file=supplier_invoice_file or "",
            notes=notes,
            created_by=created_by,
        )

        # Create line items
        for item in items_data:
            prod = item["product"]
            if isinstance(prod, int):
                prod = Product.objects.get(pk=prod)

            qty = Decimal(str(item["quantity"]))
            rate = Decimal(str(item["purchase_rate"]))
            tax = Decimal(str(item.get("tax_rate", 0)))
            line_subtotal = qty * rate

            PurchaseItem.objects.create(
                purchase=purchase,
                product=prod,
                quantity=qty,
                purchase_rate=rate,
                tax_rate=tax,
                subtotal=line_subtotal,
                returned_quantity=Decimal("0.00"),
            )

        if submit_immediately:
            return cls.submit_purchase(purchase, created_by=created_by)

        return purchase

    @classmethod
    @transaction.atomic
    def update_purchase(
        cls,
        purchase: Purchase,
        supplier: Supplier,
        items_data: List[Dict[str, Any]],
        purchase_date: Optional[date] = None,
        discount_amount: Decimal = Decimal("0.00"),
        tax_amount: Decimal = Decimal("0.00"),
        paid_amount: Decimal = Decimal("0.00"),
        payment_method: Optional[PaymentMethod] = None,
        payment_account: Optional[Account] = None,
        supplier_invoice_number: Optional[str] = None,
        supplier_invoice_file: Optional[str] = None,
        notes: str = "",
        submit_immediately: bool = False,
        created_by=None,
    ) -> Purchase:
        """
        Updates an existing DRAFT or CANCELLED purchase order and optionally submits it.
        """
        if purchase.status not in [PurchaseStatus.DRAFT, PurchaseStatus.CANCELLED]:
            raise ValidationError("Only DRAFT or CANCELLED purchase orders can be edited.")

        if not items_data:
            raise ValidationError("A purchase order must contain at least one product item.")

        if purchase_date is None:
            purchase_date = timezone.now().date()

        # Calculate totals
        subtotal = Decimal("0.00")
        for item in items_data:
            qty = Decimal(str(item["quantity"]))
            rate = Decimal(str(item["purchase_rate"]))
            if qty <= 0:
                raise ValidationError("Product quantity must be greater than zero.")
            if rate < 0:
                raise ValidationError("Purchase rate cannot be negative.")
            subtotal += qty * rate

        discount_amount = Decimal(str(discount_amount))
        tax_amount = Decimal(str(tax_amount))
        paid = Decimal(str(paid_amount))

        grand_total = subtotal - discount_amount + tax_amount
        if grand_total < Decimal("0.00"):
            grand_total = Decimal("0.00")

        if purchase.status == PurchaseStatus.CANCELLED:
            purchase.status = PurchaseStatus.DRAFT

        purchase.supplier = supplier
        purchase.date = purchase_date
        purchase.subtotal = subtotal
        purchase.discount_amount = discount_amount
        purchase.tax_amount = tax_amount
        purchase.grand_total = grand_total
        purchase.initial_paid_amount = paid
        purchase.paid_amount = paid
        purchase.payment_method = payment_method
        purchase.payment_account = payment_account
        if supplier_invoice_number is not None:
            purchase.supplier_invoice_number = supplier_invoice_number
        if supplier_invoice_file:
            purchase.supplier_invoice_file = supplier_invoice_file
        purchase.notes = notes
        purchase.save()

        # Re-create line items
        purchase.items.all().delete()
        for item in items_data:
            prod = item["product"]
            if isinstance(prod, int):
                prod = Product.objects.get(pk=prod)

            qty = Decimal(str(item["quantity"]))
            rate = Decimal(str(item["purchase_rate"]))
            line_subtotal = qty * rate

            PurchaseItem.objects.create(
                purchase=purchase,
                product=prod,
                quantity=qty,
                purchase_rate=rate,
                subtotal=line_subtotal,
            )

        if submit_immediately:
            return cls.submit_purchase(purchase, created_by=created_by)

        return purchase

    @classmethod
    @transaction.atomic
    def submit_purchase(cls, purchase: Purchase, created_by=None) -> Purchase:
        """
        Submits a draft purchase:
        1. Generates StockMovement (+Qty) for each item
        2. Generates Double-Entry Accounting journal entry
        3. Updates status to SUBMITTED
        4. Reallocates any supplier payments
        """
        if purchase.status == PurchaseStatus.SUBMITTED:
            raise ValidationError("This purchase has already been submitted.")

        # 1. Create Stock Movements & Update Latest Product Catalog Purchase Price
        for item in purchase.items.all():
            StockMovement.objects.create(
                product=item.product,
                movement_type=MovementType.PURCHASE,
                quantity=item.quantity,
                unit_cost=item.purchase_rate,
                reference_type="PURCHASE",
                reference_id=purchase.purchase_number,
                notes=f"Purchase from {purchase.supplier.name} ({purchase.purchase_number})",
            )
            # Synchronize latest cost rate into Product Catalog
            prod = item.product
            if prod.purchase_price != item.purchase_rate:
                prod.purchase_price = item.purchase_rate
                prod.save(update_fields=["purchase_price", "updated_at"])

        # 2. Lookup standard accounting accounts
        inventory_acc = Account.objects.filter(code="1040").first() or Account.objects.get(code="1040")
        payable_acc = Account.objects.filter(code="2010").first() or Account.objects.get(code="2010")

        pay_acc = purchase.payment_account
        if not pay_acc:
            pay_acc = Account.objects.filter(code="1011").first() or Account.objects.filter(parent__code="1010").first() or Account.objects.filter(code="1010").first()

        # 3. Create Balanced Accounting Journal Entry
        AccountingService.record_purchase(
            purchase_ref=purchase.purchase_number,
            total_amount=purchase.grand_total,
            paid_amount=purchase.initial_paid_amount,
            payment_account=pay_acc,
            inventory_account=inventory_acc,
            supplier_payable_account=payable_acc,
            created_by=created_by or purchase.created_by,
            entry_date=purchase.date,
        )

        # 4. Mark Submitted
        purchase.status = PurchaseStatus.SUBMITTED
        purchase.save(update_fields=["status", "updated_at"])

        # 5. Reallocate payments for this supplier
        cls.reallocate_supplier_payments(purchase.supplier)

        return purchase

    @classmethod
    @transaction.atomic
    def cancel_purchase(cls, purchase: Purchase, reason: str = "", created_by=None) -> Purchase:
        """
        Cancels a submitted purchase:
        1. Creates reversing StockMovement (-Qty)
        2. Reverses the accounting journal entry
        3. Updates status to CANCELLED
        """
        if purchase.status != PurchaseStatus.SUBMITTED:
            raise ValidationError("Only SUBMITTED purchase orders can be cancelled.")

        # 1. Reversing Stock Movements
        for item in purchase.items.all():
            StockMovement.objects.create(
                product=item.product,
                movement_type=MovementType.PURCHASE_RETURN,
                quantity=-item.quantity,
                unit_cost=item.purchase_rate,
                reference_type="PURCHASE_CANCELLATION",
                reference_id=purchase.purchase_number,
                notes=f"Cancellation of {purchase.purchase_number}: {reason}",
            )

        # 2. Reverse Accounting Entry
        from apps.accounting.models import JournalEntry, ReferenceType
        original_entry = JournalEntry.objects.filter(
            reference_type=ReferenceType.PURCHASE,
            reference_id=purchase.purchase_number,
        ).first()

        if original_entry:
            AccountingService.reverse_entry(
                original_entry=original_entry,
                reason=f"Purchase order cancellation: {reason}",
                created_by=created_by,
            )

        purchase.status = PurchaseStatus.CANCELLED
        purchase.notes = f"{purchase.notes or ''}\n[CANCELLED]: {reason}".strip()
        purchase.save(update_fields=["status", "notes", "updated_at"])

        return purchase

    @classmethod
    @transaction.atomic
    def process_purchase_return(
        cls,
        purchase: Purchase,
        items_to_return: List[Dict[str, Any]],
        refund_method: str = RefundMethod.PAYABLE_DEDUCTION,
        payment_account=None,
        notes: str = "",
        created_by=None,
    ) -> PurchaseReturn:
        """
        Processes a purchase return from an existing submitted purchase.
        items_to_return: [{"purchase_item_id": int, "quantity": Decimal}]
        """
        if purchase.status != PurchaseStatus.SUBMITTED:
            raise ValidationError("Returns can only be processed on SUBMITTED purchases.")

        return_number = cls.generate_return_number()
        total_return_amount = Decimal("0.00")

        # Validation Phase
        validated_items = []
        for r_item in items_to_return:
            p_item = PurchaseItem.objects.select_for_update().get(pk=r_item["purchase_item_id"], purchase=purchase)
            qty_return = Decimal(str(r_item["quantity"]))

            if qty_return <= 0:
                continue

            if qty_return > p_item.remaining_returnable_quantity:
                raise ValidationError(
                    f"Cannot return {qty_return} of '{p_item.product.name}'. Maximum available to return is {p_item.remaining_returnable_quantity}."
                )

            item_total = qty_return * p_item.purchase_rate
            total_return_amount += item_total
            validated_items.append((p_item, qty_return, item_total))

        if not validated_items:
            raise ValidationError("No valid items to return.")

        # Resolve Accounts
        inventory_acc = Account.objects.filter(code="1040").first() or Account.objects.get(code="1040")
        payable_acc = Account.objects.filter(code="2010").first() or Account.objects.get(code="2010")

        if isinstance(payment_account, int):
            payment_account = Account.objects.get(pk=payment_account)

        if refund_method in [RefundMethod.CASH, RefundMethod.CASH_REFUND]:
            receiving_acc = payment_account or purchase.payment_account or Account.objects.filter(code="1011").first() or Account.objects.filter(parent__code="1010").first() or Account.objects.filter(code="1010").first()
        elif refund_method in [RefundMethod.BANK, RefundMethod.CHEQUE]:
            receiving_acc = payment_account or Account.objects.filter(code="1021").first() or Account.objects.filter(parent__code="1020").first() or Account.objects.filter(code="1020").first()
        else:
            receiving_acc = payable_acc

        # Create Return Document
        p_return = PurchaseReturn.objects.create(
            return_number=return_number,
            original_purchase=purchase,
            supplier=purchase.supplier,
            date=timezone.now().date(),
            total_amount=total_return_amount,
            refund_method=refund_method,
            payment_account=receiving_acc if refund_method != RefundMethod.PAYABLE_DEDUCTION else None,
            notes=notes,
            created_by=created_by,
        )

        # Process each returned item
        for p_item, qty, item_total in validated_items:
            PurchaseReturnItem.objects.create(
                purchase_return=p_return,
                purchase_item=p_item,
                product=p_item.product,
                quantity=qty,
                unit_rate=p_item.purchase_rate,
                subtotal=item_total,
            )

            # Update item returned quantity count
            p_item.returned_quantity += qty
            p_item.save(update_fields=["returned_quantity"])

            # Deduct Inventory Stock (-Qty)
            StockMovement.objects.create(
                product=p_item.product,
                movement_type=MovementType.PURCHASE_RETURN,
                quantity=-qty,
                unit_cost=p_item.purchase_rate,
                reference_type="PURCHASE_RETURN",
                reference_id=p_return.return_number,
                notes=f"Return from {purchase.purchase_number} to {purchase.supplier.name}",
            )

        # Generate Double-Entry Accounting:
        # Debit: Cash / Bank (if cash/bank refund) OR Accounts Payable (if payable deduction)
        # Credit: Merchandise Inventory Asset (1040)
        lines = [
            {
                "account": receiving_acc,
                "debit": total_return_amount,
                "credit": Decimal("0.00"),
                "description": f"Purchase Return from {purchase.supplier.name} via {receiving_acc.name} ({p_return.return_number})",
            },
            {
                "account": inventory_acc,
                "debit": Decimal("0.00"),
                "credit": total_return_amount,
                "description": f"Inventory credit for {p_return.return_number}",
            },
        ]
        from apps.accounting.models import ReferenceType
        AccountingService.create_journal_entry(
            entry_date=p_return.date,
            reference_type=ReferenceType.PURCHASE_RETURN,
            reference_id=p_return.return_number,
            lines=lines,
            narration=f"Purchase Return: {p_return.return_number} (Ref: {purchase.purchase_number}) - Debit {receiving_acc.name} / Credit Inventory",
            created_by=created_by,
        )

        cls.reallocate_supplier_payments(purchase.supplier)

        return p_return

    @staticmethod
    def get_supplier_outstanding(supplier_id: int) -> Decimal:
        """
        Dynamically calculates outstanding payable balance for a supplier from single sources of truth.
        Outstanding = Total Purchases (SUBMITTED) - Total Upfront Paid - Total Returns (PAYABLE_DEDUCTION) - Total Submitted Payments
        """
        supplier = Supplier.objects.get(pk=supplier_id)
        purchases = Purchase.objects.filter(
            supplier=supplier,
            status=PurchaseStatus.SUBMITTED,
        )
        total_purchased = (supplier.opening_balance or Decimal("0.00")) + (sum(p.grand_total for p in purchases) or Decimal("0.00"))
        total_upfront_paid = sum(p.initial_paid_amount for p in purchases) or Decimal("0.00")

        returns = PurchaseReturn.objects.filter(
            supplier=supplier,
            refund_method=RefundMethod.PAYABLE_DEDUCTION,
        )
        total_returns_deducted = sum(r.total_amount for r in returns) or Decimal("0.00")

        payments = SupplierPayment.objects.filter(
            supplier=supplier,
            status=SupplierPaymentStatus.SUBMITTED,
        )
        total_payments = sum(pay.amount for pay in payments) or Decimal("0.00")

        return max(Decimal("0.00"), total_purchased - total_upfront_paid - total_returns_deducted - total_payments)

    @classmethod
    @transaction.atomic
    def record_supplier_payment(
        cls,
        supplier: Supplier,
        amount: Decimal,
        payment_method: str,
        payment_account: Account,
        payment_date: Optional[date] = None,
        reference: str = "",
        notes: str = "",
        submit_now: bool = True,
        created_by=None,
    ) -> SupplierPayment:
        """
        Records a payment voucher for a supplier with overpayment validation.
        """
        amt = Decimal(str(amount))
        if amt <= Decimal("0.00"):
            raise ValidationError("Payment amount must be greater than zero.")

        outstanding = cls.get_supplier_outstanding(supplier.id)
        if amt > outstanding:
            raise ValidationError(
                f"Maximum payable amount for {supplier.name} is Rs. {outstanding:,.2f}. Payment of Rs. {amt:,.2f} exceeds outstanding balance."
            )

        if payment_date is None:
            payment_date = timezone.now().date()

        payment_number = SupplierPayment.generate_payment_number(payment_date)

        payment = SupplierPayment.objects.create(
            payment_number=payment_number,
            supplier=supplier,
            date=payment_date,
            amount=amt,
            payment_method=payment_method,
            payment_account=payment_account,
            reference=reference,
            notes=notes,
            status=SupplierPaymentStatus.DRAFT,
            created_by=created_by,
        )

        if submit_now:
            payment = cls.submit_supplier_payment(payment, user=created_by)

        return payment

    @classmethod
    @transaction.atomic
    def submit_supplier_payment(cls, payment: SupplierPayment, user=None) -> SupplierPayment:
        """
        Submits and posts a supplier payment voucher to the General Ledger.
        - Debit: Accounts Payable (2010)
        - Credit: Cash/Bank Account (payment.payment_account)
        """
        if payment.status == SupplierPaymentStatus.SUBMITTED:
            return payment
        if payment.status == SupplierPaymentStatus.CANCELLED:
            raise ValidationError(f"Cannot submit cancelled supplier payment [{payment.payment_number}].")

        # Double check overpayment at moment of submission
        outstanding = cls.get_supplier_outstanding(payment.supplier.id)
        if payment.amount > outstanding:
            raise ValidationError(
                f"Maximum payable amount is Rs. {outstanding:,.2f}. Cannot submit payment of Rs. {payment.amount:,.2f}."
            )

        payable_acc = Account.objects.filter(code="2010").first() or Account.objects.get(code="2010")

        # Accounting Entry: Debit Accounts Payable (2010), Credit Cash/Bank
        journal_entry = AccountingService.record_supplier_payment(
            payment_ref=payment.payment_number,
            supplier_name=payment.supplier.company_name or payment.supplier.name,
            amount=payment.amount,
            payment_account=payment.payment_account,
            payable_account=payable_acc,
            created_by=user or payment.created_by,
            entry_date=payment.date,
        )

        payment.journal_entry = journal_entry
        payment.status = SupplierPaymentStatus.SUBMITTED
        payment.submitted_by = user or payment.created_by
        payment.submitted_at = timezone.now()
        payment.save()

        # Reallocate payments across supplier purchases in FIFO order
        cls.reallocate_supplier_payments(payment.supplier)

        return payment

    @classmethod
    @transaction.atomic
    def cancel_supplier_payment(cls, payment: SupplierPayment, user=None, reason: str = "") -> SupplierPayment:
        """
        Cancels a submitted supplier payment and creates counter-reversal journal entry:
        - Debit: Payment Account (1010 Cash / 1020 Bank)
        - Credit: 2010 Accounts Payable
        """
        if payment.status != SupplierPaymentStatus.SUBMITTED:
            raise ValidationError(f"Only submitted supplier payments can be cancelled (Status: {payment.status}).")

        if not reason.strip():
            raise ValidationError("A cancellation reason is required.")

        payable_acc = Account.objects.filter(code="2010").first() or Account.objects.get(code="2010")

        # Counter-reversal GL posting
        rev_lines = [
            {
                "account": payment.payment_account,
                "debit": payment.amount,
                "credit": Decimal("0.00"),
                "description": f"Reversal of supplier payment {payment.payment_number} to {payment.supplier.name}",
            },
            {
                "account": payable_acc,
                "debit": Decimal("0.00"),
                "credit": payment.amount,
                "description": f"Payable restoration upon cancellation of {payment.payment_number}",
            },
        ]

        rev_entry = AccountingService.create_journal_entry(
            entry_date=timezone.now().date(),
            reference_type=ReferenceType.REVERSAL,
            reference_id=payment.payment_number,
            lines=rev_lines,
            narration=f"Cancellation reversal of Supplier Payment {payment.payment_number}: {reason}",
            created_by=user,
        )

        payment.reversal_journal_entry = rev_entry
        payment.status = SupplierPaymentStatus.CANCELLED
        payment.cancelled_by = user
        payment.cancelled_at = timezone.now()
        payment.cancellation_reason = reason.strip()
        payment.save()

        # Reallocate payments across supplier purchases (restoring unpaid balance)
        cls.reallocate_supplier_payments(payment.supplier)

        return payment

    @classmethod
    def reallocate_supplier_payments(cls, supplier: Supplier):
        """
        Allocates all submitted payments for a supplier across their submitted purchases in FIFO order.
        """
        purchases = list(Purchase.objects.filter(supplier=supplier, status=PurchaseStatus.SUBMITTED).order_by("date", "id"))
        payments = list(SupplierPayment.objects.filter(supplier=supplier, status=SupplierPaymentStatus.SUBMITTED).order_by("date", "id"))

        total_payment_pool = sum(p.amount for p in payments)

        # 1. Reset each purchase to its initial upfront paid amount
        for p in purchases:
            p.paid_amount = p.initial_paid_amount

        # 2. Allocate payment pool across purchases up to their remaining payable (taking returns into account)
        for p in purchases:
            p_returns = sum(r.total_amount for r in p.returns.filter(refund_method=RefundMethod.PAYABLE_DEDUCTION))
            effective_total = max(Decimal("0.00"), p.grand_total - p_returns)
            unpaid = max(Decimal("0.00"), effective_total - p.paid_amount)
            if unpaid > Decimal("0.00") and total_payment_pool > Decimal("0.00"):
                pay_alloc = min(total_payment_pool, unpaid)
                p.paid_amount += pay_alloc
                total_payment_pool -= pay_alloc

            p.save(update_fields=["paid_amount", "updated_at"])

    @staticmethod
    def get_supplier_statement(
        supplier_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Generates official supplier statement detailing opening balance, purchases, returns, payments,
        running balance, and final outstanding payable.
        """
        supplier = Supplier.objects.get(pk=supplier_id)

        # 1. Calculate opening balance before start_date
        base_opening = supplier.opening_balance or Decimal("0.00")
        opening_purchases = base_opening
        opening_upfront_paid = Decimal("0.00")
        opening_returns = Decimal("0.00")
        opening_payments = Decimal("0.00")

        if start_date:
            prior_purchases = Purchase.objects.filter(supplier=supplier, status=PurchaseStatus.SUBMITTED, date__lt=start_date)
            opening_purchases += (sum(p.grand_total for p in prior_purchases) or Decimal("0.00"))
            opening_upfront_paid += (sum(p.initial_paid_amount for p in prior_purchases) or Decimal("0.00"))

            prior_returns = PurchaseReturn.objects.filter(supplier=supplier, refund_method=RefundMethod.PAYABLE_DEDUCTION, date__lt=start_date)
            opening_returns += (sum(r.total_amount for r in prior_returns) or Decimal("0.00"))

            prior_payments = SupplierPayment.objects.filter(supplier=supplier, status=SupplierPaymentStatus.SUBMITTED, date__lt=start_date)
            opening_payments += (sum(pay.amount for pay in prior_payments) or Decimal("0.00"))

        opening_balance = max(Decimal("0.00"), opening_purchases - opening_upfront_paid - opening_returns - opening_payments)

        # 2. Fetch transactions within range
        p_qs = Purchase.objects.filter(supplier=supplier, status=PurchaseStatus.SUBMITTED)
        r_qs = PurchaseReturn.objects.filter(supplier=supplier)
        pay_qs = SupplierPayment.objects.filter(supplier=supplier, status=SupplierPaymentStatus.SUBMITTED)

        if start_date:
            p_qs = p_qs.filter(date__gte=start_date)
            r_qs = r_qs.filter(date__gte=start_date)
            pay_qs = pay_qs.filter(date__gte=start_date)

        if end_date:
            p_qs = p_qs.filter(date__lte=end_date)
            r_qs = r_qs.filter(date__lte=end_date)
            pay_qs = pay_qs.filter(date__lte=end_date)

        # 3. Interleave into chronological transaction rows
        events = []
        period_purchases = Decimal("0.00")
        period_upfront_paid = Decimal("0.00")
        period_returns = Decimal("0.00")
        period_voucher_payments = Decimal("0.00")

        for p in p_qs:
            period_purchases += p.grand_total
            events.append({
                "date": p.date,
                "created_at": p.created_at,
                "reference": p.purchase_number,
                "transaction_type": "PURCHASE",
                "description": f"Purchase Invoice ({p.items.count()} items - Total: Rs. {p.grand_total:,.2f})",
                "debit": 0.0,
                "credit": float(p.grand_total),
            })

            if p.initial_paid_amount > Decimal("0.00"):
                period_upfront_paid += p.initial_paid_amount
                method_name = p.payment_method.name if p.payment_method else "Cash/Bank"
                events.append({
                    "date": p.date,
                    "created_at": p.created_at,
                    "reference": p.purchase_number,
                    "transaction_type": "PAYMENT",
                    "description": f"Immediate Payment at Purchase ({method_name})",
                    "debit": float(p.initial_paid_amount),
                    "credit": 0.0,
                })

        for r in r_qs:
            period_returns += r.total_amount
            if r.refund_method == RefundMethod.PAYABLE_DEDUCTION:
                events.append({
                    "date": r.date,
                    "created_at": r.created_at,
                    "reference": r.return_number,
                    "transaction_type": "PURCHASE_RETURN",
                    "description": f"Purchase Return (Deducted from Payable - {r.items.count()} items)",
                    "debit": float(r.total_amount),
                    "credit": 0.0,
                })
            else:
                events.append({
                    "date": r.date,
                    "created_at": r.created_at,
                    "reference": r.return_number,
                    "transaction_type": "PURCHASE_RETURN",
                    "description": f"Purchase Return ({r.get_refund_method_display()} Refund - Rs. {r.total_amount:,.2f})",
                    "debit": 0.0,
                    "credit": 0.0,
                })

        for pay in pay_qs:
            period_voucher_payments += pay.amount
            events.append({
                "date": pay.date,
                "created_at": pay.created_at,
                "reference": pay.payment_number,
                "transaction_type": "SUPPLIER_PAYMENT",
                "description": f"Payment Voucher ({pay.get_payment_method_display()} - {pay.payment_account.name})",
                "debit": float(pay.amount),
                "credit": 0.0,
            })

        events.sort(key=lambda x: (x["date"], x["created_at"]))

        running_balance = opening_balance
        rows = []
        for e in events:
            debit_val = Decimal(str(e["debit"]))
            credit_val = Decimal(str(e["credit"]))
            running_balance += (credit_val - debit_val)

            rows.append({
                "date": str(e["date"]),
                "reference": e["reference"],
                "transaction_type": e["transaction_type"],
                "description": e["description"],
                "debit": float(debit_val),
                "credit": float(credit_val),
                "running_balance": float(max(Decimal("0.00"), running_balance)),
            })

        closing_payable = max(Decimal("0.00"), running_balance)
        total_settled_paid = period_upfront_paid + period_voucher_payments

        return {
            "supplier_id": supplier.id,
            "supplier_name": supplier.name,
            "company_name": supplier.company_name,
            "representative": supplier.name,
            "phone": supplier.phone,
            "email": supplier.email,
            "start_date": str(start_date) if start_date else None,
            "end_date": str(end_date) if end_date else None,
            "summary": {
                "opening_balance": float(opening_balance),
                "total_purchases": float(period_purchases),
                "upfront_paid": float(period_upfront_paid),
                "voucher_payments": float(period_voucher_payments),
                "total_payments": float(total_settled_paid),
                "total_returns": float(period_returns),
                "closing_payable": float(closing_payable),
            },
            "rows": rows,
        }

    @staticmethod
    def get_supplier_payables_report(
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        supplier_id: Optional[int] = None,
        payment_account_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        transaction_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Consolidated master supplier payables and payments report.
        """
        suppliers_qs = Supplier.objects.filter(is_active=True)
        if supplier_id:
            suppliers_qs = suppliers_qs.filter(pk=supplier_id)

        supplier_summaries = []
        total_purchases_all = Decimal("0.00")
        total_returns_all = Decimal("0.00")
        total_paid_all = Decimal("0.00")
        total_outstanding_all = Decimal("0.00")

        for s in suppliers_qs:
            stmt = PurchaseService.get_supplier_statement(s.id, start_date=start_date, end_date=end_date)
            sum_data = stmt["summary"]

            total_purchases_all += Decimal(str(sum_data["total_purchases"]))
            total_returns_all += Decimal(str(sum_data["total_returns"]))
            total_paid_all += Decimal(str(sum_data["total_payments"]))
            total_outstanding_all += Decimal(str(sum_data["closing_payable"]))

            supplier_summaries.append({
                "supplier_id": s.id,
                "supplier_name": s.name,
                "company_name": s.company_name,
                "phone": s.phone,
                "opening_balance": sum_data["opening_balance"],
                "total_purchases": sum_data["total_purchases"],
                "total_returns": sum_data["total_returns"],
                "total_payments": sum_data["total_payments"],
                "outstanding_payable": sum_data["closing_payable"],
            })

        # Payment vouchers listing
        pay_qs = SupplierPayment.objects.all().select_related("supplier", "payment_account", "created_by")
        if start_date:
            pay_qs = pay_qs.filter(date__gte=start_date)
        if end_date:
            pay_qs = pay_qs.filter(date__lte=end_date)
        if supplier_id:
            pay_qs = pay_qs.filter(supplier_id=supplier_id)
        if payment_account_id:
            pay_qs = pay_qs.filter(payment_account_id=payment_account_id)
        if status_filter:
            pay_qs = pay_qs.filter(status=status_filter)

        payment_rows = []
        for p in pay_qs:
            payment_rows.append({
                "id": p.id,
                "payment_number": p.payment_number,
                "date": str(p.date),
                "supplier_id": p.supplier.id,
                "supplier_name": p.supplier.name,
                "company_name": p.supplier.company_name,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "payment_method_display": p.get_payment_method_display(),
                "payment_account_name": p.payment_account.name,
                "payment_account_code": p.payment_account.code,
                "status": p.status,
                "status_display": p.get_status_display(),
                "reference": p.reference,
                "journal_entry_number": p.journal_entry.entry_number if p.journal_entry else None,
                "created_by_name": p.created_by.get_full_name() or p.created_by.username if p.created_by else "System",
            })

        return {
            "summary": {
                "total_suppliers": len(supplier_summaries),
                "total_purchases": float(total_purchases_all),
                "total_returns": float(total_returns_all),
                "total_payments": float(total_paid_all),
                "total_outstanding_payables": float(total_outstanding_all),
            },
            "supplier_summaries": supplier_summaries,
            "payments": payment_rows,
        }

    @staticmethod
    def get_purchase_report(
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        supplier_id: Optional[int] = None,
        status_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Aggregates purchases and returns for the master Purchase Report.
        """
        qs = Purchase.objects.all().select_related("supplier", "created_by").prefetch_related("items__product")

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        total_orders = qs.count()
        submitted_qs = list(qs.filter(status=PurchaseStatus.SUBMITTED))

        total_grand = sum(p.grand_total for p in submitted_qs) or Decimal("0.00")
        total_upfront_paid = sum(p.initial_paid_amount for p in submitted_qs) or Decimal("0.00")

        # Purchase returns
        returns_qs = PurchaseReturn.objects.all()
        if start_date:
            returns_qs = returns_qs.filter(date__gte=start_date)
        if end_date:
            returns_qs = returns_qs.filter(date__lte=end_date)
        if supplier_id:
            returns_qs = returns_qs.filter(supplier_id=supplier_id)

        total_returns = returns_qs.aggregate(t=models.Sum("total_amount"))["t"] or Decimal("0.00")
        net_purchases = max(Decimal("0.00"), total_grand - total_returns)

        # Supplier opening payables & voucher payments
        suppliers_qs = Supplier.objects.filter(is_active=True)
        if supplier_id:
            suppliers_qs = suppliers_qs.filter(pk=supplier_id)

        total_opening = sum(s.opening_balance for s in suppliers_qs) or Decimal("0.00")

        pay_qs = SupplierPayment.objects.filter(supplier__in=suppliers_qs, status=SupplierPaymentStatus.SUBMITTED)
        if start_date:
            pay_qs = pay_qs.filter(date__gte=start_date)
        if end_date:
            pay_qs = pay_qs.filter(date__lte=end_date)

        total_voucher_payments = pay_qs.aggregate(t=models.Sum("amount"))["t"] or Decimal("0.00")
        total_paid = total_upfront_paid + total_voucher_payments

        # Total outstanding payables for suppliers
        total_payable = Decimal("0.00")
        for s in suppliers_qs:
            stmt = PurchaseService.get_supplier_statement(s.id, start_date=start_date, end_date=end_date)
            total_payable += Decimal(str(stmt["summary"]["closing_payable"]))

        return {
            "total_orders": total_orders,
            "total_purchases": float(total_grand),
            "opening_balance": float(total_opening),
            "total_paid": float(total_paid),
            "total_payable": float(total_payable),
            "total_returned": float(total_returns),
            "net_purchases": float(net_purchases),
        }
