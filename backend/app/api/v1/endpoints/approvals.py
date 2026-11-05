import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.approval import ApprovalActionResponse, ApprovalDecisionRequest
from app.services import approval_service
from app.services.webhook_dispatcher import WebhookDispatcher
from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User

logger = logging.getLogger("customex.approvals")
router = APIRouter()


@router.get("/pending", response_model=List[ApprovalActionResponse])
def get_pending_approvals():
    """Retrieves all high-risk actions pending human staff sign-off."""
    return approval_service.list_approvals(status_filter="pending")


@router.get("", response_model=List[ApprovalActionResponse])
def list_all_approvals(status: Optional[str] = Query(None)):
    """Retrieves approvals filtered by status (pending, approved, rejected)."""
    return approval_service.list_approvals(status_filter=status)


@router.post("/{approval_id}/approve", response_model=ApprovalActionResponse)
async def approve_action(
    approval_id: str,
    decision: ApprovalDecisionRequest = ApprovalDecisionRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Authorizes a pending HITL action.
    High-risk actions require supervisor or admin credentials.
    Dispatches approval.approved event to Layer 5 automations.
    """
    result = approval_service.approve_action(
        approval_id=approval_id,
        reviewer_name=current_user.full_name or current_user.email,
        reviewer_role=current_user.role,
        note=decision.note,
    )
    try:
        await WebhookDispatcher.dispatch_event(
            session=db,
            organization_id=current_user.organization_id,
            event_type="approval.approved",
            payload={
                "approval_id": approval_id,
                "ticket_id": result.ticket_id,
                "ticket_number": result.ticket_number,
                "amount": result.amount,
                "reviewed_by": result.reviewed_by,
                "note": result.review_note or decision.note,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to dispatch approval.approved webhook: {e}")

    return result


@router.post("/{approval_id}/reject", response_model=ApprovalActionResponse)
async def reject_action(
    approval_id: str,
    decision: ApprovalDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Rejects a proposed action with mandatory rationale logged to audit trail.
    Dispatches approval.rejected event to Layer 5 automations.
    """
    reason = decision.rejection_reason or decision.note or "Rejected by support staff"
    result = approval_service.reject_action(
        approval_id=approval_id,
        reviewer_name=current_user.full_name or current_user.email,
        reason=reason,
    )
    try:
        await WebhookDispatcher.dispatch_event(
            session=db,
            organization_id=current_user.organization_id,
            event_type="approval.rejected",
            payload={
                "approval_id": approval_id,
                "ticket_id": result.ticket_id,
                "ticket_number": result.ticket_number,
                "amount": result.amount,
                "reviewed_by": result.reviewed_by,
                "rejection_reason": reason,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to dispatch approval.rejected webhook: {e}")

    return result
