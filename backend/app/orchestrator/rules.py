from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.orchestrator.schemas import BusinessRuleValidationResult, ExtractedEntities
from app.orchestrator.guardrails import strip_unknown_urls


class BusinessRuleValidator:
    """
    Step 6: Validate Results & Apply Business Rules.
    Enforces deterministic e-commerce policy constraints and Human-in-the-Loop thresholds.
    """

    @staticmethod
    def validate(
        intent: str,
        entities: ExtractedEntities,
        order_data: Optional[Dict[str, Any]] = None,
        shipment_data: Optional[Dict[str, Any]] = None,
    ) -> BusinessRuleValidationResult:
        violations: List[str] = []
        requires_hitl = False
        hitl_reason = None
        allowed_action = None
        penalty = 0.0

        # --- Rule 1: Return Window (<= 30 calendar days) ---
        if intent == "return_request":
            if order_data:
                created_at_str = order_data.get("created_at")
                if created_at_str:
                    try:
                        # Parse ISO datetime
                        created_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                        now_dt = datetime.now(timezone.utc)
                        age_days = (now_dt - created_dt).days
                        if age_days > settings.RETURN_WINDOW_DAYS:
                            violations.append(
                                f"Order age ({age_days} days) exceeds the standard {settings.RETURN_WINDOW_DAYS}-day return window."
                            )
                            requires_hitl = True
                            hitl_reason = f"Return requested outside the standard {settings.RETURN_WINDOW_DAYS}-day window (order is {age_days} days old)."
                    except Exception:
                        pass

            # --- Rule 2: Refund Financial Threshold ($50.00 / 5000 cents) ---
            refund_amount = entities.amount_cents
            if refund_amount is None and order_data:
                refund_amount = order_data.get("total_amount_cents", 0)

            if refund_amount is not None:
                if refund_amount > settings.REFUND_AUTONOMOUS_THRESHOLD_CENTS:
                    requires_hitl = True
                    hitl_reason = (
                        f"Financial refund proposal (${refund_amount / 100:.2f}) "
                        f"exceeds autonomous threshold (${settings.REFUND_AUTONOMOUS_THRESHOLD_CENTS / 100:.2f}) and requires staff approval."
                    )
                    allowed_action = "request_refund_approval"
                else:
                    allowed_action = "issue_return_label"
            else:
                allowed_action = "issue_return_label"

        # --- Rule 3: In-Transit Cancellation Guard ---
        elif intent == "cancellation_request":
            order_status = (order_data or {}).get("status", "").lower()
            shipment_status = (shipment_data or {}).get("status", "").lower()

            if order_status in ["in_transit", "shipped", "delivered"] or shipment_status in ["in_transit", "delivered"]:
                requires_hitl = True
                hitl_reason = f"Order status is '{order_status or shipment_status}' and cannot be cancelled autonomously without carrier intervention."
                allowed_action = "escalate_to_human"
                violations.append("Attempted autonomous cancellation of dispatched consignment.")
            else:
                allowed_action = "cancel_order_request"

        elif intent == "order_status_tracking":
            allowed_action = "send_information_reply"

        else:
            allowed_action = "send_information_reply"

        is_valid = len(violations) == 0

        return BusinessRuleValidationResult(
            is_valid=is_valid,
            requires_hitl=requires_hitl,
            hitl_reason=hitl_reason,
            rule_violations=violations,
            allowed_action_type=allowed_action,
            confidence_penalty=penalty,
        )

    @staticmethod
    def sanitize_output_reply(reply: str) -> str:
        """Applies URL allow-listing safety rail to final generated reply text."""
        sanitized, _ = strip_unknown_urls(reply)
        return sanitized
