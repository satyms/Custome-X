# AGENTS.md — Development Instructions & Operating Protocols

> **Project:** Custome-X  
> **Mission:** Autonomous, agentic AI customer support platform for e-commerce with RAG-based knowledge retrieval, intelligent order tracking, automated ticket routing, and human-in-the-loop escalation.

---

## 1. Core Operating Principles

Every AI coding agent operating in this repository must adhere to the following non-negotiable rules:

1. **Evidence Before Assertions:** Never claim code works, tests pass, or bugs are fixed without executing the actual verification command and inspecting output.
2. **Test-Driven Development (TDD):** Write failing test cases *first* before writing implementation code for critical domain logic (ticket routing, refund thresholds, tool parsing).
3. **Surgical Changes:** Make minimal, targeted modifications. Do not rewrite unaffected functions or alter formatting across untouched code.
4. **No Silent Assumptions:** If an e-commerce API, webhook contract, or database constraint is ambiguous, surface the question or verify against the schema.
5. **Preserve Documentation Integrity:** Maintain existing comments, docstrings, and architectural decision records.

---

## 2. Skill Trigger Reference

Use the local project skills installed in `.agents/skills/` during development:

| Scenario / Need | Primary Skill | Secondary Skill |
| :--- | :--- | :--- |
| **Beginning a feature or multi-step task** | `gsd-plan-phase` | `writing-plans` |
| **Executing implementation plans** | `gsd-execute-phase` | `executing-plans` |
| **Investigating bugs, timeouts, or regressions** | `systematic-debugging` | `diagnosing-bugs` |
| **Writing core business logic & algorithms** | `test-driven-development` | `tdd` |
| **Designing database entities or domain rules** | `domain-modeling` | `codebase-design` |
| **Navigating unfamiliar code or architecture** | `understand` / `understand-explain` | `graphify` |
| **Designing agent prompts & tool definitions** | `karpathy-agentic-engineering` | `karpathy-understanding-first` |
| **Building frontend & dashboard UI** | `ui-ux-pro-max` | `design-taste-frontend` |
| **Preparing PRs or code completion** | `verification-before-completion` | `code-review` |

---

## 3. Technology Stack & Architectural Standards

### 3.1 Backend & Database
* **Database:** PostgreSQL (via Supabase) with the `pgvector` extension enabled for hybrid dense/sparse vector search.
* **Row-Level Security (RLS):** All database tables handling tenant, ticket, or customer data must enforce strict Supabase RLS policies.
* **Database Migrations:** Use versioned SQL migration scripts. Never mutate production or shared schemas ad-hoc.

### 3.2 Agent & LLM Layer
* **Tool Calling:** All tools exposed to the agent must use typed JSON schemas with explicit parameter validation, failure recovery, and idempotency keys.
* **Human-in-the-Loop (HITL):** High-risk actions (e.g., executing refunds over \$50, cancellation of in-transit orders, customer account data modifications) require explicit staff approval before execution.
* **RAG Pipeline:** Pre-process knowledge base documents with deterministic chunking, metadata tagging (category, last_updated, tenant_id), and vector similarity threshold filters.

### 3.3 Integration & Webhooks
* **Workflow Engine:** n8n for incoming webhook routing (Shopify, WooCommerce, Stripe) and asynchronous notification dispatches.
* **Retry Strategy:** Webhook handlers must implement exponential backoff with a dead-letter queue (DLQ) for failed delivery events.

### 3.4 Frontend Dashboard
* **Design Guidelines:** Follow design tokens defined in `ui-ux-pro-max`. Clean, uncluttered layouts with dark-mode support and high information density for support agents.
* **Accessibility:** WCAG AA compliance across all dashboard controls, ticket queues, and chat inspectors.

---

## 4. Git & Workflow Hygiene

* **Branch Naming:** `feat/<phase>-<feature>`, `fix/<issue-id>-<description>`, `refactor/<module>`.
* **Atomic Commits:** Commit often with descriptive conventional commit messages:
  * `feat(rag): add hybrid search query function in supabase`
  * `test(orders): add unit tests for shipping status parser`
  * `fix(webhook): handle missing order payload gracefully`
* **Pre-completion Checklist:**
  1. Unit tests written and passing (`green`).
  2. Linter / type-checker passing with zero errors.
  3. Documentation updated in [ARCHITECTURE.md](ARCHITECTURE.md) and [TASKS.md](TASKS.md).
  4. Architecture decisions logged in [DECISIONS.md](DECISIONS.md) if conventions changed.
