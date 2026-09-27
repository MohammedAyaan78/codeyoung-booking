# CodeYoung Trial Class Booking System

A production-quality appointment booking application for trial coding classes. Parents can browse available slots in their local timezone, and the system automatically assigns an eligible mentor — handling DST, midnight crossover, and concurrent booking attempts correctly.

---

## Features

- **Timezone-safe booking** — all times stored as UTC, displayed in IANA-correct local time
- **DST handling** — uses Luxon with real IANA rules, never manual offset arithmetic
- **Mentor auto-assignment** — deterministic, load-balanced, daily-limit-aware
- **Concurrency protection** — Serializable transactions + row-level locking
- **Idempotency** — duplicate submissions return the original booking
- **Google OAuth for parents** — secure sign-in, no passwords stored for parents
- **Mentor email/password login** — bcrypt-hashed, rate-limited
- **Role-based access control** — backend-enforced, parents and mentors see only their own data
- **Parent dashboard** — upcoming/past bookings, profile management
- **Mentor dashboard** — assigned classes, daily capacity indicator
- **Polished UX** — 3-step booking flow, skeleton loading, error states with alternatives
- **Animated hero** — CSS/DOM floating card composition (no heavy 3D dependency)
- **Accessible** — keyboard navigation, ARIA labels, focus states, reduced-motion support

---

## Architecture

```
BookingController
    ↓
BookingService          (orchestration, idempotency, past-slot check)
    ↓
MentorAssignmentService (eligibility: conflict + daily limit in mentor's timezone)
    ↓
Prisma Transaction      (Serializable isolation + FOR UPDATE lock on mentors)
    ↓
PostgreSQL
```

Auth layer wraps around the booking system:

```
Google OAuth / Mentor Local Strategy (Passport.js)
    ↓
express-session (HTTP-only cookie)
    ↓
requireAuth + requireRole middleware
    ↓
/api/parent/* or /api/mentor/* routes
```

---

## Technology Stack

| Layer           | Technology                                      |
|-----------------|-------------------------------------------------|
| Frontend        | React 18, TypeScript, Vite, Tailwind CSS        |
| Animations      | Framer Motion                                   |
| Forms           | React Hook Form + Zod                           |
| Backend         | Node.js, TypeScript, Express                    |
| ORM             | Prisma 5                                        |
| Database        | PostgreSQL 16                                   |
| Timezone        | Luxon (IANA-aware, DST-correct)                 |
| Auth (parents)  | Google OAuth 2.0 via Passport.js                |
| Auth (mentors)  | Email + password (bcrypt) via Passport.js       |
| Sessions        | express-session with HTTP-only cookies          |
| Testing         | Jest + ts-jest + Supertest                      |

---

## Project Structure

```
/
├── frontend/           React + Vite frontend
│   └── src/
│       ├── components/ Shared UI components (Alert, Skeleton, ProtectedRoute)
│       ├── features/   Booking-specific components
│       ├── hooks/      useAuth, useAvailability
│       ├── pages/      HomePage, LoginPage, BookingPage, ParentDashboard,
│       │               MentorDashboard, ParentProfilePage, ConfirmationPage
│       └── services/   API client
│
├── backend/            Express API
│   └── src/
│       ├── controllers/
│       ├── routes/     auth, parent, mentor, bookings, availability, timezones
│       ├── services/   BookingService, AvailabilityService, MentorAssignmentService
│       ├── repositories/
│       ├── middleware/ auth.middleware, errorHandler, requestLogger
│       ├── validators/
│       └── utils/      timezone.ts, passport.ts, prisma.ts
│
├── shared/             Shared TypeScript types (DTOs)
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/     init + add_auth_fields
│   └── seed.ts         10 deterministic demo mentors with hashed passwords
│
├── tests/
│   ├── unit/           timezone.test.ts
│   └── integration/    booking.test.ts, api.test.ts, auth.test.ts
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16 (or Docker)

---

## Installation

```bash
git clone <repo>
cd codeyoung-booking
npm install
```

---

## Environment Variables

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

| Variable               | Description                          | Default                                              |
|------------------------|--------------------------------------|------------------------------------------------------|
| `DATABASE_URL`         | PostgreSQL connection string         | `postgresql://postgres:postgres@localhost:5432/...`  |
| `PORT`                 | Backend port                         | `4000`                                               |
| `FRONTEND_URL`         | Allowed CORS origin                  | `http://localhost:5173`                              |
| `NODE_ENV`             | Environment                          | `development`                                        |
| `SESSION_SECRET`       | Secret for signing session cookies   | *(must be changed in production)*                    |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID               | *(required for parent Google login)*                 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret           | *(required for parent Google login)*                 |
| `GOOGLE_CALLBACK_URL`  | OAuth redirect URI                   | `http://localhost:4000/api/auth/google/callback`     |
| `JOIN_WINDOW_BEFORE_MINUTES` | Minutes before class start when Join becomes active | `10`                          |

