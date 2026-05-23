# Phase 1: Backend Foundation + Auth — Research

**Researched:** 2026-05-23
**Domain:** Node.js/Express + PostgreSQL + JWT auth (greenfield backend)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Store JWT tokens in Expo SecureStore (hardware-encrypted iOS Keychain / Android Keystore). Do NOT use AsyncStorage or MMKV for tokens.
- **D-02:** Access token lifetime: 15 minutes. Refresh token lifetime: 30 days. Axios interceptor handles silent refresh before expiry.
- **D-03:** Use Resend as the email provider (simple API, generous free tier 100/day, React Email templates).
- **D-04:** Password reset link expires in 1 hour. Single-use token stored in DB, invalidated on use.
- **D-05:** Phase 1 runs entirely local — Express + PostgreSQL on developer machine. No cloud deployment in this phase.
- **D-06:** PostgreSQL runs in Docker (`docker-compose.yml` with postgres service). Include `docker-compose.yml` in repo root.

### Claude's Discretion

- Database ORM: Drizzle recommended by research — planner chooses final approach.
- PostgreSQL schema design: idempotency keys, generic outbox table, pg_trgm indexes — planner implements per research ARCHITECTURE.md.
- API versioning, folder structure, error response format — standard Express patterns, planner decides.
- bcrypt rounds, JWT signing algorithm (HS256 vs RS256) — planner uses secure defaults.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email and password | `/api/auth/register` endpoint, bcryptjs hashing, Drizzle `users` table insert, Zod email/password validation |
| AUTH-02 | User can log in and stay logged in across app restarts | `/api/auth/login` returning access + refresh tokens; refresh token persisted in DB (hashed), mobile stores in Expo SecureStore |
| AUTH-03 | User can reset password via email link | Resend SDK + React Email template, `password_reset_tokens` table with 1-hour expiry + single-use flag, `/api/auth/forgot-password` + `/api/auth/reset-password` endpoints |
| AUTH-04 | User session persists on device until explicit logout | `/api/auth/logout` endpoint invalidates refresh token in DB; Expo SecureStore cleared client-side |
| SYNC-01 | All user data stored in Node.js/Express + PostgreSQL backend | Full schema: `users`, `user_profiles`, `foods`, `food_log`, `water_log`, `weight_log`, `workout_plans`, `workout_log`, `barcode_cache`, `sync_outbox` — all tables + indexes in Phase 1 migrations |
| SYNC-02 | App reads cached data offline; syncs pending writes when network reconnects (idempotent, no duplicates) | `sync_outbox` table with `idempotency_key` + `UNIQUE(user_id, idempotency_key)` on `food_log` — schema laid in Phase 1; full offline flush implemented in Phase 5 |
| SYNC-03 | Logging in on a new device restores all historical data | Server is source of truth; TanStack Query `refetchOnWindowFocus` fetches fresh data from PostgreSQL on any device login |
</phase_requirements>

---

## Summary

Phase 1 builds the Node.js/Express backend, PostgreSQL schema, and JWT auth system that every subsequent phase depends on. This is a backend-only phase — no mobile UI. The walking skeleton is: scaffolded Express app + Docker-composed PostgreSQL + one migration applied + one working auth endpoint (register → returns token) reachable at `http://localhost:3000/api/auth/register`.

The standard stack is well-settled: Express 4.x + Drizzle ORM 0.45.x + PostgreSQL 17 (Docker) + jsonwebtoken 9.x + bcryptjs 3.x + Resend 6.x + Zod 4.x. All packages have been version-verified against the npm registry. The key schema decisions — UUID PKs everywhere, denormalized calorie snapshots in `food_log`, `pg_trgm` GIN indexes for Thai food search, generic `sync_outbox` with idempotency keys — must be made now because they are expensive to retrofit after data exists.

The one environment blocker is Docker WSL2 integration: Docker Desktop 29.2.1 is installed on Windows but the WSL integration is not enabled, so `docker` and `docker-compose` are not available inside the WSL shell. This must be resolved before the database container can start. The fix is a settings toggle in Docker Desktop (no reinstall needed).

