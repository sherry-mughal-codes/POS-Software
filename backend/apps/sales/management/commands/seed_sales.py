"""
Seed command to create realistic demo POS sales and return transactions.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.products.models import Product
from apps.contacts.models import Customer
from apps.sales.models import PaymentMethodType, Sale
from apps.sales.services import SalesService


class Command(BaseCommand):
    help = "Seed demo sales transactions"

    def handle(self, *args, **options):
        if Sale.objects.exists():
            self.stdout.write(self.style.WARNING("Sales already exist in database."))
            return

        admin_user = User.objects.filter(is_superuser=True).first()
        walkin = Customer.objects.filter(is_walkin=True).first()
        credit_customer = Customer.objects.filter(credit_enabled=True, is_walkin=False).first()

        coca = Product.objects.filter(sku="PRD-00001").first()
        pepsi = Product.objects.filter(sku="PRD-00002").first()
        water = Product.objects.filter(sku="PRD-00004").first()
        biscuit = Product.objects.filter(sku="PRD-00008").first()

        if not (walkin and coca and pepsi and water and biscuit):
            self.stdout.write(self.style.ERROR("Required seed dependencies (products/customers) not found."))
            return

        # 1. Cash Sale to Walk-in Customer
        sale1 = SalesService.create_sale(
            customer_id=walkin.id,
            items_data=[
                {"product": coca.id, "quantity": Decimal("2.00"), "unit_price": coca.selling_price, "discount": Decimal("0.00")},
                {"product": biscuit.id, "quantity": Decimal("1.00"), "unit_price": biscuit.selling_price, "discount": Decimal("0.00")},
            ],
            payment_method=PaymentMethodType.CASH,
            discount_amount=Decimal("0.00"),
            paid_amount=Decimal("500.00"), # Tender 500, auto change calculation
            created_by=admin_user,
        )
        self.stdout.write(self.style.SUCCESS(f"Created Cash Sale: {sale1.invoice_number} (Rs. {sale1.grand_total})"))

        # 2. Card Sale to Walk-in Customer
        sale2 = SalesService.create_sale(
            customer_id=walkin.id,
            items_data=[
                {"product": pepsi.id, "quantity": Decimal("3.00"), "unit_price": pepsi.selling_price, "discount": Decimal("10.00")},
                {"product": water.id, "quantity": Decimal("2.00"), "unit_price": water.selling_price, "discount": Decimal("0.00")},
            ],
            payment_method=PaymentMethodType.CARD,
            discount_amount=Decimal("20.00"),
            created_by=admin_user,
        )
        self.stdout.write(self.style.SUCCESS(f"Created Card Sale: {sale2.invoice_number} (Rs. {sale2.grand_total})"))

        # 3. Credit Sale to Registered Customer
        if credit_customer:
            sale3 = SalesService.create_sale(
                customer_id=credit_customer.id,
                items_data=[
                    {"product": coca.id, "quantity": Decimal("4.00"), "unit_price": coca.selling_price, "discount": Decimal("0.00")},
                    {"product": water.id, "quantity": Decimal("5.00"), "unit_price": water.selling_price, "discount": Decimal("0.00")},
                ],
                payment_method=PaymentMethodType.CREDIT,
                discount_amount=Decimal("0.00"),
                created_by=admin_user,
            )
            self.stdout.write(self.style.SUCCESS(f"Created Credit Sale: {sale3.invoice_number} (Rs. {sale3.grand_total})"))

            # Process a return against Sale 3 (1 water bottle returned)
            water_item = sale3.items.filter(product=water).first()
            if water_item:
                ret = SalesService.process_sales_return(
                    sale_id=sale3.id,
                    items_data=[{"sale_item_id": water_item.id, "quantity": Decimal("1.00")}],
                    reason="Customer changed mind / unopened bottle",
                    created_by=admin_user,
                )
                self.stdout.write(self.style.SUCCESS(f"Created Sales Return: {ret.return_number} (Rs. {ret.refund_amount})"))

        self.stdout.write(self.style.SUCCESS("All demo sales seeded successfully!"))
