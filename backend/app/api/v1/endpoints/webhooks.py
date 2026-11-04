import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, Request, Header, Response, status
from app.core.webhook_security import verify_hmac_sha256, webhook_deduplicator
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger("customex.webhooks")

DEFAULT_TEST_WEBHOOK_SECRET = "whsec_test_secret_key_customex_2026"


@router.post("/shopify", status_code=status.HTTP_200_OK)
async def shopify_webhook(
    request: Request,
    response: Response,
    x_shopify_hmac_sha256: str = Header(..., alias="X-Shopify-Hmac-Sha256"),
    x_shopify_webhook_id: str = Header(..., alias="X-Shopify-Webhook-Id"),
    x_shopify_topic: str = Header("orders/create", alias="X-Shopify-Topic"),
) -> Dict[str, Any]:
    """
    Shopify Inbound Webhook Gateway.
    Verifies HMAC-SHA256 signature in Base64 and drops duplicate deliveries.
    """
    raw_body = await request.body()
    secret = getattr(settings, "SHOPIFY_WEBHOOK_SECRET", DEFAULT_TEST_WEBHOOK_SECRET)

    # 1. Cryptographic HMAC verification
    verify_hmac_sha256(
        raw_body=raw_body,
        secret=secret,
        signature_header=x_shopify_hmac_sha256,
        signature_format="base64",
    )

    # 2. Idempotency & Deduplication
    if webhook_deduplicator.is_duplicate(x_shopify_webhook_id):
        logger.info(f"Duplicate Shopify webhook delivery detected: {x_shopify_webhook_id}")
        response.headers["X-Webhook-Duplicate"] = "true"
        return {
            "status": "duplicate_ignored",
            "event_id": x_shopify_webhook_id,
            "topic": x_shopify_topic,
        }

    # 3. Payload processing
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        payload = {}

    logger.info(f"Successfully verified & ingested Shopify webhook: {x_shopify_topic} [{x_shopify_webhook_id}]")
    response.headers["X-Webhook-Duplicate"] = "false"
    return {
        "status": "processed",
        "event_id": x_shopify_webhook_id,
        "topic": x_shopify_topic,
        "received_keys": list(payload.keys())[:5],
    }


@router.post("/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    response: Response,
    stripe_signature: str = Header(..., alias="Stripe-Signature"),
) -> Dict[str, Any]:
    """
    Stripe Inbound Webhook Gateway.
    Verifies timestamped Stripe-Signature HMAC-SHA256 and dedupes event id.
    """
    raw_body = await request.body()
    secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", DEFAULT_TEST_WEBHOOK_SECRET)

    # 1. Cryptographic HMAC verification
    verify_hmac_sha256(
        raw_body=raw_body,
        secret=secret,
        signature_header=stripe_signature,
        signature_format="stripe",
    )

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        payload = {}

    event_id = payload.get("id", f"stripe_{hash(raw_body)}")
    event_type = payload.get("type", "charge.refunded")

    # 2. Deduplication check
    if webhook_deduplicator.is_duplicate(event_id):
        logger.info(f"Duplicate Stripe webhook delivery: {event_id}")
        response.headers["X-Webhook-Duplicate"] = "true"
        return {
            "status": "duplicate_ignored",
            "event_id": event_id,
            "type": event_type,
        }

    response.headers["X-Webhook-Duplicate"] = "false"
    return {
        "status": "processed",
        "event_id": event_id,
        "type": event_type,
    }
