# FanXI — World Cup 2026 Tactical Hub

The world's first tactical-first football prediction platform for the 2026 FIFA World Cup. Predict starting XIs, formations, tactics and match stats — then watch AI score your football IQ in real time.

**48 nations · 104 matches · 1,100+ players · Free to play**

---

## Version History

| Version | Description |
|---------|-------------|
| 1.0 | Initial FastAPI + SQLite scaffold, Jinja2 HTML prediction form |
| 1.1 | Tactical Bridge: React PitchBoard with drag-and-drop, JSON API, state re-hydration |
| 1.2 | Security hardening: UserCreate schema, response_model filtering, error log isolation |
| 1.3 | JWT auth: access + refresh tokens, httpOnly cookie session, `/me`, `/auth/refresh`, `/auth/logout` |
| 1.4 | Rate limiting (slowapi), password reset via Resend email, forgot/reset password flow |
| 1.5 | Static World Cup squads (48 teams × 23 players), squad caching, AI scoring via Groq |
| 1.6 | Full Next.js UI: hub page, leaderboard, nation intel, matches, profile, AI page, custom cursor |
| 1.7 | PostgreSQL (Neon) in production, Vercel deployment, stadium background, Space Grotesk + Syne typography |
| 1.8 | Google OAuth: one-click sign-in/register, account linking by email |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Fonts | Space Grotesk (display), Syne (body), JetBrains Mono (micro labels) |
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Backend | Python 3.11, FastAPI |
| ORM | SQLModel + Pydantic v2 |
| Database | PostgreSQL via Neon (production), SQLite (local dev) |
| Auth | JWT access tokens (in-memory) + httpOnly refresh cookie, Google OAuth 2.0 |
| Password hashing | passlib + bcrypt |
| Rate limiting | slowapi (per-IP, per-route limits) |
| Email | Resend API (password reset) |
| AI scoring | Groq API (llama-3) |
| HTTP client | httpx |
| Image generation | Pillow (shareable lineup cards) |
| HTML templates | Jinja2 (legacy prototype interface) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Next.js Frontend (localhost:3000)            │
│                                                           │
│  /                  Hub — PitchBoard + UserStats          │
│  /login             Auth — login, register, Google OAuth  │
│  /auth/callback     Google OAuth redirect handler         │
│  /leaderboard       Global scout rankings                 │
│  /nation            Nation Intel — news, YouTube, stats   │
│  /matches           Live & upcoming matches               │
│  /ai                AI Football IQ analysis               │
│  /profile/[user]    Public scout profile                  │
│  /guide             How to play                           │
│  /forgot-password   Password reset request                │
│  /reset-password    Password reset confirmation           │
└──────────────────────────┬───────────────────────────────┘
                           │ JSON (authFetch — auto refresh)
                           ▼
┌──────────────────────────────────────────────────────────┐
│              FastAPI Backend (localhost:8000)             │
│                                                           │
│  Auth                                                     │
│  POST  /register                  create account          │
│  POST  /login                     username + password     │
│  GET   /auth/google               redirect to Google      │
│  GET   /auth/google/callback      exchange code → user    │
│  POST  /auth/refresh              rotate access token     │
│  POST  /auth/logout               clear refresh cookie    │
│  GET   /me                        current user            │
│  POST  /auth/forgot-password      email reset link        │
│  POST  /auth/reset-password       apply new password      │
│                                                           │
│  Predictions                                              │
│  POST  /predictions/lock/{match_id}                       │
│  GET   /predictions/match/{match_id}                      │
│  GET   /predictions/history/{user_id}                     │
│                                                           │
│  Squads / Teams / Matches / Leagues / Intel / AI          │
│  GET   /squads/{team_name}                                │
│  GET   /teams/{id}/matches                                │
│  GET   /leagues/                                          │
│  GET   /intel/{country}                                   │
│  POST  /ai/score                                          │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
              PostgreSQL (Neon) — production
              SQLite fanxi.db  — local dev
              ├─ User                (accounts + Google ID)
              ├─ MatchPrediction     (tactical lineups)
              ├─ PredictionDB        (legacy HTML interface)
              ├─ TeamDB
              ├─ MatchDB
              ├─ Player
              ├─ TeamSquadCache      (API quota protection)
              └─ PasswordResetToken  (single-use, 1h TTL)
