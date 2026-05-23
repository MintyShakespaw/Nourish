# Phase 1: Backend Foundation + Auth — Pattern Map

**Mapped:** 2026-05-23
**Files analyzed:** 22 new files (greenfield — no existing backend)
**Analogs found:** 0 / 22 from codebase (all patterns sourced from RESEARCH.md)

---

## Greenfield Notice

No backend code exists in this repository. The only existing file is `nutrition_tracker.html`
(a single-file prototype), which is the source-of-truth for Thai food data and TDEE logic to be
ported in Phase 2. It has no backend patterns to extract.

**All pattern assignments reference concrete excerpts from RESEARCH.md Patterns 1–9 and Code
Examples section.** Line numbers reference `01-RESEARCH.md` in this phase directory.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `backend/src/server.ts` | config | request-response | RESEARCH.md Walking Skeleton | research-only |
| `backend/src/app.ts` | config | request-response | RESEARCH.md Walking Skeleton | research-only |
| `backend/src/config/env.ts` | config | — | RESEARCH.md Pattern 7 | research-only |
| `backend/src/db/connection.ts` | config | — | RESEARCH.md Pattern 2 | research-only |
| `backend/src/db/schema/users.ts` | model | CRUD | RESEARCH.md Pattern 1 | research-only |
| `backend/src/db/schema/foods.ts` | model | CRUD | RESEARCH.md Pattern 4 | research-only |
| `backend/src/db/schema/food-log.ts` | model | CRUD | RESEARCH.md Pattern 1 (table structure) | research-only |
| `backend/src/db/schema/water-log.ts` | model | CRUD | RESEARCH.md Pattern 1 (table structure) | research-only |
| `backend/src/db/schema/weight-log.ts` | model | CRUD | RESEARCH.md Pattern 1 (table structure) | research-only |
| `backend/src/db/schema/workouts.ts` | model | CRUD | RESEARCH.md Pattern 1 (table structure) | research-only |
| `backend/src/db/schema/sync-outbox.ts` | model | event-driven | RESEARCH.md Pattern 1 (table structure) | research-only |
| `backend/src/db/schema/refresh-tokens.ts` | model | request-response | RESEARCH.md Pattern 1 | research-only |
| `backend/src/db/schema/password-reset-tokens.ts` | model | request-response | RESEARCH.md Pattern 1 | research-only |
| `backend/drizzle.config.ts` | config | — | RESEARCH.md Pattern 3 | research-only |
| `backend/src/routes/auth.routes.ts` | route | request-response | RESEARCH.md Architecture Patterns | research-only |
| `backend/src/controllers/auth.controller.ts` | controller | request-response | RESEARCH.md Code Examples | research-only |
| `backend/src/services/auth.service.ts` | service | request-response | RESEARCH.md Pattern 5 | research-only |
| `backend/src/services/email.service.ts` | service | request-response | RESEARCH.md Pattern 6 | research-only |
| `backend/src/repositories/user.repo.ts` | repository | CRUD | RESEARCH.md Code Examples (Drizzle Query) | research-only |
| `backend/src/repositories/token.repo.ts` | repository | CRUD | RESEARCH.md Pattern 1 + Code Examples | research-only |
| `backend/src/middleware/auth.middleware.ts` | middleware | request-response | RESEARCH.md Pattern 8 | research-only |
| `backend/src/middleware/error.middleware.ts` | middleware | request-response | RESEARCH.md Architecture Patterns | research-only |
| `backend/src/middleware/validate.middleware.ts` | middleware | request-response | RESEARCH.md Pattern 7 (Zod approach) | research-only |
| `backend/src/emails/PasswordResetEmail.tsx` | component | — | RESEARCH.md Pattern 6 | research-only |
| `docker-compose.yml` | config | — | RESEARCH.md Pattern 9 | research-only |
| `backend/tests/auth.test.ts` | test | request-response | RESEARCH.md Validation Architecture | research-only |
| `backend/tests/schema.test.ts` | test | CRUD | RESEARCH.md Validation Architecture | research-only |
| `backend/vitest.config.ts` | config | — | RESEARCH.md Validation Architecture | research-only |

---

## Pattern Assignments

### `backend/src/config/env.ts` (config)

**Source:** RESEARCH.md Pattern 7 (lines 379–397)

