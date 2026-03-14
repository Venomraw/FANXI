"""
Observability middleware — request tracing, duration logging, slow request alerts.

Adds to every request:
  - X-Request-ID header (UUID) for tracing across logs
  - Structured log line: method, path, status, duration_ms
  - WARN log for requests slower than SLOW_REQUEST_MS
"""
import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("fanxi.requests")

SLOW_REQUEST_MS = 500


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:12]
        request.state.request_id = request_id

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "request_id=%s method=%s path=%s status=500 duration_ms=%.1f error=unhandled_exception",
                request_id, request.method, request.url.path, duration_ms,
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id

        log_fn = logger.info
        if duration_ms > SLOW_REQUEST_MS:
            log_fn = logger.warning

        log_fn(
            "request_id=%s method=%s path=%s status=%d duration_ms=%.1f",
            request_id, request.method, request.url.path,
            response.status_code, duration_ms,
        )

        return response
