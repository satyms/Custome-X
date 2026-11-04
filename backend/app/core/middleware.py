import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Ensures every request has a unique correlation ID for distributed tracing,
    structured JSON logging, and uniform error reporting.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        # Honor client provided X-Request-ID if present, else generate fresh UUID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
