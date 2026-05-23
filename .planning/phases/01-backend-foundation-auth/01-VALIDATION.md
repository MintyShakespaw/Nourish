---
phase: 1
slug: backend-foundation-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (Wave 0 installs) |
| **Config file** | `backend/vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `npx vitest run tests/auth.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/auth.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | AUTH-01 | — | N/A | unit | `npx vitest run tests/auth.test.ts -t "register"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | AUTH-01 | — | Duplicate email returns 409 not 200 | unit | `npx vitest run tests/auth.test.ts -t "duplicate email"` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | AUTH-01 | — | Invalid email returns 400 | unit | `npx vitest run tests/auth.test.ts -t "invalid email"` | ❌ W0 | ⬜ pending |
| 1-02-01 | 01 | 1 | AUTH-02 | — | Login returns access + refresh tokens | integration | `npx vitest run tests/auth.test.ts -t "login success"` | ❌ W0 | ⬜ pending |
| 1-02-02 | 01 | 1 | AUTH-02 | — | Wrong password returns 401 | integration | `npx vitest run tests/auth.test.ts -t "login wrong password"` | ❌ W0 | ⬜ pending |
| 1-02-03 | 01 | 1 | AUTH-02 | — | Refresh token exchange returns new access token | integration | `npx vitest run tests/auth.test.ts -t "refresh token"` | ❌ W0 | ⬜ pending |
| 1-03-01 | 01 | 1 | AUTH-03 | — | Forgot-password always 200 (no email enumeration) | integration | `npx vitest run tests/auth.test.ts -t "forgot password"` | ❌ W0 | ⬜ pending |
| 1-03-02 | 01 | 1 | AUTH-03 | — | Reset with valid token updates password hash | integration | `npx vitest run tests/auth.test.ts -t "reset password"` | ❌ W0 | ⬜ pending |
| 1-03-03 | 01 | 1 | AUTH-03 | — | Reset with expired token returns 400 | integration | `npx vitest run tests/auth.test.ts -t "expired token"` | ❌ W0 | ⬜ pending |
| 1-04-01 | 01 | 1 | AUTH-04 | — | Logout sets revokedAt on refresh token | integration | `npx vitest run tests/auth.test.ts -t "logout"` | ❌ W0 | ⬜ pending |
| 1-05-01 | 01 | 0 | SYNC-01 | — | All schema tables exist after migrations | smoke | `npx vitest run tests/schema.test.ts` | ❌ W0 | ⬜ pending |
| 1-06-01 | 01 | 0 | SYNC-02 | — | food_log UNIQUE(user_id, idempotency_key) enforced | smoke | `npx vitest run tests/schema.test.ts -t "idempotency"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/auth.test.ts` — stubs for AUTH-01 through AUTH-04
- [ ] `backend/tests/schema.test.ts` — SYNC-01 and SYNC-02 constraint checks
- [ ] `backend/vitest.config.ts` — test framework configuration
- [ ] Framework install: `npm install --save-dev vitest` in `backend/`

*SYNC-03 (data restore on new device login) is covered by AUTH-02 + SYNC-01 together — no additional test stub needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Password reset email arrives in inbox | AUTH-03 | Requires live Resend API key + real email address | Call `POST /api/auth/forgot-password` with a registered email; verify email received within 60s |
| Docker WSL2 integration works | SYNC-01 | Environment setup — not code | Run `docker --version && docker-compose --version` in WSL; must return versions, not "command not found" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
