# FanXI — Skills & Competencies

FanXI is a tactical-first football prediction engine (World Cup 2026 Tactical Hub) with **two interfaces** (Next.js React app + Jinja2 HTML) backed by a **single FastAPI + SQLModel (SQLite)** backend.

This document lists the practical skills required to build, maintain, and extend FanXI.

---

## 1) Product & Domain Skills

### Football domain modeling
- Modeling **leagues, teams, matches, squads, lineups**
- Understanding **formations** (4-3-3, 3-5-2, etc.) and mapping them into pitch "slots"
- Designing prediction mechanics:
  - Starting XI selection
  - Tactical sliders (mentality / line height / width)
  - Outcome predictions (result, correct score, BTTS, O/U, HT/FT)
  - Player props (first scorer, anytime scorer, assists, cards, shots, MOTM)
- Scoring design: balancing points, edge cases, and fairness

### UX/game mechanics
- Prediction lifecycle: **OPEN → CLOSED → RESULTS READY**
- Leaderboards & identity:
  - Scout profiles (username/email/country)
  - Points, ranks, titles, and progression systems

---

## 2) Backend Skills (FastAPI + SQLModel)

### FastAPI API design
- Route design, versioning mindset, REST conventions
- `APIRouter` organization: users, predictions, leagues, teams (+ intel)
- `response_model` filtering to prevent sensitive fields from leaking
- Dependency injection (`Depends`) and query params (placeholder auth via `user_id`)

### Data validation (Pydantic v2)
- Request/response schemas with strong constraints
- Field validators (e.g., username rules, lineup validation)
- Nested schemas for complex JSON payloads (lineup map, tactics object, outcome bundles)

### Database (SQLModel + SQLite now, Postgres later)
- Modeling tables and relationships (Users, matches, predictions)
- CRUD patterns via SQLModel `select()` and sessions
- Upsert behavior (overwrite "one active prediction per match per user")
- Migration readiness (designing schemas to move from SQLite → Postgres)

### Scoring engine & business logic
- Implementing deterministic scoring helpers:
  - XI matching
  - Result/correct score/BTTS/O-U/HT-FT scoring
  - Player prop scoring
- Keeping "engine" logic cleanly separated from web/UI routes

### External API integration (httpx)
- Calling football data providers
- Handling timeouts, failures, retries, and caching strategy (future)
- Normalizing provider responses into FanXI models

---

## 3) Security & Auth Skills

### Secure user registration
- Password hashing with **bcrypt** (`passlib[bcrypt]`)
- Preventing mass assignment by accepting **UserCreate** (not DB model)
- Avoiding user enumeration patterns in error responses

### Token-based auth (next milestone)
- JWT fundamentals (the repo already includes `python-jose[cryptography]`)
- Designing login + access tokens + refresh tokens (optional)
- Replacing `user_id` query param with `Depends(get_current_user)`
- Authorization (who can submit match results / admin actions)

### App hardening basics
- CORS: allowing only trusted origins (dev: localhost:3000)
- Error isolation: log server-side, return generic HTTP errors
- Secrets management: `.env` + settings (`pydantic-settings`), never committed

---

## 4) Frontend Skills (Next.js + React)

### Next.js + React fundamentals
- Next.js App Router structure
- React state and UI composition for a complex interactive widget (PitchBoard)

### TypeScript
- Strong typing for lineup/tactics payloads
- Safer refactors as the tactical model grows

### Drag-and-drop UI (dnd-kit)
- Droppable pitch slots and draggable players
- Constraint rules:
  - No duplicates
  - Exactly 11 (or formation-based slot count)
- State "rehydration" (loading saved predictions back into UI)

### Styling & UI polish
- Tailwind CSS v4
- Layout, spacing, component discipline (cards, panels, tabs)
- Mobile considerations (future)

---

## 5) HTML Interface Skills (Jinja2)

FanXI keeps a lightweight HTML prototype interface alongside React.

- Jinja2 templates + server-rendered pages
- Form handling + `python-multipart`
- Keeping HTML routes as presentation-only (logic stays in scoring/services)

---

## 6) Image/Media Skills (Pillow)

- Generating **shareable lineup cards**
- Basic image composition (text, layout, resizing)
- Creating deterministic outputs for social sharing

---

## 7) Testing & Quality Skills

### Backend testing
- pytest (recommended) for:
  - Schema validation edge cases
  - Scoring functions (pure unit tests)
  - API route tests (FastAPI TestClient)

### Frontend testing (optional but valuable)
- Component tests for drag/drop behaviors
- Type-level confidence via TS + strict mode

### Code quality
- Logging discipline (don't leak internals)
- Linting:
  - ESLint for Next.js
  - (Recommended) Ruff/Black for Python

---

## 8) DevOps & Local Developer Experience

- Running local stacks:
  - Backend: `uvicorn app.main:app --reload`
  - Frontend: `npm run dev`
- Environment setup:
  - `.env` for football API keys
  - Git hygiene for secrets
- (Recommended) Docker for reproducible environments (future)
- Observability basics:
  - structured logs
  - request IDs (future)
  - error monitoring (future)

---

## 9) "Contributor Skill Tracks" (Pick Your Path)

### Track A — Backend Engineer
- FastAPI routing + Pydantic schema design
- SQLModel queries + clean service layers
- External API integration + caching
- JWT auth implementation

### Track B — Frontend Engineer
- PitchBoard UX improvements
- Better formation editor + validations
- Rehydration + match history views
- Polished UI for tactics + outcomes

### Track C — Data/Scoring Engineer
- Scoring engine expansion & calibration
- Match result ingestion pipeline
- Anti-cheat / cutoff enforcement logic
- Leaderboard/ranking algorithms

### Track D — Security Engineer
- JWT auth + RBAC admin endpoints
- Rate limiting + abuse controls
- Security headers + deployment hardening
- Threat modeling (user enumeration, injection, replay)

---

## 10) Skill Gaps / Next Skills to Add (Roadmap-ready)

- Postgres + migrations (Alembic)
- Background jobs (Celery/RQ) for:
  - pulling fixtures
  - updating results
  - recalculating leaderboards
- Caching layer (Redis)
- CI pipeline (GitHub Actions): lint + test + typecheck
- Deployment:
  - backend on Fly.io/Render/AWS
  - frontend on Vercel
  - environment-based CORS + secrets
- Analytics:
  - crowd stats (% picked each player/formation)
  - retention metrics and feature flags

---

## Quick Self-Check (Definition of "Ready to Contribute")

You can confidently ship features in FanXI if you can:
- Add a new endpoint with a correct Pydantic schema + DB integration
- Extend the scoring engine with tests
- Modify PitchBoard drag/drop while preserving constraints
- Keep secrets safe and avoid leaking sensitive fields in responses
- Run both apps locally and debug end-to-end requests
