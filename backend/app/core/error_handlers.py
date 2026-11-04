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

        # Map domain exceptions to appropriate HTTP status codes
        if isinstance(exc, EntityNotFoundError):
            status_code = status.HTTP_404_NOT_FOUND
        elif isinstance(exc, DuplicateResourceError):
            status_code = status.HTTP_409_CONFLICT
        elif isinstance(exc, InvalidStatusTransitionError):
            status_code = status.HTTP_400_BAD_REQUEST
        else:
            status_code = status.HTTP_400_BAD_REQUEST

        return JSONResponse(
            status_code=status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = get_request_id(request)
        formatted_errors = []
        for err in exc.errors():
            loc = " -> ".join([str(p) for p in err.get("loc", []) if p != "body"])
            formatted_errors.append({
                "field": loc or "body",
                "message": err.get("msg", "Invalid value"),
                "type": err.get("type", "value_error"),
            })

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "The request payload failed schema validation.",
                    "request_id": request_id,
                    "details": formatted_errors,
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        request_id = get_request_id(request)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = get_request_id(request)
        logger.error(
            f"Unhandled server error [request_id={request_id}]: {str(exc)}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected internal server error occurred. Please contact support.",
                    "request_id": request_id,
                }
            },
        )