**Core pattern — Zod env schema with fail-fast startup:**
```typescript
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

**Rule:** This file is imported first by `app.ts`. If it throws, the server does not start.
`JWT_ACCESS_SECRET.min(32)` ensures weak secrets are rejected before the first request
(see RESEARCH.md Security Domain, "Weak secrets in .env" threat row).

---

### `backend/src/db/connection.ts` (config)

**Source:** RESEARCH.md Pattern 2 (lines 254–263)

**Core pattern — Drizzle + pg Pool:**
```typescript
// backend/src/db/connection.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '../config/env';

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema, logger: env.NODE_ENV === 'development' });
```

**Rule:** Import `env` (not `process.env` directly) so the Zod validation has already run.
`logger: env.NODE_ENV === 'development'` prints SQL to stdout in dev — remove or gate in prod.

---

### `backend/src/db/schema/users.ts` (model, CRUD)

**Source:** RESEARCH.md Pattern 1 (lines 221–249) + ARCHITECTURE.md PostgreSQL Schema Outline

**Core pattern — UUID PK + all auth-related tables in one file:**
```typescript
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
  tokenHash: text('token_hash').notNull(),   // bcrypt hash — NEVER store raw token
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),  // null = active
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),  // now() + 1 hour (D-04)
  usedAt: timestamp('used_at', { withTimezone: true }),  // null = unused
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Rules:**
- All PKs are `uuid().primaryKey().defaultRandom()` — no serial/integer PKs.
- `withTimezone: true` on every timestamp — PostgreSQL stores in UTC, reads in any tz.
- `tokenHash` columns store bcrypt output (`$2b$...`), never raw tokens (RESEARCH.md Pitfall 2).

---

### `backend/src/db/schema/foods.ts` (model, CRUD)

**Source:** RESEARCH.md Pattern 4 (lines 293–307) + ARCHITECTURE.md `foods` table schema

**Core pattern — GIN index for Thai trigram search:**
```typescript
// backend/src/db/schema/foods.ts
import { pgTable, uuid, text, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const foods = pgTable('foods', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameEn: text('name_en').notNull(),
  nameTh: text('name_th'),                    // Thai name — critical for daily use
  brand: text('brand'),
  caloriesPer100g: numeric('calories_per_100g', { precision: 7, scale: 2 }).notNull(),
  proteinPer100g: numeric('protein_per_100g', { precision: 7, scale: 2 }).default('0'),
  carbsPer100g: numeric('carbs_per_100g', { precision: 7, scale: 2 }).default('0'),
  fatPer100g: numeric('fat_per_100g', { precision: 7, scale: 2 }).default('0'),
  fiberPer100g: numeric('fiber_per_100g', { precision: 7, scale: 2 }).default('0'),
  sodiumPer100mg: numeric('sodium_per_100mg', { precision: 7, scale: 2 }).default('0'),
  category: text('category'),
  source: text('source').default('manual'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nameEnTrgm: index('foods_name_en_trgm').using('gin', sql`${table.nameEn} gin_trgm_ops`),
  nameThTrgm: index('foods_name_th_trgm').using('gin', sql`${table.nameTh} gin_trgm_ops`),
}));
```

