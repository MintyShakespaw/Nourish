# Project Research Summary

**Project:** Nourish — Personal Nutrition & Fitness Tracker
**Domain:** React Native mobile health tracker (offline-first, Thai-food-aware, Claude AI-powered)
**Researched:** 2026-05-22
**Confidence:** HIGH (stack and architecture); MEDIUM (Thai food data coverage, Claude vision accuracy)

## Executive Summary

Nourish is a single-user personal nutrition and fitness tracker porting a working HTML prototype into a native iOS + Android app. Expert consensus for this domain converges on a clear stack: Expo SDK 53 (React Native 0.79, New Architecture by default) with Expo Router v4 for navigation, Zustand + TanStack Query v5 for state, and a Node.js/Express/PostgreSQL backend with no BaaS. The offline-first strategy is pragmatic, not maximalist: TanStack Query with MMKV persistence handles read caching and write queuing for a single-user app without the complexity of WatermelonDB's full sync engine. The two AI features (food photo recognition via Claude Vision, workout plan generation via Claude text) route exclusively through the backend to protect the API key.

The recommended build order follows hard dependencies: backend auth and database schema first, then core food logging and Thai food database, then water/weight tracking, then barcode scanning, and finally AI features. This order ensures every feature has a working foundation beneath it and that the highest-risk technical elements (barcode scanning in standalone builds, Claude Vision accuracy, offline sync idempotency) are addressed with the full app context in place rather than speculatively. The existing HTML prototype is a genuine asset: the TDEE calculation logic, Thai food data, and macro tracking UX are all validated and should be ported, not reimplemented.

The primary risks are: (1) Claude Vision calorie estimation has 15-40% mean error on Thai dishes and must ship with a mandatory user-confirmation step and range display rather than authoritative numbers; (2) barcode scanning silently fails in standalone production builds if permissions and format constraints are not configured before development begins; (3) offline sync creates duplicate entries unless idempotency keys and a generic outbox schema are in place from day one. None of these are blockers — all have clear mitigations documented in PITFALLS.md.

---

## Key Findings

### Recommended Stack

The stack is fully TypeScript: Expo SDK 53 on the mobile side, Node.js 22 LTS with Express 4 and Drizzle ORM on the backend, PostgreSQL 17 as the database. There are no experimental choices — every library selected has a production track record and an active maintainer in 2025-2026.

For camera and barcode, `react-native-vision-camera` v5 (rewritten to Nitro Modules) with the `react-native-vision-camera-barcode-scanner` plugin is the only defensible choice: `expo-barcode-scanner` is deprecated, `expo-camera` fails on non-centered iOS codes, and VisionCamera v4 is archived. The companion barcode plugin (Google MLKit) covers all Thai EAN-13 barcodes. Food data comes from Open Food Facts (free, 4M+ products, Thai coverage growing) with USDA FoodData Central as a fallback for US brands sold in Thailand. Charts use Victory Native XL (Skia + Reanimated, 100+ FPS on low-end Android). Claude Haiku 4.5 handles food photo recognition (cost-optimized); Claude Sonnet 4.6 handles workout plan generation (quality matters more than speed for background generation).

**Core technologies:**
- **Expo SDK 53 + React Native 0.79**: Cross-platform mobile, New Architecture enabled by default — required for native camera and barcode hardware
- **Expo Router v4**: File-based routing, automatic deep linking, maps cleanly to meal tab structure
- **Zustand 5.x**: Client state (auth tokens, UI, active day) — minimal boilerplate for a single-user app
- **TanStack Query v5 + MMKV persister**: Server state with offline read cache and mutation queuing — replaces custom sync code
- **react-native-mmkv v4**: AES-256 encrypted token storage, 30x faster than AsyncStorage
- **react-native-vision-camera v5 + barcode-scanner**: Production-grade EAN-13 scanning via Google MLKit
- **Open Food Facts API v2**: Free barcode lookup, 4M+ products, Thai portal available
- **Node.js 22 + Express 4**: REST API backend, all Claude calls proxied here to protect API key
- **PostgreSQL 17 + Drizzle ORM 0.44**: Relational schema with efficient aggregation queries for nutrition history
- **Claude Haiku 4.5** (food photo) + **Claude Sonnet 4.6** (workout plans): Single AI provider, backend-only
- **Victory Native XL 41.x**: Skia-based charts, performs on mid-range Android devices common in Thailand
- **Zod 3.x**: Runtime validation on all API bodies and Claude responses — required since Claude can return malformed JSON

