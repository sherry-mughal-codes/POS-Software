import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.contacts.services import CustomerReceivableService
import json

rep = CustomerReceivableService.get_receivables_report()
print("RECEIVABLES REPORT SUMMARY:")
print(json.dumps(rep['summary'], indent=2))
print("\nROWS:")
for r in rep['rows']:
    if r['total_credit_sales'] > 0 or r['total_payments'] > 0:
        print(r)