**Rule:** The `pg_trgm` extension must be activated in the first migration file before this
index can be created:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```
This is Assumption A1 in RESEARCH.md — put it at the top of `0000_initial_schema.sql`.

---

### `backend/src/db/schema/food-log.ts` (model, CRUD)

**Source:** ARCHITECTURE.md `food_log` schema outline + RESEARCH.md Pattern 1 (UUID/timestamp conventions)

**Core pattern — denormalized macro snapshot + idempotency key:**
```typescript
// backend/src/db/schema/food-log.ts
import { pgTable, uuid, text, numeric, date, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { foods } from './foods';

export const foodLog = pgTable('food_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  foodId: uuid('food_id').references(() => foods.id),
  logDate: date('log_date').notNull(),
  mealType: text('meal_type').notNull(),   // breakfast|lunch|dinner|snack
  quantityG: numeric('quantity_g', { precision: 7, scale: 2 }).notNull(),
  // Denormalized snapshot — food values may change but log must reflect time of logging
  calories: numeric('calories', { precision: 7, scale: 2 }).notNull(),
  proteinG: numeric('protein_g', { precision: 7, scale: 2 }).default('0'),
  carbsG: numeric('carbs_g', { precision: 7, scale: 2 }).default('0'),
  fatG: numeric('fat_g', { precision: 7, scale: 2 }).default('0'),
  source: text('source').default('manual'),   // manual|barcode|photo_ai
  notes: text('notes'),
  idempotencyKey: text('idempotency_key'),    // SYNC-02: offline dedup
  loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userDateIdx: index('food_log_user_date').on(table.userId, table.logDate),
  // SYNC-02: UNIQUE constraint prevents duplicate offline writes
  idempotencyUnique: unique('food_log_user_idempotency').on(table.userId, table.idempotencyKey),
}));
```

**Rule:** The `(user_id, idempotency_key)` unique constraint is required for SYNC-02.
The `(user_id, log_date)` composite index supports RESEARCH.md Pitfall 3 aggregation query.

---

### `backend/src/db/schema/water-log.ts`, `weight-log.ts`, `workouts.ts`, `sync-outbox.ts` (models, CRUD)

**Source:** ARCHITECTURE.md schema tables + RESEARCH.md Pattern 1 (UUID/timestamp conventions)

**Core pattern — copy the UUID PK + FK reference + composite index pattern from food-log.ts:**
```typescript
// backend/src/db/schema/water-log.ts — representative example
import { pgTable, uuid, integer, date, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const waterLog = pgTable('water_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  logDate: date('log_date').notNull(),
  amountMl: integer('amount_ml').notNull(),
  loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userDateIdx: index('water_log_user_date').on(table.userId, table.logDate),
}));
```

**Rule:** Every log table follows the same structure: UUID PK, user_id FK with CASCADE DELETE,
date column, composite index on (user_id, date). This is the invariant for all log tables.

---

### `backend/drizzle.config.ts` (config)

**Source:** RESEARCH.md Pattern 3 (lines 267–277)

**Core pattern:**
```typescript
// backend/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**Rule:** Never use `drizzle-kit push`. Always: `npx drizzle-kit generate` then
`npx drizzle-kit migrate`. Migration SQL files go in `src/db/migrations/` and are committed
to git (RESEARCH.md Pattern 3, Anti-Patterns section).

---

### `backend/src/services/auth.service.ts` (service, request-response)

**Source:** RESEARCH.md Pattern 5 (lines 316–340)

**Core pattern — token generation and verification:**
```typescript
// backend/src/services/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';

const ACCESS_TOKEN_EXPIRY = '15m';   // D-02
const REFRESH_TOKEN_EXPIRY = '30d';  // D-02

export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(40).toString('hex');  // 80-char hex, CSPRNG
  const hash = bcrypt.hashSync(raw, 10);               // store hash only — never raw
  return { raw, hash };
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
}
```

**Token storage split (D-01, D-02):**
- Access token → response body → Zustand memory on mobile (lost on app kill — acceptable)
- Refresh token raw → response body → Expo SecureStore on mobile (hardware-backed)
- Refresh token hash → `refresh_tokens.token_hash` column (bcrypt `$2b$...` format)

**Rules:**
- Always pass explicit `algorithm: 'HS256'` to `jwt.sign` — prevents algorithm confusion attacks.
- `bcrypt.hashSync` is acceptable here because it runs in the service layer on token generation,
  not in a route handler. For password hashing in controllers use `bcrypt.hash` (async).
- Rotation: every `/api/auth/refresh` call sets `revokedAt = now()` on the presented token and
  issues a new pair. DB lookup required — do not rely on JWT expiry alone for refresh tokens
  (RESEARCH.md Anti-Patterns, last bullet).

---

### `backend/src/services/email.service.ts` (service, request-response)

**Source:** RESEARCH.md Pattern 6 (lines 353–373)

**Core pattern — Resend SDK + React Email rendering:**
```typescript
// backend/src/services/email.service.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { PasswordResetEmail } from '../emails/PasswordResetEmail';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = await render(PasswordResetEmail({ resetUrl }));
  const { error } = await resend.emails.send({
    from: 'Nourish <onboarding@resend.dev>',  // use onboarding@resend.dev for local dev (D-03)
    to,
    subject: 'Reset your Nourish password',
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
```

