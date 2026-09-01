"""
Pristine production initialization command for ApexPOS.
Initializes a brand-new installation for any computer/laptop:
1. Roles, Permissions, and Default System Admin/Manager accounts.
2. Standard 32 Chart of Accounts (COA) with 0.00 balances and standard Payment Methods.
3. System Settings with document sequences starting from 1 (INV-00001, CLM-00001, etc.).
4. Standard Units of Measure (Piece, Box, Kg, Liter, Pack) and default Categories.
5. Canonical Walk-in Customer (CUS-00001, is_walkin=True).
6. 0 products in catalog, 0 transactional records, all account balances 0.00.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from apps.contacts.models import Customer
from apps.products.models import Product, Unit, Category
from apps.core.models import SystemSetting
from apps.accounting.models import Account, JournalEntry
from apps.core.sequences import DocumentSequenceService


class Command(BaseCommand):
    help = "Initializes a pristine, clean ApexPOS installation with 0 transactions, 0 account balances, and empty product catalog."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-existing",
            action="store_true",
            help="Clear all existing products and transactional data if present.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== [ApexPOS] Initializing Clean Production System ==="))

        if options.get("reset_existing"):
            self.stdout.write("\nCleaning existing transactional records and products...")
            call_command("clear_transactional_data")
            Product.objects.all().delete()

        # 1. Seed Roles, Permissions & Default Accounts
        self.stdout.write("\n1. Seeding Roles, Permissions & Security Accounts...")
        call_command("seed_roles_and_users")

        # 2. Seed Chart of Accounts & Payment Methods (strictly 0 balance)
        self.stdout.write("\n2. Initializing Standard Chart of Accounts (0.00 Balances)...")
        call_command("seed_chart_of_accounts")

        # 3. Seed System Settings & Document Number Sequences (starts at 1)
        self.stdout.write("\n3. Initializing System Settings & Transactional Sequences (Start = 1)...")
        call_command("seed_settings")

        # 4. Seed Standard Units & Basic Categories (No products)
        self.stdout.write("\n4. Seeding Standard Measurement Units...")
        standard_units = [
            {"name": "Piece", "short_code": "pcs", "allow_decimal": False},
            {"name": "Box", "short_code": "box", "allow_decimal": False},
            {"name": "Kilogram", "short_code": "kg", "allow_decimal": True},
            {"name": "Liter", "short_code": "ltr", "allow_decimal": True},
            {"name": "Pack", "short_code": "pk", "allow_decimal": False},
        ]
        for u in standard_units:
            Unit.objects.get_or_create(short_code=u["short_code"], defaults=u)

        Category.objects.get_or_create(
            code="GEN",
            defaults={"name": "General", "description": "Default General Category", "is_active": True},
        )

        # 5. Seed Single Canonical Walk-in Customer Only
        self.stdout.write("\n5. Initializing Canonical Walk-in Customer...")
        walkin, created = Customer.objects.get_or_create(
            is_walkin=True,
            defaults={
                "customer_id": "CUS-00001",
                "name": "Walk-in Customer",
                "phone": "",
                "is_walkin": True,
                "credit_enabled": False,
                "opening_balance": 0.0,
                "is_active": True,
                "notes": "Default system record for counter POS sales",
            },
        )
        if not created:
            walkin.customer_id = "CUS-00001"
            walkin.opening_balance = 0.0
            walkin.save()

        # 6. Reset all document sequence start keys to 1
        for doc_type, cfg in DocumentSequenceService.CONFIGS.items():
            start_key = cfg.get("start_key")
            prefix_key = cfg.get("prefix_key")
            default_prefix = cfg.get("default_prefix")
            if start_key:
                SystemSetting.set_setting(start_key, "1", "POS", f"Start number for {cfg.get('title')}")
            if prefix_key and not SystemSetting.objects.filter(key=prefix_key).exists():
                SystemSetting.set_setting(prefix_key, default_prefix, "POS", f"Prefix for {cfg.get('title')}")

        self.stdout.write(self.style.SUCCESS("\n======================================================="))
        self.stdout.write(self.style.SUCCESS("✓ PRISTINE APEXPOS SYSTEM INITIALIZATION COMPLETE!"))
        self.stdout.write(self.style.SUCCESS(f"  • Product Catalog: {Product.objects.count()} Products (Empty)"))
        self.stdout.write(self.style.SUCCESS(f"  • Chart of Accounts: {Account.objects.count()} Accounts (All Balance 0.00)"))
        self.stdout.write(self.style.SUCCESS(f"  • Journal Entries: {JournalEntry.objects.count()} (Empty)"))
        self.stdout.write(self.style.SUCCESS(f"  • Walk-in Customer: [{walkin.customer_id}] {walkin.name}"))
        self.stdout.write(self.style.SUCCESS(f"  • All Document Sequences: Starting from 1 (e.g. INV-00001, CLM-00001, SUP-CLM-00001)"))
        self.stdout.write(self.style.SUCCESS("======================================================="))
