# ApexPOS — Quick Setup & Installation Guide

Simple step-by-step instructions to get **ApexPOS** running on Windows, macOS, or Linux.

---

## Method 1: Docker Setup (Recommended — 2 Minutes)

### Step 1: Clone Repository & Create `.env`
```bash
git clone https://github.com/sherry-mughal-codes/POS-Software.git
cd POS-Software
```
Copy `.env.example` to `.env`:
- **Windows (PowerShell):** `Copy-Item .env.example .env`
- **Mac / Linux:** `cp .env.example .env`

### Step 2: Start Containers
```bash
docker compose up --build -d
```

### Step 3: Initialize System
Choose one of the following:

- **Clean Production (For Real Store):**
  ```bash
  docker compose exec backend python manage.py init_clean_system
  ```
- **Demo Mode (With Sample Products & Sales):**
  ```bash
  docker compose exec backend python manage.py seed_all_demo_data
  ```

### Step 4: Open Application
Open your browser and navigate to: **[http://localhost:5173](http://localhost:5173)**

---

## Default Login Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` |
| **Branch Manager** | `manager` | `manager123` |
| **Cashier** | `cashier` | `cashier123` |
| **Accountant** | `accountant` | `accountant123` |

---

## Method 2: Manual Local Setup (Without Docker)

### Prerequisites
- Python 3.11+, Node.js 18+, and PostgreSQL 15+ running on port `5432`.

### Step 1: Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtualenv:
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py init_clean_system
python manage.py runserver 127.0.0.1:8000
```

### Step 2: Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

Visit: **[http://localhost:5173](http://localhost:5173)**

---

## Useful Commands

- **Clear Transactional Data:** `docker compose exec backend python manage.py clear_transactional_data`
- **Run Edge Case Tests:** `docker compose exec backend python run_edge_case_tests.py`
- **Stop Containers:** `docker compose down`
