import hmac
import hashlib
import base64
import pytest
from httpx import AsyncClient
from app.api.v1.endpoints.webhooks import DEFAULT_TEST_WEBHOOK_SECRET
from app.core.webhook_security import webhook_deduplicator


@pytest.mark.asyncio
async def test_shopify_webhook_hmac_and_deduplication(client: AsyncClient):
    """Verifies Shopify webhook HMAC-SHA256 signature verification and event deduplication."""
    webhook_deduplicator.clear()
    payload = b'{"id": 99120, "email": "marcus.v@acme.org", "total_price": "148.50"}'

    # Compute valid Shopify Base64 signature
    computed_digest = hmac.new(
        key=DEFAULT_TEST_WEBHOOK_SECRET.encode("utf-8"),
        msg=payload,
        digestmod=hashlib.sha256,
    )
    valid_sig = base64.b64encode(computed_digest.digest()).decode("utf-8")

    # 1. Invalid signature is rejected with 401
    bad_headers = {
        "X-Shopify-Hmac-Sha256": "invalid_base64_sig==",
        "X-Shopify-Webhook-Id": "sh_event_001",
        "X-Shopify-Topic": "orders/create",
    }
    res_bad = await client.post("/api/v1/webhooks/shopify", content=payload, headers=bad_headers)
    assert res_bad.status_code == 401

    # 2. Valid signature is processed successfully (200 OK)
    good_headers = {
        "X-Shopify-Hmac-Sha256": valid_sig,
        "X-Shopify-Webhook-Id": "sh_event_001",
        "X-Shopify-Topic": "orders/create",
    }
    res_good = await client.post("/api/v1/webhooks/shopify", content=payload, headers=good_headers)
    assert res_good.status_code == 200
    assert res_good.json()["status"] == "processed"
    assert res_good.headers.get("X-Webhook-Duplicate") == "false"

    # 3. Duplicate delivery of same webhook ID returns duplicate_ignored
    res_duplicate = await client.post("/api/v1/webhooks/shopify", content=payload, headers=good_headers)
    assert res_duplicate.status_code == 200
    assert res_duplicate.json()["status"] == "duplicate_ignored"
    assert res_duplicate.headers.get("X-Webhook-Duplicate") == "true"


@pytest.mark.asyncio
async def test_stripe_webhook_hmac_verification(client: AsyncClient):
    """Verifies Stripe timestamped signature verification."""
    payload = b'{"id": "evt_stripe_101", "type": "charge.refunded"}'
    timestamp = "1672531199"
    signed_payload = f"{timestamp}.".encode("utf-8") + payload

    sig_v1 = hmac.new(
        key=DEFAULT_TEST_WEBHOOK_SECRET.encode("utf-8"),
        msg=signed_payload,
        digestmod=hashlib.sha256,
    ).hexdigest()

    header_val = f"t={timestamp},v1={sig_v1}"
    res = await client.post(
        "/api/v1/webhooks/stripe",
        content=payload,
        headers={"Stripe-Signature": header_val},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "processed"
