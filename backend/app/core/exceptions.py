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
