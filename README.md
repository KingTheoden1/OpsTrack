# OpsTrack

**Full-stack defect tracking dashboard for aerospace maintenance workflows.**

![CI](https://github.com/KingTheoden1/OpsTrack/actions/workflows/ci.yml/badge.svg)
![Coverage](https://img.shields.io/badge/coverage-60%25+-brightgreen)

Live demo: https://reasonable-luck-production-5b09.up.railway.app

---

## What It Does

OpsTrack is an operations analytics platform where authenticated users can log, track, and analyze equipment defects. It was built to mirror the tooling used in aerospace maintenance environments — role-based workflows, structured data entry, and AI-assisted risk analysis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Data Fetching | TanStack Query (React Query v5) |
| Charts | visx (D3-backed SVG charts) |
| Routing | React Router v6 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (auto-migrated on startup) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| AI Service | Python, FastAPI, Anthropic Claude API |
| CSV Processing | pandas |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Deployment | Railway |

---

## Architecture

The project is a monorepo with three independently deployable services:

```
OpsTrack/
├── apps/
│   ├── frontend/       # React SPA (served by nginx in production)
│   └── backend/        # Express REST API
├── services/
│   └── ai/             # Python FastAPI microservice
└── docker-compose.yml  # Local orchestration
```

- The **frontend** communicates with the backend via Axios with a JWT bearer token attached to every request.
- The **backend** connects to PostgreSQL and handles all CRUD operations, authentication, and authorization.
- The **AI service** is a separate Python process that receives defect data from the frontend and calls the Claude API independently — it does not go through the backend.

---

## Authentication & Authorization

- Users register and log in via `/api/auth`. Passwords are hashed with bcryptjs.
- On login, the server signs a JWT (7-day expiry) and returns it to the client.
- The frontend stores the token in localStorage and attaches it to every API request via an Axios interceptor.
- A 401 response automatically redirects the user to the login page.
- Three roles exist: **Admin**, **Supervisor**, and **Viewer**.
  - Admins and Supervisors can create, edit, and delete defects, and import CSVs.
  - Viewers can only read.

---

## Key Features

### Defect Log
- Full CRUD for defects with fields: title, description, severity (critical / high / medium / low), status (open / in progress / resolved / closed), and reporter.
- Defects are sorted by ID descending so the newest always appear first.

### Dashboard
- Four stat cards: Total Defects, Open, Critical, Resolved/Closed.
- Two responsive bar charts built with visx: defects by severity and defects by status.
- Recent defects list with color-coded severity indicators.

### AI Analysis
- Sends all logged defects to the Python AI service, which calls Claude (Haiku model).
- Returns a structured JSON response with a plain-language summary, identified risk areas, and actionable recommendations.
- The prompt instructs Claude to return valid JSON only; the service strips any markdown fences before parsing.

### CSV Import
- Upload a `.csv` file with columns: `title`, `description`, `severity`, `status`.
- The AI service parses and validates the file using pandas, returning a preview of the first 5 rows.
- On confirmation, the frontend sends the rows to the backend's bulk insert endpoint, which wraps the inserts in a single database transaction (up to 500 rows).
- A sample file is included in the repo: [`sample-defects.csv`](./sample-defects.csv) — 10 aerospace-themed defect entries ready to import.

---

## CI/CD Pipeline

GitHub Actions runs on every push and pull request to `main` with four jobs:

1. **Frontend** — ESLint, TypeScript typecheck, Vite build
2. **Backend** — ESLint, TypeScript typecheck
3. **AI Service** — pip install (dependency validation)
4. **Docker** — builds all images (runs only after the first three pass)

This ensures no broken code ever reaches the `main` branch.

---

## Trying the Live Demo

Visit https://reasonable-luck-production-5b09.up.railway.app and **create an account** on the Register page before logging in. Once registered, you will be assigned the Admin role and have full access to the defect log, dashboard, and AI analysis.

---

## Running Locally

**Prerequisites:** Docker Desktop, Node.js 20, pnpm

```bash
# Clone the repo
git clone https://github.com/KingTheoden1/OpsTrack.git
cd OpsTrack

# Copy environment variables
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Start all services
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| AI Service | http://localhost:8000 |

---

## Interview Reference Points

**"Why a monorepo?"**
Keeps all services in one place for a portfolio project — single git history, shared CI pipeline, easy to demo. In production at scale you'd evaluate whether separate repos make sense for team ownership boundaries.

**"Why a separate AI microservice instead of calling Claude from the backend?"**
It keeps concerns separated — the Python ecosystem (pandas, FastAPI) is better suited for data processing and ML adjacent tasks than Node.js. It also means the AI service can be swapped, scaled, or replaced independently without touching the core API.

**"How does the bulk insert work?"**
The backend opens a single pg client, begins a transaction, inserts all rows with parameterized queries, then commits. If anything fails mid-insert, the whole batch rolls back — no partial imports.

**"What does the CI pipeline protect against?"**
It catches TypeScript type errors, lint violations, and broken Docker builds before they hit main. A broken import or unused variable that TypeScript flags locally will also fail in CI, so the main branch is always in a deployable state.

**"How did you handle the JWT on the frontend?"**
An Axios request interceptor reads the token from a React context (backed by localStorage) and injects it as a Bearer token on every outgoing request. A response interceptor listens for 401s and redirects to login — so token expiry is handled globally without any per-page logic.
