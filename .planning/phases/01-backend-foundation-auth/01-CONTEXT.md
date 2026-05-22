# Phase 1: Backend Foundation + Auth - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Node.js/Express API, PostgreSQL schema, and JWT auth system that all mobile phases depend on. By end of phase: user can sign up, log in, reset password, and have data stored/retrievable from the backend. Mobile app connects to local backend for dev. No mobile UI in this phase — backend only.

</domain>

<decisions>
## Implementation Decisions

### Auth Token Storage (Mobile)
- **D-01:** Store JWT tokens in Expo SecureStore (hardware-encrypted iOS Keychain / Android Keystore). Do NOT use AsyncStorage or MMKV for tokens.
- **D-02:** Access token lifetime: 15 minutes. Refresh token lifetime: 30 days. Axios interceptor handles silent refresh before expiry.

### Password Reset Email
- **D-03:** Use Resend as the email provider (simple API, generous free tier 100/day, React Email templates).
- **D-04:** Password reset link expires in 1 hour. Single-use token stored in DB, invalidated on use.

### Hosting & Deployment
- **D-05:** Phase 1 runs entirely local — Express + PostgreSQL on developer machine. No cloud deployment in this phase.
- **D-06:** PostgreSQL runs in Docker for dev (`docker-compose.yml` with postgres service). Managed DB (Railway / Neon) planned for later deployment phase. Include a `docker-compose.yml` in the repo root.

### Claude's Discretion
- Database ORM: Drizzle recommended by research — planner chooses final approach.
- PostgreSQL schema design: idempotency keys, generic outbox table, pg_trgm indexes — planner implements per research ARCHITECTURE.md.
- API versioning, folder structure, error response format — standard Express patterns, planner decides.
- bcrypt rounds, JWT signing algorithm (HS256 vs RS256) — planner uses secure defaults.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — project goals, tech stack decisions, constraints
- `.planning/REQUIREMENTS.md` — AUTH-01–04, SYNC-01–03 requirements for this phase

### Research
- `.planning/research/SUMMARY.md` — recommended stack, build order, top pitfalls
- `.planning/research/ARCHITECTURE.md` — PostgreSQL schema outline, Express structure, offline sync design, idempotency key pattern
- `.planning/research/PITFALLS.md` — JWT expiry sync pitfall, offline duplicate prevention

### Roadmap
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependency map

No external ADRs or specs — all decisions captured above and in research files.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `nutrition_tracker.html` — contains the Thai food database (100+ items) and TDEE calculation logic. Port food data as a seed script in Phase 2. Auth phase does not use this file.

### Established Patterns
- None yet — greenfield backend. Research files define the patterns to establish.

### Integration Points
- Mobile app (Phase 2) will connect to `http://localhost:{PORT}` during dev. Backend must expose CORS for the Expo dev client origin.

</code_context>

<specifics>
## Specific Ideas

- Resend for transactional email (password reset). Keep email templates simple — plain text or minimal HTML.
- Local-first dev: no Docker-compose required if user has local PostgreSQL. But a `docker-compose.yml` for Postgres is a nice-to-have.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Backend Foundation + Auth*
*Context gathered: 2026-05-22*