**Password reset token generation pattern (RESEARCH.md Pattern 6, prose):**
```typescript
// In auth.service.ts — generatePasswordResetToken()
const raw = crypto.randomBytes(32).toString('hex');  // 64-char hex
const hash = bcrypt.hashSync(raw, 10);
// raw → URL query param in email link
// hash → password_reset_tokens.token_hash
// On verify: bcrypt.compare(submitted_raw, stored_hash)
```

**Rules:**
- The `from` address must use `onboarding@resend.dev` in local dev (no domain setup needed).
  Document `RESEND_FROM_EMAIL` in `.env.example` for production override.
- The forgot-password endpoint ALWAYS returns HTTP 200 regardless of whether the email exists
  (RESEARCH.md Pitfall 5, email enumeration). Do the DB lookup, but always return the same body.
- Reset tokens are single-use: check `usedAt IS NULL AND expiresAt > NOW()` before accepting.
  Set `usedAt = NOW()` atomically with the password update (RESEARCH.md Pitfall 6).

---

### `backend/src/controllers/auth.controller.ts` (controller, request-response)

**Source:** RESEARCH.md Code Examples — Register Endpoint (lines 522–541)

**Core pattern — register handler (template for all auth handlers):**
```typescript
// backend/src/controllers/auth.controller.ts
// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const body = RegisterSchema.parse(req.body);            // Zod — throws 400 on failure
  const existing = await userRepo.findByEmail(body.email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const passwordHash = await bcrypt.hash(body.password, 12);  // async — never block event loop
  const user = await userRepo.create({ email: body.email, passwordHash });
  await userProfileRepo.create({ userId: user.id });          // empty profile row
  const accessToken = generateAccessToken(user.id);
  const { raw, hash } = generateRefreshToken();
  await tokenRepo.createRefreshToken({
    userId: user.id,
    tokenHash: hash,
    expiresAt: addDays(new Date(), 30),  // D-02
  });
  res.status(201).json({ accessToken, refreshToken: raw });
}
```

**Bcrypt rounds:** 12 rounds (Assumption A6 in RESEARCH.md — ~300ms on modern hardware,
above OWASP minimum of 10).

**Error response format for all controllers:**
```typescript
// Consistent error shape across all endpoints
res.status(4xx).json({ error: 'Human-readable message' });
res.status(2xx).json({ data: result });   // or flat object for auth tokens
```

**Rules:**
- Use `bcrypt.hash` (async), never `bcrypt.hashSync`, inside route/controller handlers.
- Zod `.parse()` throws a `ZodError` — let the global error middleware catch and format it as 400.
- All controllers return `void` and use early `return` after `res.json()` calls.
- Express 5 handles async errors natively — no `express-async-errors` wrapper needed
  (RESEARCH.md State of the Art, Deprecated section, Assumption A3).

---

### `backend/src/repositories/user.repo.ts` (repository, CRUD)

**Source:** RESEARCH.md Code Examples — Drizzle Query Example (lines 545–558)

**Core pattern — Drizzle select with eq filter:**
```typescript
// backend/src/repositories/user.repo.ts
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

export async function create(data: { email: string; passwordHash: string }) {
  const [user] = await db
    .insert(users)
    .values(data)
    .returning();
  return user;
}
```

**Rule:** Repositories only interact with the database. No business logic, no HTTP objects.
Each repository file maps to one or two closely related tables. Import `db` from
`../db/connection`, never create a new Pool or drizzle instance in a repo.

---

### `backend/src/repositories/token.repo.ts` (repository, CRUD)

**Source:** RESEARCH.md Pattern 1 (refresh_tokens + password_reset_tokens schema) + Code Examples

**Core pattern — token lifecycle operations:**
```typescript
// backend/src/repositories/token.repo.ts
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/connection';
import { refreshTokens, passwordResetTokens } from '../db/schema/users';

export async function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const [token] = await db.insert(refreshTokens).values(data).returning();
  return token;
}

export async function revokeRefreshToken(id: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, id));
}

export async function findActiveRefreshTokensByUser(userId: string) {
  return db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}
```

**Rule:** Refresh token verification uses `bcrypt.compare(submittedRaw, storedHash)` in the
service layer — not a DB query by token value. The repo fetches all active tokens for a user;
the service iterates to find the match. This avoids needing an index on `token_hash`
(RESEARCH.md Assumption A5).

---

### `backend/src/middleware/auth.middleware.ts` (middleware, request-response)

**Source:** RESEARCH.md Pattern 8 (lines 400–420)

