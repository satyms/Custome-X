# Phase 4: Authentication and Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a secure, production-grade multi-tenant authentication and authorization subsystem using Supabase Auth for user registration, login, and identity management, combined with FastAPI security dependencies (HTTPBearer, JWT validation), Role-Based Access Control (RBAC: agent, supervisor, admin), automatic multi-tenant scoping, and PostgreSQL Row-Level Security (RLS).

**Architecture:** 
- Supabase Auth manages user credentials, Bcrypt password hashing, session tokens (JWT access & refresh tokens), and identity verification.
- Internal `public.users` stores the organizational profile (`id` linked to Supabase user UUID, `organization_id`, `role`, `email`, `full_name`).
- FastAPI `app/core/auth.py` provides `get_current_user` dependency validating JWT signatures/claims and resolving active tenant context.
- `require_role(...)` dependency factory enforces RBAC at the route handler level, returning 403 Forbidden for unauthorized roles.
- `tickets.py` and `customers.py` endpoints are protected and strictly scoped to `current_user.organization_id`.
- PostgreSQL Row-Level Security (RLS) policies enforce database engine-level isolation.

**Tech Stack:** FastAPI, Supabase Auth REST API, PyJWT, Pydantic v2, SQLAlchemy 2.0 (async), PostgreSQL 17 (Supabase), pytest-asyncio, httpx.

**Spec:** `Phase_4—Authentication_and_authorization.md` and `CXPilot_Project_Blueprint.md`

## Global Constraints
- All database mutations must use transactions with clean rollback on error.
- All endpoints must return uniform error responses matching `{ "error": { "code", "message", "request_id", "details" } }`.
- Password hashing must never store plain text passwords; rely on Supabase Auth's Bcrypt hashing.
- Every API endpoint manipulating tenant data must require authentication and scope queries by `organization_id`.
- 100% test pass rate with pytest-asyncio and zero linting/type errors.

## Review Focus
1. **Cross-Tenant Access Attempt:** User in Organization A attempting to read/update a ticket in Organization B receives 404 Not Found (or 403), never leaking other tenant data.
2. **Expired / Malformed Bearer Token:** Requests with malformed, expired, or missing tokens receive 401 Unauthorized with standard error envelope.
3. **Role Privilege Escalation:** An `agent` attempting supervisor or admin actions (e.g. refund approvals or admin role endpoints) receives 403 Forbidden.
4. **Duplicate Registration / Race Condition:** Registering an existing email returns 409 Conflict without leaving partial database records.
5. **RLS Database Defense:** Database policies active so unprivileged connections cannot query rows outside their assigned tenant.

---

### Task 1: Auth Schemas & Configuration
**Files:**
- Create: `backend/app/schemas/auth.py`
- Modify: `backend/app/core/config.py`
- Test: `backend/tests/test_auth_schemas.py`

**Steps:**
- [ ] Write failing test in `backend/tests/test_auth_schemas.py` testing `UserRegisterRequest`, `UserLoginRequest`, `TokenResponse`, and password complexity rules.
- [ ] Add `SUPABASE_JWT_SECRET` (optional for local JWT signature validation) and Supabase Auth client configuration in `backend/app/core/config.py`.
- [ ] Implement `UserRegisterRequest`, `UserLoginRequest`, `TokenResponse`, `UserMeResponse`, and `RefreshTokenRequest` in `backend/app/schemas/auth.py`.
- [ ] Run test suite to verify schemas pass.
- [ ] Commit: `feat(auth): add auth schemas and configuration for Supabase Auth`.

---

### Task 2: Supabase Auth Service & Password Security
**Files:**
- Create: `backend/app/services/auth_service.py`
- Modify: `backend/app/core/exceptions.py`
- Test: `backend/tests/test_auth_service.py`

**Steps:**
- [ ] Add `InvalidCredentialsError`, `AuthenticationError`, `UserAlreadyExistsError`, `UnauthorizedError`, `ForbiddenError` to `backend/app/core/exceptions.py`.
- [ ] Write unit tests in `backend/tests/test_auth_service.py` with mocked/live Supabase Auth calls for signup, login, and profile sync.
- [ ] Implement `AuthService` in `backend/app/services/auth_service.py`:
  - `register_user(session, payload)`: calls Supabase Auth signup, inserts profile into `public.users` within a transaction.
  - `login_user(session, payload)`: calls Supabase Auth token grant password endpoint, fetches user record from `public.users`.
  - `refresh_token(refresh_token)`: calls Supabase Auth refresh endpoint.
  - `get_user_by_id(session, user_id)`: retrieves user from `public.users`.
