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
)
from apps.contacts.models import Supplier
from apps.products.models import Product
from apps.inventory.models import StockMovement, MovementType
from apps.accounting.models import Account, PaymentMethod
from apps.accounting.services import AccountingService


class PurchaseService:
    """
    Authoritative domain service for all purchasing, payables, returns, and stock-in movements.
    """

    @staticmethod
    def generate_purchase_number() -> str:
        year = timezone.now().year
        prefix = f"PUR-{year}-"
        last = Purchase.objects.filter(purchase_number__startswith=prefix).order_by("-id").first()
        if last:
            try:
                seq = int(last.purchase_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = Purchase.objects.count() + 1
        else:
            seq = Purchase.objects.count() + 1
        return f"{prefix}{seq:05d}"

    @staticmethod
    def generate_return_number() -> str:
        year = timezone.now().year
        prefix = f"PRTN-{year}-"
        last = PurchaseReturn.objects.filter(return_number__startswith=prefix).order_by("-id").first()
        if last:
            try:
                seq = int(last.return_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = PurchaseReturn.objects.count() + 1
        else:
            seq = PurchaseReturn.objects.count() + 1
        return f"{prefix}{seq:05d}"

    @staticmethod
    def generate_payment_number() -> str:
        year = timezone.now().year
        prefix = f"SPAY-{year}-"
        last = SupplierPayment.objects.filter(payment_number__startswith=prefix).order_by("-id").first()
        if last:
            try:
                seq = int(last.payment_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = SupplierPayment.objects.count() + 1
        else:
            seq = SupplierPayment.objects.count() + 1
        return f"{prefix}{seq:05d}"

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
            cls.submit_purchase(purchase, created_by=created_by)

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
        if purchase.status == PurchaseStatus.CANCELLED:
            raise ValidationError("Cannot submit a cancelled purchase order.")

        # 1. Create Stock Movements
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

        # 2. Lookup standard accounting accounts
        inventory_acc = Account.objects.filter(code="1040").first() or Account.objects.get(code="1040")
        payable_acc = Account.objects.filter(code="2010").first() or Account.objects.get(code="2010")

        pay_acc = purchase.payment_account
        if not pay_acc:
            pay_acc = Account.objects.filter(code="1010").first() or Account.objects.get(code="1010")

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

        # Create Return Document
        p_return = PurchaseReturn.objects.create(
            return_number=return_number,
            original_purchase=purchase,
            supplier=purchase.supplier,
            date=timezone.now().date(),
            total_amount=total_return_amount,
            refund_method=refund_method,
            notes=notes,
            created_by=created_by,
        )

        inventory_acc = Account.objects.filter(code="1040").first() or Account.objects.get(code="1040")
        payable_acc = Account.objects.filter(code="2010").first() or Account.objects.get(code="2010")
        cash_acc = purchase.payment_account or Account.objects.filter(code="1010").first() or Account.objects.get(code="1010")

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
        # Debit: Accounts Payable (or Cash)
        # Credit: Inventory Asset
        lines = [
            {
                "account": cash_acc if refund_method == RefundMethod.CASH_REFUND else payable_acc,
                "debit": total_return_amount,
                "credit": Decimal("0.00"),
                "description": f"Purchase Return to {purchase.supplier.name} ({p_return.return_number})",
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
            narration=f"Purchase Return: {p_return.return_number} (Ref: {purchase.purchase_number})",
            created_by=created_by,
        )

        cls.reallocate_supplier_payments(purchase.supplier)

        return p_return

    @classmethod
    @transaction.atomic
    def record_supplier_payment(
        cls,
        supplier: Supplier,
        amount: Decimal,
        payment_method: PaymentMethod,
        payment_account: Account,
        payment_date: Optional[date] = None,
        reference: str = "",
        notes: str = "",
        created_by=None,
    ) -> SupplierPayment:
        """
        Records a payment to a supplier, reducing Accounts Payable.
        """
        amt = Decimal(str(amount))
        if amt <= Decimal("0.00"):
            raise ValidationError("Payment amount must be greater than zero.")

        if payment_date is None:
            payment_date = timezone.now().date()

        payment_number = cls.generate_payment_number()

        payment = SupplierPayment.objects.create(
            payment_number=payment_number,
            supplier=supplier,
            date=payment_date,
            amount=amt,
            payment_method=payment_method,
            payment_account=payment_account,
            reference=reference,
            notes=notes,
            created_by=created_by,
        )

        payable_acc = Account.objects.filter(code="2010").first() or Account.objects.get(code="2010")

        # Accounting Entry: Debit Accounts Payable, Credit Cash/Bank
        AccountingService.record_supplier_payment(
            payment_ref=payment.payment_number,
            supplier_name=supplier.company_name or supplier.name,
            amount=amt,
            payment_account=payment_account,
            payable_account=payable_acc,
            created_by=created_by,
            entry_date=payment_date,
        )

        # Allocate payment against outstanding submitted purchases for this supplier (FIFO)
        cls.reallocate_supplier_payments(supplier)

        return payment

    @classmethod
    def reallocate_supplier_payments(cls, supplier: Supplier):
        """
        Allocates all standalone payments for a supplier across their submitted purchases in FIFO order.
        """
        purchases = list(Purchase.objects.filter(supplier=supplier, status=PurchaseStatus.SUBMITTED).order_by("date", "id"))
        payments = list(SupplierPayment.objects.filter(supplier=supplier).order_by("date", "id"))
        returns = list(PurchaseReturn.objects.filter(supplier=supplier, refund_method=RefundMethod.PAYABLE_DEDUCTION).order_by("date", "id"))

        total_payment_pool = sum(p.amount for p in payments)
        total_return_pool = sum(r.total_amount for r in returns)

        # 1. Reset each purchase to its initial upfront paid amount
        for p in purchases:
            p.paid_amount = p.initial_paid_amount

        # 2. Apply return pool first, then payment pool
        for p in purchases:
            unpaid = p.grand_total - p.paid_amount
            if unpaid > Decimal("0.00") and total_return_pool > Decimal("0.00"):
                ret_alloc = min(total_return_pool, unpaid)
                p.paid_amount += ret_alloc
                total_return_pool -= ret_alloc
                unpaid -= ret_alloc

            if unpaid > Decimal("0.00") and total_payment_pool > Decimal("0.00"):
                pay_alloc = min(total_payment_pool, unpaid)
                p.paid_amount += pay_alloc
                total_payment_pool -= pay_alloc
                unpaid -= pay_alloc

            p.save(update_fields=["paid_amount", "updated_at"])

    @staticmethod
    def get_supplier_statement(supplier_id: int) -> Dict[str, Any]:
        """
        Computes total purchases, payments, returns, and net outstanding payable for a supplier.
        """
        supplier = Supplier.objects.get(pk=supplier_id)

        purchases = Purchase.objects.filter(
            supplier=supplier,
            status=PurchaseStatus.SUBMITTED,
        ).order_by("date", "id")

        payments = SupplierPayment.objects.filter(
            supplier=supplier,
        ).order_by("date", "id")

        returns = PurchaseReturn.objects.filter(
            supplier=supplier,
        ).order_by("date", "id")

        total_purchased = sum(p.grand_total for p in purchases) or Decimal("0.00")
        total_paid_at_purchase = sum(p.initial_paid_amount for p in purchases) or Decimal("0.00")
        total_standalone_payments = sum(pay.amount for pay in payments) or Decimal("0.00")
        total_returns_deducted = sum(r.total_amount for r in returns if r.refund_method == RefundMethod.PAYABLE_DEDUCTION) or Decimal("0.00")

        total_paid = total_paid_at_purchase + total_standalone_payments
        net_payable = max(Decimal("0.00"), total_purchased - total_paid - total_returns_deducted)

        return {
            "supplier_id": supplier.id,
            "supplier_name": supplier.name,
            "company_name": supplier.company_name,
            "total_purchased": float(total_purchased),
            "total_paid": float(total_paid),
            "total_returns": float(total_returns_deducted),
            "net_payable": float(net_payable),
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
        total_paid = sum(p.paid_amount for p in submitted_qs) or Decimal("0.00")
        total_payable = sum(p.payable_amount for p in submitted_qs) or Decimal("0.00")

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

        return {
            "total_orders": total_orders,
            "total_purchases": float(total_grand),
            "total_paid": float(total_paid),
            "total_payable": float(total_payable),
            "total_returned": float(total_returns),
            "net_purchases": float(net_purchases),
        }
