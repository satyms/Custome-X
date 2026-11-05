import uuid
from typing import Optional


class CustomeXException(Exception):
    """Base exception for all Custome-X domain errors."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class EntityNotFoundError(CustomeXException):
    """Raised when a requested resource does not exist."""
    def __init__(self, entity_name: str, entity_id: uuid.UUID):
        self.entity_name = entity_name
        self.entity_id = entity_id
        super().__init__(
            message=f"{entity_name} with id '{entity_id}' was not found.",
            code=f"{entity_name.upper()}_NOT_FOUND",
        )


class OrganizationNotFoundError(EntityNotFoundError):
    def __init__(self, organization_id: uuid.UUID):
        super().__init__("Organization", organization_id)


class CustomerNotFoundError(EntityNotFoundError):
    def __init__(self, customer_id: uuid.UUID):
        super().__init__("Customer", customer_id)


class TicketNotFoundError(EntityNotFoundError):
    def __init__(self, ticket_id: uuid.UUID):
        super().__init__("Ticket", ticket_id)


class UserNotFoundError(EntityNotFoundError):
    def __init__(self, user_id: uuid.UUID):
        super().__init__("User", user_id)


class AuthenticationError(CustomeXException):
    """Raised when authentication credentials or token are missing or invalid."""
    def __init__(self, message: str = "Authentication failed.", code: str = "UNAUTHORIZED"):
        super().__init__(message=message, code=code)


class InvalidCredentialsError(AuthenticationError):
    """Raised when login email/password verification fails."""
    def __init__(self, message: str = "Invalid email or password."):
        super().__init__(message=message, code="INVALID_CREDENTIALS")


class ForbiddenError(CustomeXException):
    """Raised when an authenticated user lacks permissions for an operation."""
    def __init__(self, message: str = "Permission denied.", code: str = "FORBIDDEN"):
        super().__init__(message=message, code=code)


class DuplicateResourceError(CustomeXException):
    """Raised when a unique constraint or conflict occurs."""
    def __init__(self, message: str, code: str = "DUPLICATE_RESOURCE"):
        super().__init__(message=message, code=code)


class InvalidStatusTransitionError(CustomeXException):
    """Raised when an illegal ticket state transition is attempted."""
    def __init__(self, current_status: str, attempted_status: str):
        self.current_status = current_status
        self.attempted_status = attempted_status
        super().__init__(
            message=f"Cannot transition ticket from '{current_status}' to '{attempted_status}'.",
            code="INVALID_STATUS_TRANSITION",
        )


class RateLimitExceededError(CustomeXException):
    """Raised when a client or tenant exceeds token-bucket rate limits."""
    def __init__(self, retry_after: int = 1, message: str = "Rate limit exceeded. Please wait before retrying."):
        self.retry_after = retry_after
        super().__init__(message=message, code="RATE_LIMIT_EXCEEDED")


class WebhookVerificationError(CustomeXException):
    """Raised when webhook HMAC SHA-256 signature verification fails."""
    def __init__(self, message: str = "Invalid webhook signature."):
        super().__init__(message=message, code="INVALID_WEBHOOK_SIGNATURE")


class OwnershipViolationError(CustomeXException):
    """Raised when an operation attempts cross-customer resource access."""
    def __init__(self, resource_name: str, resource_id: str, message: str = "Resource does not belong to this customer"):
        self.resource_name = resource_name
        self.resource_id = resource_id
        super().__init__(message=f"Ownership violation: {message} ({resource_name}:{resource_id})", code="OWNERSHIP_VIOLATION")


class SecurityViolationError(CustomeXException):
    """Raised when an input or output violates AI security constraints (prompt injection, malicious delimiter, etc.)."""
    def __init__(self, reason: str, code: str = "SECURITY_VIOLATION"):
        self.reason = reason
        super().__init__(message=f"Security policy violation: {reason}", code=code)
