"""
Production-ready uvicorn launcher for FanXI.

Usage:
  python run.py              # production (4 workers)
  python run.py --dev        # development (1 worker, reload)

Workers:
  Each worker is an independent process with its own event loop.
  4 workers on a 2-core machine is a good default (2x CPU cores).
  Adjust via FANXI_WORKERS env var for your hardware.
"""
import os
import sys

import uvicorn

DEV_MODE = "--dev" in sys.argv
WORKERS = 1 if DEV_MODE else int(os.environ.get("FANXI_WORKERS", "4"))

# Bind address is always 0.0.0.0 inside the container. Never read this from
# env: FANXI_HOST historically held a *public* hostname (e.g. fanxi.app), and
# passing that to uvicorn DNS-resolves to a non-local IP, causing
# [Errno 99] cannot assign requested address on Railway/Render.
HOST = "0.0.0.0"

# Railway / Heroku / Render / Fly inject PORT. Honour it first, then fall back
# to FANXI_PORT for legacy local setups, then 8000 as a final default.
PORT = int(os.environ.get("PORT") or os.environ.get("FANXI_PORT") or 8000)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        workers=WORKERS,
        reload=DEV_MODE,
        log_level="info",
        access_log=True,
    )