---

## Authentication

### Parent Login — Google OAuth

Parents sign in with Google. No password is stored for parents.

**Local setup:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add `http://localhost:4000/api/auth/google/callback` as an Authorized redirect URI.
4. Copy the Client ID and Client Secret into `.env`:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

On first sign-in a parent account is created automatically. On subsequent sign-ins the existing account is restored.

> **Note:** If `GOOGLE_CLIENT_ID` is not configured, the Google login button will redirect to Google but the callback will fail. The unauthenticated booking flow at `/book` continues to work without OAuth credentials.

### Mentor Login — Email + Password

Mentors log in with email and password at `/mentor/login`.

**Demo credentials (fictional — not production credentials):**

| Email | Password |
|---|---|
| `aarav.sharma@codeyoung.demo` | `CodeYoungDemo123!` |
| `maya.patel@codeyoung.demo` | `CodeYoungDemo123!` |
| `daniel.thomas@codeyoung.demo` | `CodeYoungDemo123!` |
| `sophia.wilson@codeyoung.demo` | `CodeYoungDemo123!` |
| `arjun.mehta@codeyoung.demo` | `CodeYoungDemo123!` |
| `emma.johnson@codeyoung.demo` | `CodeYoungDemo123!` |
| `kabir.singh@codeyoung.demo` | `CodeYoungDemo123!` |
| `olivia.brown@codeyoung.demo` | `CodeYoungDemo123!` |
| `riya.kapoor@codeyoung.demo` | `CodeYoungDemo123!` |
| `noah.williams@codeyoung.demo` | `CodeYoungDemo123!` |

Passwords are hashed with bcrypt (cost factor 12) during seeding. Plaintext passwords are never stored.

---

## Roles

| Role | Login method | Dashboard | Can book |
|---|---|---|---|
| `PARENT` | Google OAuth | `/parent` | Yes — `/parent/book` |
| `MENTOR` | Email + password | `/mentor` | No |

---

## Authorization

All protected routes enforce authorization on the **backend** — frontend route guards are a UX convenience only.

- `requireAuth` middleware returns `401` for unauthenticated requests.
- `requireRole('PARENT')` / `requireRole('MENTOR')` returns `403` for wrong-role access.
- Parent routes (`/api/parent/*`) derive `parentId` from the session — clients cannot spoof another parent's identity.
- Mentor routes (`/api/mentor/*`) derive `mentorId` from the session — mentors cannot query another mentor's bookings.

---

## Security

- **Sessions** — HTTP-only cookies, `SameSite=lax` (dev) / `strict` (prod), 7-day expiry.
- **Password hashing** — bcrypt with cost factor 12.
- **OAuth** — Google identity validated server-side; frontend never handles OAuth tokens.
- **Rate limiting** — mentor login: 10 req/min; booking endpoint: 20 req/min.
- **No secrets in source** — all credentials via environment variables.
- **Safe error responses** — `passwordHash` and OAuth tokens are never returned in API responses.

---

## Database Setup

### Option A — Docker (recommended)

```bash
docker compose up -d postgres
```

### Option B — Local PostgreSQL

Create a database named `codeyoung_booking` and update `DATABASE_URL` in `.env`.

### Run migrations

```bash
npm run db:migrate
```

### Seed demo data

```bash
npm run db:seed
```

This creates 10 deterministic mentors with hashed passwords and diverse IANA timezones.

---

## Running the Application

### Backend

```bash
cd backend
npm run dev
# → http://localhost:4000
```

### Frontend

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

### Both simultaneously (from root)

```bash
npm run dev
```

---

## Running Tests

### Unit tests (timezone logic — no database required)

```bash
npm test -- tests/unit
```

### Integration tests (requires test database)

```bash
# Start test database
docker compose up -d postgres_test

# Set test env
cp .env.test .env

# Run migrations on test DB
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/codeyoung_booking_test npx prisma migrate deploy --schema=prisma/schema.prisma

# Run tests
npm test
```

Tests include:
- `timezone.test.ts` — 13 unit tests for DST, midnight crossover, formatting
- `booking.test.ts` — booking service: success, past slot, idempotency, daily limit, concurrency
- `api.test.ts` — HTTP layer: validation, status codes, response shapes
- `auth.test.ts` — RBAC: unauthenticated access, mentor auth, role enforcement
- `classroom.test.ts` — classroom API: ownership, state transitions, join window, timezone correctness, DST

---

## API Overview

