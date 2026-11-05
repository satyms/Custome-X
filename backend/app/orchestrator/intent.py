import re
from typing import Dict, Any, Tuple, Optional
from app.orchestrator.schemas import ExtractedEntities, ClassifiedIntentResult


ORDER_ID_REGEX = re.compile(r"\b(ORD-\d{4,8})\b", re.I)
ORDER_NUM_LOOSE = re.compile(r"(?:order|order number|order #)\s*[:#]?\s*([A-Za-z0-9-_]{4,15})", re.I)
SKU_REGEX = re.compile(r"\b([A-Z0-9]{3,5}-[A-Z0-9]{2,6}(?:-[A-Z0-9]{2,6})?)\b")
TRACKING_REGEX = re.compile(r"\b(FX-\d{6,14}|1Z[0-9A-Z]{16}|\b\d{20,22}\b)\b", re.I)
AMOUNT_REGEX = re.compile(r"\$(\d+(?:\.\d{2})?)")


REASON_MAP = {
    "damaged": "item_damaged_in_transit",
    "broken": "defective_or_broken",
    "defective": "defective_unit",
    "wrong item": "incorrect_item_delivered",
    "incorrect": "incorrect_item_delivered",
    "not as described": "item_not_as_described",
    "too late": "delivery_delayed",
    "delayed": "delivery_delayed",
    "didn't arrive": "lost_in_transit",
    "lost": "lost_in_transit",
    "change mind": "buyer_remorse",
}


class IntentClassifier:
    """
    Deterministic intent classification & keyword-confidence scoring.
    """
    @staticmethod
    def classify(message: str) -> Tuple[str, float]:
        text = message.lower()

        # 1. Return & Refund Requests
        if any(w in text for w in ["refund", "return", "money back", "exchange", "send back", "store credit"]):
            return "return_request", 0.96

        # 2. Tracking & Order Status
        if any(w in text for w in [
            "where is", "where's", "tracking", "track", "shipped", "carrier", "transit",
            "package status", "delivery status", "when will it arrive", "delayed"
        ]):
            return "order_status_tracking", 0.95

        # 3. Cancellation Requests
        if any(w in text for w in ["cancel my order", "cancel order", "stop delivery", "cancel", "don't want it"]):
            return "cancellation_request", 0.93

        # 4. Warranty Claims
        if any(w in text for w in ["warranty", "repair", "hardware defect", "guarantee claim"]):
            return "warranty_claim", 0.92

        # 5. General Support / Store Policies
        return "general_support_faq", 0.85


class EntityExtractor:
    """
    High-precision deterministic entity extraction for e-commerce support.
    """
    @staticmethod
    def extract(message: str, fallback_order_id: Optional[str] = None) -> ExtractedEntities:
        # Extract Order ID
        order_id = fallback_order_id
        match_order = ORDER_ID_REGEX.search(message)
        if match_order:
            order_id = match_order.group(1).upper()
        elif not order_id:
            loose_match = ORDER_NUM_LOOSE.search(message)
            if loose_match:
                candidate = loose_match.group(1).upper()
                if not candidate.startswith("STATUS") and not candidate.startswith("CONFIRMED"):
                    order_id = candidate

        # Extract SKU (Iterate through all candidate matches to find one distinct from order_id)
        sku = None
        for m in SKU_REGEX.finditer(message):
            cand = m.group(1).upper()
            if cand != order_id and not cand.startswith("ORD-") and not cand.startswith("FX-"):
                sku = cand
                break

        # Extract Tracking Number
        tracking_number = None
        match_trk = TRACKING_REGEX.search(message)
        if match_trk:
            tracking_number = match_trk.group(1).upper()

        # Extract Amount
        amount_cents = None
        match_amt = AMOUNT_REGEX.search(message)
        if match_amt:
            try:
                dollars = float(match_amt.group(1))
                amount_cents = int(round(dollars * 100))
            except Exception:
                pass

        # Extract Reason
        reason = None
        text_lower = message.lower()
        for kw, canonical_reason in REASON_MAP.items():
            if kw in text_lower:
                reason = canonical_reason
                break

        return ExtractedEntities(
            order_id=order_id,
            sku=sku,
            tracking_number=tracking_number,
            reason=reason,
            amount_cents=amount_cents,
        )


def classify_and_extract(message: str, fallback_order_id: Optional[str] = None) -> ClassifiedIntentResult:
    intent, conf = IntentClassifier.classify(message)
    entities = EntityExtractor.extract(message, fallback_order_id=fallback_order_id)
    return ClassifiedIntentResult(
        intent=intent,
        confidence=conf,
        entities=entities,
    )
