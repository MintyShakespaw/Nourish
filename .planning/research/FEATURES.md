# Feature Landscape: Nutrition + Fitness Tracker

**Domain:** Personal nutrition, workout, and hydration tracking (React Native mobile)
**Researched:** 2026-05-22
**Project:** Nourish — single-user, Thai-food-aware, Claude AI-powered

---

## Table Stakes

Features users expect from any nutrition tracking app. Missing = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Food search by name | Core logging method; every app has it | Low | Autocomplete on keystroke; must cover Thai food names |
| Calorie + macro display (carbs, protein, fat) | The primary reason people open the app | Low | Per meal and daily totals; progress rings/bars are standard UI |
| Meal tabs (Breakfast / Lunch / Dinner / Snack) | Users mentally categorize meals this way | Low | Already validated in prototype |
| Daily calorie target with remaining balance | Users need to see headroom or overage instantly | Low | "X cal remaining" or "X cal over" must be prominent |
| TDEE / BMR calculation from profile data | Without this, calorie targets are meaningless | Medium | Weight, height, age, sex, activity level, goal → Mifflin-St Jeor or Katch-McArdle; prototype already does this |
| Food log persistence (today + history) | Logging is useless if data disappears | Low | Day-level navigation back through history required |
| Barcode scanning for packaged food | Users expect to scan labels, not type product names; MyFitnessPal's 2024 paywall on this feature drove mass user exodus | Medium | react-native-vision-camera is the standard library; EAN-13 and UPC-A at minimum |
| Manual food entry / edit nutrition | Fallback for unscanned or unlisted foods; also for home-cooked food | Low | Name + calories + macros minimum; serving size matters |
| Recent foods / favorites | Logging friction reduction; users eat the same things repeatedly | Low | Show last 5–10 foods in search; reduces daily taps significantly |
| Serving size adjustment | Eating 150g of something listed per 100g is normal | Low | Multiplier input or gram override |
| Water intake tracking | Virtually every major tracker (MyFitnessPal, Lose It, Cronometer) includes this | Low | Quick-tap interface (250ml / 500ml buttons); daily target vs actual |
| Daily summary view | Users need one-screen status: calories, macros, water, today's log | Low | Dashboard pattern; summary rings common |
| Weight log (manual entry) | Users weigh themselves and want to track trend | Low | Date + kg/lbs entry; line chart over time |
| Cross-device / account sync | Data must survive a new phone; users expect cloud backup | Medium | JWT auth + backend API; already in project requirements |

---

## Differentiators

Features that set a product apart. Not universally expected, but high value when done well.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Thai food database (curated, named in Thai) | Mainstream apps (MyFitnessPal, Cronometer) have poor Thai food coverage; a curated local database is a genuine competitive advantage for Thailand-based users | Medium | 100+ dishes already exist in prototype; should grow to 300–500 with Thai-language names and accurate macros; tom yum, pad thai, khao pad, laab, som tum etc. must all be there |
| Claude Vision food photo recognition | Reduces logging to "take a photo"; eliminates friction for home-cooked meals and restaurant dishes that cannot be barcoded | High | General-purpose LLMs show ~40% average error for weight/calorie estimation (Fridolfsson 2025); position as "rough estimate + manual confirm" flow, not precision tool; good for Thai food where the DB might miss items |
| AI workout plan suggestions (Claude) | Users with fat-loss or muscle-gain goals want structured guidance; most pure nutrition trackers don't include this | Medium | Claude prompt: user's goal, current weight, available equipment → output weekly plan; regenerate weekly; avoid pretending to be a personal trainer (disclaimer) |
| Tanita body scanner BMR import | Tanita scales measure precise BMR via bioelectrical impedance; importing from scan removes the estimation error of Mifflin-St Jeor formula | Low | Manual entry workflow: user reads BMR from Tanita printout, enters into profile; no Bluetooth API needed unless Tanita SDK becomes available |
| Macro split customization (protein rate) | Cronometer's claim to fame is precision; offering configurable protein-per-kg target (not just generic 30/40/30 split) appeals to fitness-focused users | Low | Already in prototype; protein rate (g/kg) → derive protein target → fill fat/carb from remainder |
| Copy previous day / meal template | Users who meal-prep eat identical meals for days; one-tap re-logging is a retention driver | Low | "Copy yesterday's breakfast" or save a named meal template |
| Weekly trend charts | Seeing progress (or catching a spiral) is the motivational payoff of tracking | Medium | Calorie 7-day average, weight trend line, macro breakdown chart; Victory Native or react-native-chart-kit |
| Offline-first logging | Gym basement, remote beach resort, airplane — logging must work without internet | Medium | Local SQLite as source of truth; sync queue for when connectivity returns; Expo SQLite or WatermelonDB |
| Reminder notifications | Users forget to log; a gentle evening nudge ("You haven't logged dinner yet") improves consistency | Low | Simple push notification; configurable schedule |