**Primary recommendation:** Scaffold backend first (TypeScript + Express + dotenv), then enable Docker WSL integration, then apply Drizzle migrations, then build auth endpoints in order: register → login → refresh → logout → forgot-password → reset-password.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User registration / password hashing | API / Backend | — | bcrypt must run server-side; never hash client-side |
| JWT token issuance | API / Backend | — | Signing requires the secret, which lives on the server |
| Refresh token storage (server copy) | Database / Storage | — | Hashed refresh token persisted in `refresh_tokens` table |
| Refresh token storage (device copy) | Mobile client (Expo SecureStore) | — | D-01 locked; hardware-backed keychain/keystore |
| Password reset token generation + email | API / Backend | External (Resend) | Token generated on backend, emailed via Resend API |
| PostgreSQL schema + migrations | Database / Storage | — | Drizzle Kit generates versioned SQL migration files |
| pg_trgm food search indexes | Database / Storage | API | Index defined in schema; query executed by Foods service |
| Idempotency key constraint | Database / Storage | API | `UNIQUE` constraint on DB; checked in controller on 409 |
| CORS for Expo dev client | API / Backend | — | Express `cors()` middleware, `http://localhost:8081` origin |

---

## Standard Stack

### Core (Backend)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | v24.15.0 (installed) | Runtime | LTS-class; installed on dev machine |
| TypeScript | 6.0.3 | Language | Non-negotiable; shared types with mobile later |
| Express | 5.2.1 | HTTP server | Current stable; vast middleware ecosystem |
| `pg` (node-postgres) | 8.21.0 | PostgreSQL driver | Required by Drizzle `drizzle-orm/node-postgres` adapter |
| Drizzle ORM | 0.45.2 | Database access + type-safe queries | Code-first TypeScript schema; 7.4kb; stays close to SQL |
| drizzle-kit | 0.31.10 | Migration generation + apply | `generate + migrate` workflow; versioned SQL files in git |
| `jsonwebtoken` | 9.0.3 | JWT sign / verify | Standard, well-audited |
| `bcryptjs` | 3.0.3 | Password hashing | bcrypt algorithm — correct choice for passwords |
| `zod` | 4.4.3 | Request body validation + env typing | Runtime safety; validated all API inputs |
| `resend` | 6.12.3 | Transactional email (password reset) | D-03 locked; free tier 100/day sufficient |
| `dotenv` | 17.4.2 | Environment variable loading | Standard; typed via Zod env schema |
| `helmet` | 8.2.0 | Security headers | One-line hardening; always on |
| `cors` | 2.8.6 | CORS for Expo dev client | Required for `http://localhost:8081` → `http://localhost:3000` |
| `morgan` | 1.10.1 | HTTP request logging | Development visibility |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/express` | 5.0.6 | TypeScript types for Express | Always — TypeScript project |
| `@types/pg` | 8.20.0 | TypeScript types for pg | Always — TypeScript project |
| `@types/jsonwebtoken` | 9.0.10 | TypeScript types for JWT | Always |
| `@types/bcryptjs` | 3.0.0 | TypeScript types for bcrypt | Always |
| `@types/morgan` | 1.10.1 (check) | TypeScript types for morgan | Dev dependency |
| `@types/cors` | latest | TypeScript types for cors | Dev dependency |
| `tsx` | 4.22.3 | Run TypeScript directly (dev) | `tsx watch src/server.ts` for dev server |
| `@react-email/components` | 1.0.12 | Pre-built email UI components | Password reset email template (D-03) |
| `@react-email/render` | 2.0.8 | Render React Email to HTML string | Convert template to HTML before Resend call |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma v7 | Prisma is ~1.6MB vs Drizzle's 7.4kb; Drizzle's SQL-proximity is better for the aggregation queries coming in Phase 3+ |
| bcryptjs | argon2 | argon2 is technically stronger but requires native compilation; bcryptjs is pure JS, zero native build issues |
| Resend | Nodemailer + SMTP | Nodemailer needs an SMTP server; Resend has zero infra, one API call (D-03 locked) |
| `tsx` | `ts-node` | `tsx` is faster, uses esbuild, better ESM support |
| `dotenv` + Zod | `envalid` | Zod already in stack; no reason to add another validator |

### Installation

```bash
# In backend/ directory
npm init -y
npm install express pg drizzle-orm jsonwebtoken bcryptjs zod resend dotenv helmet cors morgan @react-email/components @react-email/render
npm install --save-dev typescript tsx @types/express @types/pg @types/jsonwebtoken @types/bcryptjs @types/morgan @types/cors @types/node drizzle-kit
```

### Version verification
Versions above verified against npm registry on 2026-05-23:
- `express`: 5.2.1 — `npm view express version`
- `drizzle-orm`: 0.45.2 — `npm view drizzle-orm version`
- `drizzle-kit`: 0.31.10 — `npm view drizzle-kit version`
- `jsonwebtoken`: 9.0.3 — `npm view jsonwebtoken version`
- `bcryptjs`: 3.0.3 — `npm view bcryptjs version`
- `zod`: 4.4.3 — `npm view zod version`
- `resend`: 6.12.3 — `npm view resend version`
- `pg`: 8.21.0 — `npm view pg version`
- `dotenv`: 17.4.2 — `npm view dotenv version`
- `@react-email/components`: 1.0.12 — `npm view @react-email/components version`
- `tsx`: 4.22.3 — `npm view tsx version`

---

## Architecture Patterns

### System Architecture Diagram

```
[Expo Mobile App]
        |
        | HTTP (JWT Bearer)
        v