- [ ] Run tests and verify service passes.
- [ ] Commit: `feat(auth): implement AuthService communicating with Supabase Auth`.

---

### Task 3: FastAPI Security Dependencies & RBAC Guards
**Files:**
- Create: `backend/app/core/auth.py`
- Modify: `backend/app/core/error_handlers.py`
- Test: `backend/tests/test_rbac_and_dependencies.py`

**Steps:**
- [ ] Write tests in `backend/tests/test_rbac_and_dependencies.py` testing `get_current_user` dependency, token validation, expired token handling, and `require_role(["admin"])` / `require_role(["supervisor", "admin"])`.
- [ ] Implement `get_current_user` in `backend/app/core/auth.py` using `HTTPBearer` security scheme.
- [ ] Implement `require_role(allowed_roles: List[str])` dependency factory in `backend/app/core/auth.py`.
- [ ] Ensure 401 and 403 HTTPExceptions are correctly enveloped by `app/core/error_handlers.py`.
- [ ] Run tests and verify dependencies pass.
- [ ] Commit: `feat(auth): implement get_current_user and require_role RBAC dependencies`.

---

### Task 4: Auth REST Endpoints
**Files:**
- Create: `backend/app/api/v1/endpoints/auth.py`
- Modify: `backend/app/api/v1/api.py`
- Test: `backend/tests/test_auth_endpoints.py`

**Steps:**
- [ ] Write integration tests in `backend/tests/test_auth_endpoints.py` testing:
  - `POST /api/v1/auth/register` (201 Created)
  - `POST /api/v1/auth/login` (200 OK with token & user info)
  - `GET /api/v1/auth/me` (200 OK with authenticated user profile)
  - Invalid credentials handling (401 Unauthorized)
- [ ] Implement `auth.py` router with register, login, refresh, and me endpoints.
- [ ] Mount `auth_router` in `backend/app/api/v1/api.py` under `/auth` tag.
- [ ] Run tests to verify all auth endpoints pass.
- [ ] Commit: `feat(api): expose /api/v1/auth endpoints for signup, login, and me`.

---

### Task 5: Multi-Tenant Scoping on Tickets & Customers
**Files:**
- Modify: `backend/app/api/v1/endpoints/tickets.py`
- Modify: `backend/app/api/v1/endpoints/customers.py`
- Modify: `backend/app/services/ticket_service.py`
- Modify: `backend/app/services/customer_service.py`
- Test: `backend/tests/test_multi_tenant_isolation.py`

**Steps:**
- [ ] Write comprehensive isolation tests in `backend/tests/test_multi_tenant_isolation.py`:
  - Organization A user cannot view Organization B's tickets.
  - Organization A user cannot update Organization B's tickets.
  - Organization A customer cannot be accessed by Organization B agent.
  - Creating tickets automatically attaches `current_user.organization_id`.
- [ ] Add `current_user: User = Depends(get_current_user)` to `tickets.py` and `customers.py`.
- [ ] Update `ticket_service.py` and `customer_service.py` queries to enforce `organization_id` filters on all SELECT, UPDATE, DELETE queries.
- [ ] Run all test suites to confirm full backward-compatibility and multi-tenant security.
- [ ] Commit: `feat(security): enforce tenant isolation and auth on tickets and customers`.

---

### Task 6: PostgreSQL Row-Level Security (RLS) Verification & Policies
**Files:**
- Create: `backend/alembic/versions/*_add_rls_policies.py`
- Test: `backend/tests/test_database_rls.py`

**Steps:**
- [ ] Verify RLS is enabled on all tables in Supabase PostgreSQL (`organizations`, `users`, `customers`, `tickets`, `messages`, `ticket_events`).
- [ ] Create Alembic migration script adding tenant isolation policies.
- [ ] Apply migration with `alembic upgrade head`.
- [ ] Write test verifying RLS policies are present in PostgreSQL `pg_policies`.
- [ ] Commit: `feat(db): establish PostgreSQL Row Level Security (RLS) policies`.

---

### Task 7: Full Verification & Documentation
**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `TASKS.md`
- Modify: `DECISIONS.md`

**Steps:**
- [ ] Run full pytest suite (`.\.venv\Scripts\python.exe -m pytest -v`) and verify 100% green tests.
- [ ] Update `ARCHITECTURE.md` with Authentication, Authorization, RBAC, and Supabase Auth flow diagrams.
- [ ] Update `TASKS.md` marking Phase 4 deliverables complete.
- [ ] Log architectural decision in `DECISIONS.md` detailing Supabase Auth integration with custom `public.users` tenant binding.
- [ ] Push clean commits to `origin/backend`.
