import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.core.services import DashboardService

print('Testing FIXED dashboard for all periods...')
for period in ['today', 'this_month', 'this_week', 'this_year']:
    d = DashboardService.get_executive_dashboard(period=period)
    ss = d['sales_summary']
    tb = d['today_benchmark']
    net = ss['net_sales']
    cnt = ss['orders_count']
    tod = tb['sales']
    ok = 'OK' if net == 2400.0 else 'STILL WRONG'
    print(f"  {period}: net_sales={net}, orders={cnt}, today={tod} => {ok}")
