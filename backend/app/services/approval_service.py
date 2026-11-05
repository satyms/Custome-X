import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.approval import ApprovalActionResponse
from app.core.exceptions import EntityNotFoundError, ForbiddenError
from app.models.agent_audit import PendingAction, AuditLog
from app.models.ticket import Ticket
from app.models.customer import Customer
from app.models.user import User
from app.services.webhook_dispatcher import WebhookDispatcher

logger = logging.getLogger("customex.approvals")

# =============================================================================
# In-Memory Seed Storage (Surrogate for unit fixtures and demo preview)
# =============================================================================
INITIAL_APPROVALS: Dict[str, ApprovalActionResponse] = {
    "app_101": ApprovalActionResponse(
        id="app_101",
        type="refund",
        title="Refund $148.50 for Lost in Transit Consignment",
        ticket_id="t_8841",
        ticket_number="CX-1042",
        customer_name="Marcus Vance",
        customer_email="marcus.v@acme.org",
        amount=148.50,
        order_id="ORD-99120",
        risk_level="high",
        confidence_score=94,
        ai_rationale="Carrier scan has been idle for 16 days. Complies with Section 4.2 Non-Delivery policy.",
        proposed_payload={"action": "stripe_refund", "amount_cents": 14850, "currency": "usd"},
        status="pending",
        requested_at=datetime.now(timezone.utc) - timedelta(minutes=24),
    ),
    "app_102": ApprovalActionResponse(
        id="app_102",
        type="cancellation",
        title="Emergency Warehouse Dispatch Intercept",
        ticket_id="t_8845",
        ticket_number="CX-1045",
        customer_name="Samantha Green",
        customer_email="s.green@example.com",
        amount=320.00,
        order_id="ORD-99144",
        risk_level="critical",
        confidence_score=89,
        ai_rationale="Customer requested cancellation prior to pallet handoff to carrier.",
        proposed_payload={"action": "warehouse_intercept", "order_id": "ORD-99144"},
        status="pending",
        requested_at=datetime.now(timezone.utc) - timedelta(minutes=48),
    ),
}


# =============================================================================
# Milestone 5: Risk Classification Engine
# =============================================================================
def classify_action_risk(action_type: str, payload: Dict[str, Any]) -> Tuple[str, bool]:
    """
    Evaluates action parameters against organizational safety thresholds.
    Returns (risk_level, requires_approval).
    ARCHITECTURE.md Section 3.4.
    """
    action_type = action_type.lower()
    if action_type == "refund":
        cents = payload.get("amount_cents")
        if cents is None and "amount" in payload:
            cents = int(float(payload["amount"]) * 100)
        cents = cents or 0
        if cents > 20000:  # > $200.00
            return ("critical", True)
        elif cents > 5000:  # > $50.00
            return ("high", True)
        else:
            return ("low", False)

    elif action_type == "cancellation":
        order_status = str(payload.get("order_status", "")).lower()
        if order_status in ("shipped", "in_transit", "out_for_delivery", "delivered"):
            return ("critical", True)
        return ("low", False)

    elif action_type == "address_change":
        order_status = str(payload.get("order_status", "")).lower()
        if order_status in ("shipped", "in_transit", "out_for_delivery"):
            return ("high", True)
        return ("low", False)

    return ("medium", False)


# =============================================================================
# Milestone 5: Asynchronous Database Operations
# =============================================================================
async def create_pending_action_async(
    session: AsyncSession,
    organization_id: uuid.UUID,
    ticket_id: uuid.UUID,
    action_type: str,
    payload: Dict[str, Any],
    requested_by: str = "ai_agent",
    ai_rationale: str = "",
    confidence_score: int = 90,
) -> PendingAction:
    """
    Persists an approval-gated operation into public.pending_actions.
    Dispatches outbound automation event 'action.requires_approval'.
    """
    risk_level, _ = classify_action_risk(action_type, payload)
    enriched_payload = dict(payload)
    enriched_payload["risk_level"] = risk_level
    enriched_payload["ai_rationale"] = ai_rationale
    enriched_payload["confidence_score"] = confidence_score

    action = PendingAction(
        organization_id=organization_id,
        ticket_id=ticket_id,
        action_type=action_type,
        payload=enriched_payload,
        status="pending",
        requested_by=requested_by,
    )
    session.add(action)
    await session.commit()
    await session.refresh(action)

    # Queue outbound notification event
    try:
        await WebhookDispatcher.dispatch_event(
            session=session,
            organization_id=organization_id,
            event_type="action.requires_approval",
            payload={
                "pending_action_id": str(action.id),
                "ticket_id": str(ticket_id),
                "action_type": action_type,
                "risk_level": risk_level,
                "payload": enriched_payload,
            },
        )
    except Exception as e:
        logger.warning(f"Could not dispatch action.requires_approval webhook: {e}")

    return action


