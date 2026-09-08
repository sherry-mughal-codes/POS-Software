import os
import django
from decimal import Decimal
import random

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.products.models import Product, Category, Unit

def seed_products():
    print("Seeding 70 products into Product Catalog...")
    
    # Fetch or ensure units
    units = list(Unit.objects.filter(is_active=True))
    if not units:
        u, _ = Unit.objects.get_or_create(short_code="pcs", defaults={"name": "Piece", "allow_decimal": False, "is_active": True})
        units = [u]

    # Fetch or ensure categories
    categories = list(Category.objects.filter(is_active=True))
    if not categories:
        cat, _ = Category.objects.get_or_create(code="CAT-GEN", defaults={"name": "General Products", "is_active": True})
        categories = [cat]

    product_names = [
        "Pro Wireless Noise-Cancelling Headphones",
        "Ultra HD 4K Gaming Monitor 27-inch",
        "Mechanical RGB Mechanical Keyboard",
        "Ergonomic Optical Gaming Mouse",
        "Thunderbolt 4 USB-C Docking Station",
        "Portable External SSD 1TB High-Speed",
        "Smart Fitness Tracker Band Active 2",
        "Magnetic Wireless Fast Charging Pad",
        "True Wireless Bluetooth Earbuds ANC",
        "Dual-Band Gigabit Wi-Fi 6 Router",
        "Multi-Port USB 3.0 Hub Adapter",
        "Anodized Aluminum Laptop Stand Ergonomic",
        "Full HD 1080p Streaming Webcam with Mic",
        "Studio Condenser USB Microphone",
        "Adjustable LED Desk Lamp with USB Port",
        "Premium Braided Type-C Fast Charging Cable 2m",
        "Ultra-Slim Wireless Power Bank 10000mAh",
        "Anti-Glare Tempered Glass Screen Protector",
        "Shockproof Matte Phone Protective Case",
        "Smart RGB Color LED Light Strip 5m",
        "Compact Bluetooth Portable Speaker",
        "Cat7 High-Speed Shielded Ethernet Cable 5m",
        "Smart Home Security HD Camera Wi-Fi",
        "Universal Laptop Power Adapter 65W",
        "Multi-Device Bluetooth Quiet Keyboard",
        "High-Precision Gaming Mouse Pad XXL",
        "Laser Barcode Scanner USB Handheld",
        "Thermal POS Receipt Paper Roll 80mm Pack",
        "Wireless Presentation Clicker Remote",
        "Smart Digital Kitchen Weighing Scale",
        "Rechargeable Wireless Stylus Pen",
        "Foldable VR Virtual Reality Headset",
        "Smart Fingerprint Door Lock Padlock",
        "USB Sound Card 7.1 Channel Surround",
        "MicroSDXC High Endurance Memory Card 128GB",
    ]

    created_count = 0
    skipped_count = 0

    for i in range(1, 71):
        sku = f"PRD-TEST-{i:04d}"
        barcode = f"89012345{i:04d}"
        
        # Pick base name and add variation
        base_name = product_names[(i - 1) % len(product_names)]
        variant_suffix = f"Model V{((i - 1) // len(product_names)) + 1} (Edition #{i:02d})"
        full_name = f"{base_name} - {variant_suffix}"
        
        category = categories[(i - 1) % len(categories)]
        unit = units[(i - 1) % len(units)]
        
        # Price range
        base_cost = Decimal(random.randint(400, 35000))
        margin = Decimal(random.randint(15, 45)) / Decimal("100.00")
        selling_price = (base_cost * (Decimal("1.00") + margin)).quantize(Decimal("0.01"))
        
        product, created = Product.objects.update_or_create(
            sku=sku,
            defaults={
                "name": full_name,
                "barcode": barcode,
                "category": category,
                "unit": unit,
                "purchase_price": base_cost.quantize(Decimal("0.01")),
                "selling_price": selling_price,
                "min_stock_level": Decimal("10.00"),
                "maintain_stock": True,
                "is_active": True,
            }
        )
        if created:
            created_count += 1
        else:
            skipped_count += 1

    total_products = Product.objects.filter(is_active=True).count()
    print(f"[SUCCESS] Created {created_count} new products (Updated: {skipped_count}). Total active products in catalog: {total_products}")

if __name__ == "__main__":
    seed_products()
