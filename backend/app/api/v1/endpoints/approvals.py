from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.approval import ApprovalActionResponse, ApprovalDecisionRequest
from app.services import approval_service
from app.core.auth import get_current_user
from app.models.user import User

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
def approve_action(
    approval_id: str,
    decision: ApprovalDecisionRequest = ApprovalDecisionRequest(),
    current_user: User = Depends(get_current_user),
):
    """
    Authorizes a pending HITL action.
    High-risk actions require supervisor or admin credentials.
    """
    return approval_service.approve_action(
        approval_id=approval_id,
        reviewer_name=current_user.full_name or current_user.email,
        reviewer_role=current_user.role,
        note=decision.note,
    )


@router.post("/{approval_id}/reject", response_model=ApprovalActionResponse)
def reject_action(
    approval_id: str,
    decision: ApprovalDecisionRequest,
    current_user: User = Depends(get_current_user),
):
    """Rejects a proposed action with mandatory rationale logged to audit trail."""
    reason = decision.rejection_reason or decision.note or "Rejected by support staff"
    return approval_service.reject_action(
        approval_id=approval_id,
        reviewer_name=current_user.full_name or current_user.email,
        reason=reason,
    )