[Express API :3000]
  /api/auth/register  ──── bcryptjs.hash() ──► [PostgreSQL: users]
  /api/auth/login     ──── jwt.sign() ────────► [PostgreSQL: refresh_tokens]
  /api/auth/refresh   ──── jwt.verify() ───────► [PostgreSQL: refresh_tokens]
  /api/auth/logout    ──── token invalidate ───► [PostgreSQL: refresh_tokens]
  /api/auth/forgot-password ──► [Resend API] ──► [User's email inbox]
                              └──────────────► [PostgreSQL: password_reset_tokens]
  /api/auth/reset-password ──► token lookup ──► [PostgreSQL: users] (update password_hash)
        |
        | (protected routes, all other phases)
        v
[PostgreSQL 17 (Docker)]
  users, user_profiles, foods, food_log,
  water_log, weight_log, workout_plans,
  workout_log, barcode_cache, sync_outbox
  + pg_trgm extension (GIN indexes on foods.name_en, foods.name_th)
```

### Recommended Project Structure

```
backend/
  src/
    routes/
      auth.routes.ts
    controllers/
      auth.controller.ts
    services/
      auth.service.ts        # JWT generation, bcrypt, token rotation
      email.service.ts       # Resend client + React Email rendering
    repositories/
      user.repo.ts
      token.repo.ts
    middleware/
      auth.middleware.ts     # verifyAccessToken — used on all protected routes
      error.middleware.ts    # global Express error handler
      validate.middleware.ts # Zod schema validation factory
    db/
      connection.ts          # drizzle() setup with pg Pool
      schema/
        users.ts
        foods.ts
        food-log.ts
        water-log.ts
        weight-log.ts
        workouts.ts
        sync-outbox.ts
        password-reset-tokens.ts
        refresh-tokens.ts
      migrations/            # generated by drizzle-kit (committed to git)
      seeds/
        thai-foods.ts        # port from nutrition_tracker.html in Phase 2
    config/
      env.ts                 # Zod-validated env schema; fail-fast on startup
    app.ts                   # Express app factory (no listen())
    server.ts                # server.listen() — imports app
  drizzle.config.ts
  tsconfig.json
  package.json
  .env.example
docker-compose.yml           # repo root (D-06)
```

### Pattern 1: Drizzle Schema Definition with UUID PKs

```typescript
// Source: https://context7.com/drizzle-team/drizzle-orm/llms.txt
// backend/src/db/schema/users.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').notNull(),   // bcrypt hash of the raw token
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),  // null = active
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').notNull(),   // bcrypt hash of the raw token in the email link
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),  // now() + 1 hour (D-04)
  usedAt: timestamp('used_at', { withTimezone: true }),  // null = unused; set on use, then reject
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Pattern 2: Drizzle Connection Setup

```typescript
// Source: https://context7.com/drizzle-team/drizzle-orm/llms.txt
// backend/src/db/connection.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '../config/env';

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema, logger: env.NODE_ENV === 'development' });
```

### Pattern 3: Drizzle Migration Workflow

```typescript
// Source: https://context7.com/drizzle-team/drizzle-orm/llms.txt
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

```bash
# Generate migration SQL (run after schema changes)
npx drizzle-kit generate

