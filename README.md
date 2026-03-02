# FanXI: World Cup 2026 Tactical Hub

The world's first tactical-first football prediction engine. Fans don't just pick the XI — they set the full tactical picture: formation, mentality, line height, and width, then lock it in against real match results.

---

## Version History

| Version | Description |
|---------|-------------|
| 1.0 | Initial FastAPI + SQLite scaffold, Jinja2 HTML prediction form |
| 1.1 | Tactical Bridge: React PitchBoard with drag-and-drop, JSON API, state re-hydration |
| 1.2 | Security hardening: UserCreate schema, response_model filtering, error log isolation, missing dependencies added, web router mounted |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Drag & Drop | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |
| Backend | Python 3.11, FastAPI |
| ORM / DB | SQLModel + SQLite (`fanxi.db`) |
| Validation | Pydantic v2 |
| Password hashing | passlib + bcrypt |
| HTTP client | httpx (external football API calls) |
| HTML templates | Jinja2 (La Liga prototype interface) |
| Image generation | Pillow (shareable lineup cards) |

---

## Architecture

FanXI runs two parallel interfaces backed by the same FastAPI server:

```
┌─────────────────────────────────────┐    ┌──────────────────────────────────┐
│   React Frontend (Next.js :3000)    │    │   HTML Interface (Jinja2)        │
│                                     │    │                                  │
│  PitchBoard.tsx                     │    │  /                  home         │
│   ├─ Drag-and-drop bench → pitch    │    │  /teams/{id}/fixtures            │
│   ├─ Tactics sliders (3 axes)       │    │  /teams/{id}/matches/{id}/predict│
│   ├─ History tab (re-hydration)     │    │  /matches/{id}/scores/html       │
│   └─ Lock Selection → POST /predict │    │  /users/{name}/predictions/html  │
└────────────────┬────────────────────┘    └─────────────┬────────────────────┘
                 │ JSON (fetch)                           │ HTML forms
                 ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend (:8000)                             │
│                                                                            │
│  CORS whitelist: localhost:3000 only                                       │
│                                                                            │
│  /register              POST  — UserCreate schema → bcrypt → DB           │
│  /predictions/lock/{id} POST  — LockSelectionRequest → MatchPrediction    │
│  /predictions/match/{id} GET  — fetch locked lineup                       │
│  /predictions/history/{uid} GET — all snapshots for a scout               │
│  /leagues/              GET   — list leagues                               │
│  /leagues/{code}/teams  GET   — teams in a league                         │
│  /teams/{id}/matches    GET   — fixtures for a team                       │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        SQLite — fanxi.db
                        ├─ User
                        ├─ MatchPrediction   (React interface)
                        ├─ PredictionDB      (HTML interface)
                        ├─ TeamDB
                        ├─ MatchDB
                        └─ Player
```

### Two prediction models — why?

`MatchPrediction` (React interface) stores lineup and tactics as JSON blobs because the React frontend sends a dynamic structure that varies by formation — a 4-3-3 has different pitch slots to a 3-5-2.

`PredictionDB` (HTML interface) stores a simpler pipe-separated player list (`"Messi|Ronaldo|..."`) that matches the `<textarea>` form input from the original Jinja2 prototype.

---

## Security Model

| Concern | Mitigation |
|---------|-----------|
| Mass-assignment | `/register` accepts `UserCreate` schema, not the raw `User` DB model. Clients cannot set `hashed_password`, `rank_title`, or `football_iq_points` directly. |
| Password exposure | `response_model=UserRead` on `/register` — FastAPI filters the response through `UserRead`, which has no `hashed_password` field. The hash never leaves the server. |
| User enumeration | Duplicate-user check returns the same error whether username or email matched, so an attacker cannot probe which emails are registered. |
| Error leaking | Exceptions in prediction routes are logged server-side with `logger.error()`; the HTTP response returns a generic message with no internal detail. |
| CORS | Only `localhost:3000` is whitelisted. Replace with your production domain before deploying. |
| SQL injection | All queries go through SQLModel's parameterised `select()` API — no raw SQL. |
| Secrets | API keys read from `.env` via `pydantic-settings`; `.env` is in `.gitignore`. |

---

## API Reference

### Users
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Register a new Scout. Returns `UserRead` (no password hash). |

**Request body (`UserCreate`)**
```json
{
  "username": "venomraw",
  "email": "user@example.com",
  "password": "minimum8chars",
  "country_allegiance": "Argentina"
}
```

### Tactical Predictions (React frontend)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/predictions/lock/{match_id}` | Save or overwrite a lineup. Query param: `?user_id=1` |
| `GET`  | `/predictions/match/{match_id}` | Fetch locked lineup for a match |
| `GET`  | `/predictions/history/{user_id}` | All snapshots for a scout (newest first) |

**Request body (`LockSelectionRequest`)**
```json
{
  "lineup": {
    "GK": { "name": "E. Martínez", "number": 23 },
    "ST": { "name": "L. Messi", "number": 10 }
  },
  "tactics": { "mentality": 70, "lineHeight": 55, "width": 60 },
  "timestamp": "2026-06-14T18:00:00Z",
  "status": "LOCKED"
}
```

### League & Fixture Data
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/leagues/` | List all leagues |
| `GET` | `/leagues/{league_code}/teams` | Teams in a league (e.g. `laliga`) |
| `GET` | `/teams/{team_id}/matches` | Fixtures for a team |

---

## Quick Start

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file with your API key
echo "FOOTBALL_API_KEY=your_key_here" > .env

# Start the server (auto-reloads on file changes)
uvicorn app.main:app --reload
```

The backend starts at `http://127.0.0.1:8000`.
Interactive API docs: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`.

---

## Project Structure

```
FANXI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── users.py          # POST /register
│   │   │   ├── predictions.py    # /predictions/* routes + scoring helpers
│   │   │   ├── leagues.py        # /leagues/* routes
│   │   │   └── teams.py          # /teams/* routes
│   │   ├── core/
│   │   │   └── security.py       # bcrypt hash / verify helpers
│   │   ├── services/
│   │   │   ├── football_api.py   # httpx calls to API-Football
│   │   │   ├── prediction_engine.py  # tactical scoring logic
│   │   │   └── card_generator.py # Pillow lineup card renderer
│   │   ├── templates/            # Jinja2 HTML templates
│   │   ├── config.py             # pydantic-settings env config
│   │   ├── db.py                 # engine, get_session, init_db
│   │   ├── models.py             # SQLModel table definitions
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── main.py               # app factory, middleware, router registry
│   │   └── web.py                # Jinja2 HTML routes
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx              # renders PitchBoard
    └── src/components/
        └── pitch/
            ├── PitchBoard.tsx    # main component: bench, pitch, tabs, lock
            ├── PitchSlot.tsx     # droppable pitch position
            ├── DraggablePlayer.tsx
            └── MatchEvents.tsx   # fouls/cards/first scorer predictions
```

---

## Roadmap

- **Milestone 2** — Live data: real World Cup squads via Provider/Strategy pattern, live scores during 2026 tournament
- **Milestone 3** — Authentication: JWT access tokens, bcrypt login, role-based access control
- **Milestone 4** — Global Scout Map: visualise predictions worldwide, leaderboard with tactical scoring

---

## Author

**Venomraw** (Binamra Sigdel)
*Cybersecurity Student & Lead Developer*

- [LinkedIn](https://www.linkedin.com/in/binamra-sigdel-377553156/)
- [GitHub](https://github.com/venomraw)

## License

MIT — see [LICENSE](LICENSE) for details.