| Method | Path                         | Description                           |
|--------|------------------------------|---------------------------------------|
| GET    | `/api/health`                | Health check                          |
| GET    | `/api/timezones`             | List of IANA timezone options         |
| GET    | `/api/availability`          | Available slots for a date+timezone   |
| POST   | `/api/bookings`              | Create a booking (unauthenticated)    |
| GET    | `/api/bookings/:id`          | Get booking by ID                     |
| GET    | `/api/auth/me`               | Current authenticated user            |
| POST   | `/api/auth/logout`           | Logout (clears session cookie)        |
| GET    | `/api/auth/google`           | Initiate Google OAuth (parents)       |
| GET    | `/api/auth/google/callback`  | Google OAuth callback                 |
| POST   | `/api/auth/mentor/login`     | Mentor email/password login           |
| GET    | `/api/parent/profile`        | Parent profile (auth required)        |
| PATCH  | `/api/parent/profile`        | Update parent profile (auth required) |
| GET    | `/api/parent/bookings`       | Parent's own bookings (auth required) |
| POST   | `/api/parent/bookings`       | Create booking as authenticated parent|
| GET    | `/api/mentor/profile`        | Mentor profile (auth required)        |
| GET    | `/api/mentor/bookings`       | Mentor's assigned bookings (auth)     |
| GET    | `/api/mentor/capacity`       | Mentor's today capacity (auth)        |
| GET    | `/api/classes/:bookingId`    | Classroom data (parent or mentor auth)|

### Availability query

```
GET /api/availability?date=2026-09-28&timezone=America/New_York
```

### Create booking (unauthenticated)

```
POST /api/bookings
Idempotency-Key: <uuid>

{
  "parentName": "Jane Doe",
  "parentEmail": "jane@example.com",
  "parentPhone": "+1 555 000 0000",
  "parentTimezone": "America/New_York",
  "startUtc": "2026-09-28T14:30:00.000Z"
}
```

### Create booking (authenticated parent)

```
POST /api/parent/bookings
Idempotency-Key: <uuid>
Cookie: cy.sid=...

{
  "parentTimezone": "America/New_York",
  "startUtc": "2026-09-28T14:30:00.000Z"
}
```

---

## Timezone Architecture

**Core principle:** The UTC instant is the single source of truth.

- All `startsAtUtc` / `endsAtUtc` values are stored as UTC in PostgreSQL.
- `parentTimezone` and `mentorTimezone` are stored as IANA identifiers (e.g. `America/New_York`).
- All display conversions use Luxon: `DateTime.fromISO(utcIso, { zone: 'utc' }).setZone(ianaZone)`.
- Timezone abbreviations (EDT, EST, BST, IST) are derived from Luxon's IANA rules — never hardcoded.

---

## DST Handling

Luxon uses the V8 engine's built-in IANA timezone database (via `Intl`), which includes full DST rules.

Examples handled correctly:
- `America/New_York` spring forward (March): UTC-5 → UTC-4
- `America/New_York` fall back (November): UTC-4 → UTC-5
- `Europe/London` summer (BST = UTC+1) vs winter (GMT = UTC+0)
- Midnight crossover: a 23:30 New York booking falls on the next calendar day in India

---

## Mentor Assignment Logic

**Strategy (deterministic):**

1. Lock all active mentors with `SELECT ... FOR UPDATE` inside a Serializable transaction.
2. Exclude mentors with a conflicting confirmed booking (overlap check).
3. Exclude mentors at their daily limit — evaluated using the **mentor's local calendar date** (not UTC date).
4. Among eligible mentors, prefer the one with the fewest bookings today (load balancing).
5. Ties broken by mentor ID (stable, auditable).

**Why deterministic?** Random assignment is untestable and unauditable. Deterministic assignment makes the system predictable and verifiable.

---

## Concurrency / Double Booking Prevention

Two parents clicking the same slot simultaneously is handled by:

1. **Serializable transaction isolation** — PostgreSQL prevents phantom reads.
2. **`SELECT ... FOR UPDATE`** on the mentor rows — prevents two transactions from assigning the same mentor simultaneously.
3. **Unique constraint on `idempotencyKey`** — prevents duplicate bookings from retries.

If two concurrent requests arrive for the same slot with one available mentor, exactly one will succeed. The other will receive a `NO_AVAILABILITY` error with alternative slots.

---

## Idempotency

Every booking request should include an `Idempotency-Key` header (UUID).

- If the same key is sent again, the original booking is returned — no duplicate is created.
- The key is stored in the `Booking.idempotencyKey` column with a unique constraint.
- The frontend generates a UUID per booking session and reuses it on retry.

---

## UX Decisions

- **3-step flow** (Details → Time → Confirm) keeps cognitive load low. Authenticated parents skip step 1 — details come from their Google account.
- **Timezone shown prominently** — "Times shown in your local timezone" is always visible.
- **Slot grid** shows available (clickable) and unavailable (strikethrough) slots together so parents understand capacity.
- **Alternative slots** are surfaced immediately when a booking fails.
- **Skeleton loading** prevents layout shift during slot loading.
- **Confirmation screen** shows both parent and mentor local times explicitly.
- **Smart CTA** — "Book a Trial Class" redirects unauthenticated users to login, authenticated parents to booking, mentors to their dashboard.

