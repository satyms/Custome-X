import time
from typing import Dict, Any, Optional
from app.schemas.agent import AgentRunRequest, AgentRunResponse, ReplySuggestionResponse


def run_agent_loop(req: AgentRunRequest) -> AgentRunResponse:
    start_time = time.time()
    instruction = (req.user_instruction or "").lower()

    # Rule & Intent Classification
    if "refund" in instruction or "money back" in instruction:
        intent = "refund_request"
        tools = ["lookup_order", "calculate_return_eligibility"]
        # HITL Boundary: refunds require supervisor sign-off
        requires_hitl = True
        hitl_reason = "Financial refund request exceeds autonomous execution threshold ($50.00)"
        status = "paused_hitl"
        reply = "I have initiated a return authorization for your order. Because the refund value exceeds $50.00, our support supervisor will finalize the credit to your account shortly."
    elif "where" in instruction or "tracking" in instruction or "order" in instruction:
        intent = "order_status_tracking"
        tools = ["lookup_order", "track_package"]
        requires_hitl = False
        hitl_reason = None
        status = "completed"
        reply = "Your order #ORD-99120 is currently In Transit via FedEx (Tracking: FX-884192039). The latest carrier scan shows arrival at the regional sorting depot. Estimated delivery is tomorrow by 4:00 PM."
    else:
        intent = "general_support_faq"
        tools = ["search_knowledge_base"]
        requires_hitl = False
        hitl_reason = None
        status = "completed"
        reply = "Thank you for reaching out! In accordance with our customer service terms, our items carry a 30-day satisfaction guarantee. How else may I assist you today?"

    execution_time = round((time.time() - start_time) * 1000, 2)
    return AgentRunResponse(
        ticket_id=req.ticket_id,
        status=status,
        intent=intent,
        tools_called=tools,
        proposed_reply=reply,
        requires_hitl=requires_hitl,
        hitl_reason=hitl_reason,
        execution_time_ms=execution_time,
    )


def generate_reply_suggestion(ticket_id: str) -> ReplySuggestionResponse:
    return ReplySuggestionResponse(
        ticket_id=ticket_id,
        suggestion="I have confirmed your package status with the local distribution facility. It is out for delivery today. Please let me know if you need any adjustments to your delivery address!",
        confidence_score=0.96,
        sources_cited=[
            "FedEx Milestone Event #FX-884192039",
            "Return & Refund Policy 2026 §1.2",
        ],
        action_recommended="send_and_keep_open",
    )