**Critical version constraints:**
- Expo SDK 53, not SDK 54 — SDK 54 had Xcode 26 beta build issues with VisionCamera
- VisionCamera v5, not v4 — v4 is archived and unmaintained
- drizzle-kit 0.30.x with `generate + migrate` workflow — never `push` in production
- react-native-mmkv for token storage, not AsyncStorage — AsyncStorage is unencrypted

### Expected Features

The prototype already validates the core loop: TDEE calculation, meal tabs, food log, macro display, profile. The gap to fill is native input methods (barcode, photo), sync, and visualization.

**Must have (table stakes):**
- Food log with meal tabs (Breakfast / Lunch / Dinner / Snack) — validated in prototype
- Calorie + macro tracking with TDEE-based daily target — validated in prototype
- Thai food database (port prototype 100+ items, expand to 300-500) — core differentiator, not optional
- Manual food entry with serving size adjustment — fallback for every barcode miss
- Water intake tracking (quick-tap buttons, daily progress) — expected by all nutrition app users
- Day history navigation with 7-day charts and weight trend — motivational payoff of tracking
- User profile (weight, height, age, sex, activity, goal, protein rate, Tanita BMR import)
- Barcode scanning with Open Food Facts lookup — highest priority new input method per PROJECT.md
- Recent foods / favorites — friction reduction; users eat the same things repeatedly
- Backend account sync — data must survive a new phone

**Should have (differentiators):**
- Thai-language food names in database (Thai script + transliteration) — genuine gap vs. mainstream apps
- Claude Vision food photo recognition — fallback for home-cooked and restaurant meals; must show range estimate, not authoritative numbers
- AI workout plan suggestions via Claude — positioned as "starter plan" not "personal trainer"
- Macro split customization (protein rate in g/kg) — appeals to fitness-focused users
- Copy previous day / meal template — retention driver for meal-prep users
- Tanita BMR manual import — differentiator for users with Tanita scales

**Defer (v2+):**
- Voice logging — Thai STT to food intent is high complexity, low daily utility vs. search
- Recipe import from URLs — web scraping + ingredient matching is disproportionate effort
- Wearable integrations beyond Tanita manual BMR entry
- Social features, gamification — explicitly anti-features for a personal tool
- Micronutrient tracking — Cronometer-level complexity, not needed for calorie/macro goal
- Monthly/yearly aggregates — 7-day is the engagement-relevant window for this use case

### Architecture Approach

Three-tier architecture: Expo React Native client — Node.js/Express REST API — PostgreSQL. The client uses TanStack Query for all server state with MMKV as the persistence layer; Zustand holds auth tokens and UI state only. All writes go through optimistic mutations with automatic retry on reconnect. A generic outbox table handles all entity types (food log, water log, weight log, workout log) with idempotency keys to prevent duplicates on retry. Claude API calls proxy through the backend — the API key never touches the mobile bundle. PostgreSQL food search uses pg_trgm trigram indexes for fast Thai + English partial-match search without Elasticsearch.

