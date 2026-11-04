import uuid
from datetime import datetime
from typing import Any, Dict, Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Index, func, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket


class TicketEvent(Base):
    """
    Immutable audit log tracking all ticket state transitions, assignments, and escalations.
    """
    __tablename__ = "ticket_events"
    __table_args__ = (
        Index("idx_ticket_events_ticket_created", "ticket_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Using 'metadata' as column name, but python attribute 'event_metadata' to avoid SQLAlchemy Base.metadata collision
    event_metadata: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="events")

    def __repr__(self) -> str:
        return f"<TicketEvent id={self.id} type={self.event_type} ticket={self.ticket_id}>"
