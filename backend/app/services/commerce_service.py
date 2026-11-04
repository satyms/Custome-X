from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict
from app.schemas.commerce import (
    ProductResponse,
    OrderResponse,
    OrderItemResponse,
    ShipmentResponse,
    ShipmentTrackingEvent,
)


# Static sample commerce dataset for multi-tenant simulation
SAMPLE_PRODUCTS: List[ProductResponse] = [
    ProductResponse(id="prod_01", sku="HDPH-NC-BLK", title="Pro Wireless ANC Headphones", price_cents=12900, stock_count=45),
    ProductResponse(id="prod_02", sku="CBL-USB-C-2M", title="Braided Fast Charge Cable (2m)", price_cents=1950, stock_count=120),
    ProductResponse(id="prod_03", sku="SPKR-HI-FI", title="Studio Hi-Fi Bookshelf Monitor", price_cents=16000, stock_count=12),
    ProductResponse(id="prod_04", sku="MCH-KEY-RGB", title="Ergonomic Mechanical Keyboard", price_cents=8999, stock_count=28),
]

SAMPLE_ORDERS: List[OrderResponse] = [
    OrderResponse(
        id="ord_101",
        order_number="ORD-99120",
        customer_id="cust_881",
        customer_name="Marcus Vance",
        customer_email="marcus.v@acme.org",
        status="in_transit",
        total_amount_cents=14850,
        currency="USD",
        carrier="FedEx",
        tracking_number="FX-884192039",
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
        items=[
            OrderItemResponse(sku="HDPH-NC-BLK", title="Pro Wireless ANC Headphones", quantity=1, price_cents=12900),
            OrderItemResponse(sku="CBL-USB-C-2M", title="Braided Fast Charge Cable (2m)", quantity=1, price_cents=1950),
        ],
    ),
    OrderResponse(
        id="ord_102",
        order_number="ORD-99144",
        customer_id="cust_882",
        customer_name="Samantha Green",
        customer_email="s.green@example.com",
        status="processing",
        total_amount_cents=32000,
        currency="USD",
        carrier="UPS",
        tracking_number="1Z9999999999999999",
        created_at=datetime.now(timezone.utc) - timedelta(hours=6),
        items=[
            OrderItemResponse(sku="SPKR-HI-FI", title="Studio Hi-Fi Bookshelf Monitor", quantity=2, price_cents=16000),
        ],
    ),
    OrderResponse(
        id="ord_103",
        order_number="ORD-99081",
        customer_id="cust_883",
        customer_name="Devon Lee",
        customer_email="devon.lee@techstart.io",
        status="delivered",
        total_amount_cents=8999,
        currency="USD",
        carrier="DHL Express",
        tracking_number="DHL-77129841",
        created_at=datetime.now(timezone.utc) - timedelta(days=10),
        items=[
            OrderItemResponse(sku="MCH-KEY-RGB", title="Ergonomic Mechanical Keyboard", quantity=1, price_cents=8999),
        ],
    ),
]


def list_products(query: Optional[str] = None) -> List[ProductResponse]:
    if not query:
        return SAMPLE_PRODUCTS
    q = query.lower()
    return [p for p in SAMPLE_PRODUCTS if q in p.title.lower() or q in p.sku.lower()]


def list_orders(
    customer_email: Optional[str] = None,
    status: Optional[str] = None,
    order_number: Optional[str] = None,
) -> List[OrderResponse]:
    results = SAMPLE_ORDERS
    if customer_email:
        results = [o for o in results if o.customer_email.lower() == customer_email.lower()]
    if status:
        results = [o for o in results if o.status.lower() == status.lower()]
    if order_number:
        results = [o for o in results if o.order_number.lower() == order_number.lower()]
    return results


def get_order_by_number(order_number: str) -> Optional[OrderResponse]:
    for o in SAMPLE_ORDERS:
        if o.order_number.lower() == order_number.lower() or o.id.lower() == order_number.lower():
            return o
    return None


def get_shipment_by_tracking(tracking_number: str) -> Optional[ShipmentResponse]:
    order = next((o for o in SAMPLE_ORDERS if o.tracking_number and o.tracking_number.lower() == tracking_number.lower()), None)
    if not order:
        return None

    now = datetime.now(timezone.utc)
    events = [
        ShipmentTrackingEvent(
            timestamp=now - timedelta(days=1, hours=4),
            status="pickup_confirmed",
            location="Fulfillment Center, Memphis, TN",
            description="Carrier received consignment and scanned initial manifest.",
        ),
        ShipmentTrackingEvent(
            timestamp=now - timedelta(hours=14),
            status="in_transit",
            location="Regional Sort Facility, Nashville, TN",
            description="Consignment processed through sorting facility.",
        ),
        ShipmentTrackingEvent(
            timestamp=now - timedelta(hours=2),
            status="out_for_delivery",
            location="Local Delivery Hub",
            description="Package loaded on delivery vehicle for final transit.",
        ),
    ]

    return ShipmentResponse(
        tracking_number=tracking_number,
        carrier=order.carrier or "FedEx",
        order_number=order.order_number,
        status=order.status,
        estimated_delivery=now + timedelta(hours=6),
        events=events,
    )
