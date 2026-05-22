<!-- GSD:project-start source:PROJECT.md -->
## Project

**Nourish — Personal Nutrition & Fitness Tracker**

A personal React Native mobile app (iOS + Android) for tracking daily nutrition, water intake, and workouts. Built for one user — no multi-tenant complexity. Ports the existing `nutrition_tracker.html` prototype into a native mobile experience with barcode scanning, Claude-powered food photo recognition, AI-suggested workout plans, and a Node.js/Express backend for account sync and data persistence.

**Core Value:** Log what you eat and stay on track with your calorie + macro targets — fast, on your phone, with real Thai food support.

### Constraints

- **Platform**: React Native — needed for native camera/barcode hardware access on mobile
- **AI**: Claude API (Anthropic) only — used for both food photo recognition and workout plan suggestions
- **Backend**: Node.js + Express + PostgreSQL — custom API, self-hosted
- **Users**: Single user (personal tool) — no multi-tenancy requirements, no public sign-up
- **Thai food**: Database must include Thai dishes with Thai-language names — core to daily use
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Mobile Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Expo | SDK 53 | React Native framework | New Architecture enabled by default; all expo-* packages support New Architecture (including bridgeless). 74.6% of SDK 52 EAS builds already on New Architecture. SDK 55 will make it mandatory — start there now. |
| React Native | 0.79+ (via SDK 53) | Cross-platform mobile runtime | iOS + Android from one codebase; required for native camera and barcode hardware access that PWA cannot reliably provide on iOS. |
| TypeScript | 5.x | Language | Non-negotiable for a project with complex domain models (food logs, macros, sync state). Catches class of bugs that cost days to debug at runtime. |
### Navigation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Expo Router | v4 (bundled with SDK 53) | File-based routing | Ships with SDK 53; file-based routing maps cleanly to tab structure (Breakfast / Lunch / Dinner / Snack / History). Automatic deep linking. Removes boilerplate vs. React Navigation setup. Use over standalone React Navigation for new Expo projects. |
### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.x | UI and app state (profile, current day's food log) | Minimal boilerplate, no provider wrapping, tiny bundle. Redux is overkill for a single-user personal app. Context API collapses under frequent updates (food log entries). |
| TanStack Query | v5 | Server state (history, syncing, background refetch) | Network-aware caching with built-in offline mutation queue via `PersistQueryClientProvider`. Handles the "log offline, sync later" pattern without custom code. |
### Local Storage (Offline-First)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| WatermelonDB | ^0.27 | Primary local database for food log, foods, workouts | SQLite-backed; queries run in native thread (never blocks JS). Built-in sync protocol with custom backends. Lazy loading means 50,000 records opens as fast as 50. Handles offline logging correctly: writes are instant, sync runs on reconnect. AsyncStorage is a key-value store that crashes under relational food data at volume. |
| react-native-mmkv | v4 (Nitro Module) | Token storage, small config values | AES-256 encrypted, 30x faster than AsyncStorage. Stores JWT tokens safely. Do NOT use AsyncStorage for auth tokens — it is unencrypted and extractable if the device is compromised. |
### Camera & Barcode Scanning
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-native-vision-camera | v5 (5.0.x) | Camera foundation | V5 is fully rewritten to Nitro Modules with the new Constraints API. V4 is archived and unmaintained. Powers both barcode scanning and food photo capture. Compatible with Expo SDK 53 (SDK 54 had Xcode 26 beta build issues — target SDK 53 until resolved). |
| react-native-vision-camera-barcode-scanner | latest | Barcode decoding via MLKit | Required companion for V5 (CodeScanner is no longer in VisionCamera core). Uses Google MLKit on both iOS and Android for consistent cross-platform barcode detection. Supports EAN-13 / EAN-8 / Code-128 / QR — covers all Thai packaged food barcodes. |
### Food Data (Barcode Lookup)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Open Food Facts API | v2 (REST) | Barcode → nutrition data | Free, no API key, 4M+ products globally, 3,000+ Thai products already in database. Community-contributed. Fallback to manual entry when product not found. |
### AI Integration (Claude Vision + Workout Plans)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Anthropic SDK (`@anthropic-ai/sdk`) | ^0.39+ | Claude API client | Official SDK. All calls go through the Node.js backend — NEVER call Anthropic directly from the mobile app (the API key would be exposed in the bundle). |
- **Food photo recognition:** `claude-haiku-4-5` — fastest response, lowest cost ($1/$5 per MTok), good enough vision for common meal identification. Use when speed matters (user is waiting with camera open).
- **Workout plan generation:** `claude-sonnet-4-6` — more reasoning depth needed for personalized plan generation based on user goal + history. Slower is acceptable since this is a background generation task.
### Charts & Data Visualization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Victory Native XL | ^41.x | Calorie/macro trend charts, weight history | Rewritten from scratch with Skia + Reanimated. Renders at 100+ FPS on low-end devices. Cross-platform consistent. Use over react-native-chart-kit (abandoned) and react-native-gifted-charts (limited interactivity). Recharts is web-only — not an option for React Native. |
## Backend Stack
### Core
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 22 LTS | Runtime | LTS, actively maintained. Matches React Native JavaScript mental model. |
| Express.js | ^4.x | HTTP server | Minimal, well-understood, vast middleware ecosystem. Fastify is a valid alternative but Express has more examples for JWT + PostgreSQL auth patterns. |
| TypeScript | 5.x | Language | Shared type definitions between backend and mobile (via a shared types package or copy) prevents the most common API contract bugs. |
### Database & ORM
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 17 | Primary data store | Stores users, food logs, food items, workout plans, weight history. Relational model maps cleanly to the domain. |
| Drizzle ORM | ^0.44.x | Database access | Code-first TypeScript schema, zero dependencies (7.4kb), stays close to SQL so slow queries are debuggable. Better choice than Prisma for a project where you will write joins (weekly macro summaries, history aggregations). Prisma's higher abstraction makes custom aggregations awkward. TypeORM is legacy — avoid. |
| drizzle-kit | ^0.30.x | Schema migrations | `generate + migrate` workflow gives versioned migration files committed to git. Never run `push` in production. |
### Authentication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `jsonwebtoken` | ^9.x | JWT signing/verification | Standard, well-audited. |
| `bcryptjs` | ^2.x | Password hashing | bcrypt is the correct algorithm for password storage. Never store plain or MD5-hashed passwords. |
- Access tokens: 15-minute expiry, stored in memory on the mobile app (Zustand state — lost on app kill, which is fine)
- Refresh tokens: 7-day expiry, stored in `react-native-mmkv` (AES-256 encrypted), rotated on each use, hashed copy stored in PostgreSQL
- HTTP-only cookies are not usable from React Native (not a browser); MMKV + refresh token rotation is the correct mobile equivalent
### WatermelonDB Sync Backend
## Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3.x | Runtime validation | Validate all API request bodies on the backend; validate Claude API responses before display. Required — Claude can return malformed JSON for edge-case foods. |
| `react-native-reanimated` | ^3.x | Animations | Required peer dep for Victory Native XL. Also used for smooth food log entry animations. Already included in Expo SDK 53. |
| `react-native-gesture-handler` | ^2.x | Touch handling | Required peer dep for Victory Native XL. Already included in Expo SDK 53. |
| `@shopify/react-native-skia` | ^1.x | Canvas rendering | Required peer dep for Victory Native XL. |
| `expo-image-picker` | SDK 53 | Photo library access | For selecting meal photo from camera roll as alternative to live camera capture. |
| `expo-notifications` | SDK 53 | Water intake reminders | Optional push for daily tracking reminders. |
| `expo-secure-store` | SDK 53 | Fallback keychain access | Use mmkv as primary; expo-secure-store as fallback for very small secrets if needed. |
| `dayjs` | ^1.x | Date formatting | Lightweight Moment.js replacement. Needed for daily log grouping, "today vs. yesterday" views, week aggregation. |
| `axios` or `ky` | latest | HTTP client (mobile) | Either works. `ky` is smaller and Fetch-based. Pick one and use it consistently with TanStack Query's `queryFn`. |
| `cors` | ^2.x | Express middleware | Required for any web-based testing or admin tooling hitting the backend. |
| `helmet` | ^7.x | Express security headers | Default-on security hardening with one line. |
| `morgan` | ^1.x | HTTP request logging | Development logging. |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Navigation | Expo Router v4 | React Navigation v7 | Expo Router is the default for new SDK 53 projects; file-based routing reduces boilerplate. React Navigation is still valid but adds config overhead. |
| State management | Zustand + TanStack Query | Redux Toolkit | RTK is correct for large teams with complex shared state. Single-user personal app doesn't need the overhead. |
| Local DB | WatermelonDB | expo-sqlite (direct) | expo-sqlite works but requires building sync logic from scratch. WatermelonDB's built-in sync protocol saves weeks of custom conflict resolution code. |
| Local DB | WatermelonDB | Realm | Realm has MongoDB Atlas sync pricing complexity. WatermelonDB with a custom Node.js backend is simpler and free. |
| ORM | Drizzle | Prisma | Prisma v7 dropped its Rust engine (good) but still weighs ~1.6MB vs Drizzle's 7.4kb. More importantly: the nutrition history queries involve aggregations that Drizzle expresses more naturally in SQL. |
| ORM | Drizzle | TypeORM | TypeORM is legacy, has known decorator-based footguns, and is slower to develop for TypeScript codebases. |
| Barcode | VisionCamera v5 | expo-barcode-scanner | expo-barcode-scanner is deprecated in SDK 52+. Use VisionCamera. |
| Barcode | VisionCamera v5 | expo-camera | expo-camera barcode scanning fails on iOS for non-centered codes; limited symbology support. |
| Charts | Victory Native XL | react-native-chart-kit | Abandoned. No Reanimated/Skia support. Will break on New Architecture. |
| AI model (photo) | claude-haiku-4-5 | claude-sonnet-4-6 for photo | Haiku is fast enough for meal recognition and 3x cheaper. Sonnet adds latency without meaningful accuracy gain for common Thai dishes. |
| Barcode data | Open Food Facts | USDA FoodData Central | USDA has poor Thai food coverage. Open Food Facts is community-driven with explicit Thai contributor activity. |
| Backend | Express + Drizzle | Supabase / Firebase | Project constraint: custom Node.js + PostgreSQL. BaaS excluded. |
## Installation
# Initialize project
# Navigation (included with SDK 53 template, but explicit)
# Camera & Barcode
# Local database
# Storage
# State management
# Charts
# Utilities
# Image picker (for photo food recognition)
# Backend
## Confidence Notes
| Area | Confidence | Basis |
|------|------------|-------|
| Expo SDK 53 + New Architecture | HIGH | Official Expo changelog; 74.6% adoption in prod builds confirmed |
| VisionCamera v5 | HIGH | Official VisionCamera docs + Margelo blog post; V4 explicitly archived |
| VisionCamera v5 + SDK 53 compatibility | MEDIUM | Confirmed via GitHub issue that SDK 53 compiles; SDK 54 had Xcode 26 issues |
| WatermelonDB + custom Node.js backend | HIGH | Official WatermelonDB sync docs; pattern is well-documented |
| Drizzle over Prisma | HIGH | Multiple 2025/2026 benchmarks + official Prisma comparison docs |
| Open Food Facts Thai coverage | MEDIUM | 3,000+ Thai products confirmed but exact barcode hit rate for user's specific packaged foods is unknown — "not found" UX flow is mandatory |
| Claude model selection (Haiku for photo) | HIGH | Official Anthropic pricing page; all Claude 4.x models support vision |
| Victory Native XL | MEDIUM | Widely cited as best performer; verify peer dep versions against installed Expo SDK |
## Sources
- Expo SDK 53 changelog: https://expo.dev/changelog/sdk-53
- React Native New Architecture guide: https://docs.expo.dev/guides/new-architecture/
- VisionCamera V5 announcement: https://blog.margelo.com/react-native-qr-barcode-scanner-visioncamera-v5
- VisionCamera official docs: https://react-native-vision-camera.com/docs/guides/code-scanning
- WatermelonDB sync backend docs: https://watermelondb.dev/docs/Sync/Backend
- Drizzle ORM PostgreSQL guide: https://orm.drizzle.team/docs/get-started-postgresql
- Drizzle vs Prisma comparison (2026): https://encore.dev/articles/drizzle-vs-prisma
- Anthropic Claude models overview: https://platform.claude.com/docs/en/about-claude/models/overview
- Open Food Facts API: https://openfoodfacts.github.io/openfoodfacts-server/api/
- react-native-mmkv GitHub: https://github.com/mrousavy/react-native-mmkv
- Victory Native XL GitHub: https://github.com/FormidableLabs/victory-native-xl
- Scanbot barcode library comparison: https://scanbot.io/blog/react-native-vision-camera-vs-expo-camera/
- TanStack Query React Native docs: https://tanstack.com/query/v5/docs/framework/react/react-native
- JWT + Drizzle + Express tutorial: https://medium.com/@brian_njuguna/jwt-authentication-and-refresh-token-implementation-with-nodejs-express-postgres-and-drizzle-orm-d6709ca755e1
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
