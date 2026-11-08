# Custome-X (CXPilot) — Comprehensive System Architecture & Features

> **Autonomous Agentic AI Customer Support & Operations Platform for E-Commerce**  
> *Core Architectural Axiom: "The LLM Proposes, Deterministic Code Decides."*  
> *Empirical Verification: 100% Unit/Integration Test Pass Rate (25/25 Suites) · 100% Attack Block Rate · 0% False Positive Rate.*

---

## 1. Executive Summary & Core Mission

**Custome-X** is an autonomous, agentic AI customer support and commerce operations platform built to solve the fundamental failure modes of naive LLM wrappers:
* Hallucinated business facts, pricing, and order states
* Unauthorized database state mutations
* Security prompt injections and system jailbreaks
* Opaque, non-auditable decision making

Custome-X pairs an **autonomous 7-step orchestration engine** with a **deterministic business rules validator**, **Human-in-the-Loop (HITL) approval gateways**, **hybrid dense/sparse vector search (pgvector 768d + PostgreSQL FTS)**, and a modern **Twenty CRM-inspired Swiss minimal interface**.

### Empirical Performance & Guardrail Metrics (Measured Results)
Instead of speculative claims, the platform is verified against concrete empirical test suites:
* **Prompt Injection Defense (`test_prompt_injection_benchmarks.py`):**
  * **100.0% Attack Block Rate** across 20 adversarial attack vectors (system prompt leaks, delimiter breakouts, DAN personas).
  * **0.0% False Positive Rate** across 30 normal customer support queries (inquiries with words like "must", "never", "always").
* **Multi-Tenant Isolation (`test_tenant_a_cannot_read_tenant_b_tickets.py`):**
  * **100% Isolation Rate:** Tenant A queries attempting to access Tenant B resources return 0 items on list routes and strict `HTTP 404 TicketNotFoundError` on direct ID lookups.
* **Deterministic Rule & Financial Boundary Enforcement (`test_business_rules.py`):**
  * **100% Enforcement** of the $50.00 refund threshold (`REFUND_AUTONOMOUS_THRESHOLD_CENTS = 5000`) and 30-day return policy window.
* **Core Test Suite Coverage:** 25/25 pytest test suites passing green in automated CI.

---

## 2. Complete Technology Stack

| Layer | Technologies & Frameworks | Measured Role & Responsibility |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19**, **TypeScript 5.8**, **Vite 8** | Single Page Application (SPA), bundle built in <500ms via Vite |
| **UI & Styling** | **Tailwind CSS v4**, Lucide React, Space Grotesk & DM Sans | Airy Swiss minimal aesthetic with 20 semantic CSS design tokens |
| **Data Visualization** | **Recharts 3.10** | Inbound volume area charts, deflection rates, CSAT metrics, and latency distribution |
| **Routing & State** | **React Router v7**, React Context API (`AuthContext`) | Client-side routing, route guards, token persistence, and tenant auto-resolution |
| **Backend API Gateway** | **FastAPI 0.115+**, **Python 3.14 (AsyncIO)** | Asynchronous REST gateway averaging <45ms non-LLM latency and WebSocket streaming |
| **Server Engine** | **Uvicorn 0.54** | Asynchronous Server Gateway Interface (ASGI) runtime with hot reload |
| **Database & ORM** | **PostgreSQL 16**, **SQLAlchemy 2.0 (asyncpg)**, **Alembic** | Multi-tenant relational schema, strict foreign keys, async connection pooling, migrations |
| **Vector Search (RAG)** | **pgvector (768-dim)** + **PostgreSQL FTS** | Hybrid Reciprocal Rank Fusion (RRF) combining semantic cosine distance and full-text search |
| **AI & LLM Engine** | **Google Gemini API**, Google GenAI SDK | Intent recognition, entity extraction, semantic reasoning, and structured tool proposals |
| **Security & Auth** | **Supabase Auth & RLS**, PyJWT, passlib/bcrypt, HMAC-SHA256 | Multi-tenant row-level security, webhook verification, token-bucket rate limiting |
| **Workflow Engine** | **n8n Master Automations** | Asynchronous webhook routing (Shopify/WooCommerce), Slack/email alerts, DLQ handling |

---

## 3. End-to-End Architectural Layers

```mermaid
flowchart TD
    subgraph Client["Layer 1 · Frontend Client (React 19 + Tailwind CSS)"]
        UI_Kanban["Minimalist Ticket Kanban Pipeline (Open, In Progress, Escalated, Resolved)"]
        UI_Tickets["3-Column Ticket Detail & Reasoning Inspector"]
        UI_Approvals["Human-in-the-Loop (HITL) Queue"]
        UI_Knowledge["Hybrid Knowledge Search & Document Ingestion"]
        UI_Analytics["Live BI Dashboard & Telemetry"]
        UI_Automations["n8n DLQ & Webhook Monitor"]
    end

    subgraph Gateway["Layer 2 · Backend API Gateway (FastAPI + AsyncIO)"]
        MW_Tracing["Request ID Middleware (X-Request-ID)"]
        MW_CORS["CORS & Rate Limiter"]
        Auth["Supabase JWT & RBAC Validator"]
        Router_Core["REST Endpoints (/tickets, /customers, /orders)"]
        Router_Agent["Agent Endpoints (/run-agent, /reply-suggestion)"]
        Router_Webhooks["HMAC SHA-256 Webhook Receiver"]
    end

    subgraph AI["Layer 3 · AI Orchestration Engine (engine.py)"]
        Step1["1. Input Validation & Sanitization"]
        Step2["2. Intent Classification & Entity Extraction"]
        Step3["3. RAG Hybrid Retrieval (pgvector 768d + FTS)"]
        Step4["4. Business Data Needs Planning"]
        Step5["5. Server-Side Tool Execution & Ownership Validation"]
        Step6["6. Business Rules & Financial Threshold Validation"]
        Step7["7. Structured Action Proposal Output & Audit Tracing"]
    end

    subgraph Data["Layer 4 · Data & Security Platform (PostgreSQL 16 + Supabase)"]
        DB_Relational[("PostgreSQL 16 Multi-Tenant Tables")]
        DB_Vectors[("pgvector Embeddings (768-dim KB Chunks)")]
        DB_Audit[("Audit Logs & Agent Traces")]
        RLS["Row Level Security (RLS) via public.get_auth_organization_id()"]
    end

    subgraph Workflows["Layer 5 · Asynchronous Automations (n8n Engine)"]
        WF1["WF1: Inbound Webhook Triage"]
        WF2["WF2: Urgent SLA Escalation"]
        WF3["WF3: Gated Action Approval Dispatch"]
        WF4["WF4: Scheduled ETL & KPI Refresh"]
        DLQ["Dead-Letter Queue (DLQ) with Exponential Backoff"]
    end

    Client --> Gateway
    Gateway --> AI
    AI --> Data
    AI --> Workflows
    Workflows --> Gateway
```

---

## 4. Entity-Relationship Diagram (ERD)

