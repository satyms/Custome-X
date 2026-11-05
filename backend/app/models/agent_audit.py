import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Index,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.ticket import Ticket
    from app.models.user import User


class PendingAction(Base):
    """
    Approval-gated operations (Refunds > $50, in-transit cancellations, customer address changes).
    ARCHITECTURE.md Section 3.4.
    """
    __tablename__ = "pending_actions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="check_valid_pending_action_status",
        ),
        Index("idx_pending_actions_org_status", "organization_id", "status"),
        Index("idx_pending_actions_ticket_id", "ticket_id"),
        Index("idx_pending_actions_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    requested_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=False, default="ai_agent")
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    ticket: Mapped["Ticket"] = relationship("Ticket")
    reviewer: Mapped[Optional["User"]] = relationship("User")

    def __repr__(self) -> str:
        return f"<PendingAction id={self.id} type='{self.action_type}' status='{self.status}'>"


class WorkflowEvent(Base):
    """
    n8n & outbound automation event queue with dead-letter queue (DLQ) state.
    ARCHITECTURE.md Section 3.4 & 3.5.
    """
    __tablename__ = "workflow_events"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'success', 'failed', 'retrying')",
            name="check_valid_workflow_event_status",
        ),
        Index("idx_wf_events_org_status", "organization_id", "status"),
        Index("idx_wf_events_type", "event_type"),
        Index("idx_wf_events_idempotency", "idempotency_key", unique=True),
        Index("idx_wf_events_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued")
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")

    def __repr__(self) -> str:
        return f"<WorkflowEvent id={self.id} type='{self.event_type}' status='{self.status}' retries={self.retry_count}>"


class AgentRun(Base):
    """
    End-to-end execution logging for autonomous agent workflows.
    ARCHITECTURE.md Section 3.4.
    """
    __tablename__ = "agent_runs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('running', 'completed', 'failed', 'paused_hitl')",
            name="check_valid_agent_run_status",
        ),
        Index("idx_agent_runs_org_id", "organization_id"),
        Index("idx_agent_runs_ticket_id", "ticket_id"),
        Index("idx_agent_runs_started_at", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="running")
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    ticket: Mapped["Ticket"] = relationship("Ticket")
    tool_calls: Mapped[List["ToolCall"]] = relationship(
        "ToolCall",
        back_populates="agent_run",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<AgentRun id={self.id} model='{self.model}' status='{self.status}'>"


class ToolCall(Base):
    """
    Atomic tool invocation log.
    ARCHITECTURE.md Section 3.4.
    """
    __tablename__ = "tool_calls"
    __table_args__ = (
        Index("idx_tool_calls_agent_run_id", "agent_run_id"),
        Index("idx_tool_calls_tool_name", "tool_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    agent_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agent_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)
    input: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    output: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="success")
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    agent_run: Mapped["AgentRun"] = relationship("AgentRun", back_populates="tool_calls")

    def __repr__(self) -> str:
        return f"<ToolCall id={self.id} tool='{self.tool_name}' status='{self.status}'>"


class AuditLog(Base):
    """
    Immutable security and action audit trail.
    ARCHITECTURE.md Section 3.4.
    """
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("idx_audit_logs_org_id", "organization_id"),
        Index("idx_audit_logs_actor_id", "actor_id"),
        Index("idx_audit_logs_entity", "entity_type", "entity_id"),
        Index("idx_audit_logs_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action='{self.action}' entity='{self.entity_type}'>"
