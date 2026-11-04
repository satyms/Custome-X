import time
from typing import Dict, Tuple, Optional
from fastapi import Request
from app.core.exceptions import RateLimitExceededError


class TokenBucket:
    """
    Thread-safe in-memory Token Bucket rate limiter.
    capacity: Maximum burst capacity of tokens.
    refill_rate: Number of tokens replenished per second.
    """
    def __init__(self, capacity: float = 10.0, refill_rate: float = 2.0):
        self.capacity = capacity
        self.refill_rate = refill_rate
        # key -> (tokens, last_refill_timestamp)
        self._buckets: Dict[str, Tuple[float, float]] = {}

    def consume(self, key: str, tokens_needed: float = 1.0) -> Tuple[bool, int, int]:
        now = time.time()
        current_tokens, last_refill = self._buckets.get(key, (self.capacity, now))

        # Replenish tokens based on elapsed wall-clock time
        elapsed = now - last_refill
        refilled = current_tokens + (elapsed * self.refill_rate)
        current_tokens = min(self.capacity, refilled)
        last_refill = now

        if current_tokens >= tokens_needed:
            current_tokens -= tokens_needed
            self._buckets[key] = (current_tokens, last_refill)
            remaining = int(current_tokens)
            return True, remaining, 0
        else:
            self._buckets[key] = (current_tokens, last_refill)
            tokens_deficit = tokens_needed - current_tokens
            retry_after = max(1, int(tokens_deficit / self.refill_rate) + 1)
            return False, 0, retry_after

    def reset(self, key: Optional[str] = None):
        if key:
            self._buckets.pop(key, None)
        else:
            self._buckets.clear()


# Global rate limiter instance for AI / LLM / RAG invocation routes
ai_rate_limiter = TokenBucket(capacity=10.0, refill_rate=2.0)


async def check_ai_rate_limit(request: Request) -> None:
    """
    FastAPI dependency enforcing token bucket rate limiting on AI-invoking endpoints.
    Identifies tenant via Authorization header, query param, or client host.
    """
    client_id = (
        request.headers.get("x-organization-id")
        or request.headers.get("authorization")
        or getattr(request.client, "host", "anonymous")
    )
    allowed, remaining, retry_after = ai_rate_limiter.consume(client_id, tokens_needed=1.0)
    if not allowed:
        raise RateLimitExceededError(retry_after=retry_after)