**Major components:**
1. **Expo App Shell** — navigation (Tab + Stack via Expo Router), app lifecycle, push permissions, auth gate
2. **TanStack Query + MMKV Layer** — server state cache, offline read access, write queue with automatic retry
3. **Zustand Stores** — auth tokens, UI state (active date, selected meal tab); no server state here
4. **Express Controller-Service-Repository** — request handling, business logic, database access in strict separate layers
5. **Foods Service + barcode_cache** — three-tier barcode lookup: local cache table → Open Food Facts → USDA → manual entry prompt
6. **AI Service (backend only)** — Claude Vision proxy for food photo recognition, Claude text proxy for workout plans, with per-endpoint rate limiting
7. **PostgreSQL** — source of truth; pg_trgm for food search, UUID PKs throughout, denormalized calorie snapshots in food_log

**Key schema decisions:**
- `food_log` stores denormalized calorie/macro snapshot at logging time — food values in the foods table may change later without corrupting history
- `barcode_cache` persists Open Food Facts API responses to reduce repeat external calls
- `user_profiles.bmr_override` accepts Tanita scanner BMR, bypassing Mifflin-St Jeor formula
- Generic sync outbox: `{entity_type, entity_id, payload, idempotency_key}` — all entity types flow through one table, not entity-specific queues

### Critical Pitfalls

1. **Claude Vision gives confident but wrong calorie numbers** — Thai dish estimation error reaches 40-76% in benchmarks (coconut-based curries and stir-fries with hidden fat are worst cases). Never display a single authoritative number. Show a range ("approximately 380-520 kcal"), require user confirmation before logging. Use Haiku to classify the dish, look it up in the curated Thai DB first, and only fall back to Vision estimation when the dish is not found.

2. **Barcode scanning silently fails in standalone production builds** — Camera permissions (`NSCameraUsageDescription` on iOS, `CAMERA` on Android) and the VisionCamera Expo config plugin must be wired in `app.json` before any scanning code is written. Expo Go pre-includes these; standalone builds do not. Test with `eas build --profile development` from day one. Constrain scanner format to EAN-13/EAN-8 explicitly — `ALL_FORMATS` causes misidentification of Thai barcodes as Code 128.

3. **Open Food Facts has incomplete Thai product coverage** — Thai EAN-13 barcodes (prefix 885) frequently return 404. Build a three-tier fallback (Open Food Facts → local Thai packaged food cache → manual entry) before shipping the barcode feature. The "not found" path must always offer manual entry — never a dead-end error screen.

4. **Offline sync creates duplicate log entries** — Generate a client-side UUID idempotency key for every log entry at creation time. Add `UNIQUE(user_id, idempotency_key)` constraint on the backend (duplicate inserts return 200 with existing record). Write log entry and sync queue enqueue in a single SQLite transaction. Use soft deletes (tombstones), not hard deletes — tombstones sync; hard deletes do not. Test: log offline, force-quit, reopen, reconnect — verify exactly N entries appear, not 2N.

5. **JWT expiry silently breaks offline sync flush** — Implement an Axios interceptor that catches 401 responses, silently refreshes using the stored refresh token (MMKV, not AsyncStorage), and retries the original request once. Before any outbox flush, proactively check token expiry and refresh if within 60 seconds of expiration. Set access token minimum expiry to 15 minutes — excessive security for a personal app creates unnecessary friction.

---

## Implications for Roadmap

Based on combined research, the dependency chain is clear and supports a 5-phase build:

### Phase 1: Backend Foundation + Auth
**Rationale:** Everything else depends on the database schema, auth tokens, and API scaffold. Schema decisions made here — idempotency keys, soft deletes, pg_trgm indexes, Tanita BMR field, generic outbox structure — are expensive to retrofit after data exists in production.
**Delivers:** Working Express API with JWT auth (15-min access token, 7-day refresh token in MMKV), PostgreSQL schema (all tables with indexes), Drizzle migrations committed to git, seeded Thai food database ported from prototype and cross-referenced against INMU FCDB values, TDEE/BMR calculation service
**Addresses:** User profile, account persistence, TDEE calculation (validated in prototype, now moves to backend)
**Avoids:** Idempotency key gap — add to schema before any log entries are written; N+1 query pattern — add GROUP BY aggregation queries and `(user_id, date)` indexes from day one; JWT expiry sync failure — implement the Axios interceptor in the API client before any protected route is called
**Research flag:** Standard patterns — well-documented Express + Drizzle + PostgreSQL JWT auth. Skip phase research.

