from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import users, predictions, leagues, teams
from app import web
from app.db import init_db

# 1. Initialize the Ship
app = FastAPI(
    title="FanXI: World Cup 2026 Tactical Hub",
    description="The world's first tactical-first football prediction engine.",
    version="1.0.0"
)

# 2. Cybersecurity Haki: CORS Policy
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

# 3. Connect the Routers (The Fleet)
# JSON API routes
app.include_router(users.router)
app.include_router(predictions.router)
app.include_router(leagues.router)
app.include_router(teams.router)

# HTML interface routes (Jinja2 templates — serves the La Liga web UI)
app.include_router(web.router)

# 4. Startup Event: Lighting the Engines
@app.on_event("startup")
def on_startup():
    print("FanXI is setting sail...")
    init_db()
