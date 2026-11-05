import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Index,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.customer import Customer


class Product(Base):
    """
    E-commerce product catalogue.
    """
    __tablename__ = "products"
    __table_args__ = (
        Index("idx_products_org_sku", "organization_id", "sku", unique=True),
        Index("idx_products_org_name", "organization_id", "name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    order_items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="product")

    def __repr__(self) -> str:
        return f"<Product id={self.id} sku='{self.sku}' name='{self.name}'>"


class Order(Base):
    """
    Order master record (ARCHITECTURE.md Section 3.4).
    """
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')",
            name="check_valid_order_status",
        ),
        Index("idx_orders_org_status", "organization_id", "status"),
        Index("idx_orders_customer_id", "customer_id"),
        Index("idx_orders_order_number", "organization_id", "order_number", unique=True),
        Index("idx_orders_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_number: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    total_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    customer: Mapped["Customer"] = relationship("Customer")
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    shipments: Mapped[List["Shipment"]] = relationship(
        "Shipment",
        back_populates="order",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} order_number='{self.order_number}' status='{self.status}'>"


class OrderItem(Base):
    """
    Line items per order.
    """
    __tablename__ = "order_items"
    __table_args__ = (
        Index("idx_order_items_order_id", "order_id"),
        Index("idx_order_items_product_id", "product_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")

    def __repr__(self) -> str:
        return f"<OrderItem id={self.id} order_id={self.order_id} qty={self.quantity}>"


class Shipment(Base):
    """
    Logistics fulfillment tracking.
    """
    __tablename__ = "shipments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('label_created', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned')",
            name="check_valid_shipment_status",
        ),
        Index("idx_shipments_org_id", "organization_id"),
        Index("idx_shipments_order_id", "order_id"),
        Index("idx_shipments_tracking", "tracking_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    carrier: Mapped[str] = mapped_column(String(50), nullable=False)
    tracking_number: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="label_created")
    estimated_delivery: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", back_populates="shipments")
    organization: Mapped["Organization"] = relationship("Organization")
    events: Mapped[List["ShipmentEvent"]] = relationship(
        "ShipmentEvent",
        back_populates="shipment",
        cascade="all, delete-orphan",
        order_by="ShipmentEvent.event_time",
    )

    def __repr__(self) -> str:
        return f"<Shipment id={self.id} carrier='{self.carrier}' tracking='{self.tracking_number}'>"


class ShipmentEvent(Base):
    """
    Carrier scan checkpoints along shipment route.
    """
    __tablename__ = "shipment_events"
    __table_args__ = (
        Index("idx_shipment_events_shipment_id", "shipment_id"),
        Index("idx_shipment_events_time", "event_time"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipments.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="events")

    def __repr__(self) -> str:
        return f"<ShipmentEvent id={self.id} event='{self.event_type}' time='{self.event_time}'>"
