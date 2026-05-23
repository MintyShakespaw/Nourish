---
phase: 01-backend-foundation-auth
plan: 01
subsystem: backend-auth
tags: [express, drizzle, postgres, jwt, bcrypt, zod, docker, walking-skeleton]
dependency_graph:
  requires: []
  provides:
    - POST /api/auth/register endpoint (AUTH-01)
    - Drizzle ORM schema (users, refresh_tokens, password_reset_tokens)
    - JWT token generation/verification service (HS256)
    - Zod env validation with fail-fast startup
    - Docker Postgres 17 configuration
  affects:
    - Plans 02, 03, 04 (build on this skeleton's contracts and patterns)
tech_stack:
  added:
    - express@5.2.1
    - drizzle-orm@0.45.2
    - drizzle-kit@0.31.10
    - jsonwebtoken@9.0.3
    - bcryptjs@3.0.3
    - zod@4.4.3
    - dotenv@17.4.2
    - helmet@8.2.0
    - cors@2.8.6
    - morgan@1.10.1
    - pg@8.21.0
    - typescript@6.0.3
    - tsx@4.22.3
    - vitest
    - supertest
  patterns:
    - app/server split (factory function createApp() for testability)
    - Zod env schema with process.exit(1) on startup failure
    - Drizzle parameterized queries via eq/and/isNull helpers
    - bcrypt 12 rounds for passwords, 10 rounds for refresh token hashes
    - HS256 JWT with explicit algorithm pinning on both sign and verify
    - CSPRNG refresh tokens (40 bytes → 80-char hex, bcrypt hash stored only)
    - Validate middleware factory (safeParse, never parse)
    - Repository layer isolates DB queries from controllers
key_files:
  created:
    - docker-compose.yml
    - backend/package.json
    - backend/tsconfig.json
    - backend/.env.example
    - backend/.gitignore
    - backend/drizzle.config.ts
    - backend/vitest.config.ts
    - backend/src/server.ts
    - backend/src/app.ts
    - backend/src/config/env.ts
    - backend/src/db/schema/users.ts
    - backend/src/db/schema/index.ts
    - backend/src/db/connection.ts
    - backend/src/db/migrations/0000_initial_auth_schema.sql
    - backend/src/middleware/error.middleware.ts
    - backend/src/middleware/validate.middleware.ts
    - backend/src/services/auth.service.ts
    - backend/src/repositories/user.repo.ts
    - backend/src/repositories/token.repo.ts
    - backend/src/routes/schemas.ts
    - backend/src/routes/auth.routes.ts
    - backend/src/controllers/auth.controller.ts
    - backend/tests/setup.ts
    - backend/tests/auth.test.ts
  modified: []
decisions:
  - "app/server factory split: createApp() in app.ts; listen() only in server.ts — enables supertest without port binding"
  - "bcrypt rounds: 12 for user passwords (OWASP recommended), 10 for refresh token hashes (lower cost acceptable, token is already 80-char random)"
  - "Zod env validation: safeParse + process.exit(1) rather than parse() throw — gives clear console.error output before exit"
  - "validate middleware: safeParse (not parse) so validation errors are caught in middleware, not delegated to errorMiddleware"
  - "RESEND_API_KEY marked optional in Plan 01 — required when email service mounts in Plan 04"
  - "drizzle-kit generate + migrate workflow locked; push is never used (committed to git as migration file)"
metrics:
  duration_minutes: ~90
  completed_date: "2026-05-23"
  tasks_completed: 3
  tasks_total: 5
  files_created: 24
  files_modified: 0
---

# Phase 01 Plan 01: Walking Skeleton Backend Summary

**One-liner:** Express 5 + Drizzle ORM + Postgres 17 walking skeleton with bcrypt/HS256 auth, Zod env validation, and AUTH-01 register endpoint — Tasks 1-3 committed; Task 4 (migration + test run) blocked pending Docker group session refresh.

---

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Scaffold backend + Docker Postgres + Zod env | 88b7980 | docker-compose.yml, backend/package.json, backend/src/config/env.ts, backend/src/app.ts |
| 2 | Drizzle auth schema + migration + DB connection | 2d65b95 | backend/src/db/schema/users.ts, 0000_initial_auth_schema.sql, backend/src/db/connection.ts |
| 3 | Register endpoint + middleware + tests | 35afe2b | backend/src/controllers/auth.controller.ts, backend/src/services/auth.service.ts, backend/tests/auth.test.ts |

---

## Tasks Blocked (Awaiting Human Action)

**Task 4 [BLOCKING]:** Apply Drizzle migration + run AUTH-01 test suite

**Blocker:** The current shell session does not have the `docker` group active. The user `ps` is in `docker:x:1001:ps` in `/etc/group`, but the session was started before the group was added (or WSL needs to refresh group membership). Docker socket `/var/run/docker.sock` returns permission denied.

**Resolution:** Open a new WSL terminal (or run `newgrp docker` / log out and back in), then:

```bash
# From repo root — start Postgres
docker compose up -d
sleep 5
docker compose ps   # should show postgres healthy

# Apply migration
cd backend
npx drizzle-kit migrate

# Verify tables
docker compose exec -T postgres psql -U nourish -d nourish_db -c "\dt"

# Run AUTH-01 test suite
npx vitest run tests/auth.test.ts
```

**Task 5:** Human verification checkpoint (awaits Task 4 passing).

---

## Architecture Established

The Walking Skeleton vertical slice is fully implemented (code-complete, pending migration apply):

```
POST /api/auth/register
  → validate middleware (Zod RegisterSchema)
  → auth.controller.ts: register()
    → user.repo.ts: findByEmail() [Drizzle eq]
    → bcrypt.hash(password, 12)
    → user.repo.ts: create() [Drizzle insert + returning]
    → auth.service.ts: generateAccessToken() [HS256 JWT]
    → auth.service.ts: generateRefreshToken() [CSPRNG + bcrypt]
    → token.repo.ts: createRefreshToken() [Drizzle insert]
    → res.status(201).json({ accessToken, refreshToken })
  ← error.middleware.ts: ZodError→400, all others→500
```

---

## Security Controls Verified (code review)

| Threat ID | Control | Status |
|-----------|---------|--------|
| T-01-01 | JWT HS256 pinned on both sign and verify | Implemented in auth.service.ts |
| T-01-02 | Drizzle parameterized queries only | Implemented in all repos |
| T-01-03 | bcrypt 12 rounds for passwords | Implemented in auth.controller.ts |
| T-01-04 | Refresh token: only bcrypt hash stored | Implemented in auth.service.ts + token.repo.ts |
| T-01-05 | JWT secrets min 32 chars via Zod | Implemented in config/env.ts |
| T-01-06 | helmet() middleware | Implemented in app.ts |
| T-01-07 | CORS restricted to FRONTEND_URL | Implemented in app.ts |
| T-01-08 | Generic 500 responses (no internals) | Implemented in error.middleware.ts |

---

## Environment Friction Observed

1. **Docker group session issue:** User `ps` is in the `docker` group in `/etc/group` but the active shell session does not reflect this. The socket `/var/run/docker.sock` returns permission denied. A new terminal session or `newgrp docker` resolves this.

2. **JWT_ACCESS_SECRET source:** The `.env` file was generated with `openssl rand -hex 32` values during Task 1 scaffold. The exact command used: `openssl rand -hex 32` (produces 64-char hex, satisfies Zod's `min(32)` requirement).

---

## Contracts for Plans 02-04

These contracts are implemented and stable:

```typescript
// env.ts
export const env: { NODE_ENV, PORT, DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, RESEND_API_KEY?, RESEND_FROM_EMAIL, APP_BASE_URL, FRONTEND_URL }

// auth.service.ts
export function generateAccessToken(userId: string): string;           // HS256, 15m
export function generateRefreshToken(): { raw: string; hash: string }; // 80-char hex + bcrypt
export function verifyAccessToken(token: string): { sub: string };     // throws on invalid/expired
export function refreshTokenExpiry(): Date;                            // now + 30 days

// user.repo.ts
export async function findByEmail(email: string): Promise<User | null>;
export async function findById(id: string): Promise<User | null>;
export async function create(data: { email: string; passwordHash: string }): Promise<User>;

// token.repo.ts
export async function createRefreshToken(data: { userId, tokenHash, expiresAt }): Promise<RefreshToken>;
export async function findActiveByUser(userId: string): Promise<RefreshToken[]>;
export async function revokeById(id: string): Promise<void>;
```

Plans 02, 03, 04 may proceed against these contracts without further architectural negotiation.

---

## Deviations from Plan

None — plan executed exactly as written for Tasks 1-3. Task 4 blocked by Docker group session issue (not a code deviation — environment constraint).

---

## Known Stubs

None. All implemented code has real data sources. No placeholder text or hardcoded empty values in the code paths.

---

## Threat Flags

None — no new security surface beyond the plan's threat model.

---

## Self-Check: PARTIAL

**Files verified present:**
- docker-compose.yml: FOUND
- backend/src/config/env.ts: FOUND
- backend/src/db/schema/users.ts: FOUND
- backend/src/db/connection.ts: FOUND
- backend/src/db/migrations/0000_initial_auth_schema.sql: FOUND
- backend/src/services/auth.service.ts: FOUND
- backend/src/controllers/auth.controller.ts: FOUND
- backend/tests/auth.test.ts: FOUND

**Commits verified:**
- 88b7980 (Task 1): FOUND
- 2d65b95 (Task 2): FOUND
- 35afe2b (Task 3): FOUND

**Not verified (pending human action):**
- drizzle-kit migrate execution
- psql \dt showing 3 tables
- npx vitest run passing all 6 AUTH-01 tests
- Manual curl smoke test
