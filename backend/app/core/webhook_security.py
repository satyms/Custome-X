import hmac
import hashlib
import base64
import time
from typing import Dict, Optional, Tuple
from app.core.exceptions import WebhookVerificationError


class EventDeduplicator:
    """
    In-memory TTL-based idempotency cache to prevent duplicate webhook delivery processing.
    """
    def __init__(self, ttl_seconds: int = 3600):
        self.ttl_seconds = ttl_seconds
        # event_id -> timestamp
        self._processed_events: Dict[str, float] = {}

    def is_duplicate(self, event_id: str) -> bool:
        now = time.time()
        self._evict_expired(now)
        if event_id in self._processed_events:
            return True
        self._processed_events[event_id] = now
        return False

    def _evict_expired(self, now: float) -> None:
        expired_keys = [
            k for k, ts in self._processed_events.items()
            if now - ts > self.ttl_seconds
        ]
        for k in expired_keys:
            del self._processed_events[k]

    def clear(self) -> None:
        self._processed_events.clear()


webhook_deduplicator = EventDeduplicator(ttl_seconds=3600)


def verify_hmac_sha256(
    raw_body: bytes,
    secret: str,
    signature_header: str,
    signature_format: str = "hex",
) -> bool:
    """
    Verifies raw request payload against HMAC-SHA256 signature.
    Supports 'hex' (Stripe, GitHub) and 'base64' (Shopify).
    """
    if not secret or not signature_header:
        raise WebhookVerificationError("Missing webhook secret or signature header.")

    computed_digest = hmac.new(
        key=secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256,
    )

    if signature_format == "base64":
        expected_sig = base64.b64encode(computed_digest.digest()).decode("utf-8")
        if not hmac.compare_digest(expected_sig, signature_header):
            raise WebhookVerificationError("Shopify HMAC SHA-256 base64 signature mismatch.")
    elif signature_format == "stripe":
        # Parse t=1612345678,v1=abc...
        parts = dict(item.split("=", 1) for item in signature_header.split(",") if "=" in item)
        timestamp = parts.get("t")
        sig_v1 = parts.get("v1")
        if not timestamp or not sig_v1:
            raise WebhookVerificationError("Malformed Stripe-Signature header.")
        
        signed_payload = f"{timestamp}.".encode("utf-8") + raw_body
        expected_sig = hmac.new(
            key=secret.encode("utf-8"),
            msg=signed_payload,
            digestmod=hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, sig_v1):
            raise WebhookVerificationError("Stripe HMAC SHA-256 signature mismatch.")
    else:
        # Default hex format (e.g. sha256=...)
        clean_sig = signature_header.replace("sha256=", "").strip()
        expected_sig = computed_digest.hexdigest()
        if not hmac.compare_digest(expected_sig, clean_sig):
            raise WebhookVerificationError("HMAC SHA-256 hex signature mismatch.")

    return True
