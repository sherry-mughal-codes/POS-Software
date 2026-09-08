# ApexPOS — Enterprise Point of Sale & ERP System

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Django](https://img.shields.io/badge/Backend-Django%205.0%20%2B%20DRF-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**ApexPOS** is a full-stack, enterprise-grade Point of Sale (POS), Inventory Control, Warranty Claims & RMA Management, Double-Entry Accounting, and Human Resource ERP software engineered with strict GAAP accounting compliance, fast barcode operations, and real-time analytics.

---

## Key Modules

| Module | Highlights |
| :--- | :--- |
| **POS Terminal & Register** | Fast barcode scanning, multi-item cart, split payments (Cash/Bank/Cheque/Credit), 80mm/58mm thermal receipts, cash drawer reconciliation. |
| **Product Master Catalog** | Auto-generating SKUs (`PRD-00001`), barcode tracking, categories, units of measure, local image uploads, safe deletion shields, Excel import. |
| **Warranty & RMA Engine** | Two-way replacement claims, defective inventory holding (`1060`), supplier RMA batches (`1070`), replacement stock receipts (`1040`), thermal RMA slips. |
| **Inventory & Stock Control** | Live catalog, Weighted Average Costing (WAC), stock movement ledgers, stock adjustments, low-stock notifications. |
| **Purchasing & Payables (AP)** | Supplier directories, purchase orders (`PUR-00001`), supplier invoice uploads with image preview/download, multi-method purchase returns. |
| **Customers & Receivables (AR)** | Customer profiles, Walk-in Customer, credit accounts, payment vouchers with deposit slip preview/download, itemized account statements. |
| **Double-Entry General Ledger** | Standard Chart of Accounts (Assets, Liabilities, Equity, Revenue, COGS, Expenses), Trial Balance, Profit & Loss (P&L), Balance Sheet. |
| **Expenses & Transfers** | Categorized expense vouchers, inter-account fund transfers (Cash ↔ Bank), double-entry GL audit. |
| **Payroll & Attendance** | Employee directory, monthly attendance roster, auto-calculated salary slips, disbursement vouchers. |
| **Reports Center & Analytics** | Executive dashboard KPIs, interactive sales trends, cashier performance, printable and exportable financial audits. |

---

## Quick Setup (Docker — 2 Minutes)

### 1. Clone & Configure
```bash
git clone https://github.com/sherry-mughal-codes/POS-Software.git
cd POS-Software
# Windows: Copy-Item .env.example .env | Mac/Linux: cp .env.example .env
```

### 2. Start Application
```bash
docker compose up --build -d
```

### 3. Initialize Database
- **For Clean Store Setup:**
  ```bash
  docker compose exec backend python manage.py init_clean_system
  ```
- **For Demo Data & Testing:**
  ```bash
  docker compose exec backend python manage.py seed_all_demo_data
  ```

### 4. Access App
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## Default User Accounts

| Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` |
| **Branch Manager** | `manager` | `manager123` |
| **Cashier** | `cashier` | `cashier123` |
| **Accountant** | `accountant` | `accountant123` |

---

## Common CLI Commands

- **Clear All Transactional Data (Keep Master Setup):**
  ```bash
  docker compose exec backend python manage.py clear_transactional_data
  ```
- **Run Edge Case & Stress Audit Suite:**
  ```bash
  docker compose exec backend python run_edge_case_tests.py
  ```
- **Run Backend Unit Tests:**
  ```bash
  docker compose exec backend python manage.py test
  ```
