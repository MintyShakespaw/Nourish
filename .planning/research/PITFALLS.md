# Domain Pitfalls

**Domain:** React Native personal nutrition + fitness tracker (Thai food focus)
**Researched:** 2026-05-22
**Confidence:** MEDIUM-HIGH (verified with official Claude docs, peer-reviewed studies, official community sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, severe data loss, or user abandonment.

---

### Pitfall 1: Claude Vision Gives Confident but Wrong Calorie Numbers

**What goes wrong:** Claude Vision estimates calories from food photos with typical mean absolute error of 15-40% in real conditions. For Thai dishes specifically, the error can be higher — beef pho clocked 49% overestimation in benchmarking; bubble tea 76% underestimation. Portion depth is invisible from a 2D photo (bowls, layered plates). Hidden fats (coconut milk in curries, cooking oil, nam man hoy) are not visible. The model produces a confident number regardless of whether it actually knows.

**Why it happens:** AI vision training data skews toward Western meals. Thai food — particularly fried rice, curries, and stir-fries with opaque sauces — suffers from cuisine bias in base model training. Claude Vision is also a general-purpose LLM, not a specialized nutrition model. The official docs warn it "may not always be precisely accurate" for counting and may hallucinate content when images are blurry or ambiguous. Graceful degradation prompts ("if you can't see clearly, say so") actively prevent hallucination but are rarely implemented.

**Consequences:** User logs a meal, sees 450 kcal, eats more, gains weight, blames the app. Loss of trust is permanent. Worse — the app provides numbers that look authoritative (two decimal places) while being 40%+ wrong.

**Prevention:**
- Frame Claude Vision output explicitly as an estimate, never a fact. Show a range: "Approximately 380–520 kcal" rather than "450 kcal".
- Add a mandatory confirmation step where the user adjusts the estimate before it logs.
- Use Haiku (cheapest model) for initial photo classification (identify the dish), then look it up in the curated Thai food database. Use Vision only as a fallback when the dish is not in the database.
- Add explicit prompt instruction: "If you are uncertain about the calorie count due to portion size, hidden ingredients, or unfamiliar cuisine, say so and give a wide range."
- Never let Vision output go to a log entry without user review.

**Detection (warning signs):**
- User complains "the numbers seem off" within first week of use.
- Test: photograph pad kra pao and compare against known INMU database value — if off by >25%, the prompt needs revision.

**Phase:** Address in the Claude Vision integration phase. Prompt engineering and UX confirmation flow are both required before shipping this feature.

---

### Pitfall 2: Barcode Scanning Silently Fails in Production Standalone Builds

**What goes wrong:** Barcode scanning works perfectly in Expo Go during development. After building a standalone APK/IPA, the camera is blank or scanning silently returns nothing. This is the single most reported barcode issue in React Native.

**Why it happens:** Expo Go pre-includes camera permissions. Standalone builds require explicit permission strings in `app.json` (iOS: `NSCameraUsageDescription`, Android: `CAMERA` permission). Missing these strings causes the app to either crash silently or show a permission dialog that immediately denies. Additionally, `react-native-vision-camera` code scanning requires a separate plugin (`vision-camera-code-scanner` or `@mgcrea/vision-camera-barcode-scanner`) that must be configured in the Expo config plugin or `metro.config.js`. Missing this wiring is invisible until a production build.

**Consequences:** The highest-priority feature (barcode scanning, per PROJECT.md) is broken in the build that goes to a real device. Discovery happens late, after a full build cycle (15-30 min on EAS).

**Prevention:**
- Test with a standalone development build (`eas build --profile development`) from day one, not just Expo Go.
- Add permissions explicitly in `app.json` before writing any scanning code.
- Use `expo-camera` for basic scanning or `react-native-vision-camera` + `vision-camera-code-scanner` for production-grade EAN-13 reliability; confirm the Expo plugin is properly registered.
- Write a smoke test checklist: scan one EAN-13 barcode on an actual device in a dark room before calling the feature complete.

**Detection (warning signs):**
- Scanning works on Expo Go but you have not yet tested a standalone build.
- No `NSCameraUsageDescription` key in `app.json` ios plugins section.

**Phase:** Address in Phase 1 / barcode scanning phase. Run first production build test before implementing any scanning logic.

---

### Pitfall 3: Barcode Data Not Found for Thai Packaged Foods

**What goes wrong:** User scans a legitimate Thai product barcode (EAN-13 starting with 885 = Thailand). The Open Food Facts API returns 404. User is stranded with no nutrition data and a bad experience. Coverage for Thai products in Open Food Facts is sparse — the database is crowdsourced and heavily skews Western. A study on Thai packaged foods found 14.1% of nutrition labels do not comply with Thai law, meaning even when data exists, it may be wrong.

**Why it happens:** Open Food Facts has 4M+ products globally but Thai product coverage is materially lower than US/EU coverage. Many small Thai manufacturers do not participate in international databases. The INMU Thai Food Composition Database (Mahidol University) covers traditional dishes well but is not a barcode database.

**Consequences:** If a fallback path is not built, the barcode feature disappoints on the most common use case (local Thai snacks, convenience store food). Users stop scanning and revert to manual entry, defeating the feature's purpose.

**Prevention:**
- Build a three-tier barcode fallback, in order: (1) Open Food Facts API; (2) local curated database of common Thai packaged foods (manually add top 50 from 7-Eleven, FamilyMart, Tops); (3) manual entry with pre-filled name from any barcode metadata available.
- Surface a "This product is not in our database yet. Add it?" contribution flow (save the barcode + user-entered nutrition data to your PostgreSQL backend for future use — builds a private Thai product database over time).
- Never show a bare error state — always offer manual entry as the landing.

**Detection (warning signs):**
- First barcode test on a Thai convenience store item returns 404.
- No fallback UI designed for "product not found".

**Phase:** Address in barcode scanning phase. The three-tier fallback and "add missing product" flow must be designed before launch.

---

### Pitfall 4: Offline Sync Creates Duplicate Log Entries

**What goes wrong:** User logs lunch offline. Reconnects. The sync fires. Due to a race condition or retry without idempotency, the same meal appears twice in the log. This is subtle — the user may not notice for days. When they do, trust in all historical data collapses.

**Why it happens:** AsyncStorage-based sync queues are not transactional. If the app writes a log entry to AsyncStorage and then enqueues a sync task separately, a crash between the two operations leaves the queue inconsistent. On retry, the entry is re-sent without the server knowing it's a duplicate. Using `last write wins` on timestamps fails when device clock is wrong (common for users who don't auto-sync time).

