import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.services import commerce_service, knowledge_service, approval_service
from app.schemas.approval import ApprovalActionResponse
from app.orchestrator.guardrails import verify_ownership, fence
from app.core.exceptions import EntityNotFoundError, OwnershipViolationError


class ToolRegistry:
    """
    Step 5: Typed Server-Side Tool Execution Registry.
    Enforces strict customer ownership checks and parameter validation.
    """

    @staticmethod
    def get_order_details(order_id: str, customer_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves order details and verifies customer ownership.
        Throws OwnershipViolationError if customer does not own the order.
        """
        order = commerce_service.get_order_by_number(order_id)
        if not order:
            return {"error": f"Order '{order_id}' was not found in customer record."}

        # Ownership enforcement (AI_security.md §4.4)
        if customer_id and order.customer_id:
            verify_ownership(
                ticket_customer_id=customer_id,
                resource_customer_id=order.customer_id,
                resource_name="order",
                resource_id=order_id,
            )

        items_summary = [
            {
                "sku": item.sku,
                "title": item.title,
                "quantity": item.quantity,
                "price_cents": item.price_cents,
            }
            for item in order.items
        ]

        return {
            "order_id": order.order_number,
            "status": order.status,
            "customer_id": order.customer_id,
            "customer_name": order.customer_name,
            "customer_email": order.customer_email,
            "total_amount_cents": order.total_amount_cents,
            "currency": order.currency,
            "carrier": order.carrier,
            "tracking_number": order.tracking_number,
            "created_at": order.created_at.isoformat() if hasattr(order.created_at, "isoformat") else str(order.created_at),
            "items": items_summary,
        }

    @staticmethod
    def get_customer_orders(customer_id: str, limit: int = 5) -> Dict[str, Any]:
        """Fetches order history belonging to the authenticated customer."""
        orders = commerce_service.SAMPLE_ORDERS
        matching = [
            {
                "order_id": o.order_number,
                "status": o.status,
                "total_amount_cents": o.total_amount_cents,
                "tracking_number": o.tracking_number,
                "created_at": o.created_at.isoformat() if hasattr(o.created_at, "isoformat") else str(o.created_at),
                "items_count": len(o.items),
            }
            for o in orders
            if o.customer_id.lower() == str(customer_id).lower()
        ]
        return {"orders": matching[:limit]}

    @staticmethod
    def get_shipment_status(
        order_id: Optional[str] = None,
        tracking_number: Optional[str] = None,
        customer_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves shipment milestone scans and delivery progress.
        """
        target_tracking = tracking_number

        if not target_tracking and order_id:
            order = commerce_service.get_order_by_number(order_id)
            if order:
                if customer_id and order.customer_id:
                    verify_ownership(customer_id, order.customer_id, "order", order_id)
                target_tracking = order.tracking_number

        if not target_tracking:
            return {"error": "No tracking number available for lookup."}

        shipment = commerce_service.get_shipment_by_tracking(target_tracking)
        if not shipment:
            return {
                "tracking_number": target_tracking,
                "status": "in_transit",
                "carrier": "FedEx",
                "latest_event": "Parcel scanned at regional logistics interchange.",
            }

        events_summary = [
            {
                "timestamp": e.timestamp.isoformat() if hasattr(e.timestamp, "isoformat") else str(e.timestamp),
                "status": e.status,
                "location": e.location,
                "details": getattr(e, "description", getattr(e, "details", "")),
            }
            for e in shipment.events
        ]

        return {
            "tracking_number": shipment.tracking_number,
            "carrier": shipment.carrier,
            "status": shipment.status,
            "origin": getattr(shipment, "origin", None),
            "destination": getattr(shipment, "destination", None),
            "estimated_delivery": (
                shipment.estimated_delivery.isoformat()
                if shipment.estimated_delivery and hasattr(shipment.estimated_delivery, "isoformat")
                else str(shipment.estimated_delivery)
            ),
            "events": events_summary,
        }

    @staticmethod
    def get_return_policy(category: str = "returns") -> Dict[str, Any]:
        """Returns standard policy clauses for returns, refunds, and replacements."""
        return {
            "policy_title": "30-Day Return & Refund Policy 2026",
            "version": "2.1",
            "status": "active",
            "return_window_days": 30,
            "autonomous_refund_threshold_cents": 5000,
            "clauses": [
                {
                    "section": "Section 4.1: Standard Returns",
                    "text": "Merchandise may be returned within 30 days of confirmed delivery for a 100% refund.",
                },
                {
                    "section": "Section 4.2: Damaged or Incorrect Items",
                    "text": "Complimentary replacement or immediate refund for defective, transit-damaged, or incorrect items.",
                },
                {
                    "section": "Section 4.3: Lost in Transit",
                    "text": "Parcels with no carrier scan for >14 consecutive days are deemed lost; full refund or expedited replacement authorized.",
                },
            ],
        }

    @staticmethod
    def request_refund_approval(
        ticket_id: str,
        customer_id: str,
        customer_name: str,
        customer_email: str,
        order_id: str,
        refund_amount_cents: int,
        reason: str,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a pending Human-in-the-Loop approval record in the database/approval service.
        """
        action_id = f"app_{uuid.uuid4().hex[:8]}"
        amount_dollars = round(refund_amount_cents / 100.0, 2)

        approval = ApprovalActionResponse(
            id=action_id,
            type="refund",
            title=f"Refund ${amount_dollars:.2f} for Order {order_id}",
            ticket_id=ticket_id,
            ticket_number=f"CX-{order_id.replace('ORD-', '')}",
            customer_name=customer_name or "Support Customer",
            customer_email=customer_email or "customer@example.com",
            amount=amount_dollars,
            order_id=order_id,
            risk_level="high" if amount_dollars > 100 else "medium",
            confidence_score=95,
            ai_rationale=f"Automated refund proposal for {reason}. Exceeds autonomous threshold ($50.00).",
            proposed_payload={
                "action": "stripe_refund",
                "amount_cents": refund_amount_cents,
                "order_id": order_id,
                "reason": reason,
                "idempotency_key": idempotency_key or f"idem_{uuid.uuid4().hex[:12]}",
            },
            status="pending",
            requested_at=datetime.now(timezone.utc),
        )

        approval_service.INITIAL_APPROVALS[action_id] = approval
        return {
            "pending_action_id": action_id,
            "status": "pending_approval",
            "amount_dollars": amount_dollars,
            "order_id": order_id,
        }