async def list_approvals_async(
    session: AsyncSession,
    organization_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
) -> List[ApprovalActionResponse]:
    """
    Retrieves approvals from public.pending_actions scoped to organization.
    Falls back to INITIAL_APPROVALS when database has no records.
    """
    query = (
        select(PendingAction)
        .options(selectinload(PendingAction.ticket).selectinload(Ticket.customer))
        .order_by(PendingAction.created_at.desc())
    )

    conditions = []
    if organization_id is not None:
        conditions.append(PendingAction.organization_id == organization_id)
    if status_filter:
        conditions.append(PendingAction.status == status_filter.lower())

    if conditions:
        query = query.where(and_(*conditions))

    result = await session.execute(query)
    rows = result.scalars().all()

    if not rows:
        # Fall back to in-memory items
        return list_approvals(status_filter=status_filter)

    items: List[ApprovalActionResponse] = []
    for r in rows:
        ticket = r.ticket
        customer = ticket.customer if ticket else None
        p = r.payload or {}
        amt_cents = p.get("amount_cents")
        amt_dollars = round(amt_cents / 100.0, 2) if amt_cents is not None else p.get("amount")

        items.append(
            ApprovalActionResponse(
                id=str(r.id),
                type=r.action_type,
                title=f"{r.action_type.capitalize()} request for Ticket #{ticket.ticket_number if ticket else str(r.ticket_id)[:8]}",
                ticket_id=str(r.ticket_id),
                ticket_number=ticket.ticket_number if ticket else f"CX-{str(r.ticket_id)[:6].upper()}",
                customer_name=customer.full_name if customer else "Customer",
                customer_email=customer.email if customer else "customer@example.com",
                amount=amt_dollars,
                order_id=p.get("order_id"),
                risk_level=p.get("risk_level", "high"),
                confidence_score=p.get("confidence_score", 90),
                ai_rationale=p.get("ai_rationale", "Proposed by autonomous support orchestrator."),
                proposed_payload=p,
                status=r.status,
                requested_at=r.created_at,
                reviewed_by=r.reviewer_notes,
                reviewed_at=r.updated_at if r.status != "pending" else None,
                rejection_reason=r.reviewer_notes if r.status == "rejected" else None,
            )
        )
    return items


async def approve_action_async(
    session: AsyncSession,
    approval_id: str,
    reviewer_user: User,
    note: Optional[str] = None,
) -> ApprovalActionResponse:
    """
    Authorizes a pending HITL action.
    Enforces supervisor/admin RBAC on high-risk operations and records audit log.
    """
    # 1. Try to load from database
    db_action: Optional[PendingAction] = None
    try:
        action_uuid = uuid.UUID(approval_id)
        db_action = await session.get(PendingAction, action_uuid)
    except ValueError:
        db_action = None

    if db_action:
        risk_level = db_action.payload.get("risk_level", "high")
        if risk_level in ("high", "critical") and reviewer_user.role not in ("supervisor", "admin"):
            raise ForbiddenError("Only supervisors and administrators may authorize high-risk HITL actions.")

        db_action.status = "approved"
        db_action.reviewed_by = reviewer_user.id
        db_action.reviewer_notes = note or "Approved by staff"
        db_action.updated_at = datetime.now(timezone.utc)

        # Record immutable audit log
        audit = AuditLog(
            organization_id=db_action.organization_id,
            actor_id=str(reviewer_user.id),
            action="approval.approved",
            entity_type="pending_action",
            entity_id=str(db_action.id),
            details={
                "action_type": db_action.action_type,
                "reviewer_name": reviewer_user.full_name,
                "reviewer_role": reviewer_user.role,
                "note": note,
            },
        )
        session.add(audit)
        await session.commit()
        await session.refresh(db_action)

        # Dispatch outbound webhook
        try:
            await WebhookDispatcher.dispatch_event(
                session=session,
                organization_id=db_action.organization_id,
                event_type="approval.approved",
                payload={
                    "approval_id": str(db_action.id),
                    "ticket_id": str(db_action.ticket_id),
                    "reviewed_by": reviewer_user.full_name,
                    "note": note,
                },
            )
        except Exception as e:
            logger.warning(f"Could not dispatch approval.approved webhook: {e}")

        amt_cents = db_action.payload.get("amount_cents")
        amt_dollars = round(amt_cents / 100.0, 2) if amt_cents is not None else db_action.payload.get("amount")

        return ApprovalActionResponse(
            id=str(db_action.id),
            type=db_action.action_type,
            title=f"Approved {db_action.action_type}",
            ticket_id=str(db_action.ticket_id),
            ticket_number=f"CX-{str(db_action.ticket_id)[:6].upper()}",
            customer_name="Customer",
            customer_email="customer@example.com",
            amount=amt_dollars,
            order_id=db_action.payload.get("order_id"),
            risk_level=risk_level,
            confidence_score=db_action.payload.get("confidence_score", 90),
            ai_rationale=db_action.payload.get("ai_rationale", ""),
            proposed_payload=db_action.payload,
            status="approved",
            requested_at=db_action.created_at,
            reviewed_by=reviewer_user.full_name,
            reviewed_at=db_action.updated_at,
        )

    # 2. In-memory fallback
    item = INITIAL_APPROVALS.get(approval_id)
    if not item:
        raise EntityNotFoundError("ApprovalAction", approval_id)

    if item.risk_level in ("high", "critical") and reviewer_user.role not in ("supervisor", "admin"):
        raise ForbiddenError("Only supervisors and administrators may authorize high-risk HITL actions.")

    now = datetime.now(timezone.utc)
    item.status = "approved"
    item.reviewed_by = reviewer_user.full_name or reviewer_user.email
    item.reviewed_at = now
    return item