**Consequences:** Corrupted history. User cannot trust past calorie data. Requires manual cleanup. For a single-user personal tool, this is catastrophic to the core value proposition.

**Prevention:**
- Generate a client-side UUID (idempotency key) for every log entry at creation time, stored atomically in SQLite alongside the entry.
- Backend must have a UNIQUE constraint on `(user_id, idempotency_key)` — duplicate inserts return 200 with the existing record, not an error.
- Use SQLite (via `expo-sqlite`) as the local store, not AsyncStorage. Write the log entry and enqueue the sync task in a single SQLite transaction.
- Use `deleted_at` tombstones for deletions, never hard deletes — tombstones sync; hard deletes do not.
- Test: turn on airplane mode, log 3 meals, force-quit the app, reopen, go online, verify exactly 3 entries appear in history, not 6.

**Detection (warning signs):**
- Sync logic written before offline storage schema is decided.
- No idempotency key in the food log schema.
- Using AsyncStorage as the sync queue.

**Phase:** Address in backend + offline sync phase. Schema decision (idempotency key, soft deletes) must be made before any sync code is written.

---

### Pitfall 5: EAN-13 Misidentified as Code 128 by Vision Camera

**What goes wrong:** `react-native-vision-camera` (without a commercial plugin) occasionally detects Thai EAN-13 barcodes as Code 128, returning an unparseable string instead of the 13-digit product code. This has been reproduced on specific devices (Honor Magic V3, iPhone 12) and affects the Open Food Facts lookup silently — the API call is made with a wrong barcode and returns 404 with no indication that the barcode itself was misread.

**Why it happens:** The open-source ML Kit barcode plugin has known format disambiguation issues between EAN-13 and Code 128 for certain print densities and angles. Thailand uses EAN-13 as the standard product barcode. The issue is device and angle dependent.

**Consequences:** Intermittent barcode failures that are hard to reproduce and debug. User thinks the product is not in the database when the scanner is actually misreading.

**Prevention:**
- Always constrain the barcode format scanner to EAN-13 (and EAN-8) explicitly. Do not pass `ALL_FORMATS` — this increases misidentification.
- Log the raw barcode string and format name on every scan to help debug misreads.
- Add a visual validator: display the scanned barcode string on screen before the lookup fires, so the user can see if it looks wrong (13 digits vs. garbled).
- If budget allows, evaluate Scanbot SDK or Dynamsoft for production-grade EAN-13 reliability.

**Detection (warning signs):**
- Scan succeeds (callback fires) but the barcode string is not 13 digits.
- `barcodeType` field shows Code128 for a visually obvious EAN-13 product.

**Phase:** Address during barcode scanning implementation. Add format constraint and raw value logging from day one.

---

## Moderate Pitfalls

---

### Pitfall 6: AI Workout Suggestions Feel Generic and Lose User Engagement Fast

**What goes wrong:** Claude generates a workout plan based on the user's goal (lose fat / build muscle). First time, it feels impressive. Second request, it's nearly identical. By the third week, the user stops using it. The "AI" label creates an expectation of adaptation that a static prompt cannot deliver.

**Why it happens:** Without structured feedback loops (workout completion tracking, progressive overload logic, RPE ratings), the prompt has no new information to reason over. A prompt like "suggest a workout for fat loss" produces the same logical output every time. The gap between "AI-generated" expectation and "template with my name on it" reality causes disillusionment.

**Consequences:** Feature is built, shipped, but unused after two weeks. Time investment wasted. Worse — if the app is promoted as "AI workout coaching," the gap damages credibility of the food tracking features too.

**Prevention:**
- Scope the feature accurately: "AI-suggested starter workout" not "AI personal trainer". Copy should never imply the AI adapts or learns unless you build that explicitly.
- Feed concrete data to the prompt: current week's workout completion rate, logged calories vs. target, days since last rest. Claude can reason over this data even without a ML model.
- Build progressive overload logic explicitly in code (not in the AI prompt) — increase weight/reps on a schedule. AI suggests the plan; code enforces progression.
- Start with a library of 8-10 curated workout templates (based on goal) and use Claude to vary them based on recent data, rather than generating from scratch every time.

**Detection (warning signs):**
- Workout prompt has no input parameters beyond "user goal".
- App copy uses words like "adapts", "learns", "personalized" without a feedback mechanism.

**Phase:** Address during AI workout feature phase. Define what data Claude receives and what "personalization" actually means before writing any prompt.

---

### Pitfall 7: JWT Token Expiry Breaks Sync While App Is in Background

**What goes wrong:** User logs food at 7am. Access token expires at 8am (1-hour expiry). User reopens app at noon. App tries to sync offline entries, gets 401, does not refresh the token automatically, fails silently. User's morning food log is lost or stuck in the outbox indefinitely.

**Why it happens:** React Native background tasks have strict limits. Token refresh logic that works fine in the foreground may not execute correctly when the app is backgrounded or cold-started. Without silent token refresh (using the refresh token before making sync calls), any outbox flush after expiry silently fails.

**Prevention:**
- Implement an Axios/fetch interceptor that catches 401 responses, attempts a silent refresh using the stored refresh token, and retries the original request once.
- Store the refresh token in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android), not AsyncStorage.
- Before any outbox flush, check token expiry (decode JWT, compare `exp` to `Date.now()`), and refresh proactively if it will expire within the next 60 seconds.
- Set access token expiry to at least 15 minutes, not 1 minute (excessive security for a single-user personal app).

**Detection (warning signs):**
- Sync fails with 401 after leaving the app for a few hours.
- Refresh token logic only runs on user-initiated actions, not on outbox flush.

**Phase:** Address in backend auth phase and offline sync phase together.

---

### Pitfall 8: Thai Food Database Calorie Values Have Significant Variance

**What goes wrong:** The same dish (pad thai, khao man gai, tom yum) has wildly different calorie values depending on restaurant, portion size, and preparation method. User adds "Pad Thai" and logs 350 kcal. Actual restaurant version is 680 kcal. User is confused when weight loss stalls.

**Why it happens:** Thailand does not have a standardized restaurant nutrition disclosure requirement for most establishments. The INMU Thai Food Composition Database (the authoritative reference) provides values for standardized recipes; actual restaurant portions may be 1.5-2x the reference portion. The existing prototype database (100+ items from `nutrition_tracker.html`) is a starting point but values were likely estimated, not lab-verified.

