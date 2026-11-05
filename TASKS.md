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
- [x] **Task 1.5: Layer 2 Backend API Gateway Expansion**
  - [x] Commerce sub-router mounted under `/api/v1/` (`/orders`, `/shipments`, `/products`)
  - [x] Agent endpoints (`/api/v1/agent/run-agent`, `/api/v1/agent/reply-suggestion`)
  - [x] Knowledge Base RAG retrieval router (`/api/v1/knowledge/search`, `/api/v1/knowledge/upload`)
  - [x] Human Approvals router (`/api/v1/approvals`, `/api/v1/approvals/pending`, approve, reject)
  - [x] Webhook Gateway with HMAC-SHA256 verification (Shopify Base64, Stripe timestamped) and event deduplication
  - [x] Token-bucket rate-limiting dependency on AI-invoking endpoints with standard `Retry-After` headers

---

## Phase 6: Core Business Workflows

- [x] **Task 6.1: Ticket Intake & Atomic Multi-Table Provisioning**
  - [x] Sequential reference number (`CX-1001`) with database migration (`d01d6d6747dc_add_ticket_lifecycle_columns.py`)
  - [x] Automatic customer resolution and atomic provisioning by email if not exists
  - [x] Unit of work atomic multi-table write (`customers` + `tickets` + `messages` + `ticket_events`)
  - [x] Full ACID rollback verification and Pydantic schema validation tests (`test_ticket_atomic_intake.py`)
- [x] **Task 6.2: Ticket Status Machine (FSM)**
  - [x] Strict transition matrix (`open` -> `in_progress` -> `resolved` -> `closed` / `reopened`)
  - [x] `InvalidStatusTransitionError` mapped to HTTP 400 Bad Request
  - [x] Automatic lifecycle timestamp tracking (`resolved_at`, `closed_at`)
- [x] **Task 6.3: Agent Assignment & Queue Distribution**
  - [x] Organization-scoped agent validation (reject cross-tenant assignment)
  - [x] Auto-transition from `open` to `in_progress` upon claiming
  - [x] Agent unassignment back to team pool with event logging
- [x] **Task 6.4: Conversation Management & Chronological Message Threading**
  - [x] Inbound message appending with sender validation (`customer`, `agent`, `system`, `ai_assistant`)
  - [x] Content bounds validation (1 to 10,000 characters) and ticket `updated_at` bump
- [x] **Task 6.5: Ticket History & Timeline Event Sourcing**
  - [x] Unified timeline endpoint (`GET /api/v1/tickets/{id}/timeline`)
  - [x] Interleaved chronological merge of conversation messages and lifecycle audit events
- [x] **Task 6.6: Business Rules Engine (7-Day Reopen, Follow-Up Tickets)**
  - [x] 7-day auto-reopen window for customer replies on resolved tickets
  - [x] Auto-spawning linked follow-up ticket on customer replies to closed tickets
  - [x] Priority escalation guard (non-managers cannot escalate unassigned tickets to urgent)
- [x] **Task 6.7: Immutable Audit Logging**
  - [x] Append-only audit trail logging for all status, assignment, and priority changes
  - [x] Immutable query API (`audit_service.get_audit_trail`)
- [x] **Task 6.8: Decoupled Notification Dispatcher**
  - [x] In-process asynchronous pub/sub dispatcher (`NotificationDispatcher`)
  - [x] Event emitters for `ticket.created`, `ticket.assigned`, and `ticket.escalated`

---

## Milestone 2: RAG Knowledge Retrieval Pipeline (Completed)

- [x] **Task 2.1: Knowledge Base Document Ingestion**
  - [x] Document parser for Markdown and policy text (sliding window with metadata tagging and header preservation)
  - [x] Text chunking strategy (semantic header-aware sliding window with token bounds)
  - [x] Generate dense vector embeddings via Gemini `text-embedding-004` (768 dimensions) with deterministic fallback
  - [x] PostgreSQL persistence with `pgvector` (`Vector(768)`) and generated `tsvector` column
- [x] **Task 2.2: Hybrid Search & Retrieval Service**
  - [x] Implement PostgreSQL stored procedure for hybrid vector + full-text search (RRF)
  - [x] Unit tests for similarity thresholds and fallback triggers (9/9 passed)
  - [x] Context assembler with prompt budget limiter to avoid context bloat

---

## Milestone 3: Agent Core & Tool Calling Framework (Layer 3 · Completed)

- [x] **Task 3.1: Tool Registry & Execution Engine**
  - [x] Typed server-side tools (`get_order_details`, `get_customer_orders`, `get_shipment_status`, `get_return_policy`, `request_refund_approval`)
  - [x] Cross-customer ownership verification and tenant isolation guards (`OwnershipViolationError` HTTP 403)
  - [x] Deterministic fallback and mock adapters for offline / test environments
  - [x] Idempotency key generation for mutating and approval proposals