async def reject_action_async(
    session: AsyncSession,
    approval_id: str,
    reviewer_user: User,
    reason: str,
) -> ApprovalActionResponse:
    """
    Rejects a pending HITL action with mandatory rationale logged to audit trail.
    """
    if not reason or not reason.strip():
        raise ValueError("A rejection reason is mandatory.")

    # 1. Try to load from database
    db_action: Optional[PendingAction] = None
    try:
        action_uuid = uuid.UUID(approval_id)
        db_action = await session.get(PendingAction, action_uuid)
    except ValueError:
        db_action = None

    if db_action:
        db_action.status = "rejected"
        db_action.reviewed_by = reviewer_user.id
        db_action.reviewer_notes = reason
        db_action.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            organization_id=db_action.organization_id,
            actor_id=str(reviewer_user.id),
            action="approval.rejected",
            entity_type="pending_action",
            entity_id=str(db_action.id),
            details={
                "action_type": db_action.action_type,
                "reviewer_name": reviewer_user.full_name,
                "reviewer_role": reviewer_user.role,
                "reason": reason,
            },
        )
        session.add(audit)
        await session.commit()
        await session.refresh(db_action)

        try:
            await WebhookDispatcher.dispatch_event(
                session=session,
                organization_id=db_action.organization_id,
                event_type="approval.rejected",
                payload={
                    "approval_id": str(db_action.id),
                    "ticket_id": str(db_action.ticket_id),
                    "reviewed_by": reviewer_user.full_name,
                    "reason": reason,
                },
            )
        except Exception as e:
            logger.warning(f"Could not dispatch approval.rejected webhook: {e}")

        amt_cents = db_action.payload.get("amount_cents")
        amt_dollars = round(amt_cents / 100.0, 2) if amt_cents is not None else db_action.payload.get("amount")

        return ApprovalActionResponse(
            id=str(db_action.id),
            type=db_action.action_type,
            title=f"Rejected {db_action.action_type}",
            ticket_id=str(db_action.ticket_id),
            ticket_number=f"CX-{str(db_action.ticket_id)[:6].upper()}",
            customer_name="Customer",
            customer_email="customer@example.com",
            amount=amt_dollars,
            order_id=db_action.payload.get("order_id"),
            risk_level=db_action.payload.get("risk_level", "high"),
            confidence_score=db_action.payload.get("confidence_score", 90),
            ai_rationale=db_action.payload.get("ai_rationale", ""),
            proposed_payload=db_action.payload,
            status="rejected",
            requested_at=db_action.created_at,
            reviewed_by=reviewer_user.full_name,
            reviewed_at=db_action.updated_at,
            rejection_reason=reason,
        )

    # 2. In-memory fallback
    item = INITIAL_APPROVALS.get(approval_id)
    if not item:
        raise EntityNotFoundError("ApprovalAction", approval_id)

    now = datetime.now(timezone.utc)
    item.status = "rejected"
    item.reviewed_by = reviewer_user.full_name or reviewer_user.email
    item.reviewed_at = now
    item.rejection_reason = reason
    return item


# Synchronous compatibility bridges
def list_approvals(status_filter: Optional[str] = None) -> List[ApprovalActionResponse]:
    items = list(INITIAL_APPROVALS.values())
    if status_filter:
        items = [i for i in items if i.status.lower() == status_filter.lower()]
    return items


def get_approval(approval_id: str) -> Optional[ApprovalActionResponse]:
    return INITIAL_APPROVALS.get(approval_id)


def approve_action(
    approval_id: str,
    reviewer_name: str,
    reviewer_role: str,
    note: Optional[str] = None,
) -> ApprovalActionResponse:
    item = INITIAL_APPROVALS.get(approval_id)
    if not item:
        raise EntityNotFoundError("ApprovalAction", approval_id)
    if item.risk_level in ("high", "critical") and reviewer_role not in ("supervisor", "admin"):
        raise ForbiddenError("Only supervisors and administrators may authorize high-risk HITL actions.")
    now = datetime.now(timezone.utc)
    item.status = "approved"
    item.reviewed_by = reviewer_name
    item.reviewed_at = now
    return item


def reject_action(
    approval_id: str,
    reviewer_name: str,
    reason: str,
) -> ApprovalActionResponse:
    item = INITIAL_APPROVALS.get(approval_id)
    if not item:
        raise EntityNotFoundError("ApprovalAction", approval_id)
    now = datetime.now(timezone.utc)
    item.status = "rejected"
    item.reviewed_by = reviewer_name
    item.reviewed_at = now
    item.rejection_reason = reason
    return item
