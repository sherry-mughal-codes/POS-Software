"""
Core Analytics and Executive Dashboard Services for ApexPOS.
Authoritative calculation of sales, profit, inventory valuation, cash position,
receivables, payables, trends, and cashier performance from transactional single sources of truth.
"""

from decimal import Decimal
from datetime import date, datetime, time, timedelta
from typing import Dict, Any, List, Optional, Tuple
from django.utils import timezone
from django.db import models
from django.db.models import Sum, Count, F, Q, DecimalField, Value
from django.db.models.functions import Coalesce, TruncDate
from django.contrib.auth import get_user_model

from apps.sales.models import Sale, SaleItem, SaleStatus, SalesReturn, PaymentMethodType, POSDaySession
from apps.products.models import Product
from apps.inventory.models import StockMovement
from apps.expenses.models import Expense, ExpenseStatus
from apps.accounting.models import Account, AccountType
from apps.contacts.models import Customer, Supplier
from apps.contacts.services import CustomerReceivableService
from apps.purchases.services import PurchaseService

User = get_user_model()


class DashboardService:
    """
    Centralized, read-only analytical intelligence engine.
    Calculates all metrics purely via database SQL aggregations on transaction tables.
    """

    @staticmethod
    def parse_date_range(
        period: Optional[str] = "this_month",
        start_date_str: Optional[str] = None,
        end_date_str: Optional[str] = None,
    ) -> Tuple[datetime, datetime, str]:
        """
        Normalizes any date preset or custom range into exact timezone-aware datetime boundaries:
        (start_datetime 00:00:00, end_datetime 23:59:59, label).
        """
        today = timezone.now().date()
        period = (period or "this_month").lower()

        if period == "today":
            start_d = today
            end_d = today
            label = f"Today ({today.strftime('%d-%b-%Y')})"
        elif period == "yesterday":
            start_d = today - timedelta(days=1)
            end_d = start_d
            label = f"Yesterday ({start_d.strftime('%d-%b-%Y')})"
        elif period == "this_week":
            # Rolling Last 7 Days (e.g. past 7 days up to and including today)
            start_d = today - timedelta(days=6)
            end_d = today
            label = f"Last 7 Days ({start_d.strftime('%d-%b')} – {end_d.strftime('%d-%b-%Y')})"
        elif period == "last_week":
            start_d = today - timedelta(days=today.weekday() + 7)
            end_d = start_d + timedelta(days=6)
            label = f"Last Week ({start_d.strftime('%d-%b')} – {end_d.strftime('%d-%b-%Y')})"
        elif period == "this_month":
            start_d = today.replace(day=1)
            end_d = today
            label = f"This Month ({start_d.strftime('%b %Y')})"
        elif period == "last_month":
            last_month_end = today.replace(day=1) - timedelta(days=1)
            start_d = last_month_end.replace(day=1)
            end_d = last_month_end
            label = f"Last Month ({start_d.strftime('%b %Y')})"
        elif period == "this_year":
            start_d = today.replace(month=1, day=1)
            end_d = today
            label = f"This Year ({today.year})"
        elif period == "custom" and start_date_str and end_date_str:
            try:
                start_d = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                end_d = datetime.strptime(end_date_str, "%Y-%m-%d").date()
                label = f"Custom ({start_d.strftime('%d-%b-%Y')} – {end_d.strftime('%d-%b-%Y')})"
            except ValueError:
                start_d = today.replace(day=1)
                end_d = today
                label = f"This Month ({start_d.strftime('%b %Y')})"
        else:
            start_d = today.replace(day=1)
            end_d = today
            label = f"This Month ({start_d.strftime('%b %Y')})"

        # Convert to full-day timezone-aware datetimes
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(datetime.combine(start_d, time.min), tz)
        end_dt = timezone.make_aware(datetime.combine(end_d, time.max), tz)

        return start_dt, end_dt, label

    @classmethod
    def get_executive_dashboard(
        cls,
        period: Optional[str] = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        cashier_id: Optional[int] = None,
        user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """
        Executes high-performance, single-pass executive analytics for the management dashboard.
        """
        start_dt, end_dt, period_label = cls.parse_date_range(period, start_date, end_date)
        start_d = start_dt.date()
        end_d = end_dt.date()

        # Role-based scoping: Cashier can only see their own sales
        is_admin_or_manager = True
        if user and hasattr(user, "roles"):
            role_names = [r.name.upper() for r in user.roles.all()] if hasattr(user.roles, "all") else []
            if "CASHIER" in role_names and "ADMIN" not in role_names and "MANAGER" not in role_names and not user.is_staff and not user.is_superuser:
                is_admin_or_manager = False
                cashier_id = user.id

        # -------------------------------------------------------------
        # 1. SALES & REVENUE AGGREGATION
        # -------------------------------------------------------------
        sales_base = Sale.objects.filter(status=SaleStatus.COMPLETED, created_at__range=(start_dt, end_dt))
        if cashier_id:
            sales_base = sales_base.filter(created_by_id=cashier_id)

        sales_agg = sales_base.aggregate(
            orders_count=Count("id"),
            gross_sales=Coalesce(Sum("subtotal"), Value(Decimal("0.00")), output_field=DecimalField()),
            discount_total=Coalesce(Sum("discount_amount"), Value(Decimal("0.00")), output_field=DecimalField()),
            tax_total=Coalesce(Sum("tax_amount"), Value(Decimal("0.00")), output_field=DecimalField()),
            grand_total=Coalesce(Sum("grand_total"), Value(Decimal("0.00")), output_field=DecimalField()),
            cash_collected=Coalesce(Sum("paid_amount"), Value(Decimal("0.00")), output_field=DecimalField()),
            credit_due=Coalesce(Sum("due_amount"), Value(Decimal("0.00")), output_field=DecimalField()),
        )

        orders_count = sales_agg["orders_count"] or 0
        gross_sales = sales_agg["gross_sales"] or Decimal("0.00")
        discounts = sales_agg["discount_total"] or Decimal("0.00")
        tax_total = sales_agg["tax_total"] or Decimal("0.00")
        billed_sales = sales_agg["grand_total"] or Decimal("0.00")

        # -------------------------------------------------------------
        # 2. SALES RETURNS AGGREGATION
        # -------------------------------------------------------------
        returns_base = SalesReturn.objects.filter(created_at__range=(start_dt, end_dt))
        if cashier_id:
            returns_base = returns_base.filter(created_by_id=cashier_id)

        returns_agg = returns_base.aggregate(
            returns_count=Count("id"),
            total_refunded=Coalesce(Sum("refund_amount"), Value(Decimal("0.00")), output_field=DecimalField()),
        )
        returns_count = returns_agg["returns_count"] or 0
        sales_returns = returns_agg["total_refunded"] or Decimal("0.00")

        # Net Sales = Billed Sales (Gross - Discounts + Tax) - Sales Returns
        net_sales = max(Decimal("0.00"), billed_sales - sales_returns)

        # -------------------------------------------------------------
        # 3. TODAY'S SALES BENCHMARK
        # -------------------------------------------------------------
        today_start = timezone.make_aware(datetime.combine(timezone.now().date(), time.min))
        today_end = timezone.make_aware(datetime.combine(timezone.now().date(), time.max))
        today_sales_qs = Sale.objects.filter(status=SaleStatus.COMPLETED, created_at__range=(today_start, today_end))
        if cashier_id:
            today_sales_qs = today_sales_qs.filter(created_by_id=cashier_id)
        today_sales_val = today_sales_qs.aggregate(
            t=Coalesce(Sum("grand_total"), Value(Decimal("0.00")), output_field=DecimalField())
        )["t"] or Decimal("0.00")

        today_orders_count = today_sales_qs.count()

        # -------------------------------------------------------------
        # 4. COGS & PROFIT ANALYSIS (Aligned with General Ledger)
        # -------------------------------------------------------------
        from apps.accounting.services import AccountingService
        from apps.sales.models import SalesReturnItem

        items_base = SaleItem.objects.filter(
            sale__status=SaleStatus.COMPLETED,
            sale__created_at__range=(start_dt, end_dt)
        )
        expenses_qs = Expense.objects.filter(
            status=ExpenseStatus.SUBMITTED,
            date__range=(start_d, end_d)
        )
        if cashier_id:
            items_base = items_base.filter(sale__created_by_id=cashier_id)
            expenses_qs = expenses_qs.filter(created_by_id=cashier_id)

        if not cashier_id:
            # Full Company GL Income Statement Alignment
            inc_res = AccountingService.get_income_statement(start_date=start_d, end_date=end_d)
            cogs_row = next((r for r in inc_res["expenses"]["rows"] if r.get("code") == "5010"), None)
            total_cogs = Decimal(str(cogs_row["amount"])) if cogs_row else Decimal("0.00")
            total_expenses = max(Decimal("0.00"), Decimal(str(inc_res["expenses"]["total"])) - total_cogs)
            gross_profit = net_sales - total_cogs
            gross_margin_pct = round((float(gross_profit) / float(net_sales) * 100), 2) if net_sales > Decimal("0.00") else 0.0
            net_profit = Decimal(str(inc_res["net_profit"]))
            net_margin_pct = round((float(net_profit) / float(net_sales) * 100), 2) if net_sales > Decimal("0.00") else 0.0
        else:
            # Cashier-specific subledger breakdown
            gross_cogs = items_base.aggregate(
                t=Coalesce(Sum(F("quantity") * F("unit_cost")), Value(Decimal("0.00")), output_field=DecimalField())
            )["t"] or Decimal("0.00")

            ret_items_base = SalesReturnItem.objects.filter(
                return_order__created_at__range=(start_dt, end_dt),
                return_order__created_by_id=cashier_id
            )
            returned_cogs = ret_items_base.aggregate(
                t=Coalesce(Sum(F("quantity") * F("unit_cost")), Value(Decimal("0.00")), output_field=DecimalField())
            )["t"] or Decimal("0.00")

            total_cogs = max(Decimal("0.00"), gross_cogs - returned_cogs)
            gross_profit = net_sales - total_cogs
            gross_margin_pct = round((float(gross_profit) / float(net_sales) * 100), 2) if net_sales > Decimal("0.00") else 0.0

            total_expenses = expenses_qs.aggregate(
                t=Coalesce(Sum("amount"), Value(Decimal("0.00")), output_field=DecimalField())
            )["t"] or Decimal("0.00")

            net_profit = gross_profit - total_expenses
            net_margin_pct = round((float(net_profit) / float(net_sales) * 100), 2) if net_sales > Decimal("0.00") else 0.0

        # -------------------------------------------------------------
        # 5. CASH & BANK LIQUIDITY POSITION (Chart of Accounts)
        # -------------------------------------------------------------
        cash_account = Account.objects.filter(code="1010").first()
        bank_account = Account.objects.filter(code="1020").first()
        cash_balance = cash_account.get_current_balance() if cash_account else Decimal("0.00")
        bank_balance = bank_account.get_current_balance() if bank_account else Decimal("0.00")
        total_liquid_cash = cash_balance + bank_balance

        # -------------------------------------------------------------
        # 6. CUSTOMER RECEIVABLES (AR) SUMMARY
        # -------------------------------------------------------------
        total_ar = Decimal("0.00")
        customers_with_balance = 0
        top_debtors = []

        customer_dues_map = {
            row["customer_id"]: row["total_due"]
            for row in Sale.objects.filter(status=SaleStatus.COMPLETED, due_amount__gt=0)
            .values("customer_id")
            .annotate(total_due=Coalesce(Sum("due_amount"), Value(Decimal("0.00")), output_field=DecimalField()))
        }

        all_customers = Customer.objects.filter(is_active=True, is_walkin=False).values("id", "customer_id", "name", "phone", "opening_balance")
        customer_balances = []
        for cust in all_customers:
            out_bal = (cust["opening_balance"] or Decimal("0.00")) + customer_dues_map.get(cust["id"], Decimal("0.00"))
            if out_bal > Decimal("0.00"):
                customers_with_balance += 1
                total_ar += out_bal
                customer_balances.append({
                    "id": cust["id"],
                    "customer_id": cust["customer_id"],
                    "name": cust["name"],
                    "phone": cust["phone"] or "",
                    "outstanding_balance": float(out_bal),
                })

        customer_balances.sort(key=lambda x: x["outstanding_balance"], reverse=True)
        top_debtors = customer_balances[:5]

        # -------------------------------------------------------------
        # 7. SUPPLIER PAYABLES (AP) SUMMARY
        # -------------------------------------------------------------
        total_ap = Decimal("0.00")
        suppliers_with_balance = 0
        top_creditors = []

        from apps.purchases.models import Purchase, PurchaseStatus, PurchaseReturn, RefundMethod, SupplierPayment, SupplierPaymentStatus

        purchases_by_supp = {
            row["supplier_id"]: (row["total_purchased"] or Decimal("0.00"), row["total_upfront"] or Decimal("0.00"))
            for row in Purchase.objects.filter(status=PurchaseStatus.SUBMITTED)
            .values("supplier_id")
            .annotate(
                total_purchased=Coalesce(Sum("grand_total"), Value(Decimal("0.00")), output_field=DecimalField()),
                total_upfront=Coalesce(Sum("initial_paid_amount"), Value(Decimal("0.00")), output_field=DecimalField())
            )
        }
        returns_by_supp = {
            row["supplier_id"]: (row["total_ret"] or Decimal("0.00"))
            for row in PurchaseReturn.objects.filter(refund_method=RefundMethod.PAYABLE_DEDUCTION)
            .values("supplier_id")
            .annotate(total_ret=Coalesce(Sum("total_amount"), Value(Decimal("0.00")), output_field=DecimalField()))
        }
        payments_by_supp = {
            row["supplier_id"]: (row["total_pay"] or Decimal("0.00"))
            for row in SupplierPayment.objects.filter(status=SupplierPaymentStatus.SUBMITTED)
            .values("supplier_id")
            .annotate(total_pay=Coalesce(Sum("amount"), Value(Decimal("0.00")), output_field=DecimalField()))
        }

        all_suppliers = Supplier.objects.filter(is_active=True).values("id", "supplier_id", "name", "company_name", "phone", "opening_balance")
        supplier_balances = []
        for supp in all_suppliers:
            s_id = supp["id"]
            p_grand, p_upfront = purchases_by_supp.get(s_id, (Decimal("0.00"), Decimal("0.00")))
            s_open = supp["opening_balance"] or Decimal("0.00")
            ret_ded = returns_by_supp.get(s_id, Decimal("0.00"))
            supp_pays = payments_by_supp.get(s_id, Decimal("0.00"))

            out_ap = max(Decimal("0.00"), (s_open + p_grand) - p_upfront - ret_ded - supp_pays)
            if out_ap > Decimal("0.00"):
                suppliers_with_balance += 1
                total_ap += out_ap
                supplier_balances.append({
                    "id": s_id,
                    "supplier_id": supp["supplier_id"],
                    "name": supp["name"],
                    "company_name": supp["company_name"] or supp["name"],
                    "phone": supp["phone"] or "",
                    "outstanding_payable": float(out_ap),
                })

        supplier_balances.sort(key=lambda x: x["outstanding_payable"], reverse=True)
        top_creditors = supplier_balances[:5]

        # -------------------------------------------------------------
        # 8. INVENTORY HEALTH & VALUATION
        # -------------------------------------------------------------
        products_qs = Product.objects.filter(is_active=True).select_related("category")
        total_products_count = products_qs.count()

        # Single bulk query for all product stock quantities
        stock_map = {
            row["product_id"]: row["total_qty"]
            for row in StockMovement.objects.values("product_id")
            .annotate(total_qty=Coalesce(Sum("quantity"), Value(Decimal("0.00")), output_field=DecimalField()))
        }

        in_stock_count = 0
        low_stock_count = 0
        out_of_stock_count = 0
        total_inventory_valuation = Decimal("0.00")
        low_stock_items = []

        for p in products_qs:
            stock = stock_map.get(p.id, Decimal("0.00"))
            val = stock * p.purchase_price
            total_inventory_valuation += max(Decimal("0.00"), val)

            min_threshold = float(p.min_stock_level) if p.min_stock_level else 10.0

            if stock <= 0:
                out_of_stock_count += 1
                low_stock_items.append({
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "category": p.category.name if p.category else "",
                    "current_stock": float(stock),
                    "min_stock": min_threshold,
                    "purchase_price": float(p.purchase_price),
                    "status": "OUT_OF_STOCK",
                })
            elif stock <= Decimal(str(min_threshold)):
                low_stock_count += 1
                low_stock_items.append({
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "category": p.category.name if p.category else "",
                    "current_stock": float(stock),
                    "min_stock": min_threshold,
                    "purchase_price": float(p.purchase_price),
                    "status": "LOW_STOCK",
                })
            else:
                in_stock_count += 1

        low_stock_items.sort(key=lambda x: x["current_stock"])

        # -------------------------------------------------------------
        # 9. SALES TREND TIME SERIES (Daily or Monthly intervals)
        # -------------------------------------------------------------
        from django.db.models.functions import TruncMonth, TruncDate
        sales_trend = []
        days_diff = (end_d - start_d).days + 1

        if days_diff > 35:
            # Single query monthly aggregation
            m_sales = {
                row["m"].strftime("%Y-%m"): (row["gross"], row["orders"])
                for row in sales_base.annotate(m=TruncMonth("created_at"))
                .values("m")
                .annotate(
                    gross=Coalesce(Sum("grand_total"), Value(Decimal("0.00")), output_field=DecimalField()),
                    orders=Count("id")
                )
                if row.get("m")
            }
            m_returns = {
                row["m"].strftime("%Y-%m"): row["refund"]
                for row in returns_base.annotate(m=TruncMonth("created_at"))
                .values("m")
                .annotate(
                    refund=Coalesce(Sum("refund_amount"), Value(Decimal("0.00")), output_field=DecimalField())
                )
                if row.get("m")
            }

            import calendar
            current_dt = start_d.replace(day=1)
            while current_dt <= end_d:
                year = current_dt.year
                month = current_dt.month
                key = current_dt.strftime("%Y-%m")

                gross_val, orders_val = m_sales.get(key, (Decimal("0.00"), 0))
                ret_val = m_returns.get(key, Decimal("0.00"))
                net_val = max(Decimal("0.00"), gross_val - ret_val)

                sales_trend.append({
                    "date": key,
                    "label": current_dt.strftime("%b %Y") if (end_d.year != start_d.year) else current_dt.strftime("%b"),
                    "orders_count": orders_val,
                    "gross_sales": float(gross_val),
                    "returns": float(ret_val),
                    "net_sales": float(net_val),
                })

                if month == 12:
                    current_dt = date(year + 1, 1, 1)
                else:
                    current_dt = date(year, month + 1, 1)
        else:
            # Single query daily aggregation
            d_sales = {
                row["d"].strftime("%Y-%m-%d"): (row["gross"], row["orders"])
                for row in sales_base.annotate(d=TruncDate("created_at"))
                .values("d")
                .annotate(
                    gross=Coalesce(Sum("grand_total"), Value(Decimal("0.00")), output_field=DecimalField()),
                    orders=Count("id")
                )
                if row.get("d")
            }
            d_returns = {
                row["d"].strftime("%Y-%m-%d"): row["refund"]
                for row in returns_base.annotate(d=TruncDate("created_at"))
                .values("d")
                .annotate(
                    refund=Coalesce(Sum("refund_amount"), Value(Decimal("0.00")), output_field=DecimalField())
                )
                if row.get("d")
            }

            for i in range(days_diff):
                cur_date = start_d + timedelta(days=i)
                key = cur_date.strftime("%Y-%m-%d")

                gross_val, orders_val = d_sales.get(key, (Decimal("0.00"), 0))
                ret_val = d_returns.get(key, Decimal("0.00"))
                net_val = max(Decimal("0.00"), gross_val - ret_val)

                sales_trend.append({
                    "date": key,
                    "label": cur_date.strftime("%d %b"),
                    "orders_count": orders_val,
                    "gross_sales": float(gross_val),
                    "returns": float(ret_val),
                    "net_sales": float(net_val),
                })

        # -------------------------------------------------------------
        # 10. TOP PRODUCTS (By Quantity and By Revenue)
        # -------------------------------------------------------------
        top_items_qs = items_base.values(
            "product_id", "product__name", "product__sku", "product__category__name"
        ).annotate(
            qty_sold=Coalesce(Sum("quantity"), Value(Decimal("0.00")), output_field=DecimalField()),
            total_revenue=Coalesce(Sum("subtotal"), Value(Decimal("0.00")), output_field=DecimalField()),
            total_cost=Coalesce(Sum(F("quantity") * F("unit_cost")), Value(Decimal("0.00")), output_field=DecimalField()),
        )

        top_by_qty = sorted(
            [
                {
                    "product_id": item["product_id"],
                    "sku": item["product__sku"],
                    "name": item["product__name"],
                    "category": item["product__category__name"] or "",
                    "quantity_sold": float(item["qty_sold"]),
                    "revenue": float(item["total_revenue"]),
                    "profit": float(item["total_revenue"] - item["total_cost"]),
                }
                for item in top_items_qs
            ],
            key=lambda x: x["quantity_sold"],
            reverse=True,
        )[:10]

        top_by_revenue = sorted(top_by_qty, key=lambda x: x["revenue"], reverse=True)[:10]

        # -------------------------------------------------------------
        # 11. PAYMENT METHODS BREAKDOWN
        # -------------------------------------------------------------
        # Break down by CASH, CARD, CREDIT, SPLIT
        pay_distribution = []
        pay_methods = [
            (PaymentMethodType.CASH, "Cash"),
            (PaymentMethodType.CARD, "Card / POS Terminal"),
            (PaymentMethodType.CREDIT, "Customer Credit / AR"),
            (PaymentMethodType.SPLIT, "Split / Multi-Payment"),
        ]

        total_breakdown_amount = Decimal("0.00")
        method_buckets = {}
        for code, label in pay_methods:
            m_sum = sales_base.filter(payment_method=code).aggregate(
                t=Coalesce(Sum("grand_total"), Value(Decimal("0.00")), output_field=DecimalField())
            )["t"] or Decimal("0.00")
            method_buckets[code] = {"label": label, "amount": m_sum}
            total_breakdown_amount += m_sum

        for code, data in method_buckets.items():
            pct = round((float(data["amount"]) / float(total_breakdown_amount) * 100), 1) if total_breakdown_amount > Decimal("0.00") else 0.0
            pay_distribution.append({
                "method_code": code,
                "method_name": data["label"],
                "amount": float(data["amount"]),
                "percentage": pct,
            })

        # -------------------------------------------------------------
        # 12. CASHIER PERFORMANCE MATRIX
        # -------------------------------------------------------------
        cashier_stats = []
        if is_admin_or_manager:
            cashiers_qs = User.objects.filter(is_active=True).filter(
                Q(sales_recorded__isnull=False) | Q(is_staff=True)
            ).distinct()

            for c in cashiers_qs:
                c_sales = Sale.objects.filter(
                    created_by=c,
                    status=SaleStatus.COMPLETED,
                    created_at__range=(start_dt, end_dt)
                )
                c_count = c_sales.count()
                if c_count == 0:
                    continue

                c_gross = c_sales.aggregate(
                    t=Coalesce(Sum("grand_total"), Value(Decimal("0.00")), output_field=DecimalField())
                )["t"] or Decimal("0.00")

                c_rets = SalesReturn.objects.filter(
                    created_by=c,
                    created_at__range=(start_dt, end_dt)
                ).aggregate(
                    t=Coalesce(Sum("refund_amount"), Value(Decimal("0.00")), output_field=DecimalField())
                )["t"] or Decimal("0.00")

                c_net = max(Decimal("0.00"), c_gross - c_rets)
                avg_ticket = round(float(c_net) / c_count, 2) if c_count > 0 else 0.0

                cashier_stats.append({
                    "cashier_id": c.id,
                    "cashier_name": c.get_full_name() or c.username,
                    "username": c.username,
                    "orders_count": c_count,
                    "gross_sales": float(c_gross),
                    "returns": float(c_rets),
                    "net_sales": float(c_net),
                    "avg_ticket": avg_ticket,
                })

            cashier_stats.sort(key=lambda x: x["net_sales"], reverse=True)

        # -------------------------------------------------------------
        # 13. EXPENSE BY CATEGORY BREAKDOWN
        # -------------------------------------------------------------
        expenses_by_cat = []
        cat_agg = expenses_qs.values("expense_account__name").annotate(
            total=Coalesce(Sum("amount"), Value(Decimal("0.00")), output_field=DecimalField()),
            cnt=Count("id")
        ).order_by("-total")

        for cat in cat_agg:
            amt = cat["total"]
            pct = round((float(amt) / float(total_expenses) * 100), 1) if total_expenses > Decimal("0.00") else 0.0
            expenses_by_cat.append({
                "category_name": cat["expense_account__name"] or "General / Uncategorized",
                "amount": float(amt),
                "count": cat["cnt"],
                "percentage": pct,
            })

        # -------------------------------------------------------------
        # 14. ACTIVE POS SESSION SNAPSHOT
        # -------------------------------------------------------------
        active_pos_session = POSDaySession.objects.filter(status="OPEN").first()
        active_session_data = None
        if active_pos_session:
            active_session_data = {
                "id": active_pos_session.id,
                "session_number": active_pos_session.session_number,
                "opened_at": active_pos_session.opened_at.isoformat() if active_pos_session.opened_at else None,
                "opened_by": active_pos_session.opened_by.username,
                "opening_cash": float(active_pos_session.opening_cash),
            }

        return {
            "period": period,
            "period_label": period_label,
            "start_date": start_d.strftime("%Y-%m-%d"),
            "end_date": end_d.strftime("%Y-%m-%d"),
            "is_restricted_view": not is_admin_or_manager,
            "today_benchmark": {
                "sales": float(today_sales_val),
                "orders_count": today_orders_count,
            },
            "sales_summary": {
                "orders_count": orders_count,
                "gross_sales": float(gross_sales),
                "discounts": float(discounts),
                "tax": float(tax_total),
                "sales_returns": float(sales_returns),
                "returns_count": returns_count,
                "net_sales": float(net_sales),
                "avg_order_value": round(float(net_sales) / orders_count, 2) if orders_count > 0 else 0.0,
            },
            "profit_overview": {
                "net_sales": float(net_sales),
                "cogs": float(total_cogs),
                "gross_profit": float(gross_profit),
                "gross_margin_percentage": gross_margin_pct,
                "operating_expenses": float(total_expenses),
                "net_profit": float(net_profit),
                "net_margin_percentage": net_margin_pct,
            },
            "cash_position": {
                "cash_in_hand": float(cash_balance),
                "bank_balance": float(bank_balance),
                "total_liquid_cash": float(total_liquid_cash),
            },
            "receivables_summary": {
                "total_receivables": float(total_ar),
                "customers_count": customers_with_balance,
                "top_debtors": top_debtors,
            },
            "payables_summary": {
                "total_payables": float(total_ap),
                "suppliers_count": suppliers_with_balance,
                "top_creditors": top_creditors,
            },
            "inventory_health": {
                "total_skus": total_products_count,
                "in_stock_count": in_stock_count,
                "low_stock_count": low_stock_count,
                "out_of_stock_count": out_of_stock_count,
                "total_inventory_valuation": float(total_inventory_valuation),
                "low_stock_alerts": low_stock_items[:10],
            },
            "sales_trend": sales_trend,
            "top_products_by_quantity": top_by_qty,
            "top_products_by_revenue": top_by_revenue,
            "payment_distribution": pay_distribution,
            "cashier_performance": cashier_stats,
            "expense_categories": expenses_by_cat,
            "active_pos_session": active_session_data,
        }
