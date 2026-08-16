"""
Django management command to seed categories, units of measurement, and demo product catalog.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.products.models import Category, Unit, Product


class Command(BaseCommand):
    help = "Seeds initial categories, measurement units, and product master catalog."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Seeding Product Master Data, Categories & Units ==="))

        # 1. Seed Units of Measurement
        units_data = [
            {"name": "Piece", "short_code": "pcs", "allow_decimal": False},
            {"name": "Bottle", "short_code": "btl", "allow_decimal": False},
            {"name": "Can", "short_code": "can", "allow_decimal": False},
            {"name": "Pack", "short_code": "pk", "allow_decimal": False},
            {"name": "Box", "short_code": "box", "allow_decimal": False},
            {"name": "Kilogram", "short_code": "kg", "allow_decimal": True},
            {"name": "Gram", "short_code": "g", "allow_decimal": True},
            {"name": "Liter", "short_code": "L", "allow_decimal": True},
        ]

        units_map = {}
        for u_data in units_data:
            unit, created = Unit.objects.get_or_create(
                short_code=u_data["short_code"],
                defaults={"name": u_data["name"], "allow_decimal": u_data["allow_decimal"], "is_active": True},
            )
            units_map[u_data["short_code"]] = unit
            if created:
                self.stdout.write(f"  + Unit: {unit.name} ({unit.short_code})")

        self.stdout.write(self.style.SUCCESS(f"✓ Measurement Units initialized ({len(units_map)} units)."))

        # 2. Seed Categories
        categories_data = [
            {"code": "BEV", "name": "Beverages", "parent": None, "desc": "Cold drinks, juices, energy drinks, water"},
            {"code": "BEV-SD", "name": "Soft Drinks", "parent": "BEV", "desc": "Carbonated sodas & colas"},
            {"code": "BEV-WAT", "name": "Bottled Water", "parent": "BEV", "desc": "Mineral & spring water"},
            {"code": "BEV-JUC", "name": "Juices & Energy", "parent": "BEV", "desc": "Fruit juices and energy drinks"},
            {"code": "SNK", "name": "Snacks & Confectionery", "parent": None, "desc": "Chips, biscuits, chocolates, crisps"},
            {"code": "SNK-CHP", "name": "Chips & Crisps", "parent": "SNK", "desc": "Potato and corn chips"},
            {"code": "SNK-BIS", "name": "Biscuits & Cookies", "parent": "SNK", "desc": "Cookies, crackers and wafers"},
            {"code": "DAI", "name": "Dairy & Bakery", "parent": None, "desc": "Milk, cheese, yogurt, fresh bread"},
            {"code": "GRO", "name": "Groceries & Staples", "parent": None, "desc": "Rice, flour, cooking oil, spices"},
            {"code": "PER", "name": "Personal Care", "parent": None, "desc": "Soaps, shampoos, toothpaste"},
            {"code": "HOU", "name": "Household & Cleaning", "parent": None, "desc": "Detergents, disinfectants, paper goods"},
        ]

        categories_map = {}
        for c_data in categories_data:
            parent_cat = categories_map.get(c_data["parent"]) if c_data["parent"] else None
            cat, created = Category.objects.get_or_create(
                code=c_data["code"],
                defaults={
                    "name": c_data["name"],
                    "parent": parent_cat,
                    "description": c_data["desc"],
                    "is_active": True,
                },
            )
            categories_map[c_data["code"]] = cat
            if created:
                self.stdout.write(f"  + Category: [{cat.code}] {cat.name}")

        self.stdout.write(self.style.SUCCESS(f"✓ Categories initialized ({len(categories_map)} categories)."))

        # 3. Seed Demo Products Catalog
        products_data = [
            # Soft Drinks
            {
                "sku": "PRD-00001",
                "name": "Coca-Cola 500ml Pet Bottle",
                "barcode": "5449000000996",
                "category": "BEV-SD",
                "unit": "btl",
                "purchase_price": Decimal("85.00"),
                "selling_price": Decimal("110.00"),
                "image_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80",
                "desc": "Original Taste chilled Coca Cola 500ml",
            },
            {
                "sku": "PRD-00002",
                "name": "Pepsi 1.5 Liter Bottle",
                "barcode": "012000000133",
                "category": "BEV-SD",
                "unit": "btl",
                "purchase_price": Decimal("160.00"),
                "selling_price": Decimal("210.00"),
                "image_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80",
                "desc": "Refreshing Pepsi 1.5 Liter family pack",
            },
            {
                "sku": "PRD-00003",
                "name": "Sprite Can 250ml",
                "barcode": "5449000014535",
                "category": "BEV-SD",
                "unit": "can",
                "purchase_price": Decimal("75.00"),
                "selling_price": Decimal("100.00"),
                "image_url": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&q=80",
                "desc": "Crisp lemon-lime refreshment can",
            },
            {
                "sku": "PRD-00004",
                "name": "Aquafina Mineral Water 1.5L",
                "barcode": "012000803451",
                "category": "BEV-WAT",
                "unit": "btl",
                "purchase_price": Decimal("60.00"),
                "selling_price": Decimal("90.00"),
                "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&q=80",
                "desc": "Pure purified drinking water",
            },
            {
                "sku": "PRD-00005",
                "name": "Red Bull Energy Drink 250ml",
                "barcode": "9002490100070",
                "category": "BEV-JUC",
                "unit": "can",
                "purchase_price": Decimal("280.00"),
                "selling_price": Decimal("350.00"),
                "image_url": "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400&q=80",
                "desc": "Vitalizes body and mind premium energy drink",
            },

            # Snacks
            {
                "sku": "PRD-00006",
                "name": "Lay's Classic Salted Crisps 65g",
                "barcode": "028400041234",
                "category": "SNK-CHP",
                "unit": "pk",
                "purchase_price": Decimal("65.00"),
                "selling_price": Decimal("90.00"),
                "image_url": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
                "desc": "Crispy golden salted potato chips",
            },
            {
                "sku": "PRD-00007",
                "name": "Doritos Nacho Cheese 100g",
                "barcode": "028400091823",
                "category": "SNK-CHP",
                "unit": "pk",
                "purchase_price": Decimal("120.00"),
                "selling_price": Decimal("160.00"),
                "image_url": "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=400&q=80",
                "desc": "Bold cheesy crunch tortilla chips",
            },
            {
                "sku": "PRD-00008",
                "name": "Oreo Chocolate Sandwich Cookies 120g",
                "barcode": "044000032029",
                "category": "SNK-BIS",
                "unit": "pk",
                "purchase_price": Decimal("75.00"),
                "selling_price": Decimal("100.00"),
                "image_url": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80",
                "desc": "Milk's favorite cookie with rich cream",
            },

            # Dairy & Bakery
            {
                "sku": "PRD-00009",
                "name": "Olper's Full Cream Milk 1 Liter UHT",
                "barcode": "8961014120015",
                "category": "DAI",
                "unit": "pk",
                "purchase_price": Decimal("240.00"),
                "selling_price": Decimal("280.00"),
                "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
                "desc": "100% pure nutritious UHT whole milk",
            },
            {
                "sku": "PRD-00010",
                "name": "Dawn Fresh Sandwich Bread Large",
                "barcode": "8964000100412",
                "category": "DAI",
                "unit": "pk",
                "purchase_price": Decimal("130.00"),
                "selling_price": Decimal("170.00"),
                "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
                "desc": "Soft freshly baked family sandwich bread",
            },

            # Groceries & Staples
            {
                "sku": "PRD-00011",
                "name": "Super Kernel Basmati Rice 5kg",
                "barcode": "8961000300124",
                "category": "GRO",
                "unit": "pk",
                "purchase_price": Decimal("1650.00"),
                "selling_price": Decimal("1950.00"),
                "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
                "desc": "Aromatic long-grain premium basmati rice",
            },
            {
                "sku": "PRD-00012",
                "name": "Dalda Pure Cooking Oil 1L Pouch",
                "barcode": "8964000300902",
                "category": "GRO",
                "unit": "pk",
                "purchase_price": Decimal("480.00"),
                "selling_price": Decimal("540.00"),
                "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80",
                "desc": "Refined healthy pure cooking oil",
            },

            # Personal Care & Household
            {
                "sku": "PRD-00013",
                "name": "Lifebuoy Total 10 Anti-Bacterial Soap 115g",
                "barcode": "8961014101014",
                "category": "PER",
                "unit": "pcs",
                "purchase_price": Decimal("85.00"),
                "selling_price": Decimal("110.00"),
                "image_url": "https://images.unsplash.com/photo-1607006314144-8e5c26c1bc18?w=400&q=80",
                "desc": "100% stronger germ protection soap bar",
            },
            {
                "sku": "PRD-00014",
                "name": "Surf Excel Washing Powder 1kg",
                "barcode": "8961014201011",
                "category": "HOU",
                "unit": "pk",
                "purchase_price": Decimal("490.00"),
                "selling_price": Decimal("580.00"),
                "image_url": "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&q=80",
                "desc": "Stain removal premium laundry detergent",
            },
        ]

        for p_data in products_data:
            cat = categories_map.get(p_data["category"])
            unit = units_map.get(p_data["unit"])
            product, created = Product.objects.get_or_create(
                sku=p_data["sku"],
                defaults={
                    "name": p_data["name"],
                    "barcode": p_data["barcode"],
                    "category": cat,
                    "unit": unit,
                    "purchase_price": p_data["purchase_price"],
                    "selling_price": p_data["selling_price"],
                    "image_url": p_data["image_url"],
                    "description": p_data["desc"],
                    "is_active": True,
                },
            )
            if created:
                self.stdout.write(f"  + Product: [{product.sku}] {product.name} (Selling: Rs. {product.selling_price})")

        self.stdout.write(self.style.SUCCESS(f"✓ Product Master Catalog seeded ({len(products_data)} products)."))
        self.stdout.write(self.style.SUCCESS("=== Product Master Setup Completed Successfully! ==="))
