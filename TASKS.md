# Implementation Progress & Roadmap (TASKS.md)

> **Status Legend:**  
> `[x]` Completed  
> `[/]` In Progress  
> `[ ]` Planned / Pending  

---

## Milestone 1: Foundation & Data Architecture

- [ ] **Task 1.1: Project Scaffolding & Repository Config**
  - [x] Initialize Git repository & core documentation (`AGENTS.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TASKS.md`)
  - [ ] Set up project structure (`/apps/api`, `/apps/web`, `/packages/core`, `/packages/tools`)
  - [ ] Configure linting, formatting (Prettier, ESLint), and pre-commit hooks
- [/] **Task 1.2: Supabase & PostgreSQL Schema Setup**
  - [x] Provision Supabase PostgreSQL 17 project & configure SQLAlchemy connection pooling with asyncpg
  - [x] Define core declarative models: `organizations`, `users`, `customers`, `tickets`, `messages`, `ticket_events`
  - [x] Generate and apply versioned Alembic migration to Supabase
  - [x] Verify ACID transactions, referential integrity (RESTRICT, CASCADE, SET NULL), and constraints via automated test suite
  - [ ] Enable `pgvector` extension and configure vector tables for knowledge documents
  - [ ] Write and verify Row Level Security (RLS) policies for tenant isolation
  - [ ] Seed test dataset (sample e-commerce store with orders and mock customers)
- [/] **Task 1.3: Core REST API Gateway & Routing (FastAPI v1)**
  - [x] Configure modular APIRouter hierarchy with `/api/v1` prefix
  - [x] Tickets router (`/api/v1/tickets`) with GET, POST, PATCH, DELETE status code contracts
  - [x] Customers router (`/api/v1/customers`) with GET, POST status code contracts
  - [x] Pydantic v2 validation schemas and response models (Features 3.3 & 3.4)
  - [x] Service layer & Repository CRUD integration (Features 3.5 & 3.6)
  - [ ] Centralized error handling & pagination enhancements (Features 3.7 - 3.9)


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
