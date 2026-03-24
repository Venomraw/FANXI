import logging
import os
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from app.api import users, predictions, leagues, teams, intel, squads, matches, ai, cards, news, admin, agents
from app.websocket import match_ws
from app import web
from app.db import init_db, engine
from app.config import settings
from app.middleware.observability import ObservabilityMiddleware

# ---------------------------------------------------------------------------
# Structured logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)-5s %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("fanxi")

# ---------------------------------------------------------------------------
# Sentry — captures unhandled exceptions, route context, release info.
# Only active when SENTRY_DSN is set (production).
# ---------------------------------------------------------------------------
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                FastApiIntegration(),
                StarletteIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=float(os.environ.get("SENTRY_TRACES_RATE", "0.1")),
            release=os.environ.get("FANXI_RELEASE", "dev"),
            environment=os.environ.get("FANXI_ENV", "production"),
            send_default_pii=False,
        )
        logger.info("Sentry initialized (release=%s)", os.environ.get("FANXI_RELEASE", "dev"))
    except ImportError:
        logger.warning("SENTRY_DSN set but sentry-sdk not installed — skipping")

# ---------------------------------------------------------------------------
# Rate limiting — slowapi
# ---------------------------------------------------------------------------
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter

# ---------------------------------------------------------------------------
# Custom 429 handler — structured JSON + rate-limit visibility logging.
# ---------------------------------------------------------------------------
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = str(exc.limit.limit.get_expiry())
    client_ip = request.client.host if request.client else "unknown"

    logger.warning(
        "RATE_LIMIT_HIT ip=%s method=%s path=%s limit=%s",
        client_ip, request.method, request.url.path, exc.limit.limit,
    )

    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after": retry_after,
        },
        headers={"Retry-After": retry_after},
    )

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FanXI: World Cup 2026 Tactical Hub",
    description="The world's first tactical-first football prediction engine.",
    version=os.environ.get("FANXI_RELEASE", "1.0.0"),
    # Disable docs in production
    docs_url="/docs" if os.environ.get("FANXI_ENV", "development") != "production" else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# ---------------------------------------------------------------------------
# CORS — exact origins only. Never use ["*"] with credentials.
# ---------------------------------------------------------------------------
_env = os.environ.get("FANXI_ENV", "development")
if _env == "production":
    origins = [
        "https://fanxi.vercel.app",
    ]
    # Add any custom production domain from env
    extra_origin = os.environ.get("FANXI_CORS_ORIGIN")
    if extra_origin:
        origins.append(extra_origin)
else:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://fanxi.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Observability — request ID, method/path/status/duration logging
app.add_middleware(ObservabilityMiddleware)

# Compress responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# ---------------------------------------------------------------------------
# Router registry
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
app.include_router(cards.router)
app.include_router(news.router, prefix="/news", tags=["news"])
app.include_router(admin.router)
app.include_router(agents.router)

# WebSocket
app.include_router(match_ws.router)

# HTML interface (Jinja2 templates)
app.include_router(web.router)


# ---------------------------------------------------------------------------
# Health check — liveness probe. No auth, no DB.
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"])
async def health_check():
    """Instant liveness probe. Returns 200 as soon as the server is up."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Readiness check — verifies DB + critical config before accepting traffic.
# ---------------------------------------------------------------------------

@app.get("/ready", tags=["health"])
async def readiness_check():
    """
    Readiness probe. Returns 200 only when:
      - DB is reachable (single SELECT 1)
      - Critical secrets are present
    Use this for deploy gates and load balancer health checks.
    """
    errors = []

    # 1. DB connectivity
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        errors.append(f"db: {exc}")

    # 2. Critical config
    if not settings.secret_key:
        errors.append("config: SECRET_KEY not set")
    if not settings.database_url:
        errors.append("config: DATABASE_URL not set")

    if errors:
        logger.error("Readiness check failed: %s", "; ".join(errors))
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "errors": errors},
        )

    return {"status": "ready", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Startup hook
# ---------------------------------------------------------------------------

@app.on_event("startup")
def on_startup():
    logger.info("FanXI starting up...")
    init_db()
    match_ws.scheduler.start()
    logger.info("APScheduler started for live match polling.")

    # -----------------------------------------------------------------------
    # Avengers Initiative — scheduled agent jobs
    # -----------------------------------------------------------------------
    from app.agents.natasha import Natasha
    _natasha = Natasha()

    # NATASHA secrets scan — every 24 hours
    match_ws.scheduler.add_job(
        _natasha.run_secrets_scan,
        "interval",
        hours=24,
        id="natasha_secrets_scan",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # NATASHA auth watchdog — every 5 minutes
    match_ws.scheduler.add_job(
        _natasha.run_auth_watchdog,
        "interval",
        minutes=5,
        id="natasha_auth_watchdog",
        replace_existing=True,
        misfire_grace_time=60,
    )

    logger.info("NATASHA scheduled: secrets_scan (24h), auth_watchdog (5m)")

    # RHODEY — CI guardian, every 6 hours
    from app.agents.rhodey import Rhodey
    _rhodey = Rhodey()

    match_ws.scheduler.add_job(
        _rhodey.run_ci_scan,
        "interval",
        hours=6,
        id="rhodey_ci_scan",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    logger.info("RHODEY scheduled: ci_scan (6h)")

    # VISION — squad auditor + scout reports
    from app.agents.vision import Vision
    _vision = Vision()

    # VISION squad audit — every 24 hours
    match_ws.scheduler.add_job(
        _vision.run_squad_audit,
        "interval",
        hours=24,
        id="vision_squad_audit",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # VISION scout reports — every 6 hours
    match_ws.scheduler.add_job(
        _vision.run_scout_reports,
        "interval",
        hours=6,
        id="vision_scout_reports",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    logger.info("VISION scheduled: squad_audit (24h), scout_reports (6h)")
    logger.info("Environment: %s", os.environ.get("FANXI_ENV", "development"))
