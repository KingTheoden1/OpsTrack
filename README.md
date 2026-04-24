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
| Testing | Jest + Supertest (backend), Vitest + React Testing Library (frontend) |
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
  - Admins can create, edit, delete defects and assets, and import CSVs.
  - Supervisors can create and edit, but cannot delete.
  - Viewers can only read.

---

## Key Features

### Defect Log
- Full CRUD for defects with fields: title, description, severity (critical / high / medium / low), status (open / in progress / resolved / closed), and reporter.
- **Search and filtering** — filter by severity, status, or free-text search across title and description simultaneously. Active filter count updates the subtitle in real time. A Clear button resets all filters at once.
- **Client-side pagination** — 10 defects per page with a smart page number bar (ellipsis gaps for large sets). Pagination resets automatically when any filter changes.
- **Detail slide-over panel** — clicking any row slides in a panel from the right showing the full description, all metadata, and an inline edit form for admin/supervisor users. Closes on Escape or backdrop click.
- Defects are sorted by ID descending so the newest always appear first.

### Asset Management
- Full CRUD for tracked assets (name, type, location).
- Search bar filters by name, type, or location.
- Same slide-over pattern as the defect log — click a row to see details and edit inline.
- Admin-only delete with an inline confirmation step to prevent accidental removal.

### Dashboard
- Four stat cards: Total Defects, Open, Critical, Resolved/Closed.
- Two responsive bar charts built with visx: defects by severity and defects by status.
- Tooltips appear at the cursor position on hover (not offset from the bar).
- Y-axis always shows whole-number ticks only.
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

## Test Suite

Tests run automatically in CI on every push.

### Backend (Jest + Supertest)
- Unit tests for the JWT middleware (`signToken`, `authenticate`, `requireRole`)
- Integration tests for all route handlers using a mocked `pg` pool — no real database required
- Transaction rollback test for the bulk insert endpoint

### Frontend (Vitest + React Testing Library)
- `AuthContext` — sign in/out state, localStorage persistence, provider guard
- `ProtectedRoute` — redirect when unauthenticated, render when authenticated
- `Layout` — nav links, role badge, sign-out behavior
- `DefectLog` — data display, RBAC on create/edit, search filtering, pagination, slide-over panel
- `Assets` — data display, RBAC on create/delete, search, slide-over panel
- `AIAnalysis` — run analysis button, CSV import RBAC by role

---

## CI/CD Pipeline

GitHub Actions runs on every push and pull request to `main` with four jobs:

1. **Frontend** — ESLint, TypeScript typecheck, Vitest test suite, Vite build
2. **Backend** — ESLint, TypeScript typecheck, Jest test suite
3. **AI Service** — pip install (dependency validation)
4. **Docker** — builds all production images (runs only after the first three pass)

This ensures no broken code, failing test, or broken Docker build ever reaches the `main` branch.

---

## Trying the Live Demo

Visit https://reasonable-luck-production-5b09.up.railway.app and **create an account** on the Register page before logging in. Once registered, you will be assigned the Admin role and have full access to all features.

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

## Problems & Solutions encountered

A record of real technical challenges encountered during development and how they were resolved. Useful for behavioral and technical interview questions.

---

**Problem: Jest mocking `pool` from `../../db` in integration tests**

The backend integration tests need to mock PostgreSQL so CI doesn't require a running database. The first attempt used `require()` inside the test after the mock was set up, but `jest.mock()` is hoisted to the top of the file at compile time — so any import that ran before the mock was applied would get the real `pool`.

*Solution:* Converted all requires to ES imports and used the hoisting behavior intentionally. `jest.mock('../../db', () => ({ pool: { query: jest.fn() } }))` is declared at the top of the file, which means the mock is in place before any module import resolves. The mocked instance is then accessed via a type assertion: `const mockPool = pool as unknown as { query: jest.Mock }`.

---

**Problem: `@testing-library/react` DOM not cleaning up between tests**

Multiple frontend tests were failing with "Found multiple elements with the text: X" — the second test in a file was seeing DOM from the first test still in the document.

*Root cause:* `@testing-library/react` registers its cleanup via `afterEach(cleanup)` at module load time. This only works if `afterEach` is a global. Vitest does not expose globals by default, so the cleanup registration silently failed and every rendered tree persisted for the entire test file.

*Solution:* Added `globals: true` to the `test` block in `vite.config.ts`. This exposes `afterEach`, `beforeEach`, `describe`, and `expect` as globals, which unblocks the cleanup registration. Also added `"vitest/globals"` to the `types` array in `tsconfig.json` so TypeScript knows about the global declarations.

---

**Problem: Express `throw err` in async route handler didn't reach the error middleware**

The bulk insert route caught a failed transaction, called `ROLLBACK`, then re-threw the error expecting Express's error handler to return a 500. In tests the request just timed out at 5000ms instead.

*Root cause:* Express 4 does not automatically catch errors thrown inside `async` functions. An unhandled promise rejection from `throw err` never reaches the `(err, req, res, next)` error middleware — the request simply hangs.

*Solution:* Added `next` as the third parameter to the route handler and replaced `throw err` with `next(err)`. This forwards the error explicitly to Express's error middleware, which sends a 500 and completes the request.

---

**Problem: Dashboard chart tooltip rendering far from the cursor**

The bar chart tooltips appeared in the wrong position — sometimes off-screen, always offset from where the mouse actually was.

*Root cause:* `e.clientX` and `e.clientY` are viewport-absolute coordinates. `TooltipWithBounds` from `@visx/tooltip` positions itself relative to its nearest `position: relative` ancestor (the wrapper div). Passing raw `clientX/Y` meant the tooltip was placed at screen coordinates inside a div-relative coordinate system, which doesn't line up.

*Solution:* Added a `useRef` to the wrapper div and subtracted `containerRef.current.getBoundingClientRect()` from the mouse coordinates inside `onMouseMove`. This converts page-absolute coordinates to container-local coordinates that `TooltipWithBounds` interprets correctly.

---

**Problem: Horizontal scrollbar appearing on the dashboard**

A thin horizontal scrollbar appeared at the bottom of the page whenever the chart section was visible.

*Root cause:* The `<svg>` element rendered at exactly the width measured by `ParentSize`. Sub-pixel rounding in the browser sometimes made the SVG 1–2px wider than the container, which caused the `overflow-y-auto` on the main layout element to also show a horizontal scrollbar.

*Solution:* Added `overflow: hidden` to the `position: relative` wrapper div that surrounds each SVG. This clips any sub-pixel overflow before it propagates up to the scroll container.

---

**Problem: Y-axis on charts showing decimal tick values (0.5, 1.5)**

When the defect count was low (e.g., 2 defects), the Y-axis showed 0, 0.5, 1.0, 1.5, 2.0 — fractional ticks on a count axis that only makes sense as integers.

*Root cause:* `scaleLinear` with `numTicks={4}` picks evenly spaced ticks across the domain regardless of whether those values are integers.

*Solution:* Set `numTicks` to `Math.min(maxCount, 5)` so the axis never requests more ticks than there are integer values, and added a `tickFormat` callback that returns an empty string for any non-integer tick that `nice()` might still generate.

---

## Q&A

**"Why a monorepo?"**
Keeps all services in one place for a portfolio project — single git history, shared CI pipeline, easy to demo. In production at scale you'd evaluate whether separate repos make sense for team ownership boundaries.

**"Why a separate AI microservice instead of calling Claude from the backend?"**
It keeps concerns separated — the Python ecosystem (pandas, FastAPI) is better suited for data processing and ML-adjacent tasks than Node.js. It also means the AI service can be swapped, scaled, or replaced independently without touching the core API.

**"How does the bulk insert work?"**
The backend opens a single pg client, begins a transaction, inserts all rows with parameterized queries, then commits. If anything fails mid-insert, the whole batch rolls back — no partial imports. The error is forwarded via `next(err)` so Express returns a clean 500.

**"What does the CI pipeline protect against?"**
It catches TypeScript type errors, lint violations, failing unit and integration tests, and broken Docker builds before they hit main. The main branch is always in a deployable state.

**"How did you handle the JWT on the frontend?"**
An Axios request interceptor reads the token from a React context (backed by localStorage) and injects it as a Bearer token on every outgoing request. A response interceptor listens for 401s and redirects to login — so token expiry is handled globally without any per-page logic.

**"How did you approach testing without a real database?"**
Jest's `jest.mock()` hoisting replaces the `pg` pool with a mock before any module imports execute. Each test then calls `mockPool.query.mockResolvedValueOnce(...)` to control exactly what the database returns for that scenario. This keeps tests fast, deterministic, and runnable in any environment.