---

## Anti-Features

Features to explicitly NOT build for a personal tool. They add complexity without value for this use case.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Social feed / sharing | This is a personal tool; social features require moderation, privacy design, and multi-user data isolation — none of which apply | Nothing; the user doesn't want social features |
| Community / friends / challenges | Same reason; also raises GDPR/PDPA considerations | Nothing |
| Recipe import from URLs | High complexity (web scraping, ingredient parsing, nutrition matching) for low daily-use payoff; the prototype already has a working food database | Manually add common home recipes to the Thai food database |
| Meal planner / weekly scheduling | Users log retrospectively (what they ate), not prospectively (what they plan to eat); planning UX is a different product entirely | Focus on fast retroactive logging |
| Grocery list generation | Planning feature; same problem as meal planner; adds UI surface for zero tracking benefit | Not applicable |
| Apple Watch / wearable sync | Explicitly out of scope per PROJECT.md; hardware integration doubles QA surface area | Tanita BMR manual entry is the only body-scanner integration needed |
| Nutritionist consultation / in-app advice engine | Clinical advice is a regulated activity; creates liability; the AI workout plans should include a disclaimer | Claude workout plans with clear "this is general fitness guidance, not medical advice" copy |
| Gamification (badges, streaks, leaderboards) | Research shows users rate gamification lowest among desired features (mean 3.8/7); it doesn't improve retention for health-tracking use cases in personal tools | Simple logging consistency indicators (logged X of last 7 days) without gamification layer |
| Recipe nutrition calculator | Complex to implement correctly (serving sizes, cooking loss factors, crowdsourced ingredient errors); not needed for a curated Thai food DB approach | Add Thai dishes as atomic food items with their macros pre-calculated |
| Subscription / paywall | Personal tool; no monetization planned | Everything is free by design |
| Public sign-up / multi-tenancy | Single user; backend is personal infrastructure | Single user account; no registration flow for others |

---

## Feature Dependencies

```
Profile (weight, height, age, sex, activity, goal)
  → TDEE / BMR calculation
    → Daily calorie target
      → Food log progress display
        → History + trend charts

Barcode scan → Open Food Facts API → Food result → Serving adjustment → Log entry
Barcode scan [miss] → Manual search → Manual entry

Photo → Claude Vision API → Calorie estimate → User confirms/edits → Log entry

User goal + weight → Claude API → Workout plan → Display

Weight log entries → Weight trend chart

Food log entries → Weekly calorie chart → 7-day average line
```

---

## Food Logging Methods: Priority and UX Pattern

### 1. Barcode Scanning (highest daily use for packaged food)

**Library:** react-native-vision-camera with `useCodeScanner` hook
**Flow:**
1. Tap "+" → "Scan Barcode"
2. Camera opens with overlay frame
3. Scanner detects EAN-13 / UPC-A → disables immediately to prevent double-scan
4. API call: Open Food Facts first; fall back to USDA FoodData Central for US-branded imports
5. Success → product card with name, serving size, calories, macros → "Add to [Meal]"
6. Not found → "Product not found. Add manually?" → manual entry form pre-filled with barcode

**Thai coverage reality:** Open Food Facts has growing Thailand coverage but it's incomplete. USDA covers US-exported brands found in Thailand (Lay's, Nestlé, etc.). The gap for locally-produced Thai packaged goods (CP, Betagro, local snacks) should be filled by allowing manual additions that are saved to the personal custom food database on the backend.

**Confidence:** HIGH — react-native-vision-camera + Open Food Facts is the established pattern for React Native barcode food scanning.

### 2. Photo Recognition via Claude Vision (secondary; home-cooked / restaurant)

**Flow:**
1. Tap "+" → "Take Photo"
2. Camera opens → capture
3. Image sent to Claude Vision API with structured prompt: dish identification + portion estimation in grams + macro estimate
4. Response displays identified dish, estimated serving size, estimated calories/macros
5. User can edit any field before confirming
6. "This is an estimate (±30-40%). Adjust if needed." disclaimer visible

**Accuracy expectation:** General-purpose LLMs including Claude show ~40% average error for energy estimation (2025 research). This is worse than specialized models (Snap Calorie: 15% error) but better than nothing for unlogged home-cooked meals. Position as "rough estimate" not precision tracking. Thai food photo recognition will be better than global average because the Thai food database can pre-bias Claude's interpretation.

**Confidence:** MEDIUM — Claude Vision capabilities are real but accuracy benchmarks for calorie estimation are from external research (Fridolfsson 2025 via Biolayne).

### 3. Database Search (primary for Thai home cooking)

**Flow:** Search bar → autocomplete against local food DB (Thai foods) + backend search → tap result → serving adjustment → add
The curated Thai food database is the key differentiator here. Users looking up pad thai or tom kha should find it immediately with accurate macros.

### 4. Manual Entry (fallback)

Name + calories + optional macros. Saved to custom foods on the backend. Speeds up future logging of the same food.

### 5. Voice Logging (skip for MVP)

MyFitnessPal's voice logging is Premium-only and English-only. Thai language STT to food intent matching is complex. The manual search with autocomplete serves the same purpose with less implementation risk. Voice can be added as a later enhancement if demand exists.

---

## Nutrition Data Sources

| Source | Coverage | Thai Food | Barcode | API Cost | Recommendation |
|--------|----------|-----------|---------|----------|----------------|
| Open Food Facts | 4M+ products, 150 countries | Partial (crowdsourced TH data) | Yes (primary) | Free, open | Use as primary barcode lookup |
| USDA FoodData Central | 380K foods, US focus | Minimal | Yes (branded US products) | Free, API key | Use as fallback for US brands sold in Thailand |
| Custom Thai food database | 100+ items (from prototype) | Full, curated | No | Zero | Port from prototype; primary for Thai dishes |
| INMU Thai FCDB | ~700+ Thai foods, AOAC validated | Full | No | Research-only | Reference for macro values when adding new Thai items to custom DB |
| Cronometer NCCDB / USDA SR | 1M+ verified nutrients | Minimal | No | Subscription | Not needed; overkill for personal tool |

**Strategy:** Three-tier lookup for barcode scans:
1. Open Food Facts (most likely match for Thailand retail)
2. USDA FoodData Central (US imports)
3. "Not found" → prompt manual entry → save to personal custom DB

For name-based search: query custom Thai food DB first (fastest, highest accuracy for daily use), then Open Food Facts, then USDA.

**Confidence:** MEDIUM — Open Food Facts Thailand coverage is confirmed as available but incomplete; specific count of Thai barcodes not publicly disclosed.

---

## Water Tracking UX

**Pattern:** Single quick-log interface, not a separate app section.

- Fixed quick-add buttons: 150ml (small glass), 250ml (glass), 500ml (bottle), 750ml (large bottle)
- Daily goal display: "1.2L / 2.0L" with progress bar
- Tap a button → immediately adds without confirmation dialog
- Undo available for 5 seconds (toast with "Undo" button)
- History: daily totals only, not individual log entries; weekly chart is nice-to-have

**Default target:** 2,000ml (adjustable in profile). Activity-based adjustment (e.g., +500ml on workout days) is a differentiator, not table stakes.

**Notifications:** Optional reminder at configurable times (e.g., 10am, 2pm, 6pm) — low complexity, high retention value.

**Complexity:** Low. This is a counter + progress bar, not a complex feature.

---

## History + Trends Data Visualization

### Required Views

| View | Data Shown | Frequency | Complexity |
|------|------------|-----------|------------|
| Day view | Full food log, meal by meal, macros, water | Primary daily view | Low |
| 7-day calorie chart | Bar chart, daily calories vs target | Weekly review | Low |
| Weight trend chart | Line chart, weight over time | Whenever user weighs in | Low |
| Macro breakdown | Pie/donut chart per day or week | Nutritional review | Low |

### Deferred (not MVP)

- Monthly / yearly aggregates — useful later but 7-day is the engagement-relevant window
- Micronutrient tracking (vitamins, minerals) — Cronometer-level complexity; not needed for calorie/macro goal
- HRV / sleep correlation — requires wearable; out of scope
- Body measurement trends (waist, arms etc.) — can add later if user wants

**Library recommendation:** Victory Native (react-native-victory-native) or React Native Charts Kit. Both handle line and bar charts with React Native compatibility. Expo-compatible options preferred. Decision belongs in STACK.md.

**Confidence:** HIGH — chart libraries for React Native are well-established.

---

## Workout Tracking

### AI-Suggested Plans (Claude API)

**Scope:** Claude generates a weekly workout suggestion based on user goal (fat loss / muscle gain / maintenance), current weight, and any equipment notes. This is not a live coaching session — it's a weekly plan card.

**Flow:**
1. User opens "Workout" tab
2. If no plan exists: "Generate Plan" button
3. Claude prompt includes: goal, weight, fitness level (beginner/intermediate/advanced), available equipment
4. Response: 3–5 day weekly structure (e.g., Mon: Upper body push, Wed: Lower body, Fri: Cardio) with exercises, sets, reps
5. Plan displayed as readable card; user can regenerate

**What NOT to include (MVP):**
- Exercise logging with progressive overload tracking (this is a nutrition app with workout suggestions, not a gym tracker)
- 1RM calculations, rest timer, superset tracking
- Video demonstrations (content licensing complexity)

**Why:** The project goal is nutrition tracking with workout plan suggestions. Building a full gym tracker (Strong, Setgraph, Hevy) duplicates a saturated market. The differentiator is the Claude AI suggestion tied to nutrition goals, not workout logging depth.

**Confidence:** MEDIUM — Claude API capability for workout plan generation is reasonable; specific prompt engineering for Thai context (available equipment in Thai context, e.g., no gym / BKK gym / home) needs validation.

---

## Offline vs. Online Data Patterns

**Strategy:** Offline-first for all logging operations; sync when connected.

| Operation | Offline Behavior | Online Behavior |
|-----------|-----------------|-----------------|
| Log a food entry | Write to local SQLite; queue sync | Write local + sync immediately |
| Barcode scan | Look up local cache; show "offline — add manually" if not cached | Full Open Food Facts API call |
| Photo recognition | Not available offline (Claude API required) | Normal flow |
| View history | Reads from local SQLite | Same (local is source of truth) |
| Weight entry | Write local; queue sync | Write local + sync |
| Water entry | Write local; queue sync | Write local + sync |
| Workout plan | Cached from last fetch | Fetch fresh from Claude |

**Implementation:** Expo SQLite for local storage. Sync queue with timestamp-based conflict resolution (last-write-wins is safe for single user). Sync on app foreground + connectivity change event.

**Single-user simplification:** No multi-device conflict beyond the user's two devices (phone + maybe tablet). Last-write-wins is acceptable; no CRDT complexity needed.

**Confidence:** HIGH — offline-first patterns for React Native with Expo SQLite are well-documented.

---

## Thai / Asian Food Database Considerations

### The Gap Problem

- Open Food Facts Thailand coverage: growing but incomplete for locally produced packaged goods
- USDA FoodData Central: minimal Thai food, US-centric branded items only
- MyFitnessPal crowdsourced DB: unreliable macro accuracy for Thai dishes (community-entered, unvalidated)
- No authoritative API exists for Thai restaurant / street food / home cooking

### Strategy for Nourish

1. **Port and expand the prototype database** — the existing 100+ item list is the foundation. Expand to 300–500 items covering:
   - Street food staples (pad thai, pad see ew, som tum, larb, mango sticky rice)
   - Thai soups (tom yum, tom kha, kuay tiew)
   - One-plate rice dishes (khao man gai, khao na pet, khao pat)
   - Thai noodles (pad kee mao, yen ta fo)
   - Commonly eaten snacks (moo ping, sai oua, khanom buang)
   - International fast food chains present in Thailand (McDonald's TH menu, KFC TH, MK Restaurant)

2. **Store macro values from INMU FCDB** — The Mahidol University food composition database (available via FAO INFOODS) is the authoritative source for Thai food macros. Use it to validate/correct prototype values.

3. **Thai-language names** — Store both Thai script (ข้าวผัด) and transliteration (khao pat) for search; Thai-speaking users will search in Thai.

4. **Custom food contributions saved to user's backend** — when user manually enters a food not in the DB, it saves to their personal food list. This builds up a personal "my foods" collection over time.

5. **Barcode gaps for Thai packaged food** — Accept that some Thai-produced packaged goods will not be in Open Food Facts. The "not found" → manual entry → save to personal DB flow handles this gracefully.

### Confidence: MEDIUM
Open Food Facts Thailand data exists but is crowdsourced and incomplete. INMU FCDB is authoritative but access is research-oriented, not via public API. The curated prototype DB approach is the right pragmatic answer.

---

## MVP Feature Priority

### Phase 1 — Core Tracking (must ship first)
1. Food log with meal tabs (Breakfast / Lunch / Dinner / Snack)
2. Thai food database (port prototype, expand to 200+ items)
3. Calorie + macro tracking with TDEE-based target
4. Manual food entry + serving size adjustment
5. Water intake tracking (quick-tap buttons + daily progress)
6. Day history navigation (browse past days)
7. User profile (weight, height, age, sex, activity, goal, protein rate)
8. Backend sync (account, daily log persistence)

### Phase 2 — Input Methods
1. Barcode scanning (Open Food Facts + USDA fallback)
2. Recent foods / favorites
3. 7-day calorie chart + weight trend chart
4. Weight log

### Phase 3 — AI Features
1. Food photo recognition (Claude Vision → estimate → user confirms)
2. AI workout plan suggestions (Claude API → weekly plan card)

### Defer Indefinitely
- Voice logging
- Recipe import from URLs
- Meal planning / scheduling
- Social features
- Wearable integrations beyond Tanita manual BMR entry

---

## Sources

- Caloriebliss — Best Calorie Tracking Apps 2026 comparison (barcode as free-tier expectation, pricing trends)
- Nutrola — MyFitnessPal vs Cronometer vs Lose It free tier 2026
- Cal AI — Cronometer vs Lose It 2025
- Biolayne / Fridolfsson 2025 — LLM calorie estimation accuracy (~40% error for Claude/GPT-4)
- Nutrient Metrics 2026 systematic review — portion estimation is the accuracy bottleneck (15–25% error from 2D photos)
- PMC / NCT study (PMC10337335) — user research: time investment #1 dropout reason; database quality #2; gamification rated lowest
- WellAlly Tech — React Native Vision Camera + Open Food Facts barcode scanning pattern
- PMC AI Thai food system (PMC11107195) — Thai AI dietary assessment; Open Food Facts integration for Thai market
- FAO INFOODS — Thailand Food Composition Database (INMU FCDB)
- USDA FoodData Central — API coverage (US focus, limited international)
- Open Food Facts — 4M+ products, 150 countries, Thailand portal at th-en.openfoodfacts.org
- Scandit blog — React Native barcode scanner developer guide
- InnovationM blog — React Native offline-first SQLite architecture
- Spikeapi — Top nutrition APIs for app developers 2026