# Apply migrations to the database
npx drizzle-kit migrate
```

Never use `drizzle-kit push` — it bypasses the migration file trail. [CITED: CLAUDE.md stack constraints]

### Pattern 4: GIN Index for pg_trgm Food Search

```typescript
// Source: https://context7.com/drizzle-team/drizzle-orm/llms.txt (index().using() pattern)
// backend/src/db/schema/foods.ts
import { pgTable, uuid, text, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const foods = pgTable('foods', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameEn: text('name_en').notNull(),
  nameTh: text('name_th'),
  // ... other columns
}, (table) => ({
  nameEnTrgm: index('foods_name_en_trgm').using('gin', sql`${table.nameEn} gin_trgm_ops`),
  nameThTrgm: index('foods_name_th_trgm').using('gin', sql`${table.nameTh} gin_trgm_ops`),
}));
```

The `pg_trgm` extension must be enabled before migration runs:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```
This should be the first migration file. [ASSUMED — standard PostgreSQL extension activation pattern]

### Pattern 5: JWT Auth — Access + Refresh Token Rotation

```typescript
// Source: [ASSUMED] — standard jsonwebtoken pattern; aligns with CLAUDE.md auth spec
// backend/src/services/auth.service.ts

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ACCESS_TOKEN_EXPIRY = '15m';     // D-02
const REFRESH_TOKEN_EXPIRY = '30d';   // D-02 (CONTEXT.md override — 30 days, not CLAUDE.md's 7 days)

export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' });
}

export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(40).toString('hex');  // 80-char hex string
  const hash = bcrypt.hashSync(raw, 10);               // store hash in DB
  return { raw, hash };
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
}
```

**Token storage split:**
- Access token: returned in response body → stored in Zustand memory (mobile) — lost on app kill, fine
- Refresh token: returned in response body → stored in Expo SecureStore (mobile) — D-01 locked
- Refresh token hash: stored in `refresh_tokens` table → verified on `/api/auth/refresh`

**Rotation on refresh:** Every `/api/auth/refresh` call invalidates the presented token (`revokedAt = now()`) and issues a new pair.

### Pattern 6: Resend Email (Password Reset)

```typescript
// Source: https://resend.com/docs/llms-full.txt
// backend/src/services/email.service.ts

import { Resend } from 'resend';
import { render } from '@react-email/render';
import { PasswordResetEmail } from '../emails/PasswordResetEmail';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = await render(PasswordResetEmail({ resetUrl }));
  const { error } = await resend.emails.send({
    from: 'Nourish <noreply@yourdomain.com>',
    to,
    subject: 'Reset your Nourish password',
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
```

Password reset token is a `crypto.randomBytes(32).toString('hex')` value. The raw token goes into the URL link; a bcrypt hash is stored in the database. On reset, the submitted raw token is compared against the hash using `bcrypt.compare()`. [ASSUMED — standard secure token pattern]

### Pattern 7: Zod Environment Validation (fail-fast)

```typescript
// Source: [ASSUMED] — standard Zod env pattern for Express apps
// backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().startsWith('re_'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:8081'), // Expo dev client
});

export const env = envSchema.parse(process.env);
// Throws on startup if any required env var is missing — never fails silently at runtime
```

### Pattern 8: Auth Middleware

```typescript
// Source: [ASSUMED] — standard JWT verification middleware pattern
// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    res.locals.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Access token expired or invalid' });
  }
}
```

### Pattern 9: docker-compose.yml (D-06)

