from apps.products.models import Product
from apps.inventory.models import StockMovement
from apps.accounting.models import Account, JournalItem
from apps.inventory.services import InventoryService

print('--- Products & Stock ---')
total_val = 0
for p in Product.objects.all():
    stock = p.get_current_stock()
    val = float(stock) * float(p.purchase_price)
    total_val += val
    print(f'Product: {p.sku} | {p.name} | Stock: {stock} | Cost: {p.purchase_price} | Val: {val}')
print('Total Product Valuation:', total_val)

inv_acc = Account.objects.filter(code='1040').first()
print('\n--- Account 1040 (Merchandise Inventory) ---')
print('Code:', inv_acc.code, 'Name:', inv_acc.name)
print('Current Balance:', inv_acc.get_current_balance())

print('\n--- Journal Items for 1040 ---')
dr_tot = 0
cr_tot = 0
for ji in JournalItem.objects.filter(account=inv_acc).select_related('journal_entry').order_by('journal_entry__entry_date', 'id'):
    dr_tot += ji.debit
    cr_tot += ji.credit
    print(f"{ji.id} | Date: {ji.journal_entry.entry_date} | {ji.journal_entry.entry_number} | {ji.journal_entry.reference_type} {ji.journal_entry.reference_id} | DR: {ji.debit} | CR: {ji.credit} | {ji.description}")
print('Total DR:', dr_tot, 'Total CR:', cr_tot, 'Net DR - CR:', dr_tot - cr_tot)
