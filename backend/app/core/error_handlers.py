import logging
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import (
    CustomeXException,
    EntityNotFoundError,
    DuplicateResourceError,
    InvalidStatusTransitionError,
    AuthenticationError,
    ForbiddenError,
    RateLimitExceededError,
    WebhookVerificationError,
    OwnershipViolationError,
    SecurityViolationError,
)

logger = logging.getLogger("customex.api")


def get_request_id(request: Request) -> str:
    """Helper to safely retrieve correlation ID from request state."""
    return getattr(request.state, "request_id", "unknown-request-id")


def register_exception_handlers(app: FastAPI) -> None:
    """Registers centralized, uniform error handlers for all exceptions."""

    @app.exception_handler(CustomeXException)
    async def customex_exception_handler(request: Request, exc: CustomeXException):
        request_id = get_request_id(request)
        headers = {}

        # Map domain exceptions to appropriate HTTP status codes
        if isinstance(exc, EntityNotFoundError):
            status_code = status.HTTP_404_NOT_FOUND
        elif isinstance(exc, DuplicateResourceError):
            status_code = status.HTTP_409_CONFLICT
        elif isinstance(exc, (AuthenticationError, WebhookVerificationError)):
            status_code = status.HTTP_401_UNAUTHORIZED
        elif isinstance(exc, (ForbiddenError, OwnershipViolationError)):
            status_code = status.HTTP_403_FORBIDDEN
        elif isinstance(exc, SecurityViolationError):
            status_code = status.HTTP_400_BAD_REQUEST
        elif isinstance(exc, InvalidStatusTransitionError):
            status_code = status.HTTP_400_BAD_REQUEST
        elif isinstance(exc, RateLimitExceededError):
            status_code = status.HTTP_429_TOO_MANY_REQUESTS
            headers["Retry-After"] = str(exc.retry_after)
            headers["X-RateLimit-Limit"] = "10"
            headers["X-RateLimit-Remaining"] = "0"
        else:
            status_code = status.HTTP_400_BAD_REQUEST

        return JSONResponse(
            status_code=status_code,
            headers=headers if headers else None,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        request_id = get_request_id(request)
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = get_request_id(request)
        # Format Pydantic field validation errors cleanly
        formatted_errors = []
        for err in exc.errors():
            loc = " -> ".join([str(x) for x in err.get("loc", []) if x != "body"])
            msg = err.get("msg", "Validation error")
            formatted_errors.append(f"{loc}: {msg}" if loc else msg)

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "; ".join(formatted_errors),
                    "details": exc.errors(),
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        request_id = get_request_id(request)
        logger.exception(f"Unhandled internal server error [{request_id}]: {str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected server error occurred. Please contact support with the request ID.",
                    "request_id": request_id,
                }
            },
        )