### Phase 2: Core Food Logging (Mobile App)
**Rationale:** The core loop — log food, see macro progress — is the reason the app exists. Everything else (barcode, photo, AI) is an input method for this loop. The prototype already validates the UX; the work is porting it to React Native and wiring to the backend.
**Delivers:** Expo app scaffold, Expo Router tab navigation (Dashboard / Log / Scan / Workout / Profile), food search screen with debounced autocomplete (150ms), manual log entry with serving size adjustment, dashboard with macro progress rings and daily calorie remaining, day history navigation, Zustand auth + UI stores, TanStack Query hooks for all endpoints, recent foods list
**Addresses:** Food log with meal tabs, calorie + macro tracking, Thai food database search (pg_trgm enables Thai-script search from mobile), manual entry fallback, recent foods
**Avoids:** FlatList lag — debounce + useMemo + React.memo from first keystroke, never filter in JS over >200 items; Thai food calorie variance — display source + portion size assumption on every food card (e.g., "Based on INMU standard recipe, 1 serving = 200g"), make portion multiplier easily adjustable
**Research flag:** Standard patterns for React Native food logging with TanStack Query. Skip phase research.

### Phase 3: Water, Weight, and History Visualization
**Rationale:** Standalone features with no blockers that complete the MVP data model before barcode complexity is added. Victory Native XL peer dep compatibility with SDK 53 should be verified at phase start before any chart code is written.
**Delivers:** Water intake quick-tap tracker (150ml / 250ml / 500ml / 750ml buttons, daily progress bar, 5-second undo toast), weight log with Tanita BMR import entry flow, 7-day calorie bar chart, weight trend line chart, macro breakdown donut chart, optional push notification reminders
**Addresses:** Water tracking, weight log, weekly trend charts, Tanita body scanner workflow
**Avoids:** Generic outbox omission — water log and workout log entries must route through the same sync queue as food log from day one, not use a separate API call path without queuing
**Research flag:** Verify Victory Native XL peer dep versions against Expo SDK 53 at phase start. Otherwise standard patterns.

### Phase 4: Barcode Scanning
**Rationale:** Highest-priority new input method per PROJECT.md. Requires the full food log pipeline (Phase 2) to be working — barcode is just an input method for the log, and every step of the barcode-to-log flow (scan → lookup → confirm serving → add to log) depends on Phase 2.
**Delivers:** VisionCamera v5 integration with format-constrained EAN-13/EAN-8 scanning (not ALL_FORMATS), raw barcode value logged on every scan for debugging, Open Food Facts API proxy with barcode_cache table, three-tier fallback (Open Food Facts → local packaged Thai food cache → manual entry), "add missing product" contribution flow (saves barcode + user-entered nutrition to personal DB), in-app explanation screen before camera permission system prompt
**Addresses:** Barcode scanning table stakes feature, Thai packaged food coverage gap, camera permission UX
**Avoids:** Silent failure in standalone builds — configure `app.json` permissions and Expo config plugin before writing any scanning logic, test `eas build --profile development` as first action; EAN-13 misidentification — constrain format, display scanned barcode string before lookup fires; Thai coverage gap — three-tier fallback in place before launch
**Research flag:** Needs phase research — VisionCamera v5 + Expo SDK 53 config plugin wiring for the barcode-scanner companion package is Medium confidence. Validate exact `app.json` configuration against current VisionCamera docs and GitHub issues at phase start.

