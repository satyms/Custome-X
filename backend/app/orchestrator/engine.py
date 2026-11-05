import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.exceptions import OwnershipViolationError, SecurityViolationError
from app.orchestrator.schemas import (
    OrchestrationInput,
    OrchestrationResponse,
    StepTrace,
    ProposedAction,
    ProposedActionPayload,
    SourceCitation,
)
from app.orchestrator.guardrails import (
    fence,
    mask_pii,
    detect_prompt_injection,
    strip_unknown_urls,
    verify_ownership,
)
from app.orchestrator.intent import classify_and_extract
from app.orchestrator.retrieval import KnowledgeRetriever
from app.orchestrator.planner import DataNeedsPlanner
from app.orchestrator.tools import ToolRegistry
from app.orchestrator.rules import BusinessRuleValidator
from app.orchestrator.llm_adapter import LLMProviderAdapter

logger = logging.getLogger("customex.orchestrator")


class OrchestrationEngine:
    """
    The 7-Step Deterministic AI Orchestration Engine for Custome-X.
    Guarantees strict adherence to security boundaries, ownership checks, and business rules.
    """

    @classmethod
    async def execute(cls, req: OrchestrationInput) -> OrchestrationResponse:
        total_start = time.time()
        traces: List[StepTrace] = []
        tools_called: List[str] = []

        # =====================================================================
        # Step 1: Input Validation & Sanitization
        # =====================================================================
        step1_start = time.time()
        raw_msg = req.message

        # Length cap enforcement (AI_security.md §4.1)
        if len(raw_msg) > settings.MAX_MESSAGE_LENGTH:
            raw_msg = raw_msg[:settings.MAX_MESSAGE_LENGTH]

        # PII Masking for logs/traces
        masked_for_logs = mask_pii(raw_msg)
        logger.info(f"Orchestrating ticket {req.ticket_id} for customer {req.customer_id}: {masked_for_logs}")

        # Prompt injection detection
        is_injection, injection_reason = detect_prompt_injection(raw_msg)
        if is_injection:
            logger.warning(f"Prompt injection attempt flagged on ticket {req.ticket_id}: {injection_reason}")

        # Delimiter breakout neutralization & fencing
        fenced_message = fence("customer_message", raw_msg)

        step1_time = round((time.time() - step1_start) * 1000, 2)
        traces.append(
            StepTrace(
                step_number=1,
                step_name="input_validation_and_sanitization",
                status="warning" if is_injection else "success",
                summary="Message sanitized, PII masked for tracing, and fenced in <untrusted> tags.",
                duration_ms=step1_time,
                metadata={"injection_detected": is_injection, "reason": injection_reason},
            )
        )

        # =====================================================================
        # Step 2: Intent Classification & Entity Extraction
        # =====================================================================
        step2_start = time.time()
        classification = classify_and_extract(raw_msg, fallback_order_id=req.order_id)
        intent = classification.intent
        entities = classification.entities
        confidence = classification.confidence

        step2_time = round((time.time() - step2_start) * 1000, 2)
        traces.append(
            StepTrace(
                step_number=2,
                step_name="intent_classification_and_entity_extraction",
                status="success",
                summary=f"Classified intent as '{intent}' with confidence {confidence:.2f}.",
                duration_ms=step2_time,
                metadata={
                    "intent": intent,
                    "order_id": entities.order_id,
                    "sku": entities.sku,
                    "reason": entities.reason,
                },
            )
        )

        # =====================================================================
        # Step 3: RAG Hybrid Retrieval
        # =====================================================================
        step3_start = time.time()
        rag_result = KnowledgeRetriever.retrieve(
            query=f"{intent} {entities.reason or ''} {raw_msg}",
            category="returns" if "return" in intent else None,
            top_k=3,
        )
        sources: List[SourceCitation] = list(rag_result.citations)

        step3_time = round((time.time() - step3_start) * 1000, 2)
        traces.append(
            StepTrace(
                step_number=3,
                step_name="rag_hybrid_retrieval",
                status="success",
                summary=f"Retrieved {len(rag_result.chunks)} active policy chunks.",
                duration_ms=step3_time,
                metadata={"chunks_count": len(rag_result.chunks)},
            )
        )

        # =====================================================================
        # Step 4: Plan Business Data Needs
        # =====================================================================
        step4_start = time.time()
        tool_plan = DataNeedsPlanner.plan(intent=intent, entities=entities)

        step4_time = round((time.time() - step4_start) * 1000, 2)
        traces.append(
            StepTrace(
                step_number=4,
                step_name="business_data_needs_planning",
                status="success",
                summary=f"Planned tools: {', '.join(tool_plan.planned_tools)}.",
                duration_ms=step4_time,
                metadata={"planned_tools": tool_plan.planned_tools, "rationale": tool_plan.rationale},
            )
        )

        # =====================================================================
        # Step 5: Call Approved Server-Side Tools
        # =====================================================================
        step5_start = time.time()
        tool_results: Dict[str, Any] = {}
        order_details: Optional[Dict[str, Any]] = None
        shipment_details: Optional[Dict[str, Any]] = None

        for tool_name in tool_plan.planned_tools:
            tools_called.append(tool_name)

            if tool_name == "get_order_details" and entities.order_id:
                # Strictly enforce ownership: raises OwnershipViolationError if unauthorized
                order_details = ToolRegistry.get_order_details(
                    order_id=entities.order_id,
                    customer_id=req.customer_id,
                )
                tool_results["get_order_details"] = order_details
                if "order_id" in order_details and "error" not in order_details:
                    sources.append(
                        SourceCitation(
                            source_type="database_record",
                            table="orders",
                            record_id=order_details["order_id"],
                            snippet=f"Order {order_details['order_id']} status: {order_details.get('status')}",
                        )
                    )

            elif tool_name == "get_shipment_status":
                shipment_details = ToolRegistry.get_shipment_status(
                    order_id=entities.order_id,
                    tracking_number=entities.tracking_number,
                    customer_id=req.customer_id,
                )
                tool_results["get_shipment_status"] = shipment_details
                if "tracking_number" in shipment_details:
                    sources.append(
                        SourceCitation(
                            source_type="carrier_scan",
                            table="shipments",
                            record_id=shipment_details["tracking_number"],
                            snippet=f"Carrier {shipment_details.get('carrier')} status: {shipment_details.get('status')}",
                        )
                    )

            elif tool_name == "get_return_policy":
                tool_results["get_return_policy"] = ToolRegistry.get_return_policy()

            elif tool_name == "get_customer_orders":
                tool_results["get_customer_orders"] = ToolRegistry.get_customer_orders(
                    customer_id=req.customer_id,
                )

        step5_time = round((time.time() - step5_start) * 1000, 2)
        traces.append(
            StepTrace(
                step_number=5,
                step_name="server_side_tool_execution",
                status="success",
                summary=f"Executed {len(tools_called)} allow-listed tools with verified ownership.",
                duration_ms=step5_time,
                metadata={"executed_tools": tools_called},
            )
        )

        # =====================================================================
        # Step 6: Validate Results & Apply Business Rules
        # =====================================================================
        step6_start = time.time()
        rule_eval = BusinessRuleValidator.validate(
            intent=intent,
            entities=entities,
            order_data=order_details,
            shipment_data=shipment_details,
        )

        needs_human = rule_eval.requires_hitl
        hitl_reason = rule_eval.hitl_reason
        action_type = rule_eval.allowed_action_type or "send_information_reply"

        # If injection attempt was detected, force safety restraint
        if is_injection:
            needs_human = True
            hitl_reason = f"Security review required: {injection_reason}"
            confidence = 0.50

        # Construct Proposed Action
        refund_amount = entities.amount_cents
        if refund_amount is None and order_details:
            refund_amount = order_details.get("total_amount_cents")

        proposed_action = ProposedAction(
            action_type=action_type,
            payload=ProposedActionPayload(
                order_id=entities.order_id,
                refund_amount_cents=refund_amount if "refund" in action_type else None,
                reason=entities.reason or "Customer support inquiry",
                tracking_number=entities.tracking_number or (shipment_details or {}).get("tracking_number"),
                carrier=(shipment_details or {}).get("carrier"),
                sku=entities.sku,
            ),
            idempotency_key=f"prop_{uuid.uuid4().hex[:12]}",
        )

        # If action requires HITL approval, register in pending queue
        if needs_human and action_type == "request_refund_approval" and entities.order_id:
            ToolRegistry.request_refund_approval(
                ticket_id=req.ticket_id,
                customer_id=req.customer_id,
                customer_name=(order_details or {}).get("customer_name") or "Support Customer",
                customer_email=req.customer_email or (order_details or {}).get("customer_email") or "cust@example.com",
                order_id=entities.order_id,
                refund_amount_cents=refund_amount or 0,
                reason=entities.reason or "Customer refund request",
                idempotency_key=proposed_action.idempotency_key,
            )

        step6_time = round((time.time() - step6_start) * 1000, 2)
        traces.append(
            StepTrace(
                step_number=6,
                step_name="business_rule_validation",
                status="warning" if needs_human else "success",
                summary=f"Business rules validated. Requires HITL: {needs_human}.",
                duration_ms=step6_time,
                metadata={
                    "needs_human": needs_human,
                    "hitl_reason": hitl_reason,
                    "violations": rule_eval.rule_violations,
                },
            )
        )

        # =====================================================================
        # Step 7: Structured Action Proposal Output
        # =====================================================================
        step7_start = time.time()
        answer_text = await LLMProviderAdapter.generate_response(
            intent=intent,
            fenced_user_message=fenced_message,
            retrieved_chunks=rag_result.chunks,
            tool_results=tool_results,
            business_rules_hitl=needs_human,
            hitl_reason=hitl_reason,
        )

        # Output safety rail: URL allow-listing
        final_answer = BusinessRuleValidator.sanitize_output_reply(answer_text)

        step7_time = round((time.time() - step7_start) * 1000, 2)
        traces.append(
            StepTrace(
                step_number=7,
                step_name="structured_action_proposal_output",
                status="success",
                summary="Synthesized grounded answer and generated typed action proposal.",
                duration_ms=step7_time,
            )
        )

        total_time = round((time.time() - total_start) * 1000, 2)

        return OrchestrationResponse(
            intent=intent,
            entities=entities,
            answer=final_answer,
            sources=sources,
            proposed_action=proposed_action,
            needs_human=needs_human,
            confidence_score=confidence,
            reason=hitl_reason,
            tools_called=tools_called,
            execution_traces=traces,
            total_execution_time_ms=total_time,
        )