---

## Assumptions

1. **Business hours**: 09:00–20:00 in the parent's requested timezone. In production, each mentor would have their own availability schedule.
2. **Slot duration**: 30 minutes (fixed).
3. **Meeting URL**: Dummy `https://demo.codeyoung.local/class/<uuid>` — not a real video link.
4. **Parent email as natural key**: Upserted on each booking (unauthenticated flow). Authenticated flow uses session identity.
5. **Mentor assignment is global**: Any active mentor can be assigned to any parent. In production, mentor specialization/language/level would filter candidates.

---

## Trial Class Experience

Every confirmed booking has a protected classroom accessible at `/class/:bookingId`.

### Access control

- The backend verifies identity from the session — never from the request body.
- A parent can only access a classroom for a booking they own.
- A mentor can only access a classroom for a booking assigned to them.
- Unauthenticated requests receive `401`. Wrong-user requests receive `403`. Unknown booking IDs receive `404`.

### Class state

The backend computes state from the canonical UTC booking time:

| State | Condition |
|---|---|
| `UPCOMING` | More than `JOIN_WINDOW_BEFORE_MINUTES` before start |
| `JOINABLE` | Within join window, not yet started |
| `LIVE` | Started, not yet ended |
| `ENDED` | Past end time |

Default join window: **10 minutes** before class start. Configurable via `JOIN_WINDOW_BEFORE_MINUTES` in `.env`.

### Classroom UI

The classroom page (`ClassroomPage.tsx`) is a polished mock video-conferencing interface:

- **UPCOMING** — countdown timer, both timezone representations, disabled join button
- **JOINABLE / LIVE** — full classroom with mentor + parent video tiles (avatar placeholders), mic/camera/speaker toggles, chat panel, elapsed timer, leave confirmation
- **ENDED** — completion summary with class details

All participant names and times are loaded from the authenticated booking — nothing is hardcoded.

### Timezone guarantees

The classroom preserves all existing timezone guarantees:
- Times are derived from the canonical UTC instant stored in the database
- Parent and mentor local times use Luxon IANA rules — no manual offsets
- DST transitions are handled correctly
- The same UTC instant is displayed correctly in both parent and mentor timezones

### Important: simulated experience

This is a **demo classroom** — not a production video conferencing system. There is no real WebRTC, no audio/video streams, no TURN servers. The controls (mic, camera, speaker, chat) update local UI state only. This is intentional — the assignment's core value is booking, scheduling, timezone correctness, and authentication.

---

## Limitations

- No real video conferencing integration.
- No cancellation flow (status exists in DB, no API endpoint).
- Business hours are uniform (not per-mentor).
- No calendar export (add-to-calendar) implemented.
- Google OAuth requires a configured Google Cloud project for parent login.

---

## Future Improvements

- Per-mentor availability schedules and working hours.
- Email confirmation via SendGrid/SES.
- Cancellation and rescheduling.
- Admin dashboard.
- Real video conferencing (Zoom / Google Meet API).
- Add-to-calendar (ICS file generation).
- Playwright end-to-end tests for the full booking flow.
- Redis-based rate limiting for production scale.
- Password reset flow for mentors.

---

## Recommended Demo Flow

### Scenario A — Parent (authenticated)

1. `docker compose up -d postgres` (or use local PostgreSQL)
2. `npm run db:migrate && npm run db:seed`
3. Configure Google OAuth credentials in `.env`
4. `npm run dev`
5. Open `http://localhost:5173`
6. Click **Book a Trial Class** → redirects to login
7. Click **Continue with Google** → authenticate with Google
8. Redirected to parent dashboard
9. Click **Book a Trial Class** → booking flow (step 1 skipped — details from Google)
10. Select timezone, date, and time slot
11. Confirm booking — see mentor assignment with both timezone representations
12. Return to dashboard — see upcoming class
13. Visit `/parent/profile` to update timezone

### Scenario B — Mentor

1. Open `http://localhost:5173/mentor/login`
2. Enter `aarav.sharma@codeyoung.demo` / `CodeYoungDemo123!`
3. See mentor dashboard with assigned classes
4. See parent details, parent timezone, mentor local time
5. See daily capacity indicator (e.g. 1 / 2)
6. Click **Join Trial Class** → enters the classroom experience at `/class/:bookingId`

### Scenario C — Unauthenticated booking (backward compat)

1. Open `http://localhost:5173/book` directly
2. Complete the 3-step form (name, email, phone, timezone)
3. Select date and slot
4. Confirm — booking created without login