- [x] **Task 3.2: 7-Step Deterministic AI Orchestration Pipeline**
  - [x] Step 1: Input sanitization, PII masking (`[CARD]`, `[PHONE]`, `[SECRET]`), delimiter neutralization, and prompt injection defense
  - [x] Step 2: Intent classification & canonical entity extraction (`order_id`, `sku`, `reason`, `amount`)
  - [x] Step 3: RAG hybrid retrieval via `pgvector` + FTS with active version status filtering (`status = 'active'`)
  - [x] Step 4: Least-privilege data needs planning (ensures `get_order_details` is scheduled to enforce customer ownership)
  - [x] Step 5: Typed server-side tool execution with step execution tracing
  - [x] Step 6: Business rule validation (30-day return window, $50 refund threshold, in-transit cancellation blocks, URL allow-listing)
  - [x] Step 7: Structured JSON action proposal output matching `OrchestrationResponse` contract
  - [x] Full test suite verification (18/18 tests in `test_orchestrator.py` passing)
- [x] **Task 3.3: Frontend Orchestrator Integration & Inspection Console**
  - [x] Typed frontend API client (`agentApi.orchestrate`) and TypeScript contract models
  - [x] Three-column ticket detail workspace integration with interactive `OrchestratorInspector`
  - [x] Step-by-step verification traces accordion, confidence indicator, human escalation alert, and one-click draft composer insertion

---

## Milestone 4: Workflow Orchestration & n8n Integrations (Completed)

- [x] **Task 4.1: Layer 4 Data & Platform Relational Persistence**
  - [x] Commerce domain models: `products`, `orders`, `order_items`, `shipments`, `shipment_events`
  - [x] Agent & HITL audit models: `pending_actions`, `workflow_events`, `agent_runs`, `tool_calls`, `audit_logs`
  - [x] Alembic migration `a892f3b14cd5` applied with check constraints, foreign keys, and multi-tenant RLS policies
  - [x] Full database integration test suite passed (`test_commerce_and_audit_models.py`)
- [x] **Task 4.2: Layer 5 Automations Engine & n8n Webhook Dispatcher**
  - [x] Webhook dispatcher with HMAC-SHA256 signature verification (`X-Customex-Signature: sha256=...`)
  - [x] Asynchronous event persistence, retry backoff (`max_retries = 3`), and Dead-Letter Queue (DLQ)
  - [x] REST API endpoints (`GET /api/v1/automations/events`, `GET /api/v1/automations/stats`, `POST /api/v1/automations/events/{id}/retry`)
  - [x] Exportable n8n workflows packaged in `automations/n8n/` (WF1 New Ticket, WF2 Escalation SLA, WF3 Approval Gate, WF4 Nightly ETL)
  - [x] Integration test suite passed (`test_webhook_dispatcher_and_automations.py`)
- [x] **Task 4.3: Frontend Automations & Tenant Settings Consoles**
  - [x] `AutomationsPage.tsx` with live DLQ triage console, event filter tabs, and JSON payload inspector
  - [x] `SettingsPage.tsx` with tenant RLS verification, webhook secret reveal/copy, AI guardrail thresholds, and RBAC matrix
  - [x] App router and navigation sidebar updated with zero TypeScript build errors



---

## Milestone 5: Human-In-The-Loop (HITL) Escalation (Completed)

- [x] **Task 5.1: Approval Gate Engine**
  - [x] Implement action risk classification (Low: auto-execute; High: pause & hold; Critical: intercept & hold)
  - [x] State persistence for paused agent tasks in PostgreSQL `pending_actions` table
  - [x] Immutable audit trail logging for all decisions in `audit_logs` table
  - [x] Outbound event dispatching (`action.requires_approval`, `approval.approved`, `approval.rejected`)
- [x] **Task 5.2: Triage Queue API**
  - [x] Scoped REST endpoints for pending triage (`GET /api/v1/approvals/pending`, `GET /api/v1/approvals`)
  - [x] Approval decision (`POST /api/v1/approvals/{id}/approve`) with supervisor/admin RBAC enforcement
  - [x] Rejection decision (`POST /api/v1/approvals/{id}/reject`) with mandatory rationale logging
  - [x] Automated unit and database integration test suite (3/3 passed in `test_hitl_approval_engine.py`)

---

## Milestone 6: Support Dashboard UI & Analytics

- [x] **Task 6.1: Real-Time Ticket & Conversation Console (Phase 5 Frontend)**
  - [x] Vite + React 19 + TypeScript + Tailwind CSS v4 design token architecture
  - [x] Centralized Axios client with JWT request interceptor and 401 response handling
  - [x] Authentication context (`AuthContext`) with protected route guards
  - [x] Interactive WebGL shader dot canvas login & registration with Zod validation and Toast alert system
  - [x] Support ticket queue with KPI metrics bar, status tabs, priority filters, and pagination controls
  - [x] 3-Column Ticket Detail workspace (Mini Queue, Conversation Timeline with optimistic composer, Customer Context Inspector)
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