**Core pattern — requireAuth guard for all protected routes:**
```typescript
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
    res.locals.userId = payload.sub;  // available as res.locals.userId in all downstream handlers
    next();
  } catch {
    res.status(401).json({ error: 'Access token expired or invalid' });
  }
}
```

**Rule:** All non-auth routes apply `requireAuth` as route-level middleware. Never apply it
globally in `app.ts` — the auth routes themselves must be unprotected.

---

### `backend/src/middleware/validate.middleware.ts` (middleware, request-response)

**Source:** RESEARCH.md Pattern 7 (Zod approach) — factory pattern for route-level validation

**Core pattern — Zod schema validation factory:**
```typescript
// backend/src/middleware/validate.middleware.ts
import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;  // replace body with parsed + typed data
    next();
  };
}
```

**Usage in routes:**
```typescript
router.post('/register', validate(RegisterSchema), register);
router.post('/login', validate(LoginSchema), login);
```

---

### `backend/src/middleware/error.middleware.ts` (middleware, request-response)

**Source:** RESEARCH.md Architecture Patterns (Express error middleware convention) + Express 5 behavior

**Core pattern — global error handler:**
```typescript
// backend/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

**Rule:** Register this as the last `app.use()` call in `app.ts`. Express 5 passes async
errors to this handler automatically — no need to wrap handlers in try/catch for Express-level
errors (RESEARCH.md Assumption A3). Still use try/catch in service/repo layers for business
logic errors that need specific HTTP status codes.

---

### `backend/src/routes/auth.routes.ts` (route, request-response)

**Source:** RESEARCH.md Architecture Patterns — Express API Route Structure

**Core pattern — Router with middleware applied per-route:**
```typescript
// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from './schemas';

const router = Router();

// Public auth endpoints — no requireAuth
router.post('/register', validate(RegisterSchema), authController.register);
router.post('/login', validate(LoginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', validate(ForgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(ResetPasswordSchema), authController.resetPassword);

// Protected — requireAuth applied per-route
router.post('/logout', requireAuth, authController.logout);

export default router;
```

**Mounting in app.ts:**
```typescript
app.use('/api/auth', authRouter);
```

---

### `backend/src/app.ts` + `backend/src/server.ts` (config, request-response)

**Source:** RESEARCH.md Walking Skeleton + Architecture Patterns folder structure

**Core pattern — app factory / server split:**
```typescript
// backend/src/app.ts — Express app factory (no listen() call)
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import authRouter from './routes/auth.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));  // http://localhost:8081 for Expo dev client
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRouter);

app.use(errorMiddleware);  // MUST be last use() call

export default app;
```

```typescript
// backend/src/server.ts — only file that calls listen()
import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`Nourish API running on http://localhost:${env.PORT}`);
});
```

**Rule:** The app/server split allows tests to import `app` directly without binding a port.

---

### `backend/src/emails/PasswordResetEmail.tsx` (component)

**Source:** RESEARCH.md Pattern 6 — `@react-email/components` usage

**Core pattern — minimal React Email template:**
```typescript
// backend/src/emails/PasswordResetEmail.tsx
import { Html, Body, Heading, Text, Link, Preview } from '@react-email/components';

interface Props { resetUrl: string; }

export function PasswordResetEmail({ resetUrl }: Props) {
  return (
    <Html>
      <Preview>Reset your Nourish password</Preview>
      <Body>
        <Heading>Reset your password</Heading>
        <Text>Click the link below to reset your Nourish password. It expires in 1 hour.</Text>
        <Link href={resetUrl}>Reset password</Link>
        <Text>If you did not request this, ignore this email.</Text>
      </Body>
    </Html>
  );
}
```

---

### `docker-compose.yml` (config)

**Source:** RESEARCH.md Pattern 9 (lines 425–443)

**Core pattern — postgres:17-alpine service (D-06):**
```yaml
# docker-compose.yml (repo root — D-06)
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

**Rule:** Before running `docker-compose up`, enable WSL2 integration in Docker Desktop:
Settings → Resources → WSL Integration → enable for active distro.
Verify with `docker --version` in WSL terminal (RESEARCH.md Pitfall 4).

---

### `backend/tests/auth.test.ts` + `backend/tests/schema.test.ts` (tests)

**Source:** RESEARCH.md Validation Architecture — Phase Requirements → Test Map (lines 666–688)