### Phase 5: Claude AI Features + Offline Hardening
**Rationale:** Highest complexity and highest cost, placed last so the full app context is stable. Offline hardening also belongs here because optimistic UI and mutation queuing wrap existing working features — they need real features to validate against.
**Delivers:** Backend AI service with two endpoints (`/api/ai/analyze-food` and `/api/ai/workout-plan`), food photo capture with client-side image resize to 1000x750px via expo-image-manipulator before base64 encode (10x cost reduction), Claude Vision food recognition with range display and mandatory edit-before-log confirmation step, workout plan generation with structured JSON weekly display and "regenerate" capability, TanStack Query MMKV persistence for offline reads, mutation queuing for offline writes with outbox flush on AppState foreground, error boundaries, loading states, empty states, rate limiting on AI endpoints (10 photo analyses/day, 5 workout plans/day)
**Addresses:** Food photo recognition, AI workout suggestions, offline-first logging guarantee across all entity types
**Avoids:** Claude Vision overconfidence — range display + confirmation UX is mandatory before shipping (never skip for "speed"); API cost spike from uncompressed images — expo-image-manipulator resize before encode; AI workout genericness — feed concrete data to the prompt (current week calories vs. target, workout completion rate); scope copy as "AI-suggested starter plan" not "AI personal trainer"; camera permission rejection — in-app explanation before system prompt, request only on first tap
**Research flag:** Needs phase research — Claude Vision prompt engineering for Thai food structured JSON output reliability, TanStack Query v5 mutation queuing behavior with MMKV persister for offline write queue, Express rate limiting middleware pattern.

### Phase Ordering Rationale

- Backend schema must precede mobile because idempotency keys, soft deletes, pg_trgm indexes, and the generic outbox are expensive to retrofit after live data exists
- Core food logging must precede barcode because barcode is an input method — the log pipeline it feeds must exist and be tested first
- Water and weight are independent of barcode and AI but depend on auth; placing them in Phase 3 keeps Phase 4 focused on barcode complexity without becoming too large
- AI features are last because they depend on the full app (food log for context, camera for photo input, user profile for workout generation) and have the highest iteration cost per test cycle (EAS build times + API costs)
- Offline hardening is last, not first: optimistic UI and mutation queuing are infrastructure that wraps working features — building them speculatively before the features exist creates dead code and delays feedback

### Research Flags

**Needs phase research:**
- **Phase 4 (Barcode):** VisionCamera v5 + Expo SDK 53 config plugin wiring for the companion barcode-scanner package. Medium confidence on exact `app.json` configuration. Check current VisionCamera docs and GitHub issues before writing any scanning code.
- **Phase 5 (AI Features):** Claude Vision prompt engineering for consistent structured JSON food output, TanStack Query v5 mutation queuing with MMKV persister for the offline write queue, Express rate limiting middleware. Patterns exist but specifics need validation against current SDK and library versions.

**Standard patterns (skip research-phase):**
- **Phase 1 (Backend):** Express + Drizzle + PostgreSQL auth with JWT — well-documented, official docs comprehensive, multiple verified tutorials
- **Phase 2 (Core Logging):** React Native food log UI with TanStack Query + Expo Router — established pattern, Expo Router v4 is the SDK 53 default
- **Phase 3 (Water/Weight/Charts):** Victory Native XL charts — widely adopted in React Native projects; verify peer dep versions at phase start, then proceed without further research

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major choices verified against official docs or multiple authoritative sources. VisionCamera v5 + SDK 53 compatibility is Medium (confirmed compiles but not end-to-end validated with barcode plugin); all other choices are High. |
| Features | HIGH | Feature set derived from prototype validation + competitive analysis of MyFitnessPal/Cronometer. Thai food differentiator is well-grounded. Photo recognition accuracy benchmarks are from peer-reviewed 2025 research. |
| Architecture | HIGH | Component boundaries and data flow follow well-documented patterns. WatermelonDB skip decision is conservative but sound for single-user use case — saves significant engineering complexity. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (Vision accuracy, barcode permissions, offline duplicates, JWT expiry) verified against official docs and production GitHub issue reports. Thai food barcode coverage numbers are crowdsourced estimates, not measured. |

