"""
Inventory Service Layer.
Encapsulates atomic stock adjustments, stock card queries, valuation, and negative-stock prevention.
"""

from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import date
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.products.models import Product
from apps.inventory.models import (
    StockMovement,
    MovementType,
    StockAdjustment,
    StockAdjustmentItem,
    AdjustmentType,
    AdjustmentReason,
)
from apps.accounting.models import Account, ReferenceType
from apps.accounting.services import AccountingService


class InventoryService:
    """
    Comprehensive service for inventory transactions and stock control.
    """

    @classmethod
    def generate_adjustment_number(cls) -> str:
        """
        Generates sequential adjustment identifier (e.g. ADJ-2026-00001).
        """
        year = timezone.now().year
        prefix = f"ADJ-{year}-"
        last_adj = (
            StockAdjustment.objects.filter(adjustment_number__startswith=prefix)
            .order_by("-adjustment_number")
            .first()
        )
        if last_adj:
            try:
                seq = int(last_adj.adjustment_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:05d}"

    @classmethod
    def get_product_stock(cls, product_id: int, lock: bool = False) -> Decimal:
        """
        Returns accurate on-hand stock for a product, optionally acquiring a database row lock.
        """
        qs = StockMovement.objects.filter(product_id=product_id)
        if lock:
            # Row lock on the product to prevent race conditions during concurrent checkouts
            Product.objects.select_for_update().get(pk=product_id)
        total = qs.aggregate(t=models.Sum("quantity"))["t"]
        return Decimal(str(total or "0.00"))

    @classmethod
    def get_product_stock_card(cls, product_id: int) -> Dict[str, Any]:
        """
        Generates the chronological stock ledger history for a product.
        Answers: 'Why is this product's current stock X?'
        """
        product = Product.objects.select_related("category", "unit").get(pk=product_id)
        movements = StockMovement.objects.filter(product=product).select_related("created_by").order_by("created_at", "id")

        timeline = []
        running_balance = Decimal("0.00")
        total_in = Decimal("0.00")
        total_out = Decimal("0.00")

        for m in movements:
            qty = m.quantity
            running_balance += qty
            if qty > 0:
                total_in += qty
            else:
                total_out += abs(qty)

            timeline.append({
                "id": m.id,
                "created_at": m.created_at.isoformat(),
                "movement_type": m.movement_type,
                "movement_type_display": m.get_movement_type_display(),
                "quantity": float(qty),
                "unit_cost": float(m.unit_cost),
                "balance_after": float(running_balance),
                "reference_type": m.reference_type or "",
                "reference_id": m.reference_id or "",
                "notes": m.notes or "",
                "created_by": m.created_by.get_full_name() or m.created_by.username if m.created_by else "System",
            })

        wac = StockMovement.get_weighted_average_cost(product.id)
        current_stock = float(running_balance)
        min_stock = float(product.min_stock_level or 0)

        status = "IN_STOCK"
        if current_stock <= 0:
            status = "OUT_OF_STOCK"
        elif current_stock <= min_stock:
            status = "LOW_STOCK"

        return {
            "product_id": product.id,
            "product_name": product.name,
            "sku": product.sku,
            "barcode": product.barcode or "",
            "category": product.category.name if product.category else "",
            "unit": product.unit.short_code if product.unit else "",
            "min_stock_level": min_stock,
            "current_stock": current_stock,
            "stock_status": status,
            "weighted_average_cost": wac,
            "total_valuation": current_stock * wac,
            "total_stock_in": float(total_in),
            "total_stock_out": float(total_out),
            "timeline": timeline,
        }

    @classmethod
    def get_inventory_summary(cls) -> List[Dict[str, Any]]:
        """
        Returns the real-time stock catalog with valuation and status for all active products.
        """
        products = Product.objects.select_related("category", "unit").filter(is_active=True).order_by("name")
        summary_list = []

        for p in products:
            if not p.maintain_stock:
                stock = Decimal("0.00")
                wac = Decimal(str(p.purchase_price or "0.00"))
                min_stock = Decimal("0.00")
                status = "STOCK_FREE"
            else:
                stock = cls.get_product_stock(p.id)
                wac = Decimal(str(StockMovement.get_weighted_average_cost(p.id)))
                min_stock = Decimal(str(p.min_stock_level or 0))

                if stock <= Decimal("0.00"):
                    status = "OUT_OF_STOCK"
                elif stock <= min_stock:
                    status = "LOW_STOCK"
                else:
                    status = "IN_STOCK"

            img_url = p.image_url or (p.image.url if p.image else "")
            summary_list.append({
                "product_id": p.id,
                "product_name": p.name,
                "sku": p.sku,
                "barcode": p.barcode or "",
                "image_url": img_url,
                "image": img_url,
                "category_id": p.category.id if p.category else None,
                "category_name": p.category.name if p.category else "Uncategorized",
                "unit_name": p.unit.name if p.unit else "",
                "unit_abbr": p.unit.short_code if p.unit else "",
                "maintain_stock": p.maintain_stock,
                "current_stock": float(stock),
                "min_stock_level": float(min_stock),
                "stock_status": status,
                "selling_price": float(p.selling_price),
                "weighted_average_cost": float(wac),
                "inventory_valuation": float(stock * Decimal(str(wac))),
            })

        return summary_list

    @classmethod
    @transaction.atomic
    def record_stock_adjustment(
        cls,
        adjustment_type: str,
        reason: str,
        items_data: List[Dict[str, Any]],
        notes: str = "",
        adjustment_date: Optional[date] = None,
        created_by=None,
    ) -> StockAdjustment:
        """
        Atomically records a stock adjustment:
        1. Validates inputs, reasons, and negative stock rules.
        2. Creates StockAdjustment header and StockAdjustmentItem lines.
        3. Creates signed StockMovement records.
        4. Posts balanced Double-Entry General Ledger accounting entries.
        """
        if reason == AdjustmentReason.OTHER and not (notes and notes.strip()):
            raise ValidationError("Notes are required when 'Other' reason is selected.")

        if not items_data:
            raise ValidationError("At least one product item is required for a stock adjustment.")

        if adjustment_date is None:
            adjustment_date = timezone.now().date()

        adj_number = cls.generate_adjustment_number()
        total_qty = Decimal("0.00")
        total_cost = Decimal("0.00")

        # Validation & preparation
        validated_items = []
        for row in items_data:
            prod_id = row.get("product")
            prod = Product.objects.select_for_update().get(pk=prod_id)
            current_stock = cls.get_product_stock(prod.id)
            wac = Decimal(str(StockMovement.get_weighted_average_cost(prod.id)))

            qty_diff = Decimal(str(row.get("difference_quantity", 0)))
            if qty_diff <= Decimal("0.00"):
                # If user passed actual_stock instead:
                if "actual_stock" in row:
                    actual = Decimal(str(row["actual_stock"]))
                    diff = actual - current_stock
                    qty_diff = abs(diff)
                else:
                    raise ValidationError(f"Adjustment quantity for '{prod.name}' must be greater than zero.")

            if adjustment_type == AdjustmentType.OUT:
                if current_stock < qty_diff:
                    raise ValidationError(
                        f"Insufficient stock for '{prod.name}'. Current on-hand is {current_stock}, cannot adjust out {qty_diff}."
                    )
                diff_signed = -qty_diff
                actual_stock = current_stock - qty_diff
            else:
                diff_signed = qty_diff
                actual_stock = current_stock + qty_diff

            line_cost = qty_diff * wac
            total_qty += qty_diff
            total_cost += line_cost

            validated_items.append({
                "product": prod,
                "system_stock": current_stock,
                "actual_stock": actual_stock,
                "difference_quantity": diff_signed,
                "unit_cost": wac,
                "subtotal": line_cost,
            })

        # Create Adjustment Document
        adjustment = StockAdjustment.objects.create(
            adjustment_number=adj_number,
            date=adjustment_date,
            adjustment_type=adjustment_type,
            reason=reason,
            notes=notes,
            total_quantity=total_qty,
            total_cost_impact=total_cost,
            created_by=created_by,
        )

        movement_type = (
            MovementType.ADJUSTMENT_IN
            if adjustment_type == AdjustmentType.IN
            else MovementType.ADJUSTMENT_OUT
        )

        for v in validated_items:
            StockAdjustmentItem.objects.create(
                adjustment=adjustment,
                product=v["product"],
                system_stock=v["system_stock"],
                actual_stock=v["actual_stock"],
                difference_quantity=v["difference_quantity"],
                unit_cost=v["unit_cost"],
                subtotal=v["subtotal"],
            )

            # Create signed Stock Movement
            StockMovement.objects.create(
                product=v["product"],
                movement_type=movement_type,
                quantity=v["difference_quantity"],
                unit_cost=v["unit_cost"],
                balance_after=v["actual_stock"],
                reference_type="STOCK_ADJUSTMENT",
                reference_id=adjustment.adjustment_number,
                notes=f"{adjustment.get_reason_display()}: {notes or ''}".strip(),
                created_by=created_by,
            )

        # Generate Double-Entry Accounting
        inventory_acc = Account.objects.filter(code="1040").first() or Account.objects.get(code="1040")
        cogs_loss_acc = Account.objects.filter(code="5010").first() or Account.objects.get(code="5010")
        equity_acc = Account.objects.filter(code="3010").first() or Account.objects.get(code="3010")

        if total_cost > Decimal("0.00"):
            if adjustment_type == AdjustmentType.OUT:
                # Loss/Shrinkage: Debit Expense (5010 COGS/Loss), Credit Inventory (1040)
                lines = [
                    {
                        "account": cogs_loss_acc,
                        "debit": total_cost,
                        "credit": Decimal("0.00"),
                        "description": f"Stock Shrinkage/Loss ({adjustment.get_reason_display()}) - {adjustment.adjustment_number}",
                    },
                    {
                        "account": inventory_acc,
                        "debit": Decimal("0.00"),
                        "credit": total_cost,
                        "description": f"Inventory reduction for {adjustment.adjustment_number}",
                    },
                ]
            else:
                # Gain/Found: Debit Inventory (1040), Credit Equity/Gain (3010)
                lines = [
                    {
                        "account": inventory_acc,
                        "debit": total_cost,
                        "credit": Decimal("0.00"),
                        "description": f"Stock Addition ({adjustment.get_reason_display()}) - {adjustment.adjustment_number}",
                    },
                    {
                        "account": equity_acc,
                        "debit": Decimal("0.00"),
                        "credit": total_cost,
                        "description": f"Inventory adjustment gain for {adjustment.adjustment_number}",
                    },
                ]

            AccountingService.create_journal_entry(
                entry_date=adjustment.date,
                reference_type=ReferenceType.STOCK_ADJUSTMENT if hasattr(ReferenceType, "STOCK_ADJUSTMENT") else ReferenceType.JOURNAL,
                reference_id=adjustment.adjustment_number,
                lines=lines,
                narration=f"Stock Adjustment: {adjustment.adjustment_number} ({adjustment.get_reason_display()})",
                created_by=created_by,
            )

        return adjustment

    @classmethod
    def get_comprehensive_inventory_report(
        cls,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        product_id: Optional[int] = None,
        category_id: Optional[int] = None,
        movement_type: Optional[str] = None,
        stock_status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Single comprehensive Inventory Report supporting all audit filters.
        """
        p_qs = Product.objects.select_related("category", "unit").filter(is_active=True)
        if product_id:
            p_qs = p_qs.filter(id=product_id)
        if category_id:
            p_qs = p_qs.filter(category_id=category_id)

        rows = []
        tot_opening = Decimal("0.00")
        tot_purchased = Decimal("0.00")
        tot_purchase_returned = Decimal("0.00")
        tot_sold = Decimal("0.00")
        tot_sales_returned = Decimal("0.00")
        tot_adjusted_in = Decimal("0.00")
        tot_adjusted_out = Decimal("0.00")
        tot_closing = Decimal("0.00")
        tot_valuation = Decimal("0.00")

        for prod in p_qs:
            movements = StockMovement.objects.filter(product=prod)

            # Opening stock before start_date
            opening_stock = Decimal("0.00")
            if start_date:
                op_agg = movements.filter(created_at__date__lt=start_date).aggregate(t=models.Sum("quantity"))["t"]
                opening_stock = Decimal(str(op_agg or 0))

            period_movements = movements
            if start_date:
                period_movements = period_movements.filter(created_at__date__gte=start_date)
            if end_date:
                period_movements = period_movements.filter(created_at__date__lte=end_date)
            if movement_type:
                period_movements = period_movements.filter(movement_type=movement_type)

            purchased = Decimal("0.00")
            p_return = Decimal("0.00")
            sold = Decimal("0.00")
            s_return = Decimal("0.00")
            adj_in = Decimal("0.00")
            adj_out = Decimal("0.00")

            for m in period_movements:
                q = m.quantity
                if m.movement_type == MovementType.PURCHASE:
                    purchased += q
                elif m.movement_type == MovementType.PURCHASE_RETURN:
                    p_return += abs(q)
                elif m.movement_type == MovementType.SALE:
                    sold += abs(q)
                elif m.movement_type == MovementType.SALE_RETURN:
                    s_return += q
                elif m.movement_type in [MovementType.ADJUSTMENT_IN, MovementType.OPENING_STOCK]:
                    adj_in += q
                elif m.movement_type == MovementType.ADJUSTMENT_OUT:
                    adj_out += abs(q)

            closing_stock = opening_stock + purchased - p_return - sold + s_return + adj_in - adj_out
            wac = Decimal(str(StockMovement.get_weighted_average_cost(prod.id)))
            valuation = closing_stock * wac
            min_stock = Decimal(str(prod.min_stock_level or 0))

            if closing_stock <= Decimal("0.00"):
                status = "OUT_OF_STOCK"
            elif closing_stock <= min_stock:
                status = "LOW_STOCK"
            else:
                status = "IN_STOCK"

            if stock_status and status != stock_status:
                continue

            tot_opening += opening_stock
            tot_purchased += purchased
            tot_purchase_returned += p_return
            tot_sold += sold
            tot_sales_returned += s_return
            tot_adjusted_in += adj_in
            tot_adjusted_out += adj_out
            tot_closing += closing_stock
            tot_valuation += valuation

            rows.append({
                "product_id": prod.id,
                "product_name": prod.name,
                "sku": prod.sku,
                "category": prod.category.name if prod.category else "",
                "unit": prod.unit.short_code if prod.unit else "",
                "opening_stock": float(opening_stock),
                "purchased": float(purchased),
                "purchase_returned": float(p_return),
                "sold": float(sold),
                "sales_returned": float(s_return),
                "adjusted_in": float(adj_in),
                "adjusted_out": float(adj_out),
                "closing_stock": float(closing_stock),
                "stock_status": status,
                "unit_cost": float(wac),
                "valuation": float(valuation),
            })

        return {
            "summary": {
                "total_products": len(rows),
                "total_opening_stock": float(tot_opening),
                "total_purchased": float(tot_purchased),
                "total_purchase_returned": float(tot_purchase_returned),
                "total_sold": float(tot_sold),
                "total_sales_returned": float(tot_sales_returned),
                "total_adjusted_in": float(tot_adjusted_in),
                "total_adjusted_out": float(tot_adjusted_out),
                "total_closing_stock": float(tot_closing),
                "total_inventory_valuation": float(tot_valuation),
            },
            "rows": rows,
        }
