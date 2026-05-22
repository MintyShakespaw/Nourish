# Requirements: Nourish

**Defined:** 2026-05-22
**Core Value:** Log what you eat and stay on track with calorie + macro targets — fast, on your phone, with real Thai food support.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in and stay logged in across app restarts
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists on device until explicit logout

### Nutrition Tracking

- [ ] **NUTR-01**: User can set profile (weight, height, age, sex, BMR, activity level, goal)
- [ ] **NUTR-02**: App calculates daily calorie and macro (protein/carbs/fat) targets from profile using TDEE formula
- [ ] **NUTR-03**: User can log food entries organized by meal (Breakfast / Lunch / Dinner / Snack)
- [ ] **NUTR-04**: User sees live calorie and macro progress for today (ring chart + macro bars)
- [ ] **NUTR-05**: User can adjust portion quantity for any logged food item and see calories update instantly
- [ ] **NUTR-06**: User can remove any logged food item from a meal

### Food Input

- [ ] **FOOD-01**: User can search 100+ foods (including Thai dishes with Thai-language names) by name and add to current meal
- [ ] **FOOD-02**: User can scan a product barcode (EAN-13) and the app looks up nutrition data automatically
- [ ] **FOOD-03**: When barcode has no match, user sees a clear "not found" message and can enter nutrition data manually
- [ ] **FOOD-04**: User can photograph a meal and receive a calorie estimate from Claude Vision API, shown as a range with mandatory user confirmation before logging
- [ ] **FOOD-05**: User can add a custom food (name, calories per serving, protein/carbs/fat, serving size) not in the built-in database
- [ ] **FOOD-06**: Custom foods are saved to the user's account and appear in search results

### Water Tracking

- [ ] **WATER-01**: User can log water intake by glass or millilitre
- [ ] **WATER-02**: User sees daily water progress toward target on the dashboard
- [ ] **WATER-03**: User can set a custom daily water target (default: 8 glasses / 2,000 ml)

### History & Trends

- [ ] **HIST-01**: User can view food logs for any past day
- [ ] **HIST-02**: User sees a weekly calorie and macro trend chart (last 7 days)
- [ ] **HIST-03**: User can log body weight at any time
- [ ] **HIST-04**: User sees a weight trend chart over time (last 30 days minimum)

### Fitness

- [ ] **FIT-01**: User can request an AI-suggested weekly workout plan from Claude API, based on their stated goal (lose fat / build muscle / maintain)
- [ ] **FIT-02**: User can log a completed workout (type: strength / cardio / HIIT, duration in minutes)
- [ ] **FIT-03**: App estimates calories burned from logged workout and shows net calorie balance for the day

### Backend & Sync

- [ ] **SYNC-01**: All user data (food logs, profile, workouts, water, weight) is stored in the Node.js/Express + PostgreSQL backend
- [ ] **SYNC-02**: App reads cached data offline and syncs pending writes when network reconnects (idempotent, no duplicates)
- [ ] **SYNC-03**: Logging in on a new device restores all historical data

## v2 Requirements

### Food Database

- **DB-01**: Thai food database expanded to 300–500 items with values cross-referenced against INMU Mahidol FCDB
- **DB-02**: Community barcode database — user can submit missing barcodes for review
- **DB-03**: Thai packaged food barcode cache built from user scans over time

### Notifications

- **NOTF-01**: User receives a daily push reminder to log meals (configurable time)
- **NOTF-02**: User gets a congratulation notification when they hit calorie target for the day

### Advanced Features

- **MEAL-01**: User can save a meal combo as a template and re-log it in one tap
- **MEAL-02**: User can copy yesterday's food log to today
- **TANITA-01**: App imports BMR and body composition data directly from Tanita Bluetooth scale (if model supports it)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social / sharing features | Personal tool — no community, no profiles visible to others |
| Apple Watch / wearable integration | Hardware complexity, not needed for personal use |
| Subscription / payments | Personal tool, no monetization |
| Voice logging | Adds complexity, barcode + photo cover the friction gap |
| Recipe import from URLs | Out of scope for MVP; custom food entry covers the need |
| Gamification (streaks, badges) | Research shows lowest user value rating; personal tool doesn't need it |
| Nutritionist / medical consultation | App is for tracking, not clinical use |
| Multi-user / family accounts | Personal tool only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| SYNC-01 | Phase 1 | Pending |
| SYNC-02 | Phase 1 | Pending |
| SYNC-03 | Phase 1 | Pending |
| NUTR-01 | Phase 2 | Pending |
| NUTR-02 | Phase 2 | Pending |
| NUTR-03 | Phase 2 | Pending |
| NUTR-04 | Phase 2 | Pending |
| NUTR-05 | Phase 2 | Pending |
| NUTR-06 | Phase 2 | Pending |
| FOOD-01 | Phase 2 | Pending |
| WATER-01 | Phase 2 | Pending |
| WATER-02 | Phase 2 | Pending |
| WATER-03 | Phase 2 | Pending |
| FOOD-02 | Phase 3 | Pending |
| FOOD-03 | Phase 3 | Pending |
| HIST-01 | Phase 3 | Pending |
| HIST-02 | Phase 3 | Pending |
| HIST-03 | Phase 3 | Pending |
| HIST-04 | Phase 3 | Pending |
| FOOD-04 | Phase 4 | Pending |
| FIT-01 | Phase 4 | Pending |
| FIT-02 | Phase 4 | Pending |
| FIT-03 | Phase 4 | Pending |
| FOOD-05 | Phase 5 | Pending |
| FOOD-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

Note: SYNC-02 is assigned to Phase 1 (idempotency key schema, outbox table structure laid in the database) and completed in Phase 5 (full offline flush, conflict resolution, and zero-duplicate guarantee validated end-to-end).

---
*Requirements defined: 2026-05-22*
*Last updated: 2026-05-22 — FOOD-05, FOOD-06 corrected from Phase 2 to Phase 5 (custom foods belong in polish phase, not core logging MVP)*
