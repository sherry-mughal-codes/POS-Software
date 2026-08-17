from django.core.management.base import BaseCommand
from apps.core.models import SystemSetting


class Command(BaseCommand):
    help = "Seeds standard enterprise settings for ApexPOS."

    def handle(self, *args, **options):
        default_settings = [
            ("company_name", "ApexPOS Enterprise Store", "GENERAL", "Official store / business name"),
            ("company_logo", "", "GENERAL", "Store logo image URL or base64 data"),
            ("company_phone", "+92 42 111 2653", "GENERAL", "Primary business contact phone"),
            ("company_email", "support@apexpos.com", "GENERAL", "Official store email address"),
            ("company_address", "Main Boulevard, Gulberg III, Lahore, Pakistan", "GENERAL", "Physical branch address"),
            ("tax_id", "NTN-0891234-7", "GENERAL", "National Tax Number (NTN) / STRN"),
            ("currency_symbol", "Rs.", "GENERAL", "Display currency prefix"),
            ("currency_code", "PKR", "GENERAL", "ISO currency code"),
            ("tax_rate_percent", "0.00", "POS", "Default sales tax rate percentage"),
            ("invoice_prefix", "INV-", "POS", "Prefix for generated sales receipts"),
            ("receipt_header", "ApexPOS Retail - Premier Supermarket", "POS", "Header note printed on POS receipts"),
            ("receipt_footer", "Thank you for shopping with us! No return without receipt.", "POS", "Footer message printed on POS receipts"),
            ("auto_print_receipt", "true", "POS", "Automatically launch print dialog on checkout"),
            ("low_stock_default_threshold", "10", "INVENTORY", "Default low stock alert threshold level"),
            ("default_cash_account", "1010", "ACCOUNTING", "Default GL Cash in Hand Account"),
            ("default_bank_account", "1020", "ACCOUNTING", "Default GL Bank Account"),
            ("default_sales_account", "4010", "ACCOUNTING", "Default GL Sales Revenue Account"),
            ("default_inventory_account", "1040", "ACCOUNTING", "Default GL Inventory Asset Account"),
            ("default_cogs_account", "5010", "ACCOUNTING", "Default GL Cost of Goods Sold Account"),
            ("default_ap_account", "2010", "ACCOUNTING", "Default GL Accounts Payable Account"),
            ("default_ar_account", "1030", "ACCOUNTING", "Default GL Accounts Receivable Account"),
        ]

        for key, val, grp, desc in default_settings:
            SystemSetting.set_setting(key=key, value=val, group=grp, description=desc)

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(default_settings)} standard system settings."))
