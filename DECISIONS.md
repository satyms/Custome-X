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
