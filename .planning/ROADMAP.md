# Roadmap: Nourish

**Project:** Nourish — Personal Nutrition & Fitness Tracker
**Milestone:** 1 — MVP
**Created:** 2026-05-22
**Granularity:** Standard (5 phases)
**Mode:** Vertical MVP (each phase delivers a working end-to-end user-facing capability)
**Coverage:** 29/29 v1 requirements mapped

---

## Phases

- [ ] **Phase 1: Backend Foundation + Auth** — Working Express API, PostgreSQL schema, JWT auth; data layer ready for mobile
- [ ] **Phase 2: Core Food Logging** — User can log food, track macros, and monitor water intake on their phone
- [ ] **Phase 3: Barcode Scanning + History** — User can scan barcodes and review past logs and weight trends
- [ ] **Phase 4: AI Features + Workouts** — User can photograph meals, get workout plans, and log exercise
- [ ] **Phase 5: Custom Foods + Offline Hardening** — User can add custom foods; app works reliably offline

---

## Phase Details

### Phase 1: Backend Foundation + Auth
**Goal:** User can create an account, log in, and have all their data stored and retrievable from any device.
**Mode:** mvp
**Success Criteria:**
1. User can sign up with email and password and receive a confirmation that their account is created.
2. User can log in on any device and stay logged in across app restarts without re-entering credentials.
3. User can request a password reset and receive a working reset link via email.
4. User session persists on device storage until the user explicitly logs out.
5. Logging in on a second device restores all data that was saved from the first device.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, SYNC-01, SYNC-02, SYNC-03
**Depends on:** None
**Plans:** 4 plans
- [ ] 01-01-PLAN.md — Walking Skeleton: backend scaffolding + Docker Postgres + register endpoint (AUTH-01)
- [ ] 01-02-PLAN.md — Full data schema: profiles, foods (pg_trgm), logs, sync_outbox + 0001 migration (SYNC-01/02/03 foundation)
- [ ] 01-03-PLAN.md — Login + refresh + logout + rate limiting + requireAuth middleware (AUTH-02, AUTH-04)
- [ ] 01-04-PLAN.md — Password reset via Resend email + React Email template + single-use tokens (AUTH-03)

---

### Phase 2: Core Food Logging
**Goal:** User can search for and log food by meal, see live macro and calorie progress for the day, and track daily water intake.
**Mode:** mvp
**Success Criteria:**
1. User can search 100+ foods (including Thai dishes with Thai-language names) and add any result to Breakfast, Lunch, Dinner, or Snack.
2. User can adjust the portion quantity for any logged food item and see the calorie and macro totals update instantly.
3. User can remove any food item from a meal log.
4. User sees a dashboard with live calorie remaining and macro progress (ring chart + bars) that updates every time food is added or removed.
5. User can log water by glass or millilitre, set a custom daily water target, and see their daily water progress on the dashboard.

**Requirements:** NUTR-01, NUTR-02, NUTR-03, NUTR-04, NUTR-05, NUTR-06, FOOD-01, WATER-01, WATER-02, WATER-03
**Depends on:** Phase 1
**Plans:** TBD
**UI hint**: yes

---

### Phase 3: Barcode Scanning + History
**Goal:** User can scan a product barcode to add food instantly, and review past food logs, weekly charts, and weight trends.
**Mode:** mvp
**Success Criteria:**
1. User can scan an EAN-13 barcode and have the product's nutrition data populated automatically, ready to add to a meal.
2. When a barcode has no match in any lookup tier, user sees a clear "not found" message and is offered a manual nutrition entry form — never a dead end.
3. User can tap any past date and view the complete food log for that day.
4. User sees a weekly calorie and macro bar chart covering the last 7 days.
5. User can log their body weight at any time and view a weight trend chart covering at least the last 30 days.

**Requirements:** FOOD-02, FOOD-03, HIST-01, HIST-02, HIST-03, HIST-04
**Depends on:** Phase 2
**Plans:** TBD
**UI hint**: yes

---

### Phase 4: AI Features + Workouts
**Goal:** User can photograph a meal to get a calorie estimate, request an AI-suggested workout plan, log completed workouts, and see net calories for the day.
**Mode:** mvp
**Success Criteria:**
1. User can photograph a meal and receive a calorie range estimate (e.g., "approximately 380–520 kcal") from Claude Vision; the estimate must be confirmed and editable before it is logged.
2. User can request a weekly workout plan from Claude API based on their stated goal (lose fat / build muscle / maintain) and view it as a structured weekly schedule.
3. User can log a completed workout (type: strength / cardio / HIIT, duration in minutes).
4. After logging a workout, user sees estimated calories burned and an updated net calorie balance for the day.

**Requirements:** FOOD-04, FIT-01, FIT-02, FIT-03
**Depends on:** Phase 3
**Plans:** TBD
**UI hint**: yes

---

### Phase 5: Custom Foods + Offline Hardening
**Goal:** User can add custom foods to their personal database, and all logging works correctly offline with no duplicate entries on reconnect.
**Mode:** mvp
**Success Criteria:**
1. User can create a custom food entry (name, calories per serving, protein/carbs/fat, serving size) and have it saved to their account.
2. Custom foods appear in search results alongside the built-in database.
3. User can log food, water, workouts, and weight while offline; all entries sync to the backend when the network reconnects with no duplicates created.

**Requirements:** FOOD-05, FOOD-06, SYNC-02
**Depends on:** Phase 4
**Plans:** TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation + Auth | 0/4 | Planned | - |
| 2. Core Food Logging | 0/0 | Not started | - |
| 3. Barcode Scanning + History | 0/0 | Not started | - |
| 4. AI Features + Workouts | 0/0 | Not started | - |
| 5. Custom Foods + Offline Hardening | 0/0 | Not started | - |

---

## Coverage Validation

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 1 |
| SYNC-01 | Phase 1 |
| SYNC-02 | Phase 1 |
| SYNC-03 | Phase 1 |
| NUTR-01 | Phase 2 |
| NUTR-02 | Phase 2 |
| NUTR-03 | Phase 2 |
| NUTR-04 | Phase 2 |
| NUTR-05 | Phase 2 |
| NUTR-06 | Phase 2 |
| FOOD-01 | Phase 2 |
| WATER-01 | Phase 2 |
| WATER-02 | Phase 2 |
| WATER-03 | Phase 2 |
| FOOD-02 | Phase 3 |
| FOOD-03 | Phase 3 |
| HIST-01 | Phase 3 |
| HIST-02 | Phase 3 |
| HIST-03 | Phase 3 |
| HIST-04 | Phase 3 |
| FOOD-04 | Phase 4 |
| FIT-01 | Phase 4 |
| FIT-02 | Phase 4 |
| FIT-03 | Phase 4 |
| FOOD-05 | Phase 5 |
| FOOD-06 | Phase 5 |

**Total v1 requirements:** 29
**Mapped:** 29
**Unmapped:** 0

Note: SYNC-02 (offline sync idempotency) appears in Phase 1 (schema foundations — idempotency keys, outbox table) and is the primary deliverable of Phase 5 (full offline hardening — flush, conflict resolution, zero duplicates). Phase 1 lays the schema; Phase 5 completes the behavior. Requirement is formally assigned to Phase 5.

---

*Roadmap created: 2026-05-22*
*Last updated: 2026-05-22 after initial creation*