**Consequences:** User's calorie tracking is systematically off. They follow the app, do not lose weight, and blame the app rather than the database. Trust erodes.

**Prevention:**
- Clearly display the source and portion size assumption for every Thai food entry: "Based on INMU standard recipe, 1 serving = 200g". Make it tappable.
- Allow easy portion multiplier adjustment (0.5x, 0.75x, 1x, 1.5x, 2x) on every log entry.
- Cross-reference the prototype's 100+ food database values against the INMU Thai Food Composition Database (available online) before launch. Correct systematic errors.
- For restaurant dishes, use a range in the display ("Pad Thai: typically 320–680 kcal depending on portion") to set appropriate expectations.

**Detection (warning signs):**
- Food entries have single calorie values with no portion size label.
- No way for user to adjust portion multiplier after logging.

**Phase:** Address during food database porting phase (porting from HTML prototype to PostgreSQL). Cross-reference before inserting.

---

### Pitfall 9: Water and Workout Logs Not Included in Offline Queue

**What goes wrong:** Food log syncs offline correctly (because it was built first). Water intake and workout logs were added later and use a different code path that does not go through the SQLite outbox. User logs a workout offline; it never syncs. History shows no workout for that day.

**Why it happens:** Offline-first architecture requires every data type to route through the same sync queue from day one. Teams commonly build offline support for food (the primary feature) and then add it as an afterthought for secondary features (water, workouts). The architecture is not designed generically.

**Prevention:**
- Design the sync queue and outbox as a single generic mechanism: `{ entity_type, entity_id, payload, idempotency_key, created_at, synced_at }`. All entity types (food_log, water_log, workout_log, profile) flow through the same table.
- Never write a new data entity without first asking: "does this go through the outbox?"
- Integration test: log one of each entity type offline, reconnect, verify all appear in backend.

**Detection (warning signs):**
- Water or workout logs have separate API call logic without referencing the sync queue.
- Outbox schema has `food_log_id` instead of generic `entity_type + entity_id`.

**Phase:** Address when designing the sync architecture. The generic outbox schema must be defined before any entity-specific sync code is written.

---

## Minor Pitfalls

---

### Pitfall 10: FlatList Performance Degrades on Food Search with Large Database

**What goes wrong:** As the food database grows (starting 100+ items, eventually hundreds after user additions), the search/filter FlatList becomes janky. Each keystroke re-renders the full list. On mid-range Android devices common in Thailand, this causes visible lag.

**Prevention:**
- Move food search filtering to a `useMemo` hook with debounced input (150ms debounce).
- Use `getItemLayout` on FlatList if food items have fixed height.
- Wrap row components in `React.memo`.
- For databases over 500 items, move full-text search to SQLite (built-in FTS5) rather than JS array `.filter()`.

**Phase:** Address during food search UI phase. Add debounce from the start.

---

### Pitfall 11: Claude API Costs Spike if Image Compression Is Not Applied

**What goes wrong:** Camera captures a 4000x3000 pixel JPEG (12MP). Sent directly to Claude API. At `width * height / 750` tokens, that is ~16,000 tokens per image. At Sonnet 4.6 pricing ($3/M input), each photo analysis costs ~$0.05. That sounds small but at 3 photos/day it becomes $54/year for a personal tool on a single user.

**Why it happens:** The API automatically downscales images larger than 1568px on the long edge to fit the token limit. However, the original uncompressed image is still transmitted over the network, increasing latency and data usage. The downscale happens server-side — the client still pays upload bandwidth.

**Prevention:**
- Resize and compress images client-side before sending to Claude API. Target: 1000x750px JPEG at 80% quality. This costs ~1334 tokens = ~$0.004 per image.
- Use `expo-image-manipulator` to resize before upload.
- The cost difference between no compression ($0.047/image at max resolution) and pre-resize ($0.004/image) is 10x.

**Phase:** Address during Claude Vision integration. Never send raw camera output to the API.

---

### Pitfall 12: Camera Permission Requested at Wrong Time Causes User Rejection

**What goes wrong:** App immediately asks for camera permission on first launch ("Nourish wants to use your camera"). User has not yet seen any value. They deny. Feature is permanently broken until they manually go to Settings. On iOS, you only get one automatic prompt attempt.

