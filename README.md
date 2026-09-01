# ApexPOS — Enterprise Point of Sale & ERP System

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Django](https://img.shields.io/badge/Backend-Django%205.0%20%2B%20DRF-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%205-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

**ApexPOS** is a full-stack, enterprise-grade Point of Sale (POS), Inventory Control, Warranty Claims & RMA Management, Double-Entry Accounting, and Human Resource ERP software engineered with modern web technologies, strict GAAP accounting compliance, and a high-performance modular architecture.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Modules & Capabilities](#key-modules--capabilities)
- [Warranty Claims & RMA Management](#warranty-claims--rma-management)
- [Quick Start Guide (Docker — Recommended)](#quick-start-guide-docker--recommended)
  - [Clean Production Setup (For New Deployment)](#clean-production-setup-for-new-deployment)
  - [Demo / Testing Sandbox Setup](#demo--testing-sandbox-setup)
- [Default Login Credentials](#default-login-credentials)
- [Document Numbering Sequences](#document-numbering-sequences)
- [Bulk Excel/CSV Import & Form Alignment](#bulk-excelcsv-import--form-alignment)
- [Local Setup Without Docker (Alternative)](#local-setup-without-docker-alternative)
- [Available CLI Management Commands](#available-cli-management-commands)
- [Running Automated Verification Tests](#running-automated-verification-tests)
- [Project Directory Structure](#project-directory-structure)
- [API Endpoints Overview](#api-endpoints-overview)
- [License](#license)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             Docker Network                              │
│                                                                         │
│  ┌─────────────────────────┐           ┌─────────────────────────────┐  │
│  │   frontend (Vite Dev)   │   HTTP    │   backend (Django 5.0)      │  │
│  │   React 18 + TypeScript ├──────────►│   Django REST Framework     │  │
│  │   Port: 5173            │  /api/v1/ │   Port: 8000                │  │
│  └─────────────────────────┘           └──────────────┬──────────────┘  │
│                                                       │                 │
│                                                       │ SQL (Port 5432) │
│                                                       ▼                 │
│                                        ┌─────────────────────────────┐  │
│                                        │   db (PostgreSQL 16 Alpine) │  │
│                                        │   Named Volume: pg_data     │  │
│                                        └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Modules & Capabilities

| Module | Features & Capabilities |
| :--- | :--- |
| **POS Terminal & Register** | Real-time barcode laser scanning, instant search, fast itemized cart, line-item discounts & bill discounts, split payments (Cash / Bank / Cheque / Store Credit), customer selector, 80mm/58mm thermal receipts, and register day sessions with drawer cash float audits. |
| **Product Master Catalog** | Auto-generating sequential SKUs (`PRD-00001`), barcode tracking, hierarchical categories, Units of Measurement (with fractional decimal support), warranty periods, profit margin calculators, stock-free service toggles, **local gallery image upload (drag-and-drop & URL)**, **safe deletion guards** (prevents deleting items with active stock or transactions), and bulk Excel/CSV import matching form fields. |
| **Warranty Claims Management** | End-to-end two-way warranty claims lifecycle: Customer replacement claims, defective inventory holding (`1060`), batch Supplier RMA dispatch (`1070`), supplier replacement receipts back to active stock (`1040`), and symmetrical 80mm/58mm thermal claim slips. |
| **Inventory & Stock Control** | Live stock catalog, Weighted Average Costing (WAC) valuation, signed stock movement ledgers, product stock cards, multi-reason stock adjustments with automatic General Ledger inventory postings, and low-stock alerts. |
| **Purchasing & AP Management** | Supplier directories, purchase orders (`PUR-00001`), purchase returns with multi-method refunds (Cash, Bank, AP deduction) with double-entry debit/credit ledger posting. |
| **Customers & Receivables (AR)** | Customer profiles, canonical walk-in customer (`CUS-00001`), credit limits, payment receipts, customer account ledgers, statements with non-balance impacting returns audit, and Excel bulk imports. |
| **Suppliers & Payables (AP)** | Supplier master profiles, tax IDs/NTN, payment terms, account ledgers, payable statements, and Excel bulk imports with automatic sequential IDs (`SUP-00001`). |
| **Expense Management** | Categorized operational expense vouchers, cash/bank settlements, Accounts Payable tracking, and direct GL expense entries. |
| **Staff & Payroll Management** | Employee directory, monthly attendance roster with employee filtering, automated monthly salary slip calculations, and salary disbursements with Accrued Salaries Payable (`2030`) reconciliation. |
| **Double-Entry General Ledger** | Standard 5-digit GAAP Chart of Accounts (Assets, Liabilities, Equity, Revenue, COGS, Expenses), interactive Account Ledgers, Trial Balance, Profit & Loss Statement, and Balance Sheet. |
| **Role-Based Access Control** | Granular permissions categorized by module (Admin, Branch Manager, Cashier, Inventory Officer, Chief Accountant, and dedicated Warranty Claims Management permissions). |
| **Executive Analytics Dashboard** | Real-time Gross/Net Sales, Cost of Goods Sold (COGS), Gross Profit, Net Profit, Liquid Cash/Bank tracking, Top Products, Cashier Leaderboards, and real-time **In Progress Supplier Claims** units counter. |

---

## Warranty Claims & RMA Management

ApexPOS includes an enterprise double-entry integrated warranty claims engine:

1. **Customer Warranty Claim:**
   - Cashiers/managers select an invoice and verify eligible warranty items and remaining claimable quantity.
   - System issues a replacement product to the customer immediately:
     - On-hand replacement stock decreases by the claim quantity.
     - Defective unit is booked into asset account **1060 Warranty Claim Asset**.
     - Automated GL Entry: `DR 1060 Warranty Claim Asset / CR 1040 Inventory Asset`.
   - Generates an 80mm or 58mm Customer Warranty Replacement Slip.
2. **Supplier RMA Dispatch Batch:**
   - Claims manager selects held defective units grouped by manufacturer/authoritative supplier.
   - Creates a Supplier RMA batch (`SUP-CLM-00001`):
     - Defective units are transferred to **1070 Supplier Claim Asset**.
     - Automated GL Entry: `DR 1070 Supplier Claim Asset / CR 1060 Warranty Asset`.
   - Generates an 80mm or 58mm Supplier RMA Dispatch Slip.
3. **Supplier Replacement Receipt:**
   - When the supplier delivers brand-new replacement stock, clicking **Receive Stock** restores units into active inventory:
     - Automated GL Entry: `DR 1040 Inventory Asset / CR 1070 Supplier Claim Asset`.
   - The Executive Dashboard's **In Progress Supplier Claims** card updates in real time to reflect outstanding RMA units.

---

## Quick Start Guide (Docker — Recommended)

### 1. Requirements
* Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running.
* Install [Git](https://git-scm.com/).

### 2. Clone the Repository
```bash
git clone https://github.com/sherry-mughal-codes/POS-Software.git
cd POS-Software
```

### 3. Create Environment File
* **Windows PowerShell:**
  ```powershell
  Copy-Item .env.example .env
  ```
* **Linux / macOS:**
  ```bash
  cp .env.example .env
  ```

### 4. Build and Start Containers
```bash
docker compose up --build -d
```

---

### Clean Production Setup (For New Deployment)

For a fresh install on a store computer where you want a clean database (empty catalog, 0 account balances, sequences starting from 1, and default Walk-in Customer):

```bash
docker compose exec backend python manage.py init_clean_system
```

This pristine initialization guarantees:
- **0.00 Balances:** All 32 Chart of Accounts and Payment Methods start with 0.00.
- **Empty Product Catalog:** 0 products (clean slate for your inventory).
- **Default Master Units & Categories:** Standard measurement units (Piece, Box, Kg, Liter, Pack) and General category.
- **Canonical Walk-in Customer:** Seeded as `CUS-00001` with `is_walkin=True`.
- **All Document Sequences Start at 1:** Invoices start at `INV-00001`, Customer Claims at `CLM-00001`, Supplier RMAs at `SUP-CLM-00001`, etc.

---

### Demo / Testing Sandbox Setup

To populate sample test products, categories, mock sales, and opening inventory for evaluation:

```bash
docker compose exec backend python manage.py seed_all_demo_data
```

### 5. Access the Application
Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## Default Login Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full access to all modules, settings, users, and financial reports |
| **Branch Manager** | `manager` | `manager123` | Access to POS, inventory, purchasing, warranty, expenses, and staff |
| **Cashier** | `cashier` | `cashier123` | Streamlined access to POS Terminal, sales receipts, and day registers |
| **Accountant** | `accountant` | `accountant123` | Access to General Ledger, Chart of Accounts, journal entries, and financial statements |

---

## Document Numbering Sequences

All transactional and master identifiers are powered by the centralized `DocumentSequenceService` with customizable prefixes and starting numbers in **Settings > Document Sequences**:

| Document Type | Default Prefix | Format Example | Description |
| :--- | :--- | :--- | :--- |
| **POS Sales Invoice** | `INV-` | `INV-00001` | Counter POS checkout receipts and credit invoices |
| **Sales Return Slip** | `RET-` | `RET-00001` | Customer return and refund vouchers |
| **Customer Warranty Claim** | `CLM-` | `CLM-00001` | Customer warranty replacement claims |
| **Supplier Warranty Claim** | `SUP-CLM-` | `SUP-CLM-00001` | Supplier RMA dispatch and restock batches |
| **Purchase Order** | `PUR-` | `PUR-00001` | Supplier inventory purchases |
| **Purchase Return** | `PR-` | `PR-00001` | Supplier returns and debit notes |
| **Customer Payment Receipt** | `CR-` | `CR-00001` | Customer credit collection vouchers |
| **Supplier Payment Voucher** | `SP-` | `SP-00001` | Supplier payment disbursements |
| **Stock Adjustment Voucher** | `ADJ-` | `ADJ-00001` | Inventory adjustments and stock writes-offs |
| **General Ledger Journal** | `JE-` | `JE-00001` | Double-entry journal entries |
| **Customer Code** | `CUS-` | `CUS-00001` | Registered customer records |
| **Supplier Code** | `SUP-` | `SUP-00001` | Authoritative supplier records |
| **Product SKU** | `PRD-` | `PRD-00001` | Master inventory items |

---

## Bulk Excel/CSV Import & Form Alignment

The bulk import system for **Products**, **Customers**, and **Suppliers** matches the exact fields on their respective entry forms. Identifier codes (`PRD-XXXXX`, `CUS-XXXXX`, `SUP-XXXXX`) are **generated automatically** in sequential order by the system.

### 1. Product Import Format
* **Headers:** `Product Name *`, `Category`, `Unit (e.g. pcs, kg)`, `Barcode (Optional)`, `Purchase Price (Rs.)`, `Selling Price (Rs.) *`, `Opening Quantity`, `Min Stock Level`, `Warranty Period (Days)`, `Description`.
* **Download Template:** Available via the Product Catalog modal.

### 2. Customer Import Format
* **Headers:** `Customer Name *`, `Phone Number`, `Email Address`, `Billing Address`, `Credit Allowed (Yes/No)`, `Opening Balance (Rs.)`, `Notes / Remarks`.
* **Download Template:** Available via the Customer Directory modal.

### 3. Supplier Import Format
* **Headers:** `Contact Person Name *`, `Company / Business Name`, `Phone Number`, `Email Address`, `Office / Factory Address`, `Tax / NTN / STRN`, `Opening Payable Balance (Rs.)`, `Notes / Payment Terms`.
* **Download Template:** Available via the Supplier Directory modal.

---

## Local Setup Without Docker (Alternative)

### 1. Backend Setup (Django)
```bash
cd backend
python -m venv venv

# Activate virtual environment:
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py init_clean_system      # Or seed_all_demo_data for demo
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## Available CLI Management Commands

```bash
# Clean production initialization (All accounts 0.00, empty catalog, sequences start at 1)
python manage.py init_clean_system

# Seed full demo sandbox
python manage.py seed_all_demo_data

# Clear all transactional data and reset sequences to 1 (preserving master configs)
python manage.py clear_transactional_data

# Seed individual components
python manage.py seed_roles_and_users       # Creates system roles & default users
python manage.py seed_chart_of_accounts     # Creates 32 GAAP accounts & payment methods (0.00 balance)
python manage.py seed_settings              # Initializes business settings, prefixes, and tax
python manage.py seed_contacts              # Seeds customers and suppliers
python manage.py seed_products              # Seeds categories, units, and products
python manage.py seed_inventory             # Seeds opening stock and WAC costs
python manage.py seed_purchases             # Seeds supplier purchases
python manage.py seed_sales                 # Seeds sample POS sales & day sessions
python manage.py seed_expenses              # Seeds operational expenses
python manage.py seed_employees             # Seeds employee directory & attendance
python manage.py seed_receivables           # Seeds customer credit & balances
```

---

## Running Automated Verification Tests

Execute the comprehensive automated test suites:

```bash
# Phase verification suite
docker compose exec backend python test_phase13_suite.py

# Django app unit tests
docker compose exec backend python manage.py test apps.warranty apps.products apps.core apps.accounting apps.sales
```

---

## Project Directory Structure

```
POS-Software/
├── backend/
│   ├── apps/
│   │   ├── accounting/         # GAAP Chart of Accounts, JEs, Ledgers, Reports
│   │   ├── contacts/           # Customers, Suppliers, Receivables & Statements
│   │   ├── core/               # System settings, document sequences, dashboard analytics
│   │   ├── employees/          # Staff directory, attendance rosters, payroll slips
│   │   ├── expenses/           # Expense categories, vouchers, and disbursements
│   │   ├── inventory/          # Live stock catalog, WAC, adjustments, audit cards
│   │   ├── products/           # Categories, Units, Product Master, media upload & deletion guards
│   │   ├── purchases/          # Purchases, Purchase returns, multi-method refunds
│   │   ├── sales/              # POS Checkout, Day Sessions, Receipts, Invoices
│   │   ├── users/              # Authentication, User profiles, RBAC roles & permissions
│   │   └── warranty/           # Customer replacements, Supplier RMA batches, restock receipts
│   ├── config/                 # Django settings, ASGI/WSGI, versioned URLs
│   ├── requirements.txt        # Python package dependencies
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI cards, tables, badges, modals, layouts
│   │   ├── context/            # AuthContext, SettingsContext, ToastContext
│   │   ├── pages/              # POS, Products, Inventory, Purchases, Warranty, Accounting, etc.
│   │   ├── services/           # Axios API services for each ERP submodule
│   │   ├── styles/             # Dark mode theme & responsive CSS design tokens
│   │   ├── types/              # TypeScript interface definitions
│   │   └── utils/              # Image resolution, currency, formatters
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docker/
│   ├── backend/                # Backend Dockerfile & auto-migration entrypoint
│   └── frontend/               # Frontend Dockerfile
│
├── .env.example                # Sample environment template
├── docker-compose.yml          # Multi-container orchestration
├── SETUP_GUIDE.md              # Step-by-step setup and installation guide
└── README.md
```

---

## License

This software is distributed under the **MIT License**.
