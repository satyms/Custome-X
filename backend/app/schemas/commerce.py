from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class ProductResponse(BaseModel):
    id: str
    sku: str
    title: str
    price_cents: int
    currency: str = "USD"
    stock_count: int = 100


class OrderItemResponse(BaseModel):
    sku: str
    title: str
    quantity: int
    price_cents: int


class OrderResponse(BaseModel):
    id: str
    order_number: str
    customer_id: str
    customer_name: str
    customer_email: str
    status: str = Field(..., description="processing, in_transit, delivered, cancelled, refunded")
    total_amount_cents: int
    currency: str = "USD"
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []


class ShipmentTrackingEvent(BaseModel):
    timestamp: datetime
    status: str
    location: str
    description: str


class ShipmentResponse(BaseModel):
    tracking_number: str
    carrier: str
    order_number: str
    status: str
    estimated_delivery: Optional[datetime] = None
    events: List[ShipmentTrackingEvent] = []
