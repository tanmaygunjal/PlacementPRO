# PlacementPro - Training & Placement Portal

PlacementPro is a complete placement training and tracking portal. The application is built using a modern **FastAPI** backend, a lightweight database layer (SQLAlchemy ORM supporting SQLite and PostgreSQL), and a clean **HTML5 / CSS3 / Vanilla JavaScript Single Page Application (SPA)** frontend served directly from the backend.

---

## 🚀 Key Features

### 1. Smart Placement Dashboard
Rather than simple graphs, students have access to a dashboard providing actionable metrics:
- **Placement Readiness Score (0-100%)**: Dynamically evaluated based on profile completion, resume uploads, core skills matching, job applications, and CGPA metrics.
- **Industry Core Skills Matcher**: Compares student's skills against standard core tech requirements (`SQL`, `DBMS`, `Aptitude`, `Python`, `Data Structures`, `Algorithms`) highlighting matched skills (green checks) and missing skills (red tags).
- **Upcoming Deadlines**: Lists job listings expiring in the next 7 days.
- **Interview Readiness Level**: Dynamic badge indicator (Low/Moderate/High) based on active application states.

### 2. Resume Builder & Template Themes
Students can write and format their resumes online:
- Interactive inputs form to add/remove multiple **Education**, **Work Experience**, and **Project** entries dynamically.
- Selectable template styles with real-time **Live Preview** updates:
  - *Classic Corporate*: Minimal grayscale design.
  - *Modern Professional*: Left-aligned accented blue headers.
  - *Minimalist*: Monochrome professional layout.
- **PDF Export**: CSS page-breaks and `@media print` parameters configuration hide the web application boundaries and render an A4 resume PDF natively using standard browser printing (`window.print()`).

### 3. ATS Score Auditor
An automated scoring audit scans builder content:
- **Length Checker (25 pts)**: Audits total word count, ensuring it falls within the optimal single-page target (250-650 words).
- **Action Verbs Check (25 pts)**: Validates presence of strong action verbs (*developed, designed, optimized, implemented, led, built, created, analyzed*).
- **Tech Skills Match (30 pts)**: Identifies presence of core technical competencies (*python, sql, dbms, docker, javascript, react, fastapi, django, git*).
- **Formatting Warnings (20 pts)**: Deducts points if key resume sections (summary, projects, experience, education) are omitted.

### 4. Recruiter & Admin Portal
- Create and manage corporate profiles (Companies).
- Post new Job Listings detailing locations, compensation (CTC), deadline calendars, and minimum CGPA criteria.
- **Applications Tracker Table**: List candidate applications for each position, access/download candidate resumes, view scores, and instantly update candidate statuses (*Applied, Shortlisted, Interviewing, Offered, Rejected*).

---

## 🛠️ Technology Stack

- **Backend Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database ORM**: [SQLAlchemy](https://www.sqlalchemy.org/) (SQLite for fast local run, PostgreSQL for containers)
- **Security**: JWT tokens (HS256) and direct `bcrypt` password hashing (bypassing `passlib` version incompatibilities)
- **Frontend client**: Served statically via FastAPI `StaticFiles` from same origin
  - *HTML5*: Semantic components structure
  - *CSS3*: Responsive grids, HSL design themes, custom glassmorphism panels, and printing properties
  - *JavaScript (ES6)*: State tracking, fetch controllers, drag-and-drop file readers, live previews

---

## 📂 Project Architecture

```
PlacementTraningProject/
│
├── app/
│   ├── main.py                     # App initializations, CORS, routers mapping, static mounts
│   ├── database.py                 # DB engine connectors (defaults to local SQLite placementpro.db)
│   │
│   ├── models/                     # SQLAlchemy mappings
│   │   ├── user.py                 # User and StudentProfile tables
│   │   ├── job.py                  # Company, Job, and Application tables
│   │   └── resume.py               # StudentResume table
│   │
│   ├── schemas/                    # Pydantic JSON serializers & validators
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── application.py
│   │   └── resume.py
│   │
│   ├── auth/                       # Security middleware
│   │   ├── security.py             # Bcrypt hashing & JWT creators
│   │   └── dependencies.py         # Current active checks & RBAC checkers
│   │
│   ├── services/                   # Service layer business logics
│   │   ├── user_service.py
│   │   ├── job_service.py
│   │   └── application_service.py
│   │
│   └── routers/                    # Endpoint routes
│       ├── auth.py                 # Sign-up, Sign-in, Me checks
│       ├── jobs.py                 # Company & Job postings (GET endpoints are public)
│       └── students.py             # Profiles, Resume uploads, Readiness, Builder, ATS checks
│
├── frontend/                       # Static web client assets
│   ├── index.html                  # Core layout structure and modals
│   ├── style.css                   # Layout design rules, animations, print media
│   └── app.js                      # Client side event hooks and fetch handlers
│
├── uploads/
│   └── resumes/                    # Local folder storing student uploaded resume PDFs
│
├── tests/                          # Automated Pytest suites
│   ├── conftest.py                 # Test DB configurations
│   ├── test_auth.py                # Authentication assertions
│   ├── test_jobs.py                # Positions & applications checks
│   └── test_readiness.py           # Dashboard math, builder entries, ATS score audits
```

---

## 🚀 How to Set Up and Run

### Method 1: Local Setup (Quickest)

1. **Create Virtual Environment & Activate**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Run Server**:
   ```bash
   PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```
   *(We run on port 8001 to prevent port 8000 conflicts with local services)*
4. **Open Browser**:
   Open **[http://127.0.0.1:8001/](http://127.0.0.1:8001/)** to load the client.

### Method 2: Containerized Run (Production-ready PostgreSQL)

Launch the integrated multi-container system (web API server + PostgreSQL database + persistent volumes) using Docker:

```bash
docker-compose up --build
```
- Exposes port `8000` by default: **`http://localhost:8000/`**.
- Automatically configures PostgreSQL database credentials.
- Volumes are mounted to `./uploads` on your machine to save candidate resumes and database data safely.

---

## 📘 Interactive API Documentation

FastAPI automatically serves interactive Swagger UI specs:
- **URL**: **`http://127.0.0.1:8001/docs`** (or `http://localhost:8000/docs` if on Docker)
- You can test all routes (Registration, Login, Profile creation, Resumes uploads) directly through the browser.

---

## 🧪 Running Automated Unit Tests

Test fixtures utilize an isolated in-memory SQLite database (`sqlite:///:memory:`) for quick execution.

```bash
PYTHONPATH=. ./venv/bin/pytest
```

**What the tests cover:**
- **Authentication**: Registrations, login flows, credentials check, JWT access tokens.
- **Profiles & Job Postings**: Creating companies and jobs, CGPA minimum eligibility criteria, resume presence validation, and successful applications.
- **Analytics & Builder**: Dashboard Readiness Score increments, Resume Builder save/load requests, and ATS scoring checks.
