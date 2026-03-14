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
HOST = os.environ.get("FANXI_HOST", "0.0.0.0")
PORT = int(os.environ.get("FANXI_PORT", "8000"))

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
