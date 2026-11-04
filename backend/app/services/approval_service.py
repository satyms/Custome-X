from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict
from app.schemas.approval import ApprovalActionResponse
from app.core.exceptions import EntityNotFoundError, ForbiddenError

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

    # Policy guard: high-risk/critical actions require supervisor or admin
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
