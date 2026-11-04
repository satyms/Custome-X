import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Index,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket


class Message(Base):
    """
    Individual message in a multi-turn conversation thread for a ticket.
    """
    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint(
            "sender_type IN ('customer', 'agent', 'system', 'ai_assistant')",
            name="check_valid_sender_type",
        ),
        Index("idx_messages_ticket_created", "ticket_id", "created_at"),
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
    sender_type: Mapped[str] = mapped_column(String(50), nullable=False)
    sender_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="messages")

    def __repr__(self) -> str:
        return f"<Message id={self.id} sender={self.sender_type} ticket={self.ticket_id}>"
