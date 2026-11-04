# Implementation Progress & Roadmap (TASKS.md)

> **Status Legend:**  
> `[x]` Completed  
> `[/]` In Progress  
> `[ ]` Planned / Pending  

---

## Milestone 1: Foundation & Data Architecture

- [x] **Task 1.1: Project Scaffolding & Repository Config**
  - [x] Initialize Git repository & core documentation (`AGENTS.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TASKS.md`)
  - [x] Set up FastAPI backend architecture (`backend/app/api/v1/`, `core/`, `models/`, `schemas/`, `services/`)
  - [x] Configure pytest-asyncio, testing harness, and uniform error handlers
- [x] **Task 1.2: Supabase & PostgreSQL Schema Setup (Phase 2)**
  - [x] Provision core relational schema via SQLAlchemy 2.0: `organizations`, `users`, `customers`, `tickets`, `messages`, `ticket_events`
  - [x] Versioned migrations with Alembic (`4045d08861b6_create_initial_core_schema.py`)
  - [x] Foreign key constraints, cascade rules, composite indexes, and check constraints
  - [x] ACID atomic transactions with rollback verification (`create_ticket_atomic`)
- [x] **Task 1.3: REST API & Routing Architecture (Phase 3)**
  - [x] FastAPI modular sub-routers mounted under `/api/v1/` (`tickets`, `customers`, `auth`)
  - [x] Pydantic v2 request validation schemas and serialized response models
  - [x] Service layer abstraction and full CRUD operations with PostgreSQL asyncpg persistence
  - [x] Centralized error handlers with uniform envelope (`{"error": {"code", "message", "request_id"}}`)
  - [x] Standard pagination metadata headers (`X-Total-Count`, `X-Limit`, `X-Offset`, `X-Has-More`)
- [x] **Task 1.4: Authentication, Authorization & Security (Phase 4)**
  - [x] Supabase Auth integration for registration, login, and token refresh
  - [x] Stateless JWT session management with bearer token extraction & expiration verification
  - [x] Role-Based Access Control (RBAC: `agent`, `supervisor`, `admin`) via `require_role`
  - [x] Automatic multi-tenant query scoping by `organization_id` with 404 cross-tenant isolation
  - [x] PostgreSQL Row-Level Security (RLS) policies on all domain tables applied via Alembic migration

---

## Milestone 2: RAG Knowledge Retrieval Pipeline

- [ ] **Task 2.1: Knowledge Base Document Ingestion**
  - [ ] Document parser for Markdown, PDF, and HTML policies (returns, FAQs, shipping)
  - [ ] Text chunking strategy (sliding window with metadata tagging)
  - [ ] Generate dense vector embeddings via embedding provider
- [ ] **Task 2.2: Hybrid Search & Retrieval Service**
  - [ ] Implement PostgreSQL stored procedure for hybrid vector + full-text search (RRF)
  - [ ] Unit tests for similarity thresholds and fallback triggers
  - [ ] Context assembler with prompt budget limiter to avoid context bloat

---

## Milestone 3: Agent Core & Tool Calling Framework

- [ ] **Task 3.1: Tool Registry & Execution Engine**
  - [ ] Define JSON schemas and implementations for:
    - `lookup_order(order_id, customer_email)`
    - `track_package(tracking_number)`
    - `create_ticket(customer_id, subject, priority, body)`
    - `calculate_return_eligibility(order_id, items)`
  - [ ] Unit tests with mocking for external store APIs
  - [ ] Idempotency key handling for mutating actions
- [ ] **Task 3.2: Supervisor & Orchestrator Agent**
  - [ ] Implement system prompt with Karpathy-style clear guardrails and role instructions
  - [ ] Intent classification (informational FAQ vs. transactional vs. complaint)
  - [ ] Tool selection and multi-step execution loop
  - [ ] Guardrail middleware (PII masking and prompt injection defense)

---

## Milestone 4: Workflow Orchestration & n8n Integrations

- [ ] **Task 4.1: n8n Webhook Ingestion Pipeline**
  - [ ] Set up n8n workflows for incoming e-commerce webhooks (Shopify/WooCommerce)
  - [ ] Normalization service to sync store events into Supabase
  - [ ] Exponential retry queue with dead-letter queue (DLQ) for failed syncs
- [ ] **Task 4.2: Asynchronous Notification Delivery**
  - [ ] Email & SMS dispatch worker for ticket status updates
  - [ ] Human escalation alerts via Slack / Discord / Webhook

---

## Milestone 5: Human-In-The-Loop (HITL) Escalation

- [ ] **Task 5.1: Approval Gate Engine**
  - [ ] Implement action risk classification (Low: auto-execute; High: pause & hold)
  - [ ] State persistence for paused agent tasks awaiting human review
  - [ ] Timeout and escalation triggers if human does not respond within SLA
- [ ] **Task 5.2: Triage Queue API**
  - [ ] Endpoints for pending approvals list, approval decision (`approve` / `reject` / `modify`)
  - [ ] Resume agent execution upon decision resolution

---

## Milestone 6: Support Dashboard UI & Analytics

- [ ] **Task 6.1: Real-Time Ticket & Conversation Console**
  - [ ] Implement support agent inbox with status filters (Open, In Progress, Escalate, Closed)
  - [ ] Real-time conversation viewer with streaming WebSocket updates
  - [ ] HITL one-click approval drawer with diff inspector
- [ ] **Task 6.2: Operational Analytics**
  - [ ] Deflection rate, average resolution time, and CSAT sentiment charts
  - [ ] Knowledge gap explorer (queries that failed similarity thresholds)

---

## Milestone 7: Verification, Evaluations & Launch

- [ ] **Task 7.1: Automated Evaluation Suite (Agent Gym)**
  - [ ] 50-scenario benchmark dataset covering order lookup, return edge cases, and injection attempts
  - [ ] Automated evaluation runner scoring accuracy, tool validity, and policy compliance
- [ ] **Task 7.2: Production Hardening**
  - [ ] Load testing on vector retrieval and WebSocket server
  - [ ] Security audit against OWASP Top 10 for LLM Applications
  - [ ] CI/CD pipeline configuration with automatic verification gates