```yaml
# docker-compose.yml (repo root)
# Source: [ASSUMED] — standard docker-compose PostgreSQL pattern
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: nourish
      POSTGRES_PASSWORD: nourish_dev
      POSTGRES_DB: nourish_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Anti-Patterns to Avoid

- **Storing raw refresh tokens in the database:** Store only the bcrypt hash. If the DB is compromised, raw tokens cannot be used without the hash.
- **Using `drizzle-kit push` in any environment:** It skips migration files; use `generate + migrate` only.
- **Calling `bcrypt.hashSync` inside a route handler:** Use `bcrypt.hash` (async) in service layer — sync blocks the Node.js event loop.
- **Returning 404 for "email not found" in forgot-password:** Always return 200 ("If that email exists, a reset link has been sent") to prevent email enumeration.
- **Setting `expiresIn` only on the JWT and not checking DB `revokedAt`:** Access tokens are self-contained and expire automatically. Refresh tokens require a DB lookup for revocation — do not rely on the token's own expiry alone.
- **Putting JWT secrets in code:** Always from env vars, always validated via Zod on startup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `bcryptjs` | bcrypt is peer-reviewed, intentionally slow; hand-rolled hashing is trivially broken |
| JWT signing / verification | Custom token format | `jsonwebtoken` | Timing attacks, algorithm confusion attacks, key confusion — JWT spec is subtle |
| Transactional email | SMTP server setup | Resend SDK (D-03 locked) | Deliverability, SPF/DKIM, free tier — zero infra |
| Input validation | Manual type checks | Zod schemas | Edge cases in email/URL/numeric validation are endless |
| Database migrations | Manual SQL files | drizzle-kit generate + migrate | Versioned, reversible, TypeScript-schema-derived |
| UUID generation | `Math.random()` | `uuid('id').defaultRandom()` (Drizzle) or `crypto.randomUUID()` | Math.random is not cryptographically random |
| Crypto tokens (password reset) | Custom token scheme | `crypto.randomBytes(32).toString('hex')` | Node built-in CSPRNG; no dependency needed |
| Security headers | Manual `res.set()` calls | `helmet` | 15+ headers configured correctly in one line |

**Key insight:** In auth, every hand-rolled component is a potential CVE. Use audited libraries for the cryptographic primitives and focus custom code only on the business logic (token storage design, rotation policy, reset flow UX).

---

## Common Pitfalls

### Pitfall 1: JWT Expiry Breaks Offline Sync Flush
**What goes wrong:** Mobile app has queued offline mutations. Access token expired while app was backgrounded. Outbox flush fires, gets 401, fails silently. Sync queue never clears. [CITED: .planning/research/PITFALLS.md Pitfall 7]
**Why it happens:** Refresh token logic runs only on user-initiated actions, not on outbox flush.
**How to avoid:** In Phase 1, implement the Axios interceptor on the mobile side that catches 401 → calls `/api/auth/refresh` → retries original request once. Before any outbox flush (Phase 5), check `jwt.decode(token).exp` against `Date.now()` and proactively refresh if within 60 seconds of expiry.
**Warning signs:** Sync fails with 401 after leaving the app for > 15 minutes.

### Pitfall 2: Refresh Token Not Hashed in Database
**What goes wrong:** PostgreSQL is backed up or read by a DBA. Plaintext refresh tokens in the DB can be used to impersonate the user.
**Why it happens:** Developer stores the raw token for easier comparison.
**How to avoid:** Store `bcrypt.hash(rawToken, 10)` in `refresh_tokens.token_hash`. On verification, use `bcrypt.compare(submitted, storedHash)`. Raw token only ever exists in memory and in the mobile's SecureStore.
**Warning signs:** `refresh_tokens` table has a column that looks like a hex string or UUID (not a bcrypt hash starting with `$2b$`).

### Pitfall 3: N+1 Query on History Aggregation
**What goes wrong:** History/trends endpoint (Phase 3+) fetches each day separately — 30 queries for a 30-day view. [CITED: .planning/research/PITFALLS.md Pitfall 13]
**Why it happens:** Repository method written to fetch by day, called in a loop.
**How to avoid:** Define the aggregation queries in Phase 1 schema design:
```sql
SELECT log_date, SUM(calories), SUM(protein_g), SUM(carbs_g), SUM(fat_g)
FROM food_log
WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
GROUP BY log_date ORDER BY log_date;
```
Add `CREATE INDEX food_log_user_date ON food_log (user_id, log_date)` in the Phase 1 migration.
**Warning signs:** Repository has a `getByDate(date)` function called in a `for` loop.

### Pitfall 4: Docker WSL2 Integration Not Enabled
**What goes wrong:** `docker-compose up` fails with "command not found" inside WSL shell. PostgreSQL container never starts. All subsequent development is blocked.
**Why it happens:** Docker Desktop is installed on Windows but WSL integration is off by default for non-default distros.
**How to avoid:** Before any backend work: Open Docker Desktop → Settings → Resources → WSL Integration → enable for the active distro. Verify with `docker --version` in WSL terminal. [VERIFIED: environment probe — docker not found in WSL, Docker Desktop 29.2.1 installed on Windows]
**Warning signs:** `docker: command not found` in WSL bash.

### Pitfall 5: Email Enumeration via Forgot-Password Response
**What goes wrong:** `/api/auth/forgot-password` returns 404 when email is not registered. Attacker can enumerate valid user emails.
**Why it happens:** Developer returns the "honest" error.
**How to avoid:** Always return HTTP 200 with message "If that email address is registered, a reset link has been sent." Perform the DB lookup anyway (to avoid timing side channels), but always return the same response body.
**Warning signs:** Postman test on a non-existent email returns a different response than a valid email.

### Pitfall 6: Password Reset Token Reuse
**What goes wrong:** User clicks a reset link twice (e.g., browser back button). The token is still valid and resets the password a second time, potentially to a different value if the form pre-fills. [CITED: CONTEXT.md D-04]
**Why it happens:** Token is not marked as used after first successful use.
**How to avoid:** On successful password reset: (1) update `password_reset_tokens.used_at = NOW()`, (2) atomically update `users.password_hash`. On token lookup, reject any token where `used_at IS NOT NULL` or `expires_at < NOW()`.
**Warning signs:** Same reset URL works twice.

---

## Code Examples

### Register Endpoint (complete flow)

```typescript
// Source: [ASSUMED] — standard Express + Drizzle + bcrypt pattern
// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const body = RegisterSchema.parse(req.body);            // Zod validation — throws 400 on failure
  const existing = await userRepo.findByEmail(body.email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const passwordHash = await bcrypt.hash(body.password, 12);  // 12 rounds — good balance
  const user = await userRepo.create({ email: body.email, passwordHash });
  await userProfileRepo.create({ userId: user.id });          // empty profile row
  const accessToken = generateAccessToken(user.id);
  const { raw, hash } = generateRefreshToken();
  await tokenRepo.createRefreshToken({ userId: user.id, tokenHash: hash, expiresAt: addDays(30) });
  res.status(201).json({ accessToken, refreshToken: raw });
}
```

### Drizzle Query Example (login)

```typescript
// Source: https://context7.com/drizzle-team/drizzle-orm/llms.txt
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { users } from '../db/schema/users';

