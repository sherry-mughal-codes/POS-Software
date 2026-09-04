import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.sales.models import Sale, SalesReturn, SaleStatus
from apps.core.services import DashboardService
from apps.sales.services import SalesService, DaySessionService
from django.utils import timezone
from decimal import Decimal

print("=" * 70)
print("DEEP SALES DISCREPANCY AUDIT")
print(f"Run at: {timezone.now()}")
print("=" * 70)

# -----------------------------------------------------------------------
# 1. RAW DB — What actually exists
# -----------------------------------------------------------------------
print("\n[A] RAW DATABASE — All Sales (any status)")
all_sales = Sale.objects.order_by('date', 'invoice_number')
print(f"   Total sales (ALL statuses): {all_sales.count()}")
for s in all_sales:
    print(f"   {s.invoice_number}  status={s.status}  date={s.date}  method={s.payment_method}  grand={s.grand_total}  created_at={s.created_at.isoformat()}")

completed = all_sales.filter(status=SaleStatus.COMPLETED)
print(f"\n   COMPLETED only: {completed.count()}")
from django.db.models import Sum
comp_agg = completed.aggregate(s=Sum('grand_total'))
print(f"   Sum of grand_total (COMPLETED): {comp_agg['s']}")

# -----------------------------------------------------------------------
# 2. DASHBOARD SERVICE — What it returns for each period
# -----------------------------------------------------------------------
print("\n[B] DASHBOARD SERVICE — Figures by Period")
for period in ['today', 'this_month', 'this_week', 'this_year']:
    try:
        d = DashboardService.get_executive_dashboard(period=period)
        ss = d['sales_summary']
        tb = d['today_benchmark']
        print(f"   Period={period:12s} | gross_sales={ss['gross_sales']:>10.2f} | net_sales={ss['net_sales']:>10.2f} | orders={ss['orders_count']} | today_sales={tb['sales']:>10.2f}")
    except Exception as e:
        print(f"   Period={period}: ERROR - {e}")

# -----------------------------------------------------------------------
# 3. SALES REPORT SERVICE — What get_sales_report returns
# -----------------------------------------------------------------------
print("\n[C] SALES REPORT SERVICE (Reports Center) — No filters applied")
try:
    report = SalesService.get_sales_report()
    sm = report['summary']
    print(f"   Total invoices:   {sm['total_invoices']}")
    print(f"   gross_sales:      {sm['gross_sales']:.2f}   (sum of subtotals)")
    print(f"   net_sales:        {sm['net_sales']:.2f}   (sum of grand_total - returns)")
    print(f"   total_returns:    {sm['total_returns']:.2f}")
    print(f"   cash_sales:       {sm['cash_sales']:.2f}")
    print(f"   card_sales:       {sm['card_sales']:.2f}")
    print(f"   credit_sales:     {sm['credit_sales']:.2f}")
    print(f"   SUM cash+card+credit: {sm['cash_sales'] + sm['card_sales'] + sm['credit_sales']:.2f}")
except Exception as e:
    print(f"   ERROR: {e}")

# -----------------------------------------------------------------------
# 4. REPORTS CENTER — With status=COMPLETED filter only
# -----------------------------------------------------------------------
print("\n[D] SALES REPORT SERVICE — COMPLETED status only")
try:
    report = SalesService.get_sales_report(status='COMPLETED')
    sm = report['summary']
    print(f"   Total invoices:   {sm['total_invoices']}")
    print(f"   gross_sales:      {sm['gross_sales']:.2f}")
    print(f"   net_sales:        {sm['net_sales']:.2f}")
except Exception as e:
    print(f"   ERROR: {e}")

# -----------------------------------------------------------------------
# 5. X-REPORT (active session snapshot)
# -----------------------------------------------------------------------
print("\n[E] X-REPORT (Active Session Snapshot)")
try:
    xr = DaySessionService.get_x_report()
    s = xr['sales']
    print(f"   invoices_count:   {s['invoices_count']}")
    print(f"   gross_sales:      {s['gross_sales']:.2f}  (sum of subtotals in session)")
    print(f"   net_sales:        {s['net_sales']:.2f}  (total_invoiced - returns)")
    print(f"   cash_sales:       {s['cash_sales']:.2f}  (after refunds deducted)")
    print(f"   card_sales:       {s['card_sales']:.2f}  (after refunds deducted)")
    print(f"   credit_sales:     {s['credit_sales']:.2f}")
    total_breakdown = s['cash_sales'] + s['card_sales'] + s['credit_sales']
    print(f"   SUM cash+card+credit: {total_breakdown:.2f}")
    print(f"\n   ** Z-report 'total sales' KPI = net_sales = {s['net_sales']:.2f} **")
except Exception as e:
    print(f"   ERROR: {e}")

# -----------------------------------------------------------------------
# 6. KEY FINDING
# -----------------------------------------------------------------------
print("\n" + "=" * 70)
print("ANALYSIS — Why do the numbers differ?")
print("=" * 70)
print("""
  Dashboard/Reports Center 'Net Sales' = Sum(grand_total) - Sum(refund_amount)
     filtered by: created_at__range (date/time range for selected PERIOD)
     default period = 'this_month'

  X/Z Report 'Net Sales' = Sum(grand_total) - Sum(refund_amount)
     filtered by: created_at >= session.opened_at (session start time)

  If the numbers differ, the ONLY possible causes are:
    1. Some sales were created BEFORE the session was opened
    2. Some sales fall outside the dashboard period (date filter)
    3. Different status filters (dashboard: COMPLETED; session: COMPLETED)
    4. Timezone offset causing date boundary mismatches
""")

# Show session opened_at vs sales created_at
print("[F] SESSION TIMING vs SALES TIMESTAMPS")
from apps.sales.models import POSDaySession
for sess in POSDaySession.objects.all():
    print(f"\n   Session {sess.session_number}: opened_at={sess.opened_at}")
    sales_in = Sale.objects.filter(status=SaleStatus.COMPLETED, created_at__gte=sess.opened_at)
    sales_before = Sale.objects.filter(status=SaleStatus.COMPLETED, created_at__lt=sess.opened_at)
    print(f"   Sales AFTER session open:  {sales_in.count()} invoices")
    print(f"   Sales BEFORE session open: {sales_before.count()} invoices")
    if sales_before.exists():
        print("   *** INVOICES BEFORE SESSION OPEN (not in X/Z report!) ***")
        for s in sales_before:
            print(f"       {s.invoice_number} created_at={s.created_at} grand={s.grand_total}")
