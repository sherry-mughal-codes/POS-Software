"""
Centralized Document Sequence & Numbering Management Engine.
Handles custom prefixes, configurable start numbers, and current sequence resolution
for all transactional models across the POS system.
"""

import re
from typing import Dict, Any, Tuple
from django.utils import timezone
from apps.core.models import SystemSetting


class DocumentSequenceService:
    """
    Provides unified prefix, start number, and dynamic next sequence generation
    for all transactional entities in the system.
    """

    CONFIGS = {
        "invoice": {
            "title": "Sales Invoice",
            "prefix_key": "invoice_prefix",
            "start_key": "invoice_start_number",
            "default_prefix": "INV-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.sales.models.Sale",
            "field_name": "invoice_number",
        },
        "sales_return": {
            "title": "Sales Return",
            "prefix_key": "sales_return_prefix",
            "start_key": "sales_return_start_number",
            "default_prefix": "RET-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.sales.models.SalesReturn",
            "field_name": "return_number",
        },
        "purchase_order": {
            "title": "Purchase Order",
            "prefix_key": "purchase_order_prefix",
            "start_key": "purchase_order_start_number",
            "default_prefix": "PUR-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.purchases.models.Purchase",
            "field_name": "purchase_number",
        },
        "purchase_return": {
            "title": "Purchase Return",
            "prefix_key": "purchase_return_prefix",
            "start_key": "purchase_return_start_number",
            "default_prefix": "PRTN-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.purchases.models.PurchaseReturn",
            "field_name": "return_number",
        },
        "customer_payment": {
            "title": "Customer Payment Voucher",
            "prefix_key": "customer_payment_prefix",
            "start_key": "customer_payment_start_number",
            "default_prefix": "CPAY-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.contacts.models.CustomerPayment",
            "field_name": "payment_number",
        },
        "supplier_payment": {
            "title": "Supplier Payment Voucher",
            "prefix_key": "supplier_payment_prefix",
            "start_key": "supplier_payment_start_number",
            "default_prefix": "SPAY-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.purchases.models.SupplierPayment",
            "field_name": "payment_number",
        },
        "journal_entry": {
            "title": "Journal Entry (GL)",
            "prefix_key": "journal_entry_prefix",
            "start_key": "journal_entry_start_number",
            "default_prefix": "JE-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.accounting.models.JournalEntry",
            "field_name": "entry_number",
        },
        "stock_adjustment": {
            "title": "Inventory / Stock Adjustment",
            "prefix_key": "stock_adjustment_prefix",
            "start_key": "stock_adjustment_start_number",
            "default_prefix": "ADJ-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.inventory.models.StockAdjustment",
            "field_name": "adjustment_number",
        },
        "expense": {
            "title": "Expense Voucher",
            "prefix_key": "expense_prefix",
            "start_key": "expense_start_number",
            "default_prefix": "EXP-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.expenses.models.Expense",
            "field_name": "expense_number",
        },
        "customer": {
            "title": "Customer ID Code",
            "prefix_key": "customer_prefix",
            "start_key": "customer_start_number",
            "default_prefix": "CUS-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.contacts.models.Customer",
            "field_name": "customer_id",
        },
        "supplier": {
            "title": "Supplier ID Code",
            "prefix_key": "supplier_prefix",
            "start_key": "supplier_start_number",
            "default_prefix": "SUP-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.contacts.models.Supplier",
            "field_name": "supplier_id",
        },
        "employee": {
            "title": "Employee ID Code",
            "prefix_key": "employee_prefix",
            "start_key": "employee_start_number",
            "default_prefix": "EMP-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.employees.models.Employee",
            "field_name": "employee_id",
        },
        "salary_slip": {
            "title": "Salary Slip Number",
            "prefix_key": "salary_slip_prefix",
            "start_key": "salary_slip_start_number",
            "default_prefix": "SAL-",
            "default_start": 1,
            "padding": 5,
            "model_path": "apps.employees.models.SalarySlip",
            "field_name": "slip_number",
        },
    }

    @classmethod
    def get_model_class(cls, model_path: str):
        parts = model_path.split(".")
        module_name = ".".join(parts[:-1])
        class_name = parts[-1]
        import importlib
        module = importlib.import_module(module_name)
        return getattr(module, class_name)

    @classmethod
    def get_prefix_and_start(cls, doc_type: str) -> Tuple[str, int, int]:
        cfg = cls.CONFIGS.get(doc_type, {})
        prefix_key = cfg.get("prefix_key", f"{doc_type}_prefix")
        start_key = cfg.get("start_key", f"{doc_type}_start_number")
        default_prefix = cfg.get("default_prefix", f"{doc_type.upper()}-")
        default_start = cfg.get("default_start", 1)
        padding = cfg.get("padding", 5)

        prefix = SystemSetting.get_setting(prefix_key, default_prefix) or default_prefix
        start_val = SystemSetting.get_setting(start_key, str(default_start))
        try:
            start_num = int(start_val)
            if start_num < 1:
                start_num = 1
        except (ValueError, TypeError):
            start_num = default_start

        return prefix, start_num, padding

    @classmethod
    def get_max_existing_sequence(cls, doc_type: str, prefix: str) -> int:
        cfg = cls.CONFIGS.get(doc_type)
        if not cfg:
            return 0

        model_cls = cls.get_model_class(cfg["model_path"])
        field_name = cfg["field_name"]

        # Search existing records starting with this prefix or general pattern
        qs = model_cls.objects.all()
        matching_values = qs.filter(**{f"{field_name}__startswith": prefix}).values_list(field_name, flat=True)

        max_seq = 0
        for val in matching_values:
            if not val:
                continue
            # Extract trailing numeric digits from the identifier
            match = re.search(r"(\d+)$", str(val))
            if match:
                try:
                    num = int(match.group(1))
                    if num < 90000000 and num > max_seq:
                        max_seq = num
                except ValueError:
                    pass

        return max_seq

    @classmethod
    def generate_next_number(cls, doc_type: str) -> str:
        """
        Generates consecutive unique identifier adhering to custom prefix and start number.
        - If user configures start_number = 50, next generated document starts from 51.
        - If start_number = 1 and no existing records, first generated document is 1.
        - Subsequent records increment sequentially from the latest max existing sequence.
        """
        prefix, start_num, padding = cls.get_prefix_and_start(doc_type)
        max_existing = cls.get_max_existing_sequence(doc_type, prefix)

        if start_num > 1:
            if max_existing >= start_num:
                next_seq = max_existing + 1
            else:
                next_seq = start_num
        else:
            if max_existing >= 1:
                next_seq = max_existing + 1
            else:
                next_seq = 1

        effective_padding = max(padding, len(str(next_seq)))
        return f"{prefix}{next_seq:0{effective_padding}d}"

    @classmethod
    def get_sequence_info(cls, doc_type: str) -> Dict[str, Any]:
        """
        Returns prefix, start number, current latest sequence, and next preview.
        """
        cfg = cls.CONFIGS.get(doc_type, {})
        prefix, start_num, padding = cls.get_prefix_and_start(doc_type)
        max_existing = cls.get_max_existing_sequence(doc_type, prefix)

        if start_num > 1:
            if max_existing >= start_num:
                next_seq = max_existing + 1
            else:
                next_seq = start_num
        else:
            if max_existing >= 1:
                next_seq = max_existing + 1
            else:
                next_seq = 1

        effective_padding = max(padding, len(str(next_seq)))
        next_preview = f"{prefix}{next_seq:0{effective_padding}d}"
        current_display = str(max_existing) if max_existing > 0 else "0"

        return {
            "key": doc_type,
            "title": cfg.get("title", doc_type.title()),
            "prefix_key": cfg.get("prefix_key", f"{doc_type}_prefix"),
            "start_key": cfg.get("start_key", f"{doc_type}_start_number"),
            "prefix": prefix,
            "start_number": start_num,
            "current_number": max_existing,
            "current_display": current_display,
            "next_preview": next_preview,
        }

    @classmethod
    def get_all_sequences_info(cls) -> Dict[str, Any]:
        """
        Gathers complete sequence metadata for all document types.
        """
        result = {}
        for doc_type in cls.CONFIGS:
            try:
                result[doc_type] = cls.get_sequence_info(doc_type)
            except Exception as e:
                cfg = cls.CONFIGS[doc_type]
                result[doc_type] = {
                    "key": doc_type,
                    "title": cfg.get("title", doc_type.title()),
                    "prefix_key": cfg.get("prefix_key"),
                    "start_key": cfg.get("start_key"),
                    "prefix": cfg.get("default_prefix"),
                    "start_number": cfg.get("default_start"),
                    "current_number": 0,
                    "current_display": "0",
                    "next_preview": f"{cfg.get('default_prefix')}00001",
                    "error": str(e),
                }
        return result
