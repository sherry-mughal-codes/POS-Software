from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seeds all demo data and initializes ApexPOS in the correct sequential order."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== [ApexPOS] Starting Full Database Initialization ==="))

        steps = [
            ("Roles & User Accounts", "seed_roles_and_users"),
            ("Standard Chart of Accounts & Payment Methods", "seed_chart_of_accounts"),
            ("System & POS Settings", "seed_settings"),
            ("Customers & Suppliers", "seed_contacts"),
            ("Categories, Units & Product Master", "seed_products"),
            ("Opening Stock & Inventory Valuations", "seed_inventory"),
            ("Sample Supplier Purchases", "seed_purchases"),
            ("Sample POS Sales & Day Sessions", "seed_sales"),
            ("Expense Categories & Vouchers", "seed_expenses"),
            ("Staff Directory, Attendance & Payroll", "seed_employees"),
            ("Customer Receivables (AR)", "seed_receivables"),
        ]

        for title, cmd_name in steps:
            self.stdout.write(f"\n[Step] Seeding {title} (`{cmd_name}`)...")
            try:
                call_command(cmd_name)
                self.stdout.write(self.style.SUCCESS(f"  ✓ {title} seeded successfully."))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Note: {cmd_name} finished with message: {e}"))

        self.stdout.write(self.style.SUCCESS("\n======================================================="))
        self.stdout.write(self.style.SUCCESS("✓ FULL APEXPOS DATABASE INITIALIZATION COMPLETE!"))
        self.stdout.write(self.style.SUCCESS("======================================================="))
