from typing import List, Dict, Any, Optional
from app.orchestrator.schemas import ExtractedEntities, ToolPlanResult


class DataNeedsPlanner:
    """
    Step 4: Plan Business Data Needs (Least-Privilege Tool Selection).
    Determines minimal set of read-only business tools required to fulfill customer intent.
    Always includes get_order_details if an order_id is mentioned to verify ownership.
    """
    @staticmethod
    def plan(intent: str, entities: ExtractedEntities) -> ToolPlanResult:
        planned: List[str] = []
        rationale_parts: List[str] = []

        if intent in ["order_status_tracking", "cancellation_request"]:
            if entities.order_id:
                planned.append("get_order_details")
                planned.append("get_shipment_status")
                rationale_parts.append(f"Fetch order {entities.order_id} and shipment status to verify delivery phase.")
            elif entities.tracking_number:
                planned.append("get_shipment_status")
                rationale_parts.append(f"Query carrier status for tracking number {entities.tracking_number}.")
            else:
                planned.append("get_customer_orders")
                planned.append("get_shipment_status")
                rationale_parts.append("Order identifier missing; retrieve customer order history and active shipment status.")

        elif intent == "return_request":
            if entities.order_id:
                planned.append("get_order_details")
                planned.append("get_return_policy")
                rationale_parts.append(f"Verify items and delivery date for order {entities.order_id} against return policy.")
            else:
                planned.append("get_customer_orders")
                planned.append("get_return_policy")
                rationale_parts.append("Retrieve recent purchases and standard 30-day return policy terms.")

        elif intent == "warranty_claim":
            if entities.order_id:
                planned.append("get_order_details")
            planned.append("get_return_policy")
            rationale_parts.append("Retrieve hardware warranty terms and purchase verification.")

        else:  # general_support_faq
            if entities.order_id:
                planned.append("get_order_details")
                rationale_parts.append(f"Verify customer ownership of mentioned order {entities.order_id}.")
            planned.append("search_knowledge_base")
            rationale_parts.append("Query indexed support articles and policy FAQ.")

        # Security guarantee: If an order ID is present, get_order_details MUST be planned to enforce ownership
        if entities.order_id and "get_order_details" not in planned:
            planned.insert(0, "get_order_details")

        return ToolPlanResult(
            planned_tools=planned,
            rationale=" ".join(rationale_parts),
        )
