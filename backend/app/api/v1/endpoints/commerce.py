from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.commerce import ProductResponse, OrderResponse, ShipmentResponse
from app.services import commerce_service

router = APIRouter()


@router.get("/products", response_model=List[ProductResponse])
def get_products(query: Optional[str] = Query(None, description="Search products by SKU or title")):
    return commerce_service.list_products(query=query)


@router.get("/orders", response_model=List[OrderResponse])
def get_orders(
    customer_email: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    order_number: Optional[str] = Query(None),
):
    return commerce_service.list_orders(
        customer_email=customer_email,
        status=status,
        order_number=order_number,
    )


@router.get("/orders/{order_number}", response_model=OrderResponse)
def get_order(order_number: str):
    order = commerce_service.get_order_by_number(order_number)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_number}' not found.",
        )
    return order


@router.get("/shipments/{tracking_number}", response_model=ShipmentResponse)
def get_shipment(tracking_number: str):
    shipment = commerce_service.get_shipment_by_tracking(tracking_number)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with tracking number '{tracking_number}' not found.",
        )
    return shipment