export async function findByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}
```

---

## Walking Skeleton

The thinnest end-to-end slice for this phase:

1. `backend/` directory with `tsconfig.json`, `package.json`, `src/server.ts`
2. `docker-compose.yml` in repo root with `postgres:17-alpine` service
3. `drizzle.config.ts` pointing at `src/db/schema`
4. One migration file: `0000_initial_schema.sql` (all tables + pg_trgm extension + indexes)
5. `src/db/connection.ts` — Drizzle pool setup
6. `POST /api/auth/register` endpoint — validates body, hashes password, inserts user, returns access + refresh tokens
7. `src/config/env.ts` — Zod env schema; app refuses to start if `DATABASE_URL` or `JWT_ACCESS_SECRET` missing
8. `curl -X POST http://localhost:3000/api/auth/register -d '{"email":"test@test.com","password":"hunter2"}' -H 'Content-Type: application/json'` returns `{ accessToken, refreshToken }`

A working `/register` endpoint backed by a real PostgreSQL insert proves: Node runs, Docker runs, Drizzle connects, migrations applied, auth logic executes. Every other endpoint is the same pattern.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ts-node` for dev server | `tsx` (esbuild-based) | 2023 | 3-5x faster startup; better ESM support |
| `express@4` | `express@5` (5.2.1) | 2024 stable | Async error handling built-in; no need for `express-async-errors` wrapper |
| Prisma for ORM | Drizzle ORM | 2023-2024 | Smaller bundle, SQL-close, faster cold starts |
| `crypto.randomUUID()` only in Node 15+ | Available in Node 14.17+ | 2021 | Safe to use directly; no `uuid` npm package needed |
| bcrypt (native) | bcryptjs (pure JS) | N/A | No native compilation issues in Docker or CI |
| `react-email` v1.x | `@react-email/components` + `@react-email/render` split | 2024 | Package split; use components for templates, render for HTML conversion |

**Deprecated/outdated:**
- `express-async-errors`: Express 5 handles async errors natively — no longer needed [ASSUMED — verify Express 5 async error behavior]
- `sequelize` / `typeorm`: Both are legacy choices for new TypeScript projects — use Drizzle
- `passport.js` for JWT: Unnecessary abstraction for a simple single-user app — hand-write the middleware

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pg_trgm extension activation belongs in the first migration file as `CREATE EXTENSION IF NOT EXISTS pg_trgm` | Architecture Patterns, Pattern 1 | Migrations fail or trgm indexes can't be created; trivially fixed |
| A2 | Password reset raw token is `crypto.randomBytes(32).toString('hex')`; hash stored via bcrypt | Architecture Patterns, Pattern 6 | Any secure CSPRNG approach works; exact implementation is discretionary |
| A3 | Express 5 async error handling makes `express-async-errors` unnecessary | State of the Art | If planner uses Express 4 instead of 5, would need the wrapper; check Express 5 migration guide |
| A4 | `docker-compose.yml` at repo root with `postgres:17-alpine` image is sufficient for dev | Pattern 9 | Alternative: use local PostgreSQL install instead of Docker; D-06 locks Docker |
| A5 | Refresh token verification uses `bcrypt.compare()` (full hash comparison, not DB lookup by token value) | Pattern 5 | Correct approach; no index on `token_hash` needed for lookup since `userId` is always known |
| A6 | 12 bcrypt rounds is the right balance for registration (not 10 or 14) | Code Examples | 10 rounds is OWASP minimum; 12 is ~300ms on modern hardware — acceptable |

---

## Open Questions (RESOLVED)

1. **Express 4 vs Express 5**
   - What we know: Express 5.2.1 is the current npm `latest` tag; Express 4 is still widely documented
   - What's unclear: Whether any commonly-used middleware (morgan, helmet, cors) has breaking changes with Express 5's new router behavior
   - Recommendation: Use Express 5 (already at `latest`); if any middleware incompatibility appears, `npm install express@4` is a one-command rollback

2. **Zod 4.x API changes from Zod 3.x**
   - What we know: Zod 4.4.3 is current `latest`; CLAUDE.md recommends `^3.x`
   - What's unclear: Whether there are breaking API changes from Zod 3 to Zod 4 that affect common patterns (`z.object`, `z.string`, `z.parse`)
   - Recommendation: Use Zod 4.4.3; core API (`z.object`, `.parse`, `.safeParse`) is stable across versions; verify `@react-email` peer deps don't pin Zod 3

3. **Resend domain verification for local dev**
   - What we know: Resend requires a verified sender domain for production; offers `onboarding@resend.dev` for testing
   - What's unclear: Whether `onboarding@resend.dev` can be used as the `from` address in dev without domain setup
   - Recommendation: Use `onboarding@resend.dev` as `from` in dev; document in `.env.example` that `RESEND_FROM_EMAIL` must be updated for production

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | Yes | v24.15.0 | — |
| npm | Package management | Yes | 11.12.1 | — |
| Docker Desktop | PostgreSQL container (D-06) | Yes (Windows) | 29.2.1 | Local PostgreSQL install |
| Docker in WSL | `docker-compose up` from WSL | No | — | Enable WSL integration in Docker Desktop settings |
| PostgreSQL client (`psql`) | DB inspection / debugging | No | — | Use Drizzle Studio (`npx drizzle-kit studio`) |
| TypeScript | Language | Yes (via npm) | 6.0.3 | — |

**Missing dependencies with no fallback:**
- None that are truly blocking.

**Missing dependencies with fallback:**
- **Docker in WSL:** Docker Desktop 29.2.1 is installed on Windows. Fix: Docker Desktop → Settings → Resources → WSL Integration → enable for active distro. Alternative: install PostgreSQL directly via `sudo apt install postgresql-17` in WSL (no Docker needed, but D-06 specifies docker-compose).
- **`psql` client:** Not installed in WSL. Use `npx drizzle-kit studio` for visual DB inspection, or connect via any GUI (TablePlus, DBeaver on Windows connecting to `localhost:5432`).

**First action before writing any code:** Verify Docker WSL integration is working with `docker --version && docker-compose --version` in the WSL terminal. If not resolved, the PostgreSQL container cannot start.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 must install |
| Recommended | Vitest (fast, TypeScript-native, no config needed) |
| Config file | `vitest.config.ts` — Wave 0 task |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Register with valid email + password returns 201 + tokens | Integration | `npx vitest run tests/auth.test.ts -t "register"` | Wave 0 |
| AUTH-01 | Register with duplicate email returns 409 | Integration | `npx vitest run tests/auth.test.ts -t "duplicate email"` | Wave 0 |
| AUTH-01 | Register with invalid email returns 400 | Unit | `npx vitest run tests/auth.test.ts -t "invalid email"` | Wave 0 |
| AUTH-02 | Login with valid credentials returns access + refresh tokens | Integration | `npx vitest run tests/auth.test.ts -t "login success"` | Wave 0 |
| AUTH-02 | Login with wrong password returns 401 | Integration | `npx vitest run tests/auth.test.ts -t "login wrong password"` | Wave 0 |
| AUTH-02 | Refresh token exchange returns new access token | Integration | `npx vitest run tests/auth.test.ts -t "refresh token"` | Wave 0 |
| AUTH-03 | Forgot-password always returns 200 regardless of email existence | Integration | `npx vitest run tests/auth.test.ts -t "forgot password"` | Wave 0 |
| AUTH-03 | Reset-password with valid token updates password hash | Integration | `npx vitest run tests/auth.test.ts -t "reset password"` | Wave 0 |
| AUTH-03 | Reset-password with expired token returns 400 | Integration | `npx vitest run tests/auth.test.ts -t "expired token"` | Wave 0 |
| AUTH-04 | Logout invalidates refresh token in DB | Integration | `npx vitest run tests/auth.test.ts -t "logout"` | Wave 0 |
| SYNC-01 | All schema tables exist after migrations | Smoke | `npx vitest run tests/schema.test.ts` | Wave 0 |
| SYNC-02 | food_log has UNIQUE constraint on (user_id, idempotency_key) | Smoke | `npx vitest run tests/schema.test.ts -t "idempotency"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/auth.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/auth.test.ts` — covers AUTH-01 through AUTH-04
- [ ] `backend/tests/schema.test.ts` — covers SYNC-01, SYNC-02 (table existence + constraint checks)
- [ ] `backend/vitest.config.ts` — test framework configuration
- [ ] Framework install: `npm install --save-dev vitest` in backend/

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | bcryptjs (12 rounds), Zod validation on all auth inputs, no email enumeration |
| V3 Session Management | Yes | JWT access 15min (D-02), refresh 30 days stored in DB as hash, rotation on each use, revocation via `revokedAt` |
| V4 Access Control | Yes | `requireAuth` middleware on all non-auth routes; `res.locals.userId` used for all queries (no cross-user data access possible) |
| V5 Input Validation | Yes | Zod on all request bodies; env validated at startup |
| V6 Cryptography | Yes | `bcryptjs` for passwords + refresh token hashes; `crypto.randomBytes()` for reset tokens; `jsonwebtoken` HS256 for JWTs |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via food search | Tampering | Drizzle parameterized queries — never raw string interpolation |
| JWT algorithm confusion (alg:none) | Spoofing | `jsonwebtoken.verify()` with explicit algorithm list; reject tokens with `alg: none` |
| Refresh token theft from DB | Elevation of privilege | Store only bcrypt hash; raw token never persisted |
| Email enumeration via forgot-password | Information disclosure | Always return HTTP 200 regardless of email existence |
| Brute-force on login | Denial of service / Spoofing | Rate limiting per IP on `/api/auth/login` (use `express-rate-limit`) — add in Phase 1 |
| Password reset token replay | Elevation of privilege | Single-use: `used_at` timestamp set on first use; check `used_at IS NULL` before accepting |
| Weak secrets in `.env` | Spoofing | Zod validates `JWT_ACCESS_SECRET.min(32)` at startup — rejects weak secrets before first request |

---

## Sources

### Primary (HIGH confidence)
- `/drizzle-team/drizzle-orm` (Context7) — schema definition, connection setup, migration workflow, index patterns
- `https://resend.com/docs/llms-full.txt` (Context7 via `/llmstxt/resend_llms-full_txt`) — Node.js SDK usage, React Email integration
- npm registry (verified 2026-05-23) — all package versions in Standard Stack table

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — PostgreSQL schema outline, Express folder structure, auth token flow
- `.planning/research/PITFALLS.md` — JWT expiry sync pitfall, N+1 query pattern, email enumeration
- `.planning/research/SUMMARY.md` — stack recommendations and build order rationale
- CLAUDE.md project stack — locked technology choices

### Tertiary (LOW confidence — needs validation during implementation)
- Express 5 async error handling behavior — assumed based on Express 5 release notes; verify in practice
- Zod 4 API compatibility with Zod 3 patterns — assumed stable; verify `@react-email` peer dep compatibility

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all versions verified against npm registry
- Architecture: HIGH — direct continuation of project ARCHITECTURE.md; well-documented patterns
- Pitfalls: HIGH — backed by PITFALLS.md research + environment probe (Docker WSL gap verified)
- Walking Skeleton: HIGH — straightforward Express + Drizzle bootstrap, no experimental dependencies

**Research date:** 2026-05-23
**Valid until:** 2026-06-23 (stable stack — 30-day validity)