```

---

## Auth Flow

### Username / Password
1. `POST /login` → access token (memory) + httpOnly refresh cookie (7 days)
2. Every request: `Authorization: Bearer <access_token>`
3. On 401: `AuthContext` auto-calls `POST /auth/refresh` (queue lock prevents parallel refreshes)
4. On refresh failure: redirect to `/login`

### Google OAuth
1. User clicks **Continue with Google** → browser navigates to `GET /auth/google`
2. Backend redirects to Google consent screen
3. Google redirects to `GET /auth/google/callback?code=...`
4. Backend exchanges code → fetches profile → finds or creates user → sets refresh cookie → redirects to `/auth/callback?token=<access_token>`
5. Frontend `/auth/callback` page calls `/me` with the token, stores user, redirects to hub

Existing accounts are linked by email if the same address is used with Google.

---

## Security Model

| Concern | Mitigation |
|---------|-----------|
| Mass-assignment | `/register` accepts `UserCreate` schema — clients cannot set `hashed_password`, `rank_title`, or `football_iq_points` |
| Password exposure | `response_model=UserRead` on `/register` — hash never leaves the server |
| Google users | Stored with a bcrypt hash of `secrets.token_urlsafe(32)` — unguessable, never exposed |
| XSS / token theft | Access token lives in JS memory only; refresh token is httpOnly, never readable by JS |
| CSRF | Refresh cookie is `SameSite=None; Secure` and path-scoped to `/auth/refresh` only |
| Brute force | `/login` rate-limited to 10/min per IP; `/register` to 5/min |
| User enumeration | Duplicate-user error is identical whether username or email matched |
| SQL injection | All queries use SQLModel's parameterised `select()` — no raw SQL |
| Secrets | All keys read from `.env` via `pydantic-settings`; `.env` is gitignored |
| CORS | Whitelisted origins only (`localhost:3000`, `fanxi.vercel.app`) |

---

## Squad Data Priority

For each World Cup team, squads are resolved in this order:

1. **Static data** — `backend/app/data/static_squads.py` (48 teams × 23 players, always available)
2. **DB cache** — `TeamSquadCache` table (refreshed from API, protects daily quota)
3. **API-Football** — live fetch if cache is stale
4. **Positional fallback** — placeholder slots if API is unavailable

---

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
FOOTBALL_API_KEY=your_key
FOOTBALL_API_BASE_URL=https://v3.football.api-sports.io
FOOTBALL_LALIGA_ID=140
FOOTBALL_SEASON=2024

GUARDIAN_API_KEY=your_key
NEWSDATA_API_KEY=your_key
YOUTUBE_API_KEY=your_key

RESEND_API_KEY=your_key
FRONTEND_URL=http://localhost:3000

SECRET_KEY=your_jwt_secret_64chars

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

GROQ_API_KEY=your_groq_key

# Leave blank for local SQLite, or set a Neon/PostgreSQL URL for production
DATABASE_URL=
```

```bash
uvicorn app.main:app --reload
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

---

## Project Structure

```
FanXI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── users.py          # auth routes: register, login, Google OAuth, refresh, reset
│   │   │   ├── predictions.py    # lock / fetch / history + scoring helpers
│   │   │   ├── squads.py         # squad data with static → cache → API fallback
│   │   │   ├── matches.py        # match fixtures
│   │   │   ├── leagues.py        # league listing
│   │   │   ├── teams.py          # team data
│   │   │   ├── intel.py          # nation intel (news, YouTube)
│   │   │   └── ai.py             # Groq AI scoring endpoint
│   │   ├── core/
│   │   │   ├── security.py       # bcrypt, JWT access + refresh tokens
│   │   │   └── email.py          # Resend password reset emails
│   │   ├── services/
│   │   │   ├── football_api.py   # httpx calls to API-Football
│   │   │   ├── prediction_engine.py  # tactical scoring logic
│   │   │   └── card_generator.py # Pillow lineup card renderer
│   │   ├── data/
│   │   │   └── static_squads.py  # 48 WC 2026 teams × 23 players
│   │   ├── config.py             # pydantic-settings env config
│   │   ├── db.py                 # engine, get_session, init_db
│   │   ├── models.py             # SQLModel table definitions
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── limiter.py            # slowapi rate limiter instance
│   │   ├── main.py               # app factory, CORS, router registry
│   │   └── web.py                # Jinja2 HTML routes (legacy)
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── layout.tsx             # fonts, stadium background, global providers
    │   ├── page.tsx               # hub: hero, pitch builder, leagues, footer
    │   ├── login/page.tsx         # login + register + Google OAuth
    │   ├── auth/callback/page.tsx # Google OAuth redirect handler
    │   ├── leaderboard/page.tsx
    │   ├── nation/page.tsx
    │   ├── matches/page.tsx
    │   ├── ai/page.tsx
    │   ├── profile/[username]/page.tsx
    │   ├── guide/page.tsx
    │   ├── forgot-password/page.tsx
    │   ├── reset-password/page.tsx
    │   └── globals.css            # design tokens, glassmorphism, typography
    └── src/
        ├── components/
        │   ├── pitch/
        │   │   ├── PitchBoard.tsx
        │   │   ├── PitchSlot.tsx
        │   │   ├── DraggablePlayer.tsx
        │   │   └── MatchEvents.tsx
        │   ├── hub/
        │   │   ├── UserStats.tsx
        │   │   ├── MiniLeaderboard.tsx
        │   │   └── Countdown.tsx
        │   ├── NavBar.tsx
        │   ├── TeamPicker.tsx
        │   ├── KickoffBar.tsx
        │   └── CustomCursor.tsx
        └── context/
            ├── AuthContext.tsx    # login, loginWithToken, logout, authFetch
            └── ThemeContext.tsx   # per-team colour theming
```

---

## Author

**Venomraw** (Binamra Sigdel) — Cybersecurity Student & Lead Developer

- [LinkedIn](https://www.linkedin.com/in/binamra-sigdel-377553156/)
- [GitHub](https://github.com/venomraw)

## License

MIT — see [LICENSE](LICENSE) for details.
