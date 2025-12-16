from fastapi import FastAPI


from app.api.leagues import router as leagues_router
from app.api.teams import router as teams_router
from app.api.predictions import router as predictions_router
from app.api.users import router as users_router
from app.web import router as web_router
from app.db import init_db

init_db()

app = FastAPI(
    title="FanXI API",
    version="0.1.0",
    description="Backend for the FanXI football lineup prediction game.",
)

@app.on_event("startup")
def on_startup():
    init_db() 

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(web_router)
app.include_router(leagues_router)
app.include_router(teams_router)
app.include_router(predictions_router)
app.include_router(users_router)