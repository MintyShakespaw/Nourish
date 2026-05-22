# Architecture Patterns: Nourish — Nutrition & Fitness Tracker

**Domain:** Personal mobile health tracker (React Native + Node.js/Express + PostgreSQL)
**Researched:** 2026-05-22
**Confidence:** HIGH for component boundaries and data flow; MEDIUM for sync strategy specifics

---

## Recommended Architecture

Three-tier mobile architecture: React Native client (Expo managed workflow) — Node.js/Express REST API — PostgreSQL database. Offline-first data strategy using TanStack Query + MMKV for local caching, with background sync to backend.

```
┌─────────────────────────────────────────────────────┐
│              React Native (Expo SDK 52+)            │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ TanStack │  │  Zustand │  │   MMKV Storage   │  │
│  │  Query   │  │  Stores  │  │  (local cache)   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                  │            │
│  ┌────▼──────────────▼──────────────────▼─────────┐ │
│  │              Screen Components                  │ │
│  │  Log │ Dashboard │ Scan │ Photo │ Workout │ ...  │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS (JWT Bearer)
┌───────────────────────▼─────────────────────────────┐
│              Node.js / Express API                  │
│                                                     │
│  Auth │ Foods │ Log │ Water │ Weight │ Workout │ AI  │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │  Controller │    │  Claude API (Anthropic)   │   │
│  │  Service    │    │  - vision (food photo)    │   │
│  │  Repository │    │  - text (workout plans)   │   │
│  └──────┬──────┘    └──────────────────────────┘   │
└─────────┼───────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────┐
│                    PostgreSQL                        │
│                                                     │
│  users │ foods │ food_log │ water_log │ weight_log   │
│  workout_plans │ workout_log │ barcode_cache         │
└─────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Expo App Shell** | Navigation structure (Tab + Stack), app lifecycle, push permissions | Screen components, Zustand stores |
| **Screen Components** | UI rendering, user interaction, form state | TanStack Query hooks, Zustand actions |
| **TanStack Query Layer** | Server state: fetching, caching, background sync, optimistic updates | Express API, MMKV persister |
| **Zustand Stores** | Client-only state: auth tokens, UI state, active day, current meal tab | Screen components |
| **MMKV Local Store** | Fast key-value persistence for TanStack Query cache + user profile | TanStack Query persister, Zustand |
| **Camera/Barcode Module** | Hardware access for barcode scan (expo-camera + expo-barcode-scanner) | Barcode lookup screen |
| **Claude Vision Bridge** | Resize image → base64 encode → POST to backend /api/ai/analyze-food | Food photo screen |
| **Express API** | REST endpoints, JWT validation, business logic routing | PostgreSQL, Claude API, Open Food Facts |
| **Auth Middleware** | JWT access token verification on all protected routes | All route handlers |
| **Foods Service** | CRUD for internal food DB, Thai food data, barcode cache management | foods table, Open Food Facts API |
| **Log Service** | Create/read/delete food log entries, aggregate daily macros | food_log table |
| **AI Service** | Proxy to Claude API for vision + workout text generation | Claude API (Anthropic) |
| **Open Food Facts Proxy** | Barcode lookup → normalize response → cache in barcode_cache | External OFF API |
| **PostgreSQL** | Source of truth for all persistent data | Express repositories only |

---

## Data Flow

### 1. Standard Food Log Entry (manual search)
```
User types food name
→ Screen calls useQuery("foods-search", query)
→ TanStack Query checks MMKV cache first
→ If stale/missing: GET /api/foods?q=pad+thai
→ Express Foods controller → Foods repository → PostgreSQL foods table
→ Response cached in MMKV (staleTime: 5 min for food search)
→ User picks food + portion → triggers mutation
→ useMutation → POST /api/log (optimistic UI update first)
→ Express Log controller → food_log insert → PostgreSQL
→ TanStack Query invalidates ["log", date] query
→ Dashboard re-renders with updated macros
```

### 2. Barcode Scan Flow
```
User opens scanner → expo-camera activates camera hardware
→ expo-barcode-scanner decodes EAN/UPC barcode
→ onBarcodeScanned callback fires with barcode string
→ GET /api/foods/barcode/:code (check barcode_cache table first)
│   Hit: return cached food data immediately
│   Miss: Express calls Open Food Facts API
│         https://world.openfoodfacts.net/api/v2/product/:barcode
│         Normalize response to internal food schema
│         INSERT INTO barcode_cache + foods (if new)
│         Return normalized food data
→ App shows food detail screen with nutrition info
→ User confirms portion → POST /api/log (same as manual entry)
```

### 3. Food Photo Recognition (Claude Vision)
```
User taps camera button on food photo screen
→ expo-image-picker / expo-camera captures image
→ App resizes image client-side to max 1568px (keeps token cost at ~1568 tokens = ~$0.0047/image)
→ Convert to base64 JPEG
→ POST /api/ai/analyze-food { image: base64string }
→ Express AI Service builds Claude API request:
    messages: [{role: "user", content: [
      {type: "image", source: {type: "base64", media_type: "image/jpeg", data: "..."}},
      {type: "text", text: "Identify the food items and estimate calories and macros..."}
    ]}]
→ Claude responds with structured food estimate (JSON via prompt engineering)
→ Backend parses response, returns {name, calories, protein, carbs, fat, confidence}
→ App shows estimate with edit fields (user can adjust before logging)
→ User confirms → POST /api/log
```

### 4. Workout Plan Suggestion (Claude Text)
```
User opens Workout tab → requests new plan
→ App has user profile in Zustand (goal, weight, activity level)
→ POST /api/ai/workout-plan { goal, weight, activityLevel, availableDays }
→ Express AI Service:
    messages: [{role: "user", content: "Generate a weekly workout plan..."}]
→ Claude returns structured workout plan
→ Backend stores plan in workout_plans table
→ App displays plan, user can start/log workouts
```

### 5. Offline Write + Sync
```
User logs food while offline
→ TanStack Query mutation fires → network check fails
→ Mutation queued in persistQueryClient mutation cache
→ MMKV stores pending mutations
→ App shows optimistic UI (entry appears immediately with "pending" indicator)
→ Network restored → TanStack Query flushes mutation queue
→ POST /api/log fires → PostgreSQL updated
→ Sync confirmation → "pending" indicator removed
```

### 6. Cross-Device Sync (passive)
```
App foregrounded on new device
→ AppState "active" event fires
→ TanStack Query refetchOnWindowFocus triggers
→ GET /api/log?date=today, GET /api/user/profile, etc.
→ Fresh data from PostgreSQL replaces stale cache
→ No conflict resolution needed: server is source of truth
```

---

## Offline-First vs Online-First Decision

**Recommendation: Pragmatic Offline-First (read-heavy caching, queue-based writes)**

Full offline-first (WatermelonDB + custom sync engine) is over-engineered for this use case because:
- Single user, single active device at a time
- No conflict scenarios (only one person writing)
- No requirement to work for days without connectivity

The right middle ground:
- **Reads**: TanStack Query with MMKV persister, generous staleTime (5 min for food search, 1 min for today's log). Users can browse and read past logs offline.
- **Writes**: Optimistic updates with mutation queuing. If POST fails, TanStack Query retries automatically when online. In practice, food logging requires network only to save — the optimistic UI makes it feel instant.
- **Food DB**: Pre-seed the 100+ Thai/common foods from the existing HTML prototype into PostgreSQL. On first launch, download and cache in MMKV so search works offline for known foods.

**Skip WatermelonDB** — the custom sync protocol it requires against a PostgreSQL backend is significant engineering overhead not justified for a personal tool.

---

## PostgreSQL Schema Outline

### users
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Profile stored separately (changes frequently, audit trail useful)
CREATE TABLE user_profiles (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name  TEXT,
  sex           TEXT CHECK (sex IN ('male', 'female')),
  birth_date    DATE,
  height_cm     NUMERIC(5,1),
  weight_kg     NUMERIC(5,2),         -- current weight (also in weight_log)
  activity_level TEXT,                -- sedentary|light|moderate|active|very_active
  goal          TEXT,                 -- lose_fat|maintain|build_muscle
  protein_rate  NUMERIC(4,2),         -- g per kg bodyweight
  bmr_override  NUMERIC(7,2),         -- from Tanita scanner, overrides calculated BMR
  calorie_target NUMERIC(7,2),        -- calculated or user-set
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### foods (internal database)
```sql
CREATE TABLE foods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en       TEXT NOT NULL,
  name_th       TEXT,                 -- Thai name, critical for Thai food
  brand         TEXT,                 -- null for generic/restaurant foods
  calories_per_100g NUMERIC(7,2) NOT NULL,
  protein_per_100g  NUMERIC(7,2) DEFAULT 0,
  carbs_per_100g    NUMERIC(7,2) DEFAULT 0,
  fat_per_100g      NUMERIC(7,2) DEFAULT 0,
  fiber_per_100g    NUMERIC(7,2) DEFAULT 0,
  sodium_per_100mg  NUMERIC(7,2) DEFAULT 0,
  category      TEXT,                 -- thai|protein|vegetable|grain|dairy|packaged|etc
  source        TEXT DEFAULT 'manual', -- manual|open_food_facts|usda|claude_vision
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX foods_name_en_trgm ON foods USING gin (name_en gin_trgm_ops);
CREATE INDEX foods_name_th_trgm ON foods USING gin (name_th gin_trgm_ops);
-- Trigram index enables fast partial-match search (pg_trgm extension)
```

### barcode_cache
```sql
CREATE TABLE barcode_cache (
  barcode       TEXT PRIMARY KEY,     -- EAN-13, UPC-A, etc.
  food_id       UUID REFERENCES foods(id),
  raw_response  JSONB,                -- original Open Food Facts payload
  looked_up_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### food_log
```sql
CREATE TABLE food_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id       UUID REFERENCES foods(id),
  log_date      DATE NOT NULL,
  meal_type     TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  quantity_g    NUMERIC(7,2) NOT NULL, -- grams consumed
  -- Denormalized snapshot at time of logging (food values may change)
  calories      NUMERIC(7,2) NOT NULL,
  protein_g     NUMERIC(7,2) DEFAULT 0,
  carbs_g       NUMERIC(7,2) DEFAULT 0,
  fat_g         NUMERIC(7,2) DEFAULT 0,
  source        TEXT DEFAULT 'manual', -- manual|barcode|photo_ai
  notes         TEXT,
  logged_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX food_log_user_date ON food_log (user_id, log_date);
```

### water_log
```sql
CREATE TABLE water_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL,
  amount_ml     INTEGER NOT NULL,
  logged_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX water_log_user_date ON water_log (user_id, log_date);
```

### weight_log
```sql
CREATE TABLE weight_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg     NUMERIC(5,2) NOT NULL,
  body_fat_pct  NUMERIC(4,1),         -- from Tanita scanner, optional
  bmr_kcal      NUMERIC(7,2),         -- from Tanita scanner, optional
  measured_at   TIMESTAMPTZ DEFAULT NOW(),
  notes         TEXT
);

CREATE INDEX weight_log_user_time ON weight_log (user_id, measured_at DESC);
```

### workout_plans
```sql
CREATE TABLE workout_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  goal          TEXT,
  plan_json     JSONB NOT NULL,        -- structured plan from Claude
  claude_prompt TEXT,                  -- the prompt used (for regeneration)
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### workout_log
```sql
CREATE TABLE workout_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES workout_plans(id),
  workout_date  DATE NOT NULL,
  exercises     JSONB NOT NULL,        -- [{name, sets, reps, weight_kg}]
  duration_min  INTEGER,
  notes         TEXT,
  logged_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX workout_log_user_date ON workout_log (user_id, workout_date DESC);
```

---

## Express API Route Structure

```
/api
  /auth
    POST /register       -- create account
    POST /login          -- returns access + refresh tokens
    POST /refresh        -- exchange refresh token for new access token
    POST /logout         -- invalidate refresh token

  /profile
    GET  /               -- get user profile
    PUT  /               -- update profile (triggers calorie recalculation)

  /foods
    GET  /               -- search foods (?q=pad+thai&limit=20)
    POST /               -- add custom food
    GET  /barcode/:code  -- lookup by barcode (cache → OFF API)

  /log
    GET  /               -- get log for date (?date=2026-05-22)
    POST /               -- add food log entry
    DELETE /:id          -- remove log entry
    GET  /history        -- aggregated history (?from=&to=)

  /water
    GET  /               -- water log for date (?date=)
    POST /               -- add water entry
    DELETE /:id          -- remove entry

  /weight
    GET  /               -- weight history (?limit=30)
    POST /               -- log weight (+ Tanita data)

  /workout
    GET  /plans          -- list workout plans
    POST /plans          -- save plan (from Claude or manual)
    GET  /plans/:id      -- get plan detail
    POST /log            -- log a completed workout

  /ai
    POST /analyze-food   -- Claude Vision: image → calorie estimate
    POST /workout-plan   -- Claude Text: profile → workout suggestion
```

---

## Express Backend Folder Structure

```
backend/
  src/
    routes/             -- Express router definitions only
      auth.routes.ts
      foods.routes.ts
      log.routes.ts
      water.routes.ts
      weight.routes.ts
      workout.routes.ts
      ai.routes.ts
    controllers/        -- Request/response handling, input validation
      auth.controller.ts
      foods.controller.ts
      log.controller.ts
      ai.controller.ts
    services/           -- Business logic
      auth.service.ts   -- JWT generation, bcrypt hashing
      foods.service.ts  -- search logic, barcode resolution, OFF API
      log.service.ts    -- daily macro aggregation
      ai.service.ts     -- Claude API calls, prompt building, response parsing
    repositories/       -- Database queries only (pg / node-postgres)
      user.repo.ts
      foods.repo.ts
      log.repo.ts
      water.repo.ts
      weight.repo.ts
      workout.repo.ts
    middleware/
      auth.middleware.ts -- JWT verification
      error.middleware.ts
      validate.middleware.ts -- Zod schema validation
    db/
      connection.ts      -- pg Pool setup
      migrations/        -- SQL migration files (numbered)
      seeds/             -- Thai food database seed
    config/
      env.ts             -- typed environment variables (zod)
    app.ts
    server.ts
```

---

## React Native App Folder Structure

```
app/                    -- Expo Router file-based routing
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    index.tsx           -- Dashboard (today's summary)
    log.tsx             -- Food log screen (meal tabs)
    scan.tsx            -- Barcode scanner
    workout.tsx         -- Workout plans + log
    profile.tsx         -- Profile + weight history
  _layout.tsx           -- Root navigator + auth gate

components/
  food/
    FoodSearchBar.tsx
    FoodCard.tsx
    MacroBar.tsx
    MealSection.tsx
  log/
    AddFoodModal.tsx
    PortionSelector.tsx
    PhotoAnalysisModal.tsx
  water/
    WaterTracker.tsx
  workout/
    WorkoutPlanCard.tsx
    ExerciseRow.tsx
  shared/
    LoadingSpinner.tsx
    ErrorBoundary.tsx

hooks/
  useFoodLog.ts         -- TanStack Query: fetch + mutate food log
  useFoodSearch.ts      -- TanStack Query: search foods
  useBarcodeLookup.ts   -- TanStack Query: barcode → food
  useWaterLog.ts
  useWeightLog.ts
  useWorkout.ts
  usePhotoAnalysis.ts   -- Claude Vision mutation

stores/                 -- Zustand
  auth.store.ts         -- tokens, user id
  ui.store.ts           -- active date, selected meal tab, modal state

services/
  api.ts                -- axios instance with JWT interceptor + refresh logic
  camera.ts             -- image resize + base64 helper
  sync.ts               -- AppState listener for refetch-on-foreground

constants/
  macros.ts             -- calorie per gram constants
  foods.seed.ts         -- 100+ Thai foods (also in backend seed, kept here for offline fallback)
```

---

## Claude API Integration Points

### Food Photo Analysis (Vision)

- **Where called:** Mobile app screen → POST to backend `/api/ai/analyze-food`
- **Why backend proxy:** API key stays server-side, never in mobile bundle
- **Image preprocessing:** Client-side resize to 1092x1092px max before base64 encode. At this size: ~1568 tokens, ~$0.0047 per call with claude-sonnet-4-6
- **Request format:** base64 image with type `"image/jpeg"` in content array
- **Response format:** Prompt Claude to return JSON: `{foods: [{name, calories, protein_g, carbs_g, fat_g}], total_calories, confidence: "low|medium|high"}`
- **Use claude-3-5-haiku** for photo analysis (cost efficiency) unless accuracy proves insufficient; claude-sonnet-4-6 as fallback
- **Confidence:** MEDIUM — Claude Vision for food estimation is effective but will have error margin, especially for Thai dishes. User must confirm before logging.

### Workout Plan Generation (Text)

- **Where called:** POST to backend `/api/ai/workout-plan`
- **Input to Claude:** user goal (lose_fat/build_muscle/maintain), weight_kg, age, available_days_per_week, equipment_access
- **Response format:** Prompt for structured JSON: `{plan_name, goal, days: [{day, focus, exercises: [{name, sets, reps, rest_sec, notes}]}]}`
- **Stored in:** `workout_plans.plan_json` (JSONB)
- **Model:** claude-sonnet-4-6 (quality matters more for multi-day plans than for quick food estimates)
- **Regeneration:** Store the prompt template + user params so plans can be regenerated on demand

### Shared Patterns
- All Claude calls go through `backend/src/services/ai.service.ts`
- Rate limit: add per-user rate limiting on AI endpoints (max 10 photo analyses/day, 5 workout plans/day) to prevent runaway API spend
- Always include a system prompt establishing the Claude persona as a fitness assistant
- Parse responses with try/catch — Claude occasionally returns prose instead of JSON; retry with `"return only valid JSON"` appended to prompt

---

## Build Order (Dependency Chain)

Build in this order — each phase unlocks the next:

```
Phase 1: Backend Foundation
  PostgreSQL setup + migrations (all tables)
  Express app scaffold (Controller-Service-Repository layers)
  Auth endpoints (register, login, JWT + refresh tokens)
  User profile endpoints
  WHY FIRST: Everything else depends on auth + DB

Phase 2: Food Database + Search
  Seed Thai food database (port from nutrition_tracker.html)
  Foods search endpoint
  React Native app scaffold (Expo, navigation, auth screens)
  Manual food log CRUD (no barcode yet)
  Dashboard screen (daily macro summary)
  WHY SECOND: Core loop — log food, see progress

Phase 3: Water + Weight Tracking
  Water log endpoints + screen
  Weight log endpoints + screen (+ Tanita import flow)
  History views with charts (Victory Native or React Native Charts Wrapper)
  WHY THIRD: Standalone features, no blockers, completes MVP data model

Phase 4: Barcode Scanning
  expo-camera + expo-barcode-scanner integration
  Open Food Facts API proxy on backend
  barcode_cache table population
  Barcode → food log flow
  WHY FOURTH: Needs food log working (Phase 2 complete)

Phase 5: Claude AI Features
  Backend AI service (api.service.ts, Claude API client)
  Food photo analysis endpoint + mobile camera capture flow
  Workout plan generation endpoint + workout screens
  WHY LAST: Highest complexity, highest cost, needs full app context working

Phase 6: Polish + Offline Hardening
  TanStack Query MMKV persistence (offline reads)
  Mutation queuing for offline writes
  AppState sync-on-foreground
  Error boundaries, loading states, empty states
  WHY LAST: Layer on top of working features, not a foundation
```

---

## Key Architectural Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Expo workflow | Managed (Expo SDK 52+) with Expo Router | Ships both platforms faster; expo-camera covers barcode needs; EAS Build for production |
| Local DB | MMKV + TanStack Query persister (no WatermelonDB) | Single-user personal app; no conflict resolution needed; simpler than WatermelonDB sync protocol |
| State: client | Zustand (2KB, hook-based) | RTK is overkill for a personal app; Zustand handles auth + UI state cleanly |
| State: server | TanStack Query v5 | Cache management, background sync, optimistic updates, offline queuing |
| API client | Axios with interceptor | Handles JWT refresh transparently; interceptor retries on 401 |
| ORM | node-postgres (pg) directly | TypeScript + raw SQL in repositories is more predictable than Sequelize for this schema size |
| Food search | PostgreSQL full-text + pg_trgm | Handles Thai text and partial matches; no Elasticsearch needed at personal scale |
| Claude model | haiku for photo, sonnet for workout | Cost-appropriate; haiku sufficient for single-image food ID |
| Barcode DB | Open Food Facts (free, no key, 4M+ products) | Thailand products confirmed present; free tier sufficient |
| Auth token storage | Expo SecureStore (not AsyncStorage) | Hardware-backed secure enclave on iOS/Android; required for JWT tokens |

---

## Scalability Notes

This is a personal single-user app. Scalability is explicitly not a concern. The architecture is chosen for:
- Developer velocity (build it fast)
- Correctness (don't lose food log entries)
- Maintainability (clear layer separation)

The PostgreSQL schema uses UUID PKs (not sequential integers) so if it ever needed to scale or merge datasets, collision-free IDs are already in place.

---

## Sources

- [Claude Vision API Documentation](https://platform.claude.com/docs/en/build-with-claude/vision) — image formats, token costs, size limits (HIGH confidence, official docs)
- [React Native Offline-First Architecture Guide](https://medium.com/codetodeploy/offline-first-react-native-architecture-guide-765c5f196811) — sync patterns (MEDIUM confidence)
- [WatermelonDB GitHub](https://github.com/Nozbe/WatermelonDB) — sync protocol complexity assessment (HIGH confidence, official repo)
- [TanStack Query Offline Support](https://tanstack.com/query/v4/docs/framework/react/examples/offline) — mutation queuing (HIGH confidence, official docs)
- [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/) — barcode lookup, Thailand products (HIGH confidence, official docs)
- [Expo vs Bare React Native 2025](https://www.godeltech.com/blog/expo-vs-bare-react-native-in-2025/) — workflow recommendation (MEDIUM confidence)
- [Controller-Service-Repository Pattern Node.js](https://www.w3tutorials.net/blog/controller-service-repository-pattern-nodejs/) — backend structure (MEDIUM confidence)
- [Zustand vs Redux Toolkit for React Native Health Apps](https://www.wellally.tech/blog/zustand-vs-redux-react-native-health-apps) — state management recommendation (MEDIUM confidence)
- [JWT Authentication with Refresh Tokens Node.js](https://www.freecodecamp.org/news/how-to-build-a-secure-authentication-system-with-jwt-and-refresh-tokens/) — auth pattern (MEDIUM confidence)
- [React Native Offline Data with React Query and Zustand](https://addjam.com/blog/2026-03-20/react-native-offline-data-react-query-zustand/) — mobile offline pattern (MEDIUM confidence)