**Why it happens:** Permissions are requested eagerly on mount, before context is established.

**Prevention:**
- Request camera permission only when the user taps "Scan Barcode" or "Take Photo" for the first time.
- Show an in-app explanation screen before the system prompt: "We need camera access to scan food barcodes. Your photos are never stored on our servers."
- Handle the denied state gracefully: deep-link to Settings with an explanation.

**Phase:** Address during barcode scanning UX phase, before any permission.request() call is written.

---

### Pitfall 13: Backend N+1 Query Pattern on History / Trends Endpoints

**What goes wrong:** History screen requests 30 days of food logs. Backend fetches each day's total in a separate query: 30 SQL calls for one screen load. On self-hosted PostgreSQL with a shared connection pool, this causes noticeable latency on the history endpoint.

**Prevention:**
- Aggregate calorie/macro totals server-side with a single GROUP BY query:
  `SELECT date, SUM(calories), SUM(protein) FROM food_log WHERE user_id = $1 AND date BETWEEN $2 AND $3 GROUP BY date ORDER BY date`.
- Never compute aggregates in the application layer by iterating over fetched rows.
- Add an index on `(user_id, date)` on the food_log table from day one.

**Phase:** Address during backend schema design phase. Define aggregation queries before implementing the history endpoint.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Barcode scanning | Silent failure in standalone builds | Test production build before implementing logic |
| Barcode scanning | EAN-13 misidentified | Constrain format, log raw value |
| Barcode scanning | Missing Thai product in Open Food Facts | Build 3-tier fallback + manual entry landing |
| Food database port | Calorie variance in Thai dishes | Cross-reference INMU database before insert |
| Claude Vision | High error rate on Thai food, hidden fat | Range display + mandatory user confirmation step |
| Claude Vision | API cost spike | Client-side resize to 1000px before upload |
| Backend auth | JWT expiry breaks offline sync | Token interceptor + proactive refresh in outbox flush |
| Offline sync | Duplicate entries on retry | Idempotency key + UNIQUE constraint + SQLite transactions |
| Offline sync | Secondary entities skipped | Generic outbox schema from day one |
| AI workouts | Feature abandoned after two weeks | Scope copy honestly; feed real data to prompt |
| Food search UI | FlatList lag on mid-range Android | Debounce + useMemo from day one |
| History screen | N+1 query pattern | Server-side GROUP BY aggregation |

---

## Sources

- Claude Vision official documentation: https://platform.claude.com/docs/en/build-with-claude/vision
- Claude API pricing (image token formula): https://platform.claude.com/docs/en/about-claude/pricing
- AI food logging accuracy benchmarks: https://fuelnutrition.app/blog/ai-food-logging-accuracy-benchmarks-failure-modes-and-a-practical-audit
- Peer-reviewed Thai food AI dietary assessment: https://pmc.ncbi.nlm.nih.gov/articles/PMC11107195/
- INMU Thai Food Composition Database: https://inmu.mahidol.ac.th/thaifcd/
- Thai packaged food nutrition label compliance study: https://pmc.ncbi.nlm.nih.gov/articles/PMC10261350/
- Open Food Facts database: https://world.openfoodfacts.org/data
- Vision Camera barcode scanner production issues: https://scanbot.io/blog/popular-open-source-react-native-barcode-scanners/
- Vision Camera EAN-13 Code 128 misidentification: https://github.com/mgcrea/vision-camera-barcode-scanner
- React Native offline sync SQLite outbox pattern: https://dev.to/sathish_daggula/react-native-offline-first-conflict-safe-sqlite-sync-549a
- JWT refresh token mobile pitfalls: https://www.w3tutorials.net/blog/how-to-handle-jwt-refresh-token-in-a-mobile-app-environment/
- FlatList performance optimization: https://reactnative.dev/docs/optimizing-flatlist-configuration
- AI workout app personalization pitfalls: https://rollingout.com/2025/06/20/ai-workout-plans-risks/
- AI calorie estimation accuracy (LLM study - ~40% error): https://biolayne.com/reps/issue-44/can-we-use-ai-to-accurately-track-calories-with-a-picture/
- Nutrition database accuracy comparison (40% variance across databases): https://www.welling.ai/articles/most-accurate-calorie-tracker-app
