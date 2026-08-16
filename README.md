# ApexPOS — Enterprise Point of Sale System

> **Phase 0: Architecture, Docker & Project Foundation**

ApexPOS is a robust, modular, and containerized enterprise Point of Sale (POS) system engineered with React + TypeScript, Django REST Framework, and PostgreSQL.

---

## 0.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Docker Network                        │
│                                                             │
│  ┌───────────────────────┐         ┌─────────────────────┐  │
│  │   frontend (Vite)     │  HTTP   │   backend (Django)  │  │
│  │   React + TypeScript  ├────────►│   DRF + CORS        │  │
│  │   Port: 5173          │ /api/v1 │   Port: 8000        │  │
│  └───────────────────────┘         └──────────┬──────────┘  │
│                                               │             │
│                                               │ SQL (pg)    │
│                                               ▼             │
│                                    ┌─────────────────────┐  │
│                                    │   db (PostgreSQL)   │  │
│                                    │   Port: 5432        │  │
│                                    │   Volume: pg_data   │  │
│                                    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **Frontend**: React 18 with TypeScript, Vite build tool, centralized Axios interceptors, responsive custom CSS design system with dark mode & glassmorphism.
- **Backend**: Django 5.0 with Django REST Framework, environment configuration via `django-environ`, versioned routing under `/api/v1/`, and modular `apps/` architecture.
- **Database**: PostgreSQL 16 Alpine running in a container with a named persistent Docker volume (`pos_postgres_data`).
- **Orchestration**: Docker Compose with health checks (`pg_isready`), live volume mounts for hot-reload in both frontend and backend, and isolated bridge network.

---

## 0.2 Project Directory Structure

```
POS software/
├── backend/
│   ├── apps/
│   │   ├── __init__.py
│   │   └── core/              # Health checks & system discovery
│   │       ├── apps.py
│   │       ├── urls.py
│   │       └── views.py
│   ├── config/
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py        # Environment-driven settings
│   │   ├── urls.py            # /api/v1/ router
│   │   └── wsgi.py
│   ├── requirements/
│   │   ├── base.txt
│   │   └── dev.txt
│   ├── requirements.txt
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Badge, Button, Card, LoadingSpinner
│   │   │   └── layout/        # Header, Sidebar, MainLayout
│   │   ├── pages/
│   │   │   ├── Dashboard/     # Live diagnostic status & metrics
│   │   │   └── NotFound/
│   │   ├── services/
│   │   │   ├── api.ts         # Axios client with interceptors
│   │   │   └── healthService.ts
│   │   ├── styles/
│   │   │   └── index.css      # Design system tokens & utility classes
│   │   ├── types/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docker/
│   ├── backend/
│   │   ├── Dockerfile
│   │   └── entrypoint.sh      # Auto DB wait & migration runner
│   └── frontend/
│       └── Dockerfile
│
├── .env.example
├── .env
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 0.3 Quick Start with Docker (Recommended)

### 1. Clone & Configure Environment
Ensure `.env` exists (copied from `.env.example`):
```bash
cp .env.example .env
```

### 2. Build and Start Containers
```bash
docker compose up --build
```

### 3. Access Services
- **Frontend UI**: [http://localhost:5173](http://localhost:5173)
- **Django API Root**: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)
- **Health Check Probe**: [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/)
- **Django Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/)

### 4. Database Volume Persistence
- Stop containers (data is preserved):
  ```bash
  docker compose down
  ```
- Stop containers and delete database volume:
  ```bash
  docker compose down -v
  ```

---

## 0.4 Local Manual Development (Without Docker)

### Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Run migrations and start dev server:
   ```bash
   cd backend
   python manage.py migrate
   python manage.py runserver 8000
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start Vite dev server:
   ```bash
   npm run dev
   ```

---

## 0.5 Health Check Endpoint Specification

### `GET /api/v1/health/`
Returns the status of Django and active connectivity to PostgreSQL.

**Response Example (HTTP 200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-08-16T11:20:00.000000Z",
  "environment": {
    "django_version": "5.0.6",
    "python_version": "3.11.9",
    "debug": true
  },
  "services": {
    "backend": {
      "status": "online",
      "framework": "Django REST Framework"
    },
    "database": {
      "status": "connected",
      "engine": "postgresql",
      "name": "pos_db",
      "host": "db",
      "latency_ms": 1.42,
      "error": null
    }
  },
  "total_latency_ms": 2.15
}
```

---

## 0.6 Architectural & Financial Principles

1. **One Source of Truth**: Data records (products, customers, accounts) have distinct canonical owners. Transactions reference primary keys without copying mutable master entities.
2. **Transaction-Based Stock**: No duplicated or unmanaged inventory counters across tables. Real stock levels are calculated strictly from auditable stock movement transactions.
3. **Atomic Financial Operations**: All sales, returns, payments, stock movements, and ledger postings execute inside atomic DB transactions (`BEGIN...COMMIT`). If any step fails, the entire transaction rolls back.
4. **Immutable History**: Completed financial events are never deleted. Reversals and returns are executed via explicit debit/credit balancing records.

---

## 0.7 Roadmap

- [x] **Phase 0**: Architecture, Docker & Project Foundation
- [ ] **Phase 1**: Users, Roles, Permissions (RBAC) & Authentication
- [ ] **Phase 2**: Product Catalog & Categorization
- [ ] **Phase 3**: Customer Management
- [ ] **Phase 4**: Supplier Management
- [ ] **Phase 5**: Purchasing & Supplier Invoicing
- [ ] **Phase 6**: Inventory Movements & Warehouses
- [ ] **Phase 7**: POS Register & Barcode Scanning
- [ ] **Phase 8**: Sales, Receipts & Tax Calculation
- [ ] **Phase 9**: Expense Management
- [ ] **Phase 10**: Employee Shifts & Attendance
- [ ] **Phase 11**: Double-Entry Accounting & Ledger
- [ ] **Phase 12**: Analytics, Reports & Financial Summaries
