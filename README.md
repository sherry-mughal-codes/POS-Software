# ApexPOS — Enterprise Point of Sale & ERP System

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Django](https://img.shields.io/badge/Backend-Django%205.0%20%2B%20DRF-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%205-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

**ApexPOS** is a full-stack, enterprise-grade Point of Sale (POS), Inventory Control, Double-Entry Accounting, and Human Resource ERP software engineered with modern web technologies, strict GAAP accounting compliance, and a high-performance modular architecture.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Modules & Features](#key-modules--features)
- [Quick Start Guide (Docker — Recommended)](#quick-start-guide-docker--recommended)
- [Default Login Credentials](#default-login-credentials)
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

## Key Modules & Features

| Module | Features & Capabilities |
| :--- | :--- |
| **POS Terminal & Register** | Real-time barcode laser scanning, instant search, fast itemized cart, line-item discounts & bill discounts, split payments (Cash / Bank / Cheque / Store Credit), customer selector, thermal receipts, and register day sessions with drawer cash float audits. |
| **Product Master Catalog** | Auto-generating sequential SKUs, barcode tracking, hierarchical categories, Units of Measurement (with fractional decimal support), profit margin calculators, stock-free service toggles, **local gallery image upload (drag-and-drop)**, and bulk Excel/CSV import/export. |
| **Inventory & Stock Control** | Live stock catalog, Weighted Average Costing (WAC) valuation, signed stock movement ledgers, product stock cards, multi-reason stock adjustments with automatic General Ledger inventory postings, and low-stock alerts. |
| **Purchasing & AP Management** | Supplier directories, purchase orders, purchase returns with multi-method refunds (Cash, Bank, AP deduction) with double-entry debit/credit ledger posting. |
| **Customers & Receivables (AR)** | Customer profiles, walk-in customer defaults, credit limits, payment receipts, customer account ledgers, statements with non-balance impacting returns audit. |
| **Expense Management** | Categorized operational expense vouchers, cash/bank settlements, Accounts Payable tracking, and direct GL expense entries. |
| **Staff & Payroll Management** | Employee directory, monthly attendance roster with employee filtering, automated monthly salary slip calculations, and salary disbursements with Accrued Salaries Payable (`2030`) reconciliation. |
| **Double-Entry General Ledger** | Standard 5-digit GAAP Chart of Accounts (Assets, Liabilities, Equity, Revenue, COGS, Expenses), interactive Account Ledgers, Trial Balance, Profit & Loss Statement, and Balance Sheet. |
| **Role-Based Access Control** | Granular permissions for Admin, Branch Manager, Cashier, Inventory Officer, and Chief Accountant. |
| **Executive Analytics Dashboard** | Real-time Gross/Net Sales, Cost of Goods Sold (COGS), Gross Profit, Net Profit, Liquid Cash/Bank tracking, Top Products, and Cashier Leaderboards. |

---

## Quick Start Guide (Docker — Recommended)

Follow these simple steps to run ApexPOS on any computer or laptop running **Windows**, **macOS**, or **Linux**.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v20+ with Docker Compose v2+)
- [Git](https://git-scm.com/)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/sherry-mughal-codes/POS-Software.git
cd POS-Software
```

---

### Step 2: Configure Environment Variables

Copy the provided `.env.example` template to `.env`:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Linux / macOS:**
```bash
cp .env.example .env
```

*(The default credentials in `.env.example` work out-of-the-box for local development).*

---

### Step 3: Build and Start Containers

```bash
docker compose up --build -d
```

> **Note:** The backend automatically applies all database migrations during startup via its entrypoint script.

---

### Step 4: Seed Demo Data & Initial Setup

Run the single master seed command to create the default user accounts, Chart of Accounts, system settings, categories, units, and sample catalog:

```bash
docker compose exec backend python manage.py seed_all_demo_data
```

---

### Step 5: Access the Application

Open your browser and navigate to:

| Service | URL | Description |
| :--- | :--- | :--- |
| **Web Application (Frontend)** | [http://localhost:5173](http://localhost:5173) | Main POS, ERP, and Dashboard UI |
| **Backend REST API** | [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/) | Versioned REST API Root |
| **Django Admin Panel** | [http://localhost:8000/admin/](http://localhost:8000/admin/) | System Administration Portal |

---

## Default Login Credentials

After running `seed_all_demo_data`, you can sign in with any of the following pre-configured user accounts:

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full access to all modules, settings, users, and financial reports |
| **Branch Manager** | `manager` | `manager123` | Access to POS, inventory, purchasing, expenses, and staff |
| **Cashier** | `cashier` | `cashier123` | Streamlined access to POS Terminal, sales receipts, and day registers |
| **Accountant** | `accountant` | `accountant123` | Access to General Ledger, Chart of Accounts, journal entries, and financial statements |

---

## Local Setup Without Docker (Alternative)

If you wish to run the project natively without Docker containers:

### 1. Backend Setup (Django)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a Python virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set environment variables (or create a .env file inside backend/)
# Ensure a local PostgreSQL server is running on port 5432 with database 'pos_db'

# 5. Apply migrations
python manage.py migrate

# 6. Seed demo data
python manage.py seed_all_demo_data

# 7. Start Django development server
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup (React + Vite)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node.js packages
npm install

# 3. Start Vite development server
npm run dev
```

---

## Available CLI Management Commands

You can execute any of these management commands inside the Docker backend container (`docker compose exec backend python manage.py <command>`):

```bash
# Initialize entire database in one step
python manage.py seed_all_demo_data

# Seed individual components
python manage.py seed_roles_and_users       # Creates system roles & sample users
python manage.py seed_chart_of_accounts     # Creates standard 5-digit GAAP COA & payment methods
python manage.py seed_settings              # Initializes business settings, currency, and tax
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

ApexPOS includes comprehensive automated test suites covering all accounting invariants, sales profit calculations, double-entry journal balance equations, and API views.

To execute the test suite:

```bash
docker compose exec backend python test_phase13_suite.py
```

Expected output:
```
======================================================================
PHASE 13 SUITE RESULT: 11/11 TESTS PASSED (100% SUCCESS)
======================================================================
```

---

## Project Directory Structure

```
POS-Software/
├── backend/
│   ├── apps/
│   │   ├── accounting/         # GAAP Chart of Accounts, JEs, Ledgers, Reports
│   │   ├── contacts/           # Customers, Suppliers, Receivables & Statements
│   │   ├── core/               # System settings, health, dashboard analytics
│   │   ├── employees/          # Staff directory, attendance rosters, payroll slips
│   │   ├── expenses/           # Expense categories, vouchers, and disbursements
│   │   ├── inventory/          # Live stock catalog, WAC, adjustments, audit cards
│   │   ├── products/           # Categories, Units, Product Master, media upload
│   │   ├── purchases/          # Purchases, Purchase returns, multi-method refunds
│   │   ├── sales/              # POS Checkout, Day Sessions, Receipts, Invoices
│   │   └── users/              # Authentication, User profiles, RBAC roles
│   ├── config/                 # Django settings, ASGI/WSGI, versioned URLs
│   ├── requirements.txt        # Python package dependencies
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI cards, tables, badges, modals, layouts
│   │   ├── context/            # AuthContext, SettingsContext
│   │   ├── pages/              # POS, Inventory, Purchases, Accounting, Dashboard, etc.
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
└── README.md
```

---

## API Endpoints Overview

All REST API endpoints are versioned under `/api/v1/`:

- `POST /api/v1/auth/login/` — JWT authentication & session token issue
- `GET  /api/v1/core/dashboard/` — Real-time executive KPIs & analytics
- `GET  /api/v1/products/` — Product Master catalog (with image support)
- `GET  /api/v1/inventory/summary/` — Real-time live stock & WAC valuation
- `POST /api/v1/sales/` — Submit POS sale & post double-entry GL entries
- `POST /api/v1/purchases/returns/` — Process purchase return (Cash, Bank, AP)
- `GET  /api/v1/accounting/trial-balance/` — Real-time Trial Balance report
- `GET  /api/v1/accounting/profit-loss/` — Accrual Income & Profit Statement
- `GET  /api/v1/accounting/balance-sheet/` — Balanced Balance Sheet statement
- `GET  /api/v1/employees/salary-slips/` — Monthly salary slips & disbursement vouchers

---

## Helpful Commands Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Start Containers** | `docker compose up -d` |
| **Stop Containers** | `docker compose down` |
| **Restart Services** | `docker compose restart` |
| **View Live Logs** | `docker compose logs -f` |
| **Run Migrations** | `docker compose exec backend python manage.py migrate` |
| **Seed Full Demo Data** | `docker compose exec backend python manage.py seed_all_demo_data` |
| **Create Superuser** | `docker compose exec backend python manage.py createsuperuser` |
| **Execute Test Suite** | `docker compose exec backend python test_phase13_suite.py` |

---

## License

This software is distributed under the **MIT License**. Feel free to use, modify, and distribute it in your commercial or open-source projects.
