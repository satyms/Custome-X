import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_commerce_products_and_orders_endpoints(client: AsyncClient):
    """Verifies commerce endpoints for product lookup, orders, and shipment tracking."""
    # 1. Products catalog
    res_prod = await client.get("/api/v1/products")
    assert res_prod.status_code == 200
    products = res_prod.json()
    assert len(products) >= 2
    assert any(p["sku"] == "HDPH-NC-BLK" for p in products)

    # 2. Product search filter
    res_search = await client.get("/api/v1/products?query=keyboard")
    assert res_search.status_code == 200
    assert any("Keyboard" in p["title"] for p in res_search.json())

    # 3. List orders
    res_orders = await client.get("/api/v1/orders")
    assert res_orders.status_code == 200
    orders = res_orders.json()
    assert len(orders) >= 1
    assert any(o["order_number"] == "ORD-99120" for o in orders)

    # 4. Get order by order number
    res_single = await client.get("/api/v1/orders/ORD-99120")
    assert res_single.status_code == 200
    single_order = res_single.json()
    assert single_order["order_number"] == "ORD-99120"
    assert len(single_order["items"]) >= 1

    # 5. Order not found 404
    res_missing = await client.get("/api/v1/orders/ORD-NONEXISTENT")
    assert res_missing.status_code == 404

    # 6. Shipment tracking lookup
    res_shipment = await client.get("/api/v1/shipments/FX-884192039")
    assert res_shipment.status_code == 200
    shipment_data = res_shipment.json()
    assert shipment_data["tracking_number"] == "FX-884192039"
    assert len(shipment_data["events"]) >= 1
