# Nourish — Personal Nutrition & Fitness Tracker

## What This Is

A personal React Native mobile app (iOS + Android) for tracking daily nutrition, water intake, and workouts. Built for one user — no multi-tenant complexity. Ports the existing `nutrition_tracker.html` prototype into a native mobile experience with barcode scanning, Claude-powered food photo recognition, AI-suggested workout plans, and a Node.js/Express backend for account sync and data persistence.

## Core Value

Log what you eat and stay on track with your calorie + macro targets — fast, on your phone, with real Thai food support.

## Requirements

### Validated

- ✓ Calorie + macro target calculation from BMR, activity level, and goal — from prototype
- ✓ Food log with 100+ foods including Thai dishes — from prototype
- ✓ Meal tabs (Breakfast / Lunch / Dinner / Snack) — from prototype
- ✓ Profile: weight, height, age, sex, activity, goal, protein rate — from prototype
- ✓ localStorage persistence (day's food log + profile) — from prototype

### Active

- [ ] React Native mobile app (iOS + Android) — port and rebuild from HTML prototype
- [ ] User account (sign up, login, session) — backend auth via Node.js/Express + PostgreSQL
- [ ] Barcode scanning — scan packaged food label, fetch nutrition data, add to log
- [ ] Food photo recognition — Claude Vision API estimates calories from meal photo
- [ ] Water intake tracking — log glasses/ml per day, show progress toward target
- [ ] History + trends — view past days' logs, weekly calorie/macro charts, weight progress over time
- [ ] AI-suggested workout plans — Claude recommends workouts based on user goal (lose fat / build muscle / maintain)
- [ ] Cross-device sync — data stored in backend, accessible from any phone

### Out of Scope

- Multi-user / social features — personal tool only, no sharing or community
- Apple Watch / wearable integration — out of scope for MVP
- Nutritionist consultation / medical advice — app is for tracking, not clinical use
- Subscription / payments — personal tool, no monetization planned
- Android-only or iOS-only — must ship both platforms

## Context

- Existing prototype: `nutrition_tracker.html` — single-file web app with all core nutrition logic already working. Food database (100+ items including Thai dishes), TDEE calculation, macro split, localStorage persistence are all solid and should be ported.
- User is Thai, based in Thailand — Thai food database is important. App uses Thai language food names in the database.
- Tanita body scanner integration in profile (BMR loaded from scan) — keep this workflow.
- Barcode is highest priority new input method (packaged food in Thailand). Photo recognition (Claude Vision) is secondary but wanted.
- AI workout suggestions should use Claude API, same as food photo recognition — one AI provider.
- Backend: Node.js + Express + PostgreSQL (custom, not BaaS).

## Constraints

- **Platform**: React Native — needed for native camera/barcode hardware access on mobile
- **AI**: Claude API (Anthropic) only — used for both food photo recognition and workout plan suggestions
- **Backend**: Node.js + Express + PostgreSQL — custom API, self-hosted
- **Users**: Single user (personal tool) — no multi-tenancy requirements, no public sign-up
- **Thai food**: Database must include Thai dishes with Thai-language names — core to daily use

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native over PWA | Camera + barcode require native hardware access; PWA has limitations on iOS | — Pending |
| Custom Express backend over Supabase/Firebase | User preference for full control | — Pending |
| Claude API for both vision + workouts | Single AI provider, avoid multi-vendor complexity | — Pending |
| Barcode scanning before photo recognition | Higher daily utility for packaged foods; photo is harder to get right | — Pending |
| Personal tool only (no multi-user) | Avoids auth complexity, role management, data isolation overhead | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-22 after initialization*
