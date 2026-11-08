"""
Database Seed Script for Custome-X
Populates the database with initial demo organization, demo agent users,
sample customers, sample orders, tickets, and knowledge base documents.
Idempotent and safe to run multiple times.
"""

import sys
import os
import uuid
import asyncio

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.user import User
from app.models.customer import Customer
from app.models.ticket import Ticket
from app.models.commerce import Product, Order
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk


DEMO_ORG_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


async def seed():
    print("[1/6] Connecting to database...")
    async with AsyncSessionLocal() as session:
        # 1. Organization
        org = await session.get(Organization, DEMO_ORG_ID)
        if not org:
            print(" -> Seeding demo organization (Acme Demo Store)...")
            org = Organization(
                id=DEMO_ORG_ID,
                name="Acme Demo Store",
                settings={"default_currency": "USD", "support_email": "support@acme.demo"}
            )
            session.add(org)
            await session.flush()
        else:
            print(" -> Demo organization already exists.")

        # 2. Demo Users in public.users (query by email)
        agent_user = (await session.execute(
            select(User).where(User.email == "agent1@example.com")
        )).scalar_one_or_none()

        if not agent_user:
            print(" -> Seeding demo agent (agent1@example.com)...")
            agent_user = User(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                email="agent1@example.com",
                full_name="Alex Morgan",
                role="agent"
            )
            session.add(agent_user)
            await session.flush()
        else:
            print(" -> Demo agent already exists.")
        
        supervisor_user = (await session.execute(
            select(User).where(User.email == "supervisor1@example.com")
        )).scalar_one_or_none()

        if not supervisor_user:
            print(" -> Seeding demo supervisor (supervisor1@example.com)...")
            supervisor_user = User(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                email="supervisor1@example.com",
                full_name="Sarah Connor",
                role="supervisor"
            )
            session.add(supervisor_user)
            await session.flush()
        else:
            print(" -> Demo supervisor already exists.")

        # 3. Sample Customers (query by email)
        cust1 = (await session.execute(
            select(Customer).where(Customer.email == "john.doe@example.com")
        )).scalar_one_or_none()

        if not cust1:
            print(" -> Seeding sample customers...")
            cust1 = Customer(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                email="john.doe@example.com",
                full_name="John Doe",
                phone="+1-555-0101",
            )
            session.add(cust1)
            await session.flush()
        else:
            print(" -> Customer john.doe@example.com already exists.")

        cust2 = (await session.execute(
            select(Customer).where(Customer.email == "jane.smith@example.com")
        )).scalar_one_or_none()

        if not cust2:
            cust2 = Customer(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                email="jane.smith@example.com",
                full_name="Jane Smith",
                phone="+1-555-0102",
            )
            session.add(cust2)
            await session.flush()
        else:
            print(" -> Customer jane.smith@example.com already exists.")

        # 4. Sample Commerce Products & Orders
        prod1 = (await session.execute(
            select(Product).where(Product.sku == "PROD-WIRELESS-EARBUDS")
        )).scalar_one_or_none()

        if not prod1:
            print(" -> Seeding sample products...")
            prod1 = Product(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                sku="PROD-WIRELESS-EARBUDS",
                name="Noise-Cancelling Wireless Earbuds",
                price_cents=4500,  # $45.00
            )
            prod2 = Product(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                sku="PROD-ANC-HEADPHONES",
                name="Pro Studio Over-Ear Headphones",
                price_cents=12500,  # $125.00
            )
            session.add_all([prod1, prod2])
            await session.flush()

        order1 = (await session.execute(
            select(Order).where(Order.order_number == "ORD-10001")
        )).scalar_one_or_none()

        if not order1:
            print(" -> Seeding sample orders (ORD-10001, ORD-10002)...")
            order1 = Order(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                customer_id=cust1.id,
                order_number="ORD-10001",
                status="delivered",
                total_amount_cents=4500,
                currency="USD"
            )
            order2 = Order(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                customer_id=cust2.id,
                order_number="ORD-10002",
                status="shipped",
                total_amount_cents=12500,
                currency="USD"
            )
            session.add_all([order1, order2])
            await session.flush()

        # 5. Sample Tickets
        t1 = (await session.execute(
            select(Ticket).where(Ticket.title == "Lumenfield — Data residency inquiry")
        )).scalar_one_or_none()

        if not t1:
            print(" -> Seeding sample tickets across 4 states (open, in_progress, escalated, resolved)...")
            t1 = Ticket(
                id=uuid.uuid4(),
                ticket_number="TICK-0001",
                organization_id=DEMO_ORG_ID,
                customer_id=cust1.id,
                assigned_to=agent_user.id,
                title="Lumenfield — Data residency inquiry",
                status="open",
                priority="normal",
            )
            t2 = Ticket(
                id=uuid.uuid4(),
                ticket_number="TICK-0002",
                organization_id=DEMO_ORG_ID,
                customer_id=cust1.id,
                assigned_to=agent_user.id,
                title="Halcyon — Clinic network pilot assistance",
                status="in_progress",
                priority="high",
            )
            t3 = Ticket(
                id=uuid.uuid4(),
                ticket_number="TICK-0003",
                organization_id=DEMO_ORG_ID,
                customer_id=cust2.id,
                assigned_to=supervisor_user.id,
                title="Brightpath — High-value return for ORD-10002 ($125)",
                status="escalated",
                priority="urgent",
            )
            t4 = Ticket(
                id=uuid.uuid4(),
                ticket_number="TICK-0004",
                organization_id=DEMO_ORG_ID,
                customer_id=cust2.id,
                assigned_to=agent_user.id,
                title="Cedarstone — Omnichannel suite setup completed",
                status="resolved",
                priority="normal",
            )
            session.add_all([t1, t2, t3, t4])
            await session.flush()

        # 6. Sample Knowledge Base Document
        doc1 = (await session.execute(
            select(KnowledgeDocument).where(KnowledgeDocument.title == "Return & Refund Policy")
        )).scalar_one_or_none()

        if not doc1:
            print(" -> Seeding knowledge base documents...")
            doc1 = KnowledgeDocument(
                id=uuid.uuid4(),
                organization_id=DEMO_ORG_ID,
                title="Return & Refund Policy",
                document_type="policy",
                category="returns",
                version="2.0",
                status="active",
                raw_content="Customers can return eligible items within 30 days of delivery..."
            )
            session.add(doc1)
            await session.flush()

            vector_768 = [0.0] * 768
            vector_768[0] = 1.0

            chunk1 = KnowledgeChunk(
                id=uuid.uuid4(),
                document_id=doc1.id,
                organization_id=DEMO_ORG_ID,
                chunk_index=0,
                section="30-Day Standard Return Window & $50 Autonomous Refund Cap",
                content=(
                    "Customers can return eligible items within 30 days of delivery. "
                    "Support agents and automated systems can autonomously approve refunds up to $50.00. "
                    "Refund requests exceeding $50.00 or items in-transit require human supervisor approval."
                ),
                token_count=42,
                embedding=vector_768,
                chunk_metadata={"doc_title": "Return & Refund Policy", "version": "2.0"}
            )
            session.add(chunk1)
            await session.flush()

        await session.commit()
        print("[OK] Seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
