# Nourish — Personal Nutrition & Fitness Tracker

A personal React Native mobile app for tracking daily nutrition, water intake, and workouts. Built for one user with real Thai food support, barcode scanning, Claude Vision meal recognition, and AI-suggested workout plans.

## Features

- **Food Logging** — Log meals by breakfast / lunch / dinner / snack with live calorie + macro progress
- **Thai Food Database** — 100+ Thai dishes with Thai-language names, searchable by partial match
- **Barcode Scanning** — EAN-13 barcode lookup via Open Food Facts (3,000+ Thai products)
- **AI Meal Recognition** — Photograph a meal, get a calorie range estimate from Claude Vision (requires confirmation before logging)
- **AI Workout Plans** — Claude generates a weekly workout plan based on your goal (lose fat / build muscle / maintain)
- **Water Tracking** — Log water by glass or millilitre, set custom daily target
- **History & Trends** — Past food logs, weekly calorie/macro charts, 30-day weight trend
- **Offline First** — Log food, water, and workouts offline; syncs automatically on reconnect with no duplicates
- **Custom Foods** — Add personal food entries that appear in search results

## Tech Stack

### Mobile
| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 53 + React Native 0.79 |
| Navigation | Expo Router v4 (file-based) |
| State | Zustand 5.x + TanStack Query v5 |
| Local DB | WatermelonDB (SQLite, offline-first) |
| Storage | react-native-mmkv (AES-256 encrypted) |
| Camera | react-native-vision-camera v5 + MLKit |
| Charts | Victory Native XL (Skia + Reanimated) |
| Language | TypeScript 5.x |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 LTS |
| Framework | Express 5.x |
| Database | PostgreSQL 17 (Docker for dev) |
| ORM | Drizzle ORM 0.44.x |
| Auth | JWT (HS256) — 15m access / 30d refresh |
| Password | bcrypt (12 rounds) |
| Email | Resend (password reset) |
| Validation | Zod |
| Language | TypeScript 5.x |

### AI
| Use Case | Model |
|----------|-------|
| Food photo recognition | claude-haiku-4-5 (fast + cheap) |
| Workout plan generation | claude-sonnet-4-6 (quality matters) |

## Project Structure

```
FoodTrackingApp/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/           # Zod env validation
│   │   ├── controllers/      # Route handlers
│   │   ├── db/
│   │   │   ├── schema/       # Drizzle table definitions
│   │   │   └── migrations/   # Versioned SQL migrations
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── repositories/     # DB access layer
│   │   ├── routes/           # Express routers
│   │   └── services/         # Business logic
│   └── tests/                # Vitest test suite
├── mobile/                   # React Native app (Phase 2+)
├── docker-compose.yml        # Postgres 17 for local dev
└── .planning/                # GSD project planning artifacts
```

## Getting Started

### Prerequisites

- Node.js 22+
- Docker (for local Postgres)
- WSL2 (Windows) or macOS/Linux

### Backend Setup

```bash
# Start Postgres
docker compose up -d

# Install dependencies
cd backend
npm install

# Copy env file and fill in values
cp .env.example .env

# Apply database migrations
npx drizzle-kit migrate

# Start dev server
npm run dev
```

### Environment Variables

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://nourish:nourish_dev@localhost:5432/nourish_db
JWT_ACCESS_SECRET=<min 32 chars — use: openssl rand -hex 32>
JWT_REFRESH_SECRET=<min 32 chars — use: openssl rand -hex 32>
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
APP_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8081
```

### Run Tests

```bash
cd backend
npx vitest run
```

## API Endpoints (Phase 1)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, receive access + refresh tokens |
| POST | `/api/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/auth/logout` | Revoke refresh token |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with single-use token |

## Development Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Backend Foundation + Auth | 🔄 In Progress | Express API, PostgreSQL schema, JWT auth |
| 2 — Core Food Logging | ⬜ Planned | Food search, meal logging, macro dashboard |
| 3 — Barcode Scanning + History | ⬜ Planned | EAN-13 scanning, past logs, weight trends |
| 4 — AI Features + Workouts | ⬜ Planned | Claude Vision, workout plans, net calories |
| 5 — Custom Foods + Offline | ⬜ Planned | Custom food DB, full offline hardening |

## Security

- JWT access tokens expire in 15 minutes; refresh tokens in 30 days
- Refresh tokens stored as bcrypt hashes — raw token never persisted
- Password reset links are single-use and expire in 1 hour
- `forgot-password` endpoint always returns HTTP 200 (prevents email enumeration)
- All auth routes protected with Helmet, CORS, and rate limiting

## License

Personal use — not licensed for public distribution.