**Overall confidence:** HIGH

### Gaps to Address

- **Open Food Facts Thai barcode hit rate**: Confirmed Thai products exist in the database but the exact percentage of Thai convenience-store EAN-13 barcodes that resolve is unknown. Build the three-tier fallback and measure hit rate during Phase 4 testing on real Thai retail products. Target: >60% hit rate at 7-Eleven / FamilyMart.
- **INMU Thai Food Composition Database access**: The authoritative source for Thai food macros is research-oriented, not available via public API. Use it as a reference for validating seeded food data values in Phase 2, not as a live data source. Cross-reference the prototype's 100+ items against INMU values before Phase 2 launch.
- **Claude Vision Thai food accuracy in practice**: The 15-40% error benchmark is from general LLM studies. Thai dish estimation may be worse due to Western training data bias and opaque sauces (coconut milk curries, stir-fry oil). Run a validation test at the start of Phase 5 — photograph 10 common Thai dishes and compare Claude's estimates to INMU reference values. Adjust prompt engineering and disclaimer copy based on results.
- **Victory Native XL peer dep compatibility with Expo SDK 53**: Confirmed as working in published benchmarks but Medium confidence — verify exact peer dep version matrix at Phase 3 start before committing to chart implementation.
- **VisionCamera v5 Expo config plugin wiring for barcode-scanner companion**: Confirmed SDK 53 compiles, but exact `app.json` plugin configuration has not been validated end-to-end. Address as first action in Phase 4 before writing any scanning logic.

---

## Sources

### Primary (HIGH confidence)
- Expo SDK 53 changelog: https://expo.dev/changelog/sdk-53
- VisionCamera V5 official docs: https://react-native-vision-camera.com/docs/guides/code-scanning
- WatermelonDB sync backend docs: https://watermelondb.dev/docs/Sync/Backend
- Drizzle ORM PostgreSQL guide: https://orm.drizzle.team/docs/get-started-postgresql
- Anthropic Claude models overview: https://platform.claude.com/docs/en/about-claude/models/overview
- Claude Vision official documentation: https://platform.claude.com/docs/en/build-with-claude/vision
- Open Food Facts API: https://openfoodfacts.github.io/openfoodfacts-server/api/
- TanStack Query React Native docs: https://tanstack.com/query/v5/docs/framework/react/react-native
- react-native-mmkv GitHub: https://github.com/mrousavy/react-native-mmkv
- Victory Native XL GitHub: https://github.com/FormidableLabs/victory-native-xl

### Secondary (MEDIUM confidence)
- Fridolfsson 2025 / Biolayne — LLM calorie estimation accuracy (~40% mean error): https://biolayne.com/reps/issue-44/can-we-use-ai-to-accurately-track-calories-with-a-picture/
- PMC Thai AI dietary assessment (PMC11107195) — Open Food Facts integration for Thai market
- Thai packaged food nutrition label compliance study (PMC10261350) — 14.1% non-compliance rate
- INMU Thai Food Composition Database: https://inmu.mahidol.ac.th/thaifcd/
- Drizzle vs Prisma comparison 2026: https://encore.dev/articles/drizzle-vs-prisma
- Scanbot barcode library comparison — production barcode scanning issues in React Native
- React Native offline sync SQLite outbox pattern — idempotency key approach: https://dev.to/sathish_daggula/react-native-offline-first-conflict-safe-sqlite-sync-549a

### Tertiary (LOW confidence — needs validation during implementation)
- Open Food Facts Thailand barcode hit rate — estimated from global coverage numbers, not Thailand-specific measurement
- VisionCamera v5 + Expo SDK 53 full config plugin wiring — confirmed compiles, not end-to-end validated with barcode companion package
- Claude Vision Thai food estimation accuracy — inferred from general benchmarks, not a Thai-food-specific study

---

*Research completed: 2026-05-22*
*Ready for roadmap: yes*