**Test file structure and required coverage:**

`auth.test.ts` must cover (one test per row):
- AUTH-01: Register valid email + password → 201 + tokens
- AUTH-01: Register duplicate email → 409
- AUTH-01: Register invalid email → 400
- AUTH-02: Login valid credentials → access + refresh tokens
- AUTH-02: Login wrong password → 401
- AUTH-02: Refresh token exchange → new access token
- AUTH-03: Forgot-password always returns 200 (valid and invalid email)
- AUTH-03: Reset-password with valid token → updates password hash
- AUTH-03: Reset-password with expired token → 400
- AUTH-04: Logout → refresh token revokedAt set in DB

`schema.test.ts` must cover:
- SYNC-01: All tables exist after migration
- SYNC-02: `food_log` has UNIQUE constraint on `(user_id, idempotency_key)`

**Run commands (from RESEARCH.md Validation Architecture):**
```bash
npx vitest run tests/auth.test.ts         # per-task check
npx vitest run                             # full suite (wave/phase gate)
```

---

### `backend/vitest.config.ts` (config)

**Source:** RESEARCH.md Validation Architecture

```typescript
// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],  // test DB connection setup
  },
});
```

---

## Shared Patterns

### Authentication Guard
**Source:** RESEARCH.md Pattern 8
**Apply to:** All route files except `auth.routes.ts`. Mount `requireAuth` per-route (not globally).
**Key detail:** `res.locals.userId` carries the authenticated user ID into all downstream handlers.
Never use a user ID from `req.body` or `req.params` for data ownership — always use `res.locals.userId`.

### Zod Validation
**Source:** RESEARCH.md Pattern 7 (env) + validate.middleware.ts pattern above
**Apply to:** All controller POST/PUT handlers via the `validate()` factory middleware.
All env vars validated at startup via `envSchema.parse(process.env)`.

### Error Response Format
**Source:** RESEARCH.md Code Examples (register handler shape)
**Apply to:** All controllers and error middleware.
```typescript
// Success
res.status(200).json({ data: result });        // or flat object
res.status(201).json({ accessToken, refreshToken: raw });

// Client error
res.status(400).json({ error: 'Validation failed', details: fieldErrors });
res.status(401).json({ error: 'Access token expired or invalid' });
res.status(409).json({ error: 'Email already registered' });

// Server error (from error middleware)
res.status(500).json({ error: 'Internal server error' });
```

### Drizzle Query Pattern
**Source:** RESEARCH.md Code Examples (Drizzle Query Example, lines 545–558)
**Apply to:** All repository files.
```typescript
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/connection';
// Always destructure single-row results: const [row] = await db.select()...
// Return null on miss: return row ?? null;
```

### Security — Email Enumeration Prevention
**Source:** RESEARCH.md Pitfall 5
**Apply to:** `POST /api/auth/forgot-password` handler only.
Always return HTTP 200 with a generic message. Never return 404 for unknown email.

### Security — Refresh Token Hash Storage
**Source:** RESEARCH.md Pitfall 2 + Pattern 5
**Apply to:** `token.repo.ts` and `auth.service.ts`.
The `refresh_tokens.token_hash` column must always contain a bcrypt hash starting with `$2b$`.
A raw token value (hex string or UUID) in that column is a security defect.

---

## No Analog Found (All Files)

All 28 files in this phase have no codebase analog because this is a greenfield backend.
The entire file list is sourced from scratch.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All `backend/src/**` files | various | various | Greenfield — no existing backend code |
| `docker-compose.yml` | config | — | First infrastructure file in repo |
| `backend/tests/**` | test | — | No test framework installed yet |

Planner must use RESEARCH.md Patterns 1–9 and Code Examples as the sole pattern source.
`nutrition_tracker.html` is the data source for Thai foods (Phase 2 seed only — not relevant
to Phase 1 auth implementation).

---

## Metadata

**Analog search scope:** Entire repository (`/mnt/c/Users/ps/Desktop/FoodTackingApp`)
**Files scanned:** 1 existing source file (`nutrition_tracker.html`) + planning docs
**Pattern extraction date:** 2026-05-23
**Pattern source:** RESEARCH.md Patterns 1–9 and Code Examples section (01-RESEARCH.md)
**Next consumer:** `gsd-planner` — reference this file for analog + excerpt in each plan action
