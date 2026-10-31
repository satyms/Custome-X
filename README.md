# CXPilot (Custome-X)

> **Agentic AI Platform for E-commerce Customer Support & Operations**  
> *Single-agent, tool-using support system  ·  The LLM proposes, deterministic code decides.*

[![Architecture](https://img.shields.io/badge/Architecture-8--Layer%20Master%20Design-1971c2.svg)](ARCHITECTURE.md)
[![Status](https://img.shields.io/badge/Status-Active%20MVP-green.svg)](TASKS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/Stack-React%20%7C%20Supabase%20%7C%20n8n%20%7C%20pgvector-orange.svg)](#technology-stack)

---

## 1. Project Overview

**CXPilot** is a full-stack, agentic AI platform engineered for D2C and e-commerce enterprises. It unifies hybrid RAG knowledge retrieval, LLM tool calling, deterministic order tracking, automated ticket routing, and human-in-the-loop (HITL) approval gates into an operational workspace.

The platform demonstrates how to connect modern LLMs (Gemini / Claude) safely to real application databases and business APIs without hallucinating facts, leaking customer data, or executing unauthorized state changes.

### Core Problem Solved
E-commerce support teams suffer from disconnected systems across order tracking, warehouse shipping events, return policies, and messaging channels. Repetitive inquiries consume 70%+ of agent capacity, while sensitive actions (refunds, order modifications) risk expensive mistakes if delegated blindly to probabilistic models.

### The CXPilot Solution
* **Verified Facts Only:** The AI agent queries verified database tables and vector embeddings for business facts. It is strictly prohibited from inventing tracking events or policy rules.
* **The LLM Proposes, Deterministic Code Decides:** While the LLM classifies intent and drafts proposals, deterministic application code validates parameters, checks customer ownership, and enforces policy eligibility.
* **Human-in-the-Loop (HITL) Safety:** High-impact operations (e.g., refunds over \$50, address changes, cancellations) automatically pause and require human staff approval.
* **Auditable Event Bus:** Every single agent run, tool call, document chunk citation, and approval decision is logged for auditing, KPI tracking, and automated evaluation.

---

## 2. Key Features

* **3-Column Support Workspace:**
  * **Column 1:** Filterable ticket queue (All, Unassigned, Escalated, Resolved, VIP).
  * **Column 2:** Real-time conversation timeline with AI-generated draft suggestions.
  * **Column 3:** Rich context inspector displaying customer profile, order history, live carrier tracking events, retrieved knowledge sources, and full tool execution traces.
* **7-Step AI Orchestration Pipeline:**
  1. Input sanitization & context loading
  2. Intent classification & entity extraction (Order IDs, SKUs)
  3. Semantic RAG retrieval over active policies via `pgvector`
  4. Business tool planning
  5. Execution of schema-validated read-only server tools
  6. Deterministic business rule validation
  7. Structured JSON proposal generation
* **Human Approval Center:** Dedicated queue for staff to review proposed refunds and order mutations with side-by-side evidence and policy citations.
* **Event-Driven n8n Automation:**
  * **WF1:** New ticket notification (Slack/Email with HMAC verification).
  * **WF2:** Human escalation routing for high-urgency or repeated complaints.
  * **WF3:** Action approval notifications with direct links to review drawers.
  * **WF4:** Scheduled ETL sync and KPI aggregation.
* **Operational Analytics & KPI Suite:** First-response time, resolution rate, escalation percentage, tool-call success metrics, and cost per case.
* **14-Scenario Agent Evaluation Harness:** Versioned benchmark measuring intent accuracy, entity extraction, recall@k, groundedness, and security against prompt injection.

---

## 3. Technology Stack

| Layer | Technology | Role & Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite / Next.js | Modern support workspace and analytics dashboard |
| **Styling & UI** | Tailwind CSS, shadcn/ui, Lucide Icons | Clean, high-density, accessible interface |
| **Charts** | Recharts / Plotly | Operational metrics, resolution trends, and eval charts |
| **Backend & APIs** | Node.js (TypeScript) or Python (FastAPI) | Authenticated REST gateway, tool registry, and agent engine |
| **Database & Auth** | Supabase (PostgreSQL 16+) | Single source of truth, Supabase Auth, Row-Level Security (RLS) |
| **Vector Storage** | `pgvector` extension | Storing embeddings for FAQ and policy semantic search |
| **Workflow Automation**| n8n (Self-hosted or Cloud) | Asynchronous webhook routing, email/Slack alerts, scheduled jobs |
| **AI Providers** | Google Gemini API / Anthropic Claude API | Model adapters for classification, embeddings, and tool calling |
| **Data Engineering**| Python, Pandas | ETL pipeline for importing, cleaning, and enriching commerce data |
| **Testing & Evals** | Vitest, Pytest, Python Eval Runner | Unit tests, RLS policy verification, and 14-case agent harness |

---

## 4. Master Architecture Blueprint

CXPilot is structured across **8 distinct architectural layers**:

```
[ LAYER 1: CLIENT LAYER ]
  React + TypeScript SPA (3-Column Inbox, Approvals, KB, Analytics, Evals)
          │
          ▼  HTTPS + Supabase JWT
[ LAYER 2: BACKEND API GATEWAY ]
  Auth & RBAC, REST Routers, Webhook Gateway (HMAC), Idempotency Keys
          │
          ├───► [ LAYER 3: AI ORCHESTRATION ENGINE ]
          │       7-Step Pipeline, Gemini/Claude Adapter, Tool Registry,
          │       Guardrails, Deterministic Action Validator
          │
          ├───► [ LAYER 4: DATA & PLATFORM (Supabase) ]
          │       PostgreSQL Relational DB, pgvector Search, RLS Policies,
          │       agent_runs, tool_calls, audit_logs
          │
          └───► [ LAYER 5: AUTOMATION (n8n) ]
                  WF1 (New Ticket), WF2 (Escalate), WF3 (Approve), WF4 (ETL)
                          │
                          ▼
[ LAYER 6: ETL & DATA PIPELINE (Python + Pandas) ]
  Extract ──► Transform ──► Enrich (AI Tags) ──► Load (Validated Rows)
                          ▲
[ LAYER 7: EXTERNAL & MOCK INTEGRATIONS ]
  Slack/Email Notifications · Mock Carrier API (FedEx/UPS/DHL) · Synthetic Data
                          ▲
[ LAYER 8: QUALITY, OBSERVABILITY & DELIVERY ]
  Audit Trail Inspector · 14-Case Eval Harness · Automated CI/CD Tests
```

*For complete architectural specifications, sequence diagrams, and database schemas, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.*

---

## 5. Living Documentation Links

* [**`ARCHITECTURE.md`**](ARCHITECTURE.md): Comprehensive system architecture, subsystem blueprints, data schemas, and API contracts.
* [**`AGENTS.md`**](AGENTS.md): Development instructions, TDD requirements, skill trigger maps, and operating protocols for AI pair programmers.
* [**`TASKS.md`**](TASKS.md): Implementation tracking, milestone checklist, and active development backlog.
* [**`DECISIONS.md`**](DECISIONS.md): Architectural Decision Records (ADRs) explaining technical trade-offs.

---

## 6. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
