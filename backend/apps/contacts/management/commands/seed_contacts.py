"""
Django management command to seed Walk-in Customer, registered demo customers, and FMCG suppliers.
"""

from django.core.management.base import BaseCommand
from apps.contacts.models import Customer, Supplier


class Command(BaseCommand):
    help = "Seeds Walk-in Customer, registered customers, and supplier master records."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Seeding Customers & Suppliers Master Data ==="))

        # 1. Seed Single Canonical Walk-in Customer
        walkin, created = Customer.objects.get_or_create(
            is_walkin=True,
            defaults={
                "customer_id": "CUS-000001",
                "name": "Walk-in Customer",
                "is_walkin": True,
                "credit_enabled": False,
                "is_active": True,
                "notes": "Default system record for anonymous counter POS transactions (Credit Disabled)",
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"  + Seeded Walk-in Customer: [{walkin.customer_id}] {walkin.name}"))
        else:
            self.stdout.write(f"  ✓ Walk-in Customer verified: [{walkin.customer_id}] {walkin.name}")

        # 2. Seed Registered Customers
        customers_data = [
            {
                "customer_id": "CUS-000002",
                "name": "Ali Traders (Wholesale & Retail)",
                "phone": "+92 300 1234567",
                "email": "ali.traders@example.com",
                "address": "Shop #14, Main Commercial Market, Lahore",
                "credit_enabled": True,
                "notes": "Trusted regular business customer. Credit sales permitted.",
            },
            {
                "customer_id": "CUS-000003",
                "name": "Ahmed Khan",
                "phone": "+92 321 9876543",
                "email": "ahmed.khan@gmail.com",
                "address": "House #45-B, Model Town, Lahore",
                "credit_enabled": True,
                "notes": "Regular residential account.",
            },
            {
                "customer_id": "CUS-000004",
                "name": "Fatima Superstore",
                "phone": "+92 333 4567890",
                "email": "fatima.superstore@hotmail.com",
                "address": "Plaza 8, Sector C, Bahria Town",
                "credit_enabled": True,
                "notes": "Commercial buyer.",
            },
            {
                "customer_id": "CUS-000005",
                "name": "Bilal General Store",
                "phone": "+92 345 6789012",
                "email": "bilal.store@yahoo.com",
                "address": "Circular Road, Rawalpindi",
                "credit_enabled": False,
                "notes": "Cash-only customer.",
            },
        ]

        for c_data in customers_data:
            cust, c_created = Customer.objects.get_or_create(
                customer_id=c_data["customer_id"],
                defaults={
                    "name": c_data["name"],
                    "phone": c_data["phone"],
                    "email": c_data["email"],
                    "address": c_data["address"],
                    "credit_enabled": c_data["credit_enabled"],
                    "is_walkin": False,
                    "is_active": True,
                    "notes": c_data["notes"],
                },
            )
            if c_created:
                self.stdout.write(f"  + Customer: [{cust.customer_id}] {cust.name} (Credit: {'Yes' if cust.credit_enabled else 'No'})")

        self.stdout.write(self.style.SUCCESS(f"✓ Customers initialized ({Customer.objects.count()} total)."))

        # 3. Seed Suppliers
        suppliers_data = [
            {
                "supplier_id": "SUP-000001",
                "name": "Tariq Mahmood (Key Account Manager)",
                "company_name": "Coca-Cola Beverages Pakistan Ltd",
                "phone": "+92 42 111 2653",
                "email": "orders@ccbpl.com.pk",
                "address": "Plot 12, Industrial Area, Gulberg III, Lahore",
                "tax_id": "NTN-0891234-7",
                "notes": "Authorized distributor for Coca-Cola, Sprite, Fanta, Kinley.",
            },
            {
                "supplier_id": "SUP-000002",
                "name": "Kamran Siddiqui",
                "company_name": "PepsiCo Pakistan & Beverage Distributors",
                "phone": "+92 42 3588 4000",
                "email": "supply@pepsidist.com.pk",
                "address": "Commercial Hub, Multan Road, Lahore",
                "tax_id": "NTN-1428901-2",
                "notes": "Authorized distributor for Pepsi, 7Up, Mirinda, Aquafina, Lay's.",
            },
            {
                "supplier_id": "SUP-000003",
                "name": "Haji Abdul Rehman",
                "company_name": "Al-Madina Wholesalers & Grain Merchants",
                "phone": "+92 300 8456123",
                "email": "almadina.wholesalers@gmail.com",
                "address": "Grain Market, Akbari Mandi, Lahore",
                "tax_id": "NTN-3049182-4",
                "notes": "Bulk supplier for Basmati Rice, Flour, Pulses and Grains.",
            },
            {
                "supplier_id": "SUP-000004",
                "name": "Rashid Mehmood",
                "company_name": "Engro Foods Limited (FrieslandCampina)",
                "phone": "+92 21 111 211 211",
                "email": "dist.orders@engrofoods.com",
                "address": "5th Floor, The Harbor Front, Karachi",
                "tax_id": "NTN-2541987-9",
                "notes": "Dairy supplier for Olper's Milk, Tarang, Dairy Omung.",
            },
            {
                "supplier_id": "SUP-000005",
                "name": "Zubair Hashmi",
                "company_name": "Unilever Pakistan Consumer Goods",
                "phone": "+92 21 3568 1001",
                "email": "direct.sales@unilever.com",
                "address": "Avari Plaza, Fatima Jinnah Road, Karachi",
                "tax_id": "NTN-0711902-1",
                "notes": "FMCG supplier for Lifebuoy, Surf Excel, Lipton, Sunsilk.",
            },
        ]

        for s_data in suppliers_data:
            supp, s_created = Supplier.objects.get_or_create(
                supplier_id=s_data["supplier_id"],
                defaults={
                    "name": s_data["name"],
                    "company_name": s_data["company_name"],
                    "phone": s_data["phone"],
                    "email": s_data["email"],
                    "address": s_data["address"],
                    "tax_id": s_data["tax_id"],
                    "is_active": True,
                    "notes": s_data["notes"],
                },
            )
            if s_created:
                self.stdout.write(f"  + Supplier: [{supp.supplier_id}] {supp.company_name} ({supp.name})")

        self.stdout.write(self.style.SUCCESS(f"✓ Suppliers initialized ({Supplier.objects.count()} total)."))
        self.stdout.write(self.style.SUCCESS("=== Customers & Suppliers Setup Completed Successfully! ==="))
