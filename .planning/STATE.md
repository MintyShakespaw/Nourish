# Project State: Nourish

**Last updated:** 2026-05-22
**Session:** Roadmap initialization

---

## Project Reference

**Core value:** Log what you eat and stay on track with calorie + macro targets — fast, on your phone, with real Thai food support.

**Current focus:** Awaiting first phase plan — run `/gsd-plan-phase 1` to begin.

---

## Current Position

**Milestone:** 1 — MVP
**Current phase:** None (not started)
**Current plan:** None
**Status:** Roadmap created, ready for Phase 1 planning

**Progress:**
```
[Phase 1] [ ] Backend Foundation + Auth
[Phase 2] [ ] Core Food Logging
[Phase 3] [ ] Barcode Scanning + History
[Phase 4] [ ] AI Features + Workouts
[Phase 5] [ ] Custom Foods + Offline Hardening
```

**Overall milestone progress:** 0/5 phases complete

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases defined | 5 |
| Requirements mapped | 29/29 |
| Plans created | 0 |
| Plans complete | 0 |
| Phases complete | 0 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Recorded |
|----------|-----------|---------|
| Expo SDK 53 (not 54) | SDK 54 had Xcode 26 beta build issues with VisionCamera | 2026-05-22 |
| VisionCamera v5 (not v4) | v4 archived and unmaintained | 2026-05-22 |
| TanStack Query + MMKV (not WatermelonDB) | Single-user app; avoids WatermelonDB's full sync engine complexity | 2026-05-22 |
| Claude Haiku 4.5 for food photo | Cost-optimized for frequent photo analysis calls | 2026-05-22 |
| Claude Sonnet 4.6 for workout plans | Quality matters more than speed for background generation | 2026-05-22 |
| Generic outbox table (not entity-specific queues) | All entity types (food, water, weight, workout) flow through one table | 2026-05-22 |
| drizzle-kit generate + migrate (never push) | Safe for production; push can corrupt live data | 2026-05-22 |
| FOOD-05/FOOD-06 assigned to Phase 5 | Custom foods belong with polish/hardening, not core logging MVP | 2026-05-22 |

### Critical Pitfalls (from research)

1. **Claude Vision accuracy** — Thai dish estimation error 15-40%+. Always show range, require user confirmation. Never log without confirmation step.
2. **Barcode in standalone builds** — Configure `app.json` permissions and VisionCamera Expo config plugin BEFORE writing any scanning code. Test with `eas build --profile development` immediately.
3. **Open Food Facts Thai coverage** — Build three-tier fallback (Open Food Facts → local cache → manual entry) before shipping Phase 3.
4. **Offline duplicates** — Client-side UUID idempotency key on every log entry at creation time. `UNIQUE(user_id, idempotency_key)` on backend. Soft deletes only (tombstones).
5. **JWT expiry during offline sync** — Axios interceptor catches 401, silently refreshes, retries. Proactively check expiry before outbox flush.

### Research Flags

- **Phase 3 (Barcode):** VisionCamera v5 + Expo SDK 53 config plugin wiring — verify exact `app.json` configuration at phase start before writing scanning code. Medium confidence.
- **Phase 4 (AI Features):** Claude Vision prompt engineering for Thai food structured JSON output, TanStack Query v5 mutation queuing with MMKV persister, Express rate limiting — validate against current versions at phase start.

### Technical Notes

- pg_trgm trigram indexes enable Thai-script partial-match search in PostgreSQL without Elasticsearch
- `food_log` stores denormalized calorie/macro snapshot at log time — historical accuracy preserved even if food values change
- `user_profiles.bmr_override` accepts Tanita scanner BMR, bypassing Mifflin-St Jeor formula
- Image resize to 1000x750px via expo-image-manipulator before Claude Vision base64 encode — 10x cost reduction
- Access token: 15-minute expiry. Refresh token: 7-day, stored in MMKV (AES-256 encrypted)
- EAN-13 format only for barcode scanner — do NOT use ALL_FORMATS (causes Thai barcode misidentification)

---

## Todos

- [ ] Start Phase 1: `/gsd-plan-phase 1`

---

## Blockers

None.

---

## Session Continuity

**To resume this project:**
1. Read `.planning/ROADMAP.md` for phase structure and requirements
2. Read `.planning/PROJECT.md` for core value and constraints
3. Read `.planning/research/SUMMARY.md` for stack decisions and pitfalls
4. Check current phase status in this STATE.md
5. Run `/gsd-plan-phase N` for the next incomplete phase

**Stack:** Expo SDK 53, React Native 0.79, Expo Router v4, Zustand 5.x, TanStack Query v5, MMKV, Node.js 22, Express 4, Drizzle ORM 0.44, PostgreSQL 17, VisionCamera v5, Victory Native XL, Claude Haiku 4.5 (photo), Claude Sonnet 4.6 (workouts)

---

*State initialized: 2026-05-22*
