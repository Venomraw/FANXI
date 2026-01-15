from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import users, predictions, leagues, teams # Your existing routers
from app.db import init_db

# 1. Initialize the Ship
app = FastAPI(
    title="FanXI: World Cup 2026 Tactical Hub",
    description="The world's first tactical-first football prediction engine.",
    version="1.0.0"
)

# 2. Cybersecurity Haki: CORS Policy
# This prevents unauthorized websites from calling your API.
origins = [
    "http://localhost:3000", # Your local frontend
    "http://127.0.0.1:3000",     # Your future production domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Connect the Routers (The Fleet)
app.include_router(users.router)
app.include_router(predictions.router)
# app.include_router(leagues.router) # Uncomment when these are ready
# app.include_router(teams.router)

# 4. Startup Event: Lighting the Engines
@app.on_event("startup")
def on_startup():
    print("🚢 FanXI is setting sail...")
    init_db() # Initializes SQLite and creates tables

@app.get("/")
def home():
    return {"message": "Welcome to FanXI. The Drums of Liberation are beating!"}