# Architecture Decision Records (DECISIONS.md)

This log records key architectural and technical decisions made for **Custome-X**, along with their context, rationale, and consequences.

---

## ADR-001: Supabase + PostgreSQL with pgvector for Unified Persistence & Vectors

* **Status:** Accepted
* **Context:** Custome-X requires transactional data storage (customers, orders, tickets, conversation threads) and high-performance vector similarity search for its RAG knowledge base. Managing a standalone vector database (e.g., Pinecone, Qdrant) alongside a primary relational database introduces data synchronization overhead, dual billing, and distributed transaction complexity.
* **Decision:** Use PostgreSQL hosted on Supabase as the single source of truth for both relational entities and vector embeddings, utilizing the `pgvector` extension with HNSW indexing.
* **Consequences:**
  * **Pros:** Single database to manage, backup, and monitor; transactional atomicity across vector metadata and operational data; built-in Row-Level Security (RLS) for multi-tenancy.
  * **Cons:** Vector search scaling is bound to PostgreSQL instance compute; requires index tuning for very large vector collections (> 5M embeddings).

---

## ADR-002: Dual-Loop Agent Architecture with Human-in-the-Loop (HITL) Gate

* **Status:** Accepted
* **Context:** Autonomous agents resolving customer complaints can cause severe business damage if hallucinations trigger unauthorized refunds, order cancellations, or inventory adjustments. Conversely, requiring manual approval for every response destroys agent deflection benefits.
* **Decision:** Implement a two-tiered action policy:
  1. **Tier 1 (Read-Only & Informational):** Order lookups, shipping tracking, FAQ retrieval, and drafting messages execute autonomously.
  2. **Tier 2 (High-Impact Mutating Actions):** Refunds over \$50, order cancellations after fulfillment dispatch, and address changes pause execution, persist state, and route to a human approval queue.
* **Consequences:**
  * **Pros:** Eliminates financial and operational risk while maintaining high deflection for ~80% of routine interactions.
  * **Cons:** Requires building a state-pause-and-resume workflow engine and a dedicated triage interface for human staff.

---

## ADR-003: n8n as the External Webhook & Workflow Orchestration Engine

* **Status:** Accepted
* **Context:** E-commerce stores connect with numerous third-party platforms (Shopify, WooCommerce, Stripe, ShipStation, Zendesk, WhatsApp). Writing and maintaining custom API integrations and webhook listeners inside the core backend leads to fragile boilerplate and heavy maintenance.
* **Decision:** Use **n8n** (self-hostable or cloud) as the integration bus. n8n receives incoming webhooks, validates signatures, normalizes event structures, and communicates with Custome-X via internal authenticated webhooks.
* **Consequences:**
  * **Pros:** Low-code visual workflow debugging; easy adaptation to new e-commerce platforms; built-in retry mechanisms and rate limiting.
  * **Cons:** Adds an external service dependency; requires secure API key / signature verification between n8n and Custome-X backend.

---

## ADR-004: Hybrid Search (Dense Vectors + Full-Text Search via Reciprocal Rank Fusion)

* **Status:** Accepted
* **Context:** Pure semantic vector search frequently fails on exact keyword lookups (such as specific SKU numbers, order IDs, product codes, or exact policy clauses), while classic keyword search fails on conceptual questions ("can I return an opened cosmetic item?").
* **Decision:** Implement hybrid search inside PostgreSQL combining dense vector embeddings (cosine distance) with full-text search (`tsvector` / `tsquery`), combined using Reciprocal Rank Fusion (RRF).
* **Consequences:**
  * **Pros:** Maximizes retrieval precision across both conceptual queries and exact serial/SKU matching.
  * **Cons:** Slightly higher query latency; requires storing both vector embeddings and tsvector columns in PostgreSQL.

---

## ADR-005: Test-Driven Development (TDD) & Practice Evaluation Gym

* **Status:** Accepted
* **Context:** LLM applications suffer from non-deterministic behavior and silent regression drift when prompts, tools, or model versions are updated.
* **Decision:** 
  1. Mandate TDD for all deterministic services (tool execution, schema parsers, RLS policies, webhook processors).
  2. Maintain a golden evaluation suite (Agent Gym) of 50+ benchmark customer conversations to score LLM prompt and tool selection accuracy prior to production release.
* **Consequences:**
  * **Pros:** Verifiable regression testing; confidence when refactoring agent prompts or upgrading model backends.
  * **Cons:** Requires upfront effort to create and curate synthetic/anonymized customer conversation datasets.

---

## ADR-006: Design System & Dashboard Standards via ui-ux-pro-max

* **Status:** Accepted
* **Context:** Support agents spend 8+ hours a day in the support console. Cluttered layouts, poor contrast, and generic "AI templates" degrade productivity and cause agent fatigue.
* **Decision:** Use Tailwind CSS utility tokens based on `ui-ux-pro-max` design intelligence. Establish high information density, accessible color contrast (WCAG AA), dark mode by default, and responsive drawer components for reviewing agent diffs.
* **Consequences:**
  * **Pros:** Consistent, accessible, and fatigue-reducing user interface tailored for enterprise support workflows.
  * **Cons:** Requires adherence to established semantic token scales rather than ad-hoc inline styles.

---

## ADR-007: Supabase Auth & PostgreSQL Row-Level Security (RLS) for Identity & Tenant Isolation

* **Status:** Accepted
* **Context:** Custome-X is a multi-tenant platform handling confidential ticket conversations, order information, and refunds. User credentials require bulletproof password hashing, session tokens, and strict Role-Based Access Control (RBAC). Cross-tenant data leakage must be impossible at both the API layer and the database engine level.
* **Decision:**
  1. Use **Supabase Auth** for identity management, user registration, Bcrypt password hashing, and signed JWT session token issuance (access + refresh tokens).
  2. Maintain a linked internal profile in `public.users` (`id` matching `auth.users.id`, `organization_id`, `role`, `email`, `full_name`).
  3. Enforce RBAC in FastAPI via `get_current_user` and `require_role(["agent", "supervisor", "admin"])` dependencies.
  4. Automatically scope all domain queries (`tickets`, `customers`, `messages`, `ticket_events`) to `current_user.organization_id`.
  5. Apply versioned PostgreSQL **Row-Level Security (RLS)** policies via Alembic across all domain tables (`organizations`, `users`, `customers`, `tickets`, `messages`, `ticket_events`) verifying `auth.uid()` and tenant boundaries at the database engine level.
* **Consequences:**
  * **Pros:** Industry-standard identity security and Bcrypt password hashing without managing raw cryptographic salts in application memory; dual-layer defense (API query filtering + database engine RLS).
  * **Cons:** Requires synchronization between `auth.users` and `public.users` during registration transactions.

---

## ADR-008: Non-Recursive PostgreSQL RLS Policies via SECURITY DEFINER Function

* **Status:** Accepted
* **Context:** In PostgreSQL, RLS policies that evaluate subqueries directly against the same table they protect (e.g. `USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))` on `public.users`) trigger infinite recursion (`ERROR 42P17: infinite recursion detected in policy for relation "users"`) whenever an `authenticated` user queries `public.users`. This also broke Supabase Auth password grant lookups because GoTrue queries user roles/schemas under the user context.
* **Decision:**
  1. Define a dedicated PostgreSQL function `public.get_auth_organization_id() RETURNS uuid` marked as `SECURITY DEFINER` and `SET search_path = public`.
  2. Because `SECURITY DEFINER` executes with the permissions of the function owner (bypassing RLS during its internal lookup), it safely extracts the calling user's `organization_id` using `auth.uid()` without triggering recursive policy evaluations.
  3. Formulate the `public.users` RLS policy as:
     `USING (id = auth.uid() OR organization_id = public.get_auth_organization_id())`
  4. Ensure all dependent domain table policies (`customers`, `tickets`, `messages`, `ticket_events`, `organizations`) invoke `public.get_auth_organization_id()` rather than nested subqueries against `public.users`.
* **Consequences:**
  * **Pros:** Completely eliminates PostgreSQL policy recursion; standardizes tenant resolution to a single pre-compiled database function; ensures both Supabase Auth internal queries and API tenant queries succeed seamlessly.
  * **Cons:** Requires `SET search_path = public` on the function to prevent search path hijacking.


---

## ADR-009: 7-Step Deterministic AI Orchestration Pipeline with Strict Verification Gates

* **Status:** Accepted
* **Context:** Pure LLM agents that execute actions without deterministic validation can hallucinate unauthorized refunds, access order records across customer boundaries, trigger destructive cancellations on items already dispatched, or fall victim to prompt injection and PII leakage.
* **Decision:** Implement a strictly ordered 7-step deterministic pipeline for all agent actions:
  1. **Input Sanitization & Fencing:** Strip prompt injection tokens, mask customer PII (credit cards, SSNs, secrets), neutralize pseudo-XML delimiters (`<untrusted source="...">`), and assert that the requesting `customer_id` matches the session.
  2. **Deterministic Entity Extraction & Intent Classification:** Canonical regex extractors parse order identifiers (`ORD-XXXXX`), SKUs, and amounts to ensure deterministic parameter binding.
  3. **RAG Policy Retrieval with Active Version Filtering:** Knowledge base chunks are retrieved with explicit `status = 'active'` filtering and source attribution.
  4. **Least-Privilege Data Needs Planning:** Schedule necessary server-side tools ahead of time; if an order ID is present in the customer query, always schedule `get_order_details` to verify ownership prior to revealing status.
  5. **Typed Server-Side Tool Execution:** Execute typed Python tools with strict schema validation; raise `OwnershipViolationError` (HTTP 403) if an order belongs to a different customer.
  6. **Business Rule Engine & Financial Threshold Guards:** Apply hard business constraints in Python code: 30-day return window limit, $50.00 autonomous refund threshold (mandating human supervisor approval if exceeded), in-transit cancellation blocks, and URL host allow-listing filter (`[link removed]`).
  7. **Structured Action Proposal Contract:** Generate immutable JSON conforming to the `OrchestrationResponse` schema with confidence score, source citations, proposed action payload, and complete step-by-step audit traces.
* **Consequences:**
  * **Pros:** "The LLM proposes; deterministic code decides." Guarantees zero unauthorized financial actions, stops cross-customer data leakage, and provides complete observable execution traces in the support dashboard.
  * **Cons:** Requires rigorous synchronization between LLM outputs and deterministic validator schemas.


---

## ADR-010: Hybrid RAG Architecture with pgvector (HNSW) and Full-Text Search (GIN) via Reciprocal Rank Fusion

* **Status:** Accepted
* **Context:** Support agents and AI orchestrators require authoritative knowledge retrieval over return policies, shipping SLAs, warranty terms, and FAQs. Dense vector embeddings alone can suffer from vocabulary mismatch or hallucinate non-existent policy clauses, while keyword-only search fails on semantic paraphrasing. Furthermore, multi-tenant isolation and active document versioning must be strictly guaranteed at the database level.
* **Decision:** Implement a dual-index hybrid retrieval pipeline using PostgreSQL:
  1. **Schema & Extension:** Enable `pgvector` v0.8.2 and provision `knowledge_documents` and `knowledge_chunks` tables in PostgreSQL.
  2. **Dense Vector Indexing:** 768-dimensional normalized embeddings (`vector(768)`) aligned with Gemini `text-embedding-004`, indexed with HNSW (`vector_cosine_ops`) for sub-millisecond approximate nearest neighbor search.
  3. **Sparse Full-Text Indexing:** A stored generated column `tsv_content tsvector` automatically constructed from section headers and content, indexed with PostgreSQL GIN (`idx_kchunks_tsv_gin`).
  4. **Hybrid Stored Procedure with RRF:** A PostgreSQL stored procedure `public.match_knowledge_chunks` executes Reciprocal Rank Fusion ($1 / (k + \text{rank})$) combining top dense vector candidates and sparse full-text candidates into an integrated similarity score.
  5. **Multi-Tenant RLS & Version Scoping:** Strict Row-Level Security policies (`knowledge_chunks_tenant_isolation_policy`) and procedure parameters enforce `organization_id` scoping and `status = 'active'` filtering, preventing cross-tenant leakage and obsolete policy citations.
  6. **Resilient Embedding Generation:** Async Gemini API client with an in-memory SHA-256 embedding cache and deterministic n-gram hash fallback ensuring 100% offline test reliability.
* **Consequences:**
  * **Pros:** Scale-invariant rank fusion, zero external vector database dependencies (single source of truth in PostgreSQL), deterministic testability, strict tenant isolation, and automated database-level full-text indexing.
  * **Cons:** Requires running versioned database migrations (`6d41c0cbdd36`) and maintains 768 float dimensions per chunk.


---

## ADR-011: Layer 4 Complete Relational Schema (Commerce & Agent Audit) and Layer 5 n8n Automation Engine with DLQ

* **Status:** Accepted
* **Context:** Sections 2 and 3.4 of `ARCHITECTURE.md` require completing the full relational persistence layer: Commerce domain tables (`products`, `orders`, `order_items`, `shipments`, `shipment_events`) and Agent & HITL audit tables (`pending_actions`, `workflow_events`, `agent_runs`, `tool_calls`, `audit_logs`), completing all 18 tables specified in the enterprise architecture with PostgreSQL Row-Level Security. Furthermore, Layer 5 requires an outbound automation bus for n8n workflows with cryptographic HMAC verification, delivery retries, dead-letter queue (DLQ) state persistence, and full frontend observability.
* **Decision:**
  1. **Schema Migration & RLS:** Applied versioned migration `a892f3b14cd5_create_commerce_and_agent_audit_tables.py` on Supabase PostgreSQL, creating all 10 tables with check constraints, cascade deletes, composite indexes, and Row-Level Security tenant isolation policies (`organization_id = auth.jwt() ->> 'organization_id'`).
  2. **Automations Engine & Webhook Dispatcher:** Implemented `WebhookDispatcher` with RFC 2104 compliant HMAC-SHA256 signature generation (`X-Customex-Signature: sha256=...`), idempotency checking (`idempotency_key`), automatic retry tracking up to `max_retries = 3`, and fallback to dead-letter queue (`failed` status) upon retry exhaustion.
  3. **Event Trigger Integration:** Wired asynchronous webhook triggers into core API endpoints: `ticket.created` (WF1) on ticket submission, `ticket.escalated` (WF2) on status escalation, `approval.approved` and `approval.rejected` (WF3) on HITL triage.
  4. **Production n8n Workflows:** Packaged 4 exportable n8n workflow definitions in `automations/n8n/`:
     - `wf1_new_ticket_notification.json`: Inbound ticket routing and multi-channel agent alert.
     - `wf2_escalation_urgent_sla.json`: Urgent ticket escalation and manager SLA paging.
     - `wf3_approval_gated_action.json`: HITL authorization webhook and refund/intercept dispatch.
     - `wf4_scheduled_etl_kpi.json`: Nightly batch ETL aggregation and analytics cache refresh.
  5. **Frontend Management Consoles:** Created dedicated frontend pages:
     - `AutomationsPage.tsx`: Live webhook delivery metrics, filterable event queue, one-click DLQ retry actions, and JSON payload inspector.
     - `SettingsPage.tsx`: Tenant RLS status indicator, webhook endpoint & HMAC signing secret copy modal, AI safeguard thresholds editor, and interactive RBAC matrix.
* **Consequences:**
  - **Pros:** Full relational model compliance across all 18 tables; zero silent webhook drops due to DLQ persistence and manual retry; verifiable multi-tenant security from database to dashboard.
  - **Cons:** Outbound webhooks require network egress or valid n8n endpoint target URL in production configuration.


---

## ADR-012: Client Token Storage Strategy (localStorage for Demo/Prototype vs. httpOnly Cookie BFF for Production)

* **Status:** Accepted (with staged production migration roadmap)
* **Context:**
  Custome-X consists of a React Single Page Application (SPA) communicating with FastAPI and Supabase Auth. The client application needs access to authentication JWT tokens (access token and refresh token) to attach Bearer tokens to outgoing API requests and rehydrate user session state across page reloads. The architectural trade-off is between client-accessible storage (`localStorage`) and server-managed cookies (`httpOnly` cookies).
* **Decision:**
  1. **Demo, Development, and Staging Environments:** Storing JWT tokens in `localStorage` is explicitly accepted for the current demo and evaluation phase.
     * **Rationale:**
       - Enables rapid end-to-end evaluation, local testing across distinct origins and ports (e.g., `localhost:5173` to `localhost:8000`), and automated integration testing without requiring complex cross-domain cookie, domain-level CORS, or SSL certificate provisioning.
       - Direct interoperability with Supabase JavaScript SDK session persistence conventions.
     * **Active Mitigations during Demo:**
       - Strict input sanitization and automatic JSX output escaping to prevent Cross-Site Scripting (XSS) vectors.
       - Outbound URL allowlisting via `strip_unknown_urls()` in the agent orchestrator.
       - Dependency lockfiles (`package-lock.json`) and automated CI dependency checks.
  2. **Production Transition Requirement:**
     - Prior to commercial production release with live customer PII and payment data, token storage will transition to **`httpOnly`, `Secure`, `SameSite=Strict` cookies** issued and managed by a Backend-for-Frontend (BFF) proxy or reverse proxy (e.g., Nginx, Cloudflare Workers).
     - Production deployment must enforce a strict `Content-Security-Policy` (CSP) header prohibiting inline script execution (`unsafe-inline`) and unauthorized script sources.
* **Consequences:**
  * **Pros:** Rapid iteration and developer velocity during demo and evaluation stages; frictionless local multi-port developer experience.
  * **Cons:** `localStorage` is vulnerable if an XSS vulnerability is introduced in the client bundle; production transition to httpOnly cookies and BFF routing is documented as a mandatory pre-launch security milestone.


---

## ADR-013: Deterministic Financial Risk Boundary ($50.00 Autonomous Refund Cap)

* **Status:** Accepted
* **Context:**
  Autonomous agents executing ecommerce store actions can cause severe financial loss if non-deterministic LLM behavior, hallucinations, or adversarial prompt injections trigger unauthorized high-value refunds. Conversely, requiring human staff approval for low-cost routine refunds (e.g., $15 accessories or defective items) defeats deflection efficiency.
* **Decision:**
  1. Define a hard deterministic ceiling for autonomous refund execution at exactly **$50.00 (5,000 cents)** via `REFUND_AUTONOMOUS_THRESHOLD_CENTS = 5000` in `config.py` and enforce it in `BusinessRuleValidator` (`rules.py`).
  2. For refund requests where `amount <= $50.00` and the order is within the 30-day return policy window, the agent is authorized to execute autonomous processing.
  3. For refund requests where `amount > $50.00` (e.g. $125 ANC Headphones), the engine unconditionally halts autonomous tool execution, marks `requires_approval = True`, records an immutable proposal in `pending_actions`, and dispatches the action to the Human-in-the-Loop (HITL) supervisor triage queue (`ApprovalsPage.tsx`).
* **Consequences:**
  * **Pros:** Mathematical guarantee against unauthorized high-value payouts regardless of LLM generation; preserves ~80% autonomous deflection for standard low-value support claims; full compliance with e-commerce risk standards.
  * **Cons:** Legitimate high-value refunds must await supervisor inspection; requires human triage UI and approval webhook dispatch.
