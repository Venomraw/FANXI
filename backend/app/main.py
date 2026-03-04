from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import users, predictions, leagues, teams, intel, squads, matches, ai
from app import web
from app.db import init_db

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FanXI: World Cup 2026 Tactical Hub",
    description="The world's first tactical-first football prediction engine.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — only the local Next.js dev server is allowed to call this API.
# In production, replace these with your actual domain(s).
# allow_credentials=True is needed if you later add cookie-based auth.
# allow_methods=["*"] and allow_headers=["*"] are acceptable behind a
# restricted origin whitelist; they do not weaken security here.
# ---------------------------------------------------------------------------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Router registry
#
# JSON API routes (consumed by the React frontend and external clients):
#   POST /register                        — user registration
#   POST /predictions/lock/{match_id}     — save a tactical lineup
#   GET  /predictions/match/{match_id}    — fetch a locked lineup
#   GET  /predictions/history/{user_id}   — fetch a scout's history
#   GET  /leagues/                        — list leagues
#   GET  /leagues/{league_code}/teams     — list teams in a league
#   GET  /teams/{team_id}/matches         — list matches for a team
#
# HTML interface routes (served as Jinja2 templates, consumed by a browser):
#   GET  /                                — home page (league list)
#   GET  /teams/{team_id}/fixtures        — fixtures for a team
#   GET  /teams/{team_id}/matches/{match_id}/predict — prediction form
#   POST /teams/{team_id}/matches/{match_id}/predict — submit prediction
#   GET  /users/{username}/predictions/html          — user history page
#   GET  /matches/{match_id}/scores/html             — leaderboard page
#
# Note: the standalone GET / JSON health-check was removed because web.router
# also registers GET / (the HTML home page).  FastAPI would silently shadow
# one of them; the HTML home is more useful at the root.
# ---------------------------------------------------------------------------

# JSON API
app.include_router(users.router)
app.include_router(predictions.router)
app.include_router(leagues.router)
app.include_router(teams.router)
app.include_router(intel.router)
app.include_router(squads.router)
app.include_router(matches.router)
app.include_router(ai.router)

# HTML interface (Jinja2 templates — the original La Liga prototype)
app.include_router(web.router)


# ---------------------------------------------------------------------------
# Startup hook
# ---------------------------------------------------------------------------

@app.on_event("startup")
def on_startup():
    """
    Runs once when the server starts.
    init_db() creates all SQLite tables that do not yet exist.
    It is safe to call on every restart — SQLModel uses CREATE TABLE IF NOT EXISTS.
    """
    print("FanXI is setting sail...")
    init_db()