The complete relational persistence layer encompasses 18 tables organized into Multi-Tenant Core, Commerce, Knowledge RAG, and Agent Audit domains:

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : "employs"
    ORGANIZATIONS ||--o{ CUSTOMERS : "serves"
    ORGANIZATIONS ||--o{ TICKETS : "owns"
    ORGANIZATIONS ||--o{ PRODUCTS : "catalogs"
    ORGANIZATIONS ||--o{ ORDERS : "fulfills"
    ORGANIZATIONS ||--o{ KNOWLEDGE_DOCUMENTS : "publishes"

    CUSTOMERS ||--o{ ORDERS : "places"
    CUSTOMERS ||--o{ TICKETS : "submits"

    ORDERS ||--o{ ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ ORDER_ITEMS : "references"
    ORDERS ||--o{ SHIPMENTS : "dispatches"

    TICKETS ||--o{ MESSAGES : "contains"
    TICKETS ||--o{ TICKET_EVENTS : "records"
    TICKETS ||--o{ PENDING_ACTIONS : "gates"
    USERS ||--o{ TICKETS : "assigned_to"

    KNOWLEDGE_DOCUMENTS ||--o{ KNOWLEDGE_CHUNKS : "chunks"

    ORGANIZATIONS {
        uuid id PK
        string name
        jsonb settings
        datetime created_at
    }

    USERS {
        uuid id PK
        uuid organization_id FK
        string email
        string full_name
        string role "agent | supervisor | admin"
        datetime created_at
    }

    CUSTOMERS {
        uuid id PK
        uuid organization_id FK
        string email
        string full_name
        string phone
        datetime created_at
    }

    TICKETS {
        uuid id PK
        string ticket_number "TICK-XXXX"
        uuid organization_id FK
        uuid customer_id FK
        uuid assigned_to FK
        string title
        string status "open | in_progress | escalated | resolved | closed"
        string priority "low | normal | high | urgent"
        datetime created_at
    }

    ORDERS {
        uuid id PK
        string order_number "ORD-XXXXX"
        uuid organization_id FK
        uuid customer_id FK
        string status "pending | paid | shipped | delivered | cancelled"
        int total_amount_cents
        string currency
        datetime created_at
    }

    KNOWLEDGE_DOCUMENTS {
        uuid id PK
        uuid organization_id FK
        string title
        string document_type "policy | faq"
        string version
        string status "active | archived"
        datetime created_at
    }

    KNOWLEDGE_CHUNKS {
        uuid id PK
        uuid document_id FK
        uuid organization_id FK
        int chunk_index
        string section
        text content
        vector_768 embedding
        tsvector tsv_content
        datetime created_at
    }

    PENDING_ACTIONS {
        uuid id PK
        uuid organization_id FK
        uuid ticket_id FK
        string action_type "refund | cancel | address_update"
        jsonb action_payload
        string status "pending | approved | rejected"
        datetime created_at
    }
```

---

## 5. Core API Endpoint Reference

All endpoints (except auth registration/login and webhooks) require a valid JWT Bearer token: `Authorization: Bearer <token>`.

| Domain | HTTP Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Public / Dev | Register new support agent bound to an organization |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | Authenticate user credentials and return JWT tokens |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated | Retrieve current user profile and organization details |
| **Tickets** | `POST` | `/api/v1/tickets` | Agent, Supervisor, Admin | Atomically create ticket with sequential ID (`TICK-XXXX`) |
| **Tickets** | `GET` | `/api/v1/tickets` | Agent, Supervisor, Admin | List tickets scoped to tenant with pagination and filters |
| **Tickets** | `GET` | `/api/v1/tickets/{id}` | Agent, Supervisor, Admin | Fetch complete ticket details including thread history |
| **Tickets** | `PATCH` | `/api/v1/tickets/{id}` | Agent, Supervisor, Admin | Update ticket status, priority, or assigned agent |
| **Agent** | `POST` | `/api/v1/agent/run-agent` | Agent, Supervisor, Admin | Execute the 7-step deterministic AI orchestration engine |
| **Agent** | `POST` | `/api/v1/agent/reply-suggestion` | Agent, Supervisor, Admin | Generate grounded customer reply proposal for draft composer |
| **Approvals** | `GET` | `/api/v1/approvals/pending` | Supervisor, Admin | List actions awaiting Human-in-the-Loop review |
| **Approvals** | `POST` | `/api/v1/approvals/{id}/decision` | Supervisor, Admin | Approve or reject high-risk action (refund > $50, cancel) |
| **Knowledge** | `POST` | `/api/v1/knowledge/search` | Agent, Supervisor, Admin | Hybrid vector + FTS search combining dense cosine and tsquery |
| **Knowledge** | `POST` | `/api/v1/knowledge/documents` | Supervisor, Admin | Upload policy document, chunk, and index 768d embeddings |
| **Commerce** | `GET` | `/api/v1/orders/{order_number}` | Agent, Supervisor, Admin | Fetch order details, line items, and shipping status |
| **Commerce** | `POST` | `/api/v1/orders/{id}/refund` | Supervisor, Admin | Process financial refund with idempotency check |
| **Automations**| `POST` | `/api/v1/automations/webhook` | Webhook (HMAC) | Inbound HMAC-SHA256 webhook dispatcher with DLQ routing |
| **Automations**| `GET` | `/api/v1/automations/events` | Supervisor, Admin | List outbound automation events and delivery attempts |
| **Automations**| `POST` | `/api/v1/automations/retry/{id}` | Supervisor, Admin | Manually retry failed webhook delivery from Dead-Letter Queue |
| **Analytics** | `GET` | `/api/v1/analytics/overview` | Agent, Supervisor, Admin | Aggregate metrics: deflection rate, FRT, CSAT, volume |

---

## 6. Detailed Feature & Component Breakdown

### 6.1 Layer 1: Frontend Client & Dashboard Experience
* **Minimalist Ticket Kanban Pipeline (`TicketsPage.tsx`)**:
  * 4 visual support lifecycle stages:
    * **Open (◌)** — New unassigned or triage tickets.
    * **In Progress (🔵)** — Active agent conversations and research.
    * **Escalated (🟡)** — High-risk requests awaiting supervisor HITL review.
    * **Resolved (🟣)** — Successfully resolved customer inquiries.
  * Drag-and-drop ticket cards with live stage recalculation and column totals.
  * Instant toggling between Twenty CRM-inspired Kanban board and dense table view.
* **3-Column Ticket Inspector (`TicketDetailPage.tsx` + `OrchestratorInspector.tsx`)**:
  * **Left column:** Customer conversation thread and full message history.
  * **Center column:** Interactive chat composer with AI suggestion generation and real-time step-by-step reasoning inspector.
  * **Right column:** Customer profile, lifetime value, linked orders, and sentiment indicators.
* **Human-in-the-Loop (HITL) Queue (`ApprovalsPage.tsx`)**:
  * High-risk proposals (refunds > $50, order cancellations, address changes) are blocked from execution until human staff approval.
  * Visual diff viewer displaying proposed action payload vs. current database state.
* **Hybrid Knowledge Base Explorer (`KnowledgePage.tsx`)**:
  * Document upload and chunking interface with real-time vector indexing status.
  * Live test search visualizing simultaneous dense vector cosine score and PostgreSQL full-text search score combined via RRF.
* **Operational Analytics & Telemetry (`AnalyticsPage.tsx`)**:
  * Segmented time-range controls (7D, 30D, 90D).
  * KPI metrics: Inbound Ticket Volume, Autonomous Deflection Rate (target >65%), First Response Time (FRT), and CSAT.
  * Interactive area charts and category distribution graphs powered by Recharts.
* **Automations & Webhook Monitor (`AutomationsPage.tsx`)**:
  * Real-time webhook dispatch telemetry, HMAC signature verification badges, idempotency key inspector.
  * Dead-Letter Queue (DLQ) inspection modal with JSON payload viewer and 1-click retry.

### 6.2 Layer 2: Backend API Gateway
* **Atomic Sequential Ticket Intake (`POST /api/v1/tickets`)**:
  * Generates sequential human-readable identifiers (`TICK-0001`, `TICK-0002`).
  * Auto-provisions customer records if customer does not yet exist.
* **Agent Execution Endpoints (`POST /api/v1/agent/run-agent`)**:
  * Streams intermediate agent execution steps via WebSockets or returns structured response payload.
* **HMAC-SHA256 Webhook Gateway (`POST /api/v1/automations/webhook`)**:
  * Verifies `X-Signature-SHA256` using constant-time comparison to prevent timing attacks.
  * Deduplicates events via unique `idempotency_key` stored in database.

### 6.3 Layer 3: AI Orchestration Engine (`engine.py`)
Custome-X implements a strictly verified **7-Step Deterministic Pipeline**:
1. **Input Validation & Sanitization:** Enforces length caps (`MAX_MESSAGE_LENGTH = 2000`), masks PII (credit cards, SSNs) in traces, neutralizes XML-like delimiter breakout tags, and executes dual-scope prompt injection defense (`DIRECT_INJECTION_PATTERNS` on live messages; `looks_like_instruction()` on stored KB/notes/tools).
   * **What a flag does:** Step 1 logs a warning, caps confidence at 0.50, and forces `needs_human = True` (blocking autonomous actions and routing to HITL queue).
   * **Empirical Benchmark (`test_prompt_injection_benchmarks.py`):** 0.0% False Positive Rate across 30 normal customer messages; 100.0% Block Rate across 20 adversarial injection attacks.
2. **Intent Classification & Entity Extraction:** Canonical deterministic regex and token extractors parse order identifiers (`ORD-\d+`), SKUs, and dollar amounts before calling the LLM.
3. **RAG Hybrid Retrieval:** Queries PostgreSQL `public.match_knowledge_chunks` combining 768-dim dense vectors with sparse `tsvector` FTS via Reciprocal Rank Fusion, scoped to tenant and active status.
4. **Business Data Needs Planning:** Deterministic planner identifies prerequisite server tools; if an order ID is present, automatically schedules `get_order_details`.
5. **Server-Side Tool Execution & Ownership Validation:** Executes typed Python tools in `ToolRegistry` with strict schema validation. Asserts customer ownership of records; raises `OwnershipViolationError` (HTTP 403) on cross-customer tampering.
6. **Business Rule Engine & Financial Threshold Guards:** Applies business constraints: 30-day return policy window, $50.00 autonomous refund limit (`REFUND_AUTONOMOUS_THRESHOLD_CENTS = 5000`), block on in-transit cancellations, and outbound URL host allow-listing (`strip_unknown_urls`). High-risk actions set `requires_approval = True`.
7. **Structured Action Proposal Output:** Grounded response synthesis via Google Gemini API (`GEMINI_MODEL`, fallback `GEMINI_FALLBACK_MODEL`) with deterministic offline fallback, accompanied by full immutable step audit traces in `OrchestrationResponse`.

* **Hybrid RAG Pipeline (`retrieval.py` & `knowledge_service.py`)**:
  * **Primary SQL RRF Path (`public.match_knowledge_chunks`)**: Executes PostgreSQL stored procedure combining dense vector cosine similarity (768-dim `text-embedding-004` via `pgvector`) and sparse full-text search (`tsvector` generated column against `plainto_tsquery('english', query)`) using Reciprocal Rank Fusion:
    $$RRF\_Score(d) = \frac{1}{60 + rank_{dense}(d)} + \frac{1}{60 + rank_{sparse}(d)}$$
    strictly scoped by tenant (`organization_id = auth_org_id`) and active status (`status = 'active'`).
  * **Resilient Keyword Fallback Path (`search_knowledge`)**: In offline environments or development testing without database access, performs in-memory weighted keyword overlap scoring ($hits / |query\_tokens|$) across sample policy chunks.
* **Deterministic Business Rules Validator (`rules.py`)**:
  * Validates every tool call proposal against concrete constraints.
  * Example: If `issue_refund` amount exceeds $50.00, status is automatically set to `requires_approval`, halting execution until staff review.

### 6.4 Layer 4 & 5: Data & Integration
* **Multi-Tenant Isolation Architecture & Verified RLS Policies**:
  * Multi-tenancy is enforced through **Application-Level Tenant Isolation** using strict `organization_id` query filters on all database access paths, backed by foreign-key relational schemas.
  * Verified in `tests/test_tenant_a_cannot_read_tenant_b_tickets.py`: Tenant A attempting to read Tenant B's tickets gets nothing (0 items on list queries, HTTP 404 `TicketNotFoundError` on direct ID lookups).
  * **Actual Database Row-Level Security (RLS) Implementation (Migrations `bad184373bcd` & `675875ef33d9`)**:
    PostgreSQL RLS policies invoke a `SECURITY DEFINER` function `public.get_auth_organization_id() RETURNS uuid` (`SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1`) to eliminate policy recursion while guaranteeing engine-level isolation:
    * `public.users`: `(id = auth.uid() OR organization_id = public.get_auth_organization_id())`
    * `public.organizations`: `(id = public.get_auth_organization_id())`
    * `public.customers` & `public.tickets`: `(organization_id = public.get_auth_organization_id())`
    * `public.messages` & `public.ticket_events`: `(ticket_id IN (SELECT id FROM public.tickets WHERE organization_id = public.get_auth_organization_id()))`
    * `public.knowledge_documents` & `public.knowledge_chunks`: `(organization_id = public.get_auth_organization_id())`
* **n8n Master Workflows**:
  * `WF1`: New ticket ingestion & initial classification notification.
  * `WF2`: Urgent ticket escalation to supervisor Slack channel.
  * `WF3`: HITL gated action dispatch with direct review link.
  * `WF4`: Scheduled hourly ETL and KPI data lake sync.

---

## 7. Demo Accounts & Default Credentials

Custome-X comes pre-configured with demo accounts for evaluation. You can log in directly at `http://localhost:5173/login`:

| Account Role | Email Address | Password | Permissions & Notes |
| :--- | :--- | :--- | :--- |
| **Support Agent** | `agent1@example.com` | `SecurePassword123!` | Standard agent triage, ticket resolution, AI draft suggestions. *(Click **"Fill Demo Agent Credentials"** on login page).* |
| **Supervisor** | `supervisor1@example.com` | `SecurePassword123!` | Human-in-the-Loop (HITL) approval queue, refund authorization >$50, SLA management. |
| **Default Tenant** | `11111111-1111-1111-1111-111111111111` | N/A | **Acme Demo Store** (All demo tickets, orders, and policies are scoped to this organization). |

---

## 8. Step-by-Step Setup & Run Guide (Runnable)

Follow these instructions to run Custome-X from a fresh clone. Both Windows (PowerShell) and macOS/Linux (Bash) commands are provided.

### 8.1 System Prerequisites
Ensure the following runtimes are installed on your workstation:
* **Python:** Version 3.11, 3.12, 3.13, or 3.14
* **Node.js:** Version 20.x or 22.x (with `npm` 10+)
* **PostgreSQL:** Version 16 with the `pgvector` extension enabled (or an active Supabase project)
* **Git**

---

### 8.2 Environment Configuration (`.env`)

#### Backend Configuration
Copy the template and configure your connection credentials:

**Windows (PowerShell):**
```powershell
cd backend
Copy-Item .env.example .env
```

**macOS / Linux (Bash):**
```bash
cd backend
cp .env.example .env
```

Verify `backend/.env` contains your database connection string and API keys:
```env
ENVIRONMENT=development
PORT=8000
HOST=127.0.0.1
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Database Connection (PostgreSQL 16 + pgvector)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/postgres

# Supabase Auth Settings
SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_JWT_SECRET=[YOUR-JWT-SECRET-MIN-32-CHARS]

# Google Gemini API
GEMINI_API_KEY=[YOUR-GEMINI-API-KEY]
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-2.0-flash

# Autonomous Safeguards
REFUND_AUTONOMOUS_THRESHOLD_CENTS=5000
RETURN_WINDOW_DAYS=30
```

#### Frontend Configuration

**Windows (PowerShell):**
```powershell
cd ../frontend
Copy-Item .env.example .env
```

**macOS / Linux (Bash):**
```bash
cd ../frontend
cp .env.example .env
```

Verify `frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

---

### 8.3 Backend Installation, Migration & Seed

#### 1. Create Virtual Environment & Install Dependencies
**Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

**macOS / Linux (Bash):**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### 2. Run Database Migrations (Alembic)
Applies all versioned schema tables, check constraints, and PostgreSQL RLS functions:

**Windows & macOS/Linux:**
```bash
alembic upgrade head
```

*Expected output:*
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 4045d08861b6, init_core_tables
INFO  [alembic.runtime.migration] Running upgrade 4045d08861b6 -> 6d41c0cbdd36, add_knowledge_base_tables
INFO  [alembic.runtime.migration] Running upgrade 6d41c0cbdd36 -> bad184373bcd, add_rls_policies_for_tenant_isolation
INFO  [alembic.runtime.migration] Running upgrade bad184373bcd -> 675875ef33d9, fix_rls_infinite_recursion
INFO  [alembic.runtime.migration] Running upgrade 675875ef33d9 -> a892f3b14cd5, create_commerce_and_agent_audit_tables
```

#### 3. Seed Database with Demo Data
Seeds the default demo organization, demo agent accounts, sample orders, tickets, and knowledge chunks:

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\python.exe scripts/seed_data.py
```

**macOS / Linux (Bash):**
```bash
python scripts/seed_data.py
```

*Expected output:*
```
[1/6] Connecting to database...
 -> Seeding demo organization (Acme Demo Store)...
 -> Seeding demo agent (agent1@example.com)...
 -> Seeding demo supervisor (supervisor1@example.com)...
 -> Seeding sample customers...
 -> Seeding sample products...
 -> Seeding sample orders (ORD-10001, ORD-10002)...
 -> Seeding sample tickets across 4 states (open, in_progress, escalated, resolved)...
 -> Seeding knowledge base documents...
[OK] Seed completed successfully!
```

#### 4. Start the Backend API Gateway

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**macOS / Linux (Bash):**
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

*Expected output:*
```
INFO:     Will watch for changes in: ['D:\PR\Custome-X\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process using WatchFiles
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```
* **API Base:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Interactive Swagger Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 8.4 Frontend Installation & Execution

#### 1. Install Dependencies
Open a second terminal window:

**Windows & macOS/Linux:**
```bash
cd frontend
npm install
```

#### 2. Start the Vite Development Server

**Windows & macOS/Linux:**
```bash
npm run dev
```

*Expected output:*
```
  VITE v8.3.5  ready in 248 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```
* Open [http://localhost:5173](http://localhost:5173) in your browser.
* Click **"Fill Demo Agent Credentials"** to log in as `agent1@example.com`.

---

### 8.5 Verification & Automated Testing

Execute the test suites to verify system integrity:

**Backend Tests:**
```bash
cd backend
pytest -v
```
*Expected output: `25 passed in ~50s`.*

**Frontend Build & Typecheck:**
```bash
cd frontend
npm run build
```
*Expected output: `✓ built in ~500ms` with zero TypeScript errors.*

---

## 9. Known Limitations & Production Roadmap

1. **Client Token Storage (`localStorage` in Demo Environment):**
   * *Current State:* JWT session access tokens are stored in browser `localStorage` during evaluation for rapid cross-origin testing across dev ports (`5173` to `8000`) and SDK session rehydration.
   * *Production Requirement:* Documented in `DECISIONS.md` (`ADR-012`), commercial production deployment mandates transitioning to **`httpOnly`, `Secure`, `SameSite=Strict` cookies** issued by a Backend-for-Frontend (BFF) reverse proxy with strict `Content-Security-Policy` (CSP) headers.
2. **PostgreSQL pgvector Compute Scale Threshold:**
   * *Current State:* Hybrid dense vector search operates directly in PostgreSQL via `pgvector` (HNSW cosine distance index).
   * *Scale Boundary:* When knowledge base collections exceed 5,000,000 embedding chunks, vector indexing compute should be offloaded to dedicated read-replicas to prevent connection pool starvation on transaction queries.
3. **External Webhook Dispatch Egress in Local Development:**
   * *Current State:* Inbound Shopify/WooCommerce webhooks expect direct HTTP delivery to `/api/v1/automations/webhook`.
   * *Workaround:* For live testing with third-party webhooks on local development machines, an ngrok or Cloudflare tunnel is required to expose port `8000` to the internet.
4. **Third-Party LLM Latency Variance:**
   * *Current State:* Synthesis steps calling Google Gemini API are subject to public internet transit latency (typically 800ms–1800ms).
   * *Resilience Mitigation:* The platform implements automated retry with exponential backoff and instant fallback to high-fidelity deterministic template synthesis if external API calls exceed timeout bounds.

---

## Appendix: Codebase Knowledge Graph Insights (`graphify`)

Analysis generated by `graphify` over the 192 project files (1,261 nodes, 3,772 edges, 63 communities):

```
Graph: 1261 nodes · 3772 edges · 63 functional communities
Extraction Integrity: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS (avg confidence: 0.94)
Interactive Visualization: graphify-out/graph.html
Detailed Report: graphify-out/GRAPH_REPORT.md
```

### Top 10 God Nodes (Core Architectural Abstractions)
These nodes represent the most interconnected centers of gravity in the codebase:

1. **`User` (98 edges)** — The fundamental actor entity linking auth, tenancy, supervisor roles, and audit trails.
2. **`Organization` (87 edges)** — The multi-tenant root partition isolating database rows, API keys, and configurations.
3. **`Customer` (59 edges)** — The e-commerce customer profile tracking lifetime value, orders, and sentiment history.
4. **`Ticket` (49 edges)** — The core unit of work with state machine transitions (`open`, `in_progress`, `escalated`, `closed`).
5. **`create_ticket_atomic()` (35 edges)** — Transaction-safe atomic intake handler provisioning customers, sequential IDs, and initial agent routing.
6. **`Base` (32 edges)** — SQLAlchemy declarative model base standardizing UUIDs and timestamp mixins across all tables.
7. **`get_current_user()` (27 edges)** — Security dependency enforcing Supabase JWT verification and RBAC permissions.
8. **`react` (27 edges)** — Primary UI component tree anchor binding views, layouts, and modals.
9. **`OrchestrationEngine` (26 edges)** — The central 7-step autonomous agent reasoning and tool execution engine.
10. **`AuthService` (26 edges)** — Multi-strategy authentication service with resilient fallback and automatic tenant resolution.
