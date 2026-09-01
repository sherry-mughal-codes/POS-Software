# ApexPOS Setup & Installation Guide

This guide provides step-by-step instructions for installing and running **ApexPOS** on any computer or laptop (Windows, macOS, or Linux).

---

## Method 1: Docker Setup (Recommended — 2 Minutes)

Docker is the fastest way to get ApexPOS up and running because it automatically configures PostgreSQL 16, Python/Django 5.0, and Node/React with all required dependencies.

### 1. Requirements
* Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running.
* Install [Git](https://git-scm.com/).

### 2. Clone the Repository
Open your terminal (PowerShell, Command Prompt, or Bash) and run:
```bash
git clone https://github.com/sherry-mughal-codes/POS-Software.git
cd POS-Software
```

### 3. Create the Environment File
Copy `.env.example` to `.env`:
* **Windows PowerShell:**
  ```powershell
  Copy-Item .env.example .env
  ```
* **Linux / macOS:**
  ```bash
  cp .env.example .env
  ```

### 4. Build and Start the Containers
```bash
docker compose up --build -d
```
Docker will download the images, build the frontend and backend, start the database, and automatically run database migrations.

### 5. Initialize the Database

* **Option A: Clean Production Setup (Clean Install for Real Store Use):**
  Initializes default settings, standard Chart of Accounts (all 0.00 balances), roles, units of measure, and default Walk-in Customer. Product catalog is empty, and all transaction sequences start from 1:
  ```bash
  docker compose exec backend python manage.py init_clean_system
  ```

* **Option B: Demo / Testing Setup (With Sample Products & Sales):**
  Seeds sample catalog items, mock sales, and demo stock:
  ```bash
  docker compose exec backend python manage.py seed_all_demo_data
  ```

### 6. Open the App
Visit [http://localhost:5173](http://localhost:5173) in your web browser.

---

## Default User Accounts

| Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` |
| **Manager** | `manager` | `manager123` |
| **Cashier** | `cashier` | `cashier123` |
| **Accountant** | `accountant` | `accountant123` |

---

## Method 2: Manual Local Setup (Without Docker)

If you prefer to run Python and Node.js directly on your operating system:

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm
* PostgreSQL 15+ server installed and running on port `5432` with a database named `pos_db` and user credentials matching `.env`.

### 1. Backend Setup
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

# For Clean Production:
python manage.py init_clean_system

# Or For Demo Testing:
# python manage.py seed_all_demo_data

python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Useful Daily Commands

| Action | Command |
| :--- | :--- |
| **Start software** | `docker compose up -d` |
| **Stop software** | `docker compose down` |
| **Restart software** | `docker compose restart` |
| **View real-time logs** | `docker compose logs -f` |
| **Clean Production Init** | `docker compose exec backend python manage.py init_clean_system` |
| **Reset / Re-seed Demo** | `docker compose exec backend python manage.py seed_all_demo_data` |
| **Clear Transactions Only** | `docker compose exec backend python manage.py clear_transactional_data` |
| **Run Test Suites** | `docker compose exec backend python test_phase13_suite.py` |
| **Create Custom Superuser** | `docker compose exec backend python manage.py createsuperuser` |
