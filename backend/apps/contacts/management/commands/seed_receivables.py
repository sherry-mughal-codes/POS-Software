"""
Demo seed data command for Phase 9: Customer Receivables & Payments.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from apps.contacts.models import Customer
from apps.contacts.services import CustomerReceivableService
from apps.sales.models import Sale, SaleItem, SaleStatus, PaymentMethodType
from apps.products.models import Product
from apps.accounting.models import Account, PaymentMethod
from apps.accounting.services import AccountingService


class Command(BaseCommand):
    help = "Seeds demo customer receivables, credit sales, and customer payments."

    def handle(self, *args, **options):
        self.stdout.write("=== Seeding Phase 9 Customer Receivables & Payments ===")

        admin_user = User.objects.filter(username="admin").first()

        # 1. Get or create customer Ahmed Khan
        ahmed, _ = Customer.objects.get_or_create(
            customer_id="CUS-000002",
            defaults={
                "name": "Ahmed Khan",
                "phone": "0300-1234567",
                "email": "ahmed.khan@example.com",
                "address": "House 12, Street 4, F-7/2, Islamabad",
                "credit_enabled": True,
                "is_walkin": False,
                "is_active": True,
            },
        )

        # 2. Get Cash / Bank Accounts
        cash_acc = Account.objects.filter(code="1010").first()
        ar_acc = Account.objects.filter(code="1030").first()
        rev_acc = Account.objects.filter(code="4010").first()
        cogs_acc = Account.objects.filter(code="5010").first()
        inv_acc = Account.objects.filter(code="1040").first()

        product = Product.objects.filter(is_active=True).first()

        # 3. Create sample credit sale if Ahmed Khan has 0 credit sales
        existing_sales = Sale.objects.filter(customer=ahmed, status=SaleStatus.COMPLETED)
        if not existing_sales.exists() and product:
            sale_num = Sale.generate_invoice_number() if hasattr(Sale, 'generate_invoice_number') else f"INV-{timezone.now().year}-90001"
            sale = Sale.objects.create(
                invoice_number=sale_num,
                customer=ahmed,
                date=timezone.now().date(),
                status=SaleStatus.COMPLETED,
                subtotal=Decimal("15000.00"),
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("0.00"),
                grand_total=Decimal("15000.00"),
                paid_amount=Decimal("5000.00"),
                change_amount=Decimal("0.00"),
                due_amount=Decimal("10000.00"),
                payment_method=PaymentMethodType.CREDIT,
                notes="Credit sale for monthly groceries",
                created_by=admin_user,
            )

            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=Decimal("10.00"),
                unit_price=Decimal("1500.00"),
                unit_cost=product.purchase_price,
                discount=Decimal("0.00"),
                subtotal=Decimal("15000.00"),
            )

            # Record accounting
            AccountingService.record_sale(
                sale_ref=sale.invoice_number,
                total_amount=sale.grand_total,
                paid_amount=sale.paid_amount,
                payment_account=cash_acc,
                sales_revenue_account=rev_acc,
                customer_receivable_account=ar_acc,
                cogs_amount=Decimal("10.00") * product.purchase_price,
                cogs_account=cogs_acc,
                inventory_account=inv_acc,
                created_by=admin_user,
            )
            self.stdout.write(f"✓ Created sample credit sale: {sale.invoice_number} (Due: Rs. {sale.due_amount})")

        # 4. Check outstanding and create sample payment
        bal = CustomerReceivableService.get_customer_outstanding(ahmed.id)
        self.stdout.write(f"Ahmed Khan current outstanding: Rs. {bal['outstanding_balance']}")

        if bal["outstanding_balance"] > Decimal("0.00"):
            pay_amt = min(Decimal("4000.00"), bal["outstanding_balance"])
            payment = CustomerReceivableService.create_payment(
                data={
                    "customer": ahmed,
                    "amount": pay_amt,
                    "date": timezone.now().date(),
                    "payment_method": "CASH",
                    "payment_account": cash_acc,
                    "reference": "RCPT-001",
                    "notes": "Partial cash payment on account",
                },
                user=admin_user,
                submit_now=True,
            )
            self.stdout.write(f"✓ Created submitted customer payment: {payment.payment_number} (Rs. {payment.amount})")

        updated_bal = CustomerReceivableService.get_customer_outstanding(ahmed.id)
        self.stdout.write(f"✓ Ahmed Khan remaining outstanding: Rs. {updated_bal['outstanding_balance']}")
        self.stdout.write("=== Phase 9 Seeding Completed! ===")
