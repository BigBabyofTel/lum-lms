# Luminescence LMS — Complete MVP Guide: Beginning to End

> A single-document, end-to-end blueprint for building the Luminescence LMS MVP. Consolidates and synthesizes all
> research, architecture, pacing, and phase documents into one actionable reference.
>
> **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Zustand · Go · Gin v1.11 · sqlc · lib/pq ·
> PostgreSQL · Docker Compose
>
> **Target:** One developer, ~10 weeks, classroom-ready MVP by **May 9, 2026**

---

## Table of Contents

1. [MVP Vision & Scope](#1-mvp-vision--scope)
2. [What "Done" Looks Like](#2-what-done-looks-like)
3. [Architecture Overview](#3-architecture-overview)
4. [Current State of the Codebase](#4-current-state-of-the-codebase)
5. [Complete Database Schema Evolution](#5-complete-database-schema-evolution)
6. [Phase 0 — Foundations (Weeks 1–2)](#6-phase-0--foundations-weeks-12)
7. [Phase 1 — Authentication (Weeks 3–4)](#7-phase-1--authentication-weeks-34)
8. [Phase 2 — Classes & Assignments (Weeks 5–6)](#8-phase-2--classes--assignments-weeks-56)
9. [Phase 3 — Submissions & Grading (Weeks 7–8)](#9-phase-3--submissions--grading-weeks-78)
10. [Phase 4 — Communication & Parent Portal (Week 9)](#10-phase-4--communication--parent-portal-week-9)
11. [Phase 5 — Polish, Testing & Launch (Week 10)](#11-phase-5--polish-testing--launch-week-10)
12. [Complete API Reference](#12-complete-api-reference)
13. [Security Playbook](#13-security-playbook)
14. [Risk Register & Mitigations](#14-risk-register--mitigations)
15. [Velocity Checkpoints](#15-velocity-checkpoints)
16. [QA User Journey Scripts](#16-qa-user-journey-scripts)
17. [Post-MVP Roadmap](#17-post-mvp-roadmap)
18. [Key Architectural Decisions](#18-key-architectural-decisions)
19. [Competitive Advantages Over Existing Platforms](#19-competitive-advantages-over-existing-platforms)
20. [References](#20-references)

---

## 1. MVP Vision & Scope

### The One-Line Definition

> A real teacher can log in, create a class, post an assignment, students can view and submit it, the teacher can grade
> it, and parents can see their child's grades.

### What Is Included

| Feature               | Description                                                         |
|-----------------------|---------------------------------------------------------------------|
| User registration     | Teacher, student, and parent accounts with role-based access        |
| JWT authentication    | Login, logout, token refresh, route protection                      |
| Class management      | Teachers create/edit/delete classes; students see enrolled classes  |
| Student enrollment    | Teachers enroll students by email; roster management                |
| Assignment management | Create assignments and materials with due dates                     |
| Text submissions      | Students submit text responses; draft auto-save                     |
| Grading & feedback    | Teachers grade submissions with integer scores and written feedback |
| Gradebook             | Full student × assignment matrix per class                          |
| Class stream          | Teachers post announcements; chronological feed                     |
| Parent portal         | Parents link to children, view grades and upcoming work             |

### What Is Explicitly Excluded (Deferred to v1+)

| Feature                       | Reason for deferral                     |
|-------------------------------|-----------------------------------------|
| File uploads for submissions  | Requires MinIO/S3 infrastructure        |
| Rich text editor (TipTap)     | Plain textarea works for MVP            |
| Quiz / assessment engine      | Complex; 2–3 week effort alone          |
| Real-time notifications (SSE) | Polling / page refresh works for MVP    |
| Direct messaging              | Not needed for core academic loop       |
| Rubric-based grading          | Integer grades work for MVP             |
| Analytics dashboard           | Gradebook serves this purpose initially |
| Google OAuth SSO              | Email/password auth works for MVP       |
| LTI 1.3 / SCORM integration   | Enterprise feature; 3–4 week effort     |
| PWA / offline mode            | Mobile-responsive web is sufficient     |
| Global search                 | Navigate-to-class is acceptable for MVP |

---

## 2. What "Done" Looks Like

The MVP is shippable when a user can complete these five journeys end-to-end without errors:

1. **Teacher full cycle:** Register → login → create class → post announcement → create assignment → enroll student →
   view submissions → grade → logout
2. **Student full cycle:** Register → login → see enrolled class → read announcement → view assignment → submit text →
   see returned grade + feedback
3. **Grading round-trip:** Teacher grades a submission → student sees grade and feedback on the same assignment page
4. **Parent portal:** Register as parent → link to child by email → see child's grades, upcoming assignments, and class
   list
5. **Session resilience:** Page refresh preserves login state; 401 triggers silent token refresh; logout clears
   everything

### Production Readiness Criteria

- [ ] All 5 user journeys pass manual QA
- [ ] `docker compose -f docker-compose.prod.yml up` starts all services
- [ ] `next build` completes with zero TypeScript errors
- [ ] `go test ./...` passes
- [ ] No blank white screens — every page handles loading, empty, and error states
- [ ] Security checklist fully verified
- [ ] `v0.1.0` Git tag created and pushed
- [ ] `README.md` has complete setup instructions

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                            │
│                                                                      │
│   Next.js 15 (App Router)                                            │
│   ├── Tailwind CSS (styling)                                         │
│   ├── Zustand (client state: access_token, user, classes)            │
│   ├── apiFetch<T>() (typed API client — all API calls go through it) │
│   └── httpOnly cookie (refresh_token — JS cannot read it)            │
│                                                                      │
│   Port :3000                                                         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  HTTP (JSON)
                             │  Authorization: Bearer <access_token>
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Go Backend (Gin v1.11)                        │
│                                                                      │
│   ├── AuthMiddleware (validates JWT on every /v1/api/* request)       │
│   ├── RequireRole proxy (teacher / student / parent scoping)     │
│   ├── ParentGuard proxy (validates parent ↔ student link)        │
│   ├── Rate limiter on /v1/api/auth/login                             │
│   ├── sqlc-generated DB queries (type-safe, no raw SQL)              │
│   └── Background goroutine (marks overdue assignments as "missing")  │
│                                                                      │
│   Port :8080                                                         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  SQL (lib/pq driver)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 16                                    │
│                                                                      │
│   Tables: users · classes · class_enrollments · assignments ·         │
│           user_assignments · topics · posts · comments ·              │
│           parent_student_links                                        │
│                                                                      │
│   Port :5432                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

### Token Flow

```
Browser                                  Gin Backend
  │                                          │
  │  POST /v1/api/auth/login                 │
  │  { email, password }                     │
  │  ───────────────────────────────────►    │
  │                                          │  bcrypt compare
  │                                          │  Generate access JWT (15min)
  │                                          │  Generate refresh JWT (7d)
  │    ◄───────────────────────────────────  │
  │  JSON: { access_token, user }            │
  │  Set-Cookie: refresh_token (httpOnly)    │
  │                                          │
  │  GET /v1/api/classes                     │
  │  Authorization: Bearer <access_token>    │
  │  ───────────────────────────────────►    │
  │                                          │  AuthMiddleware validates JWT
  │    ◄───────────────────────────────────  │
  │  JSON: { classes: [...] }                │
  │                                          │
  │  (15 min later — access token expires)   │
  │                                          │
  │  POST /v1/api/auth/refresh               │
  │  Cookie: refresh_token (sent auto)       │
  │  ───────────────────────────────────►    │
  │                                          │  Validate refresh token
  │                                          │  Issue new access + refresh
  │    ◄───────────────────────────────────  │
  │  JSON: { access_token }                  │
  │  Set-Cookie: new refresh_token           │
```

---

## 4. Current State of the Codebase

**As of project start (February 28, 2026):**

| Component         | Status                                                                                            |
|-------------------|---------------------------------------------------------------------------------------------------|
| Docker Compose    | ✅ Running — PostgreSQL + Go backend + Next.js frontend                                            |
| PostgreSQL schema | ✅ Migrated — `users`, `classes`, `assignments`, `topics`, `user_assignments`, `posts`, `comments` |
| Gin server        | ✅ Live — 2 endpoints: `POST /v1/api/classes`, `GET /v1/api/classes`                               |
| sqlc              | ✅ Configured — code generation working                                                            |
| Next.js frontend  | ✅ Scaffolded — Tailwind, dashboard layout, class cards, portal/auth page                          |
| Authentication    | ❌ Not implemented — no `password` column, no JWT, no login                                        |
| Enrollment        | ❌ No `class_enrollments` table — no way to track student ↔ class                                  |
| Assignment API    | ❌ No endpoints for creating or fetching assignments                                               |
| Submissions       | ❌ No `submission_text` column — no submission flow                                                |
| Grading           | ❌ No `feedback` column — grade is just an integer with no return flow                             |
| Announcements     | ❌ `posts` table has no `class_id` — not scoped to classes                                         |
| Parent portal     | ❌ No `parent_student_links` table — no parent ↔ student association                               |

### Known Bugs to Fix First

1. `createClass` handler: missing `return` after UUID parse error → silent 500
2. `cfg.DB.CreateClass` error response uses wrong HTTP status code
3. All handlers need audit for missing `return` after error responses
4. Hardcoded API URLs in frontend components (should use env var)

---

## 5. Complete Database Schema Evolution

Every migration file in order, from the existing schema through MVP completion:

### Existing: `0002_basic_tables.sql` (already applied)

```sql
-- Tables: users, classes, assignments, topics, user_assignments, posts, comments
-- Enums: role (teacher/student/parent), content_type (assignment/material), assignment_status
-- No password column, no class_enrollments, no parent links
```

### Migration 1: `0003_add_password.sql` (Phase 0, Week 1)

```sql
-- +goose Up
ALTER TABLE users ADD COLUMN password varchar(255);

-- +goose Down
ALTER TABLE users DROP COLUMN password;
```

### Migration 2: `0004_add_class_color.sql` (Phase 0, Week 1)

```sql
-- +goose Up
ALTER TABLE classes ADD COLUMN color varchar(50) NOT NULL DEFAULT 'bg-blue-600';

-- +goose Down
ALTER TABLE classes DROP COLUMN color;
```

### Migration 3: `0005_class_enrollments.sql` (Phase 2, Week 5)

```sql
-- +goose Up
CREATE TABLE class_enrollments (
    id          uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    class_id    uuid        NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    student_id  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id)
);
CREATE INDEX idx_enrollments_class_id ON class_enrollments (class_id);
CREATE INDEX idx_enrollments_student_id ON class_enrollments (student_id);

-- +goose Down
DROP TABLE IF EXISTS class_enrollments;
```

### Migration 4: `0006_submission_content.sql` (Phase 3, Week 7)

```sql
-- +goose Up
ALTER TABLE user_assignments
    ADD COLUMN submission_text text,
    ADD COLUMN submitted_at    timestamptz;

-- +goose Down
ALTER TABLE user_assignments
    DROP COLUMN submission_text,
    DROP COLUMN submitted_at;
```

### Migration 5: `0007_grading_columns.sql` (Phase 3, Week 8)

```sql
-- +goose Up
ALTER TABLE user_assignments
    ADD COLUMN feedback  text,
    ADD COLUMN graded_by uuid REFERENCES users (id),
    ADD COLUMN graded_at timestamptz;

-- +goose Down
ALTER TABLE user_assignments
    DROP COLUMN feedback,
    DROP COLUMN graded_by,
    DROP COLUMN graded_at;
```

### Migration 6: `0008_posts_class_id.sql` (Phase 4, Week 9)

```sql
-- +goose Up
ALTER TABLE posts ADD COLUMN class_id uuid REFERENCES classes (id) ON DELETE CASCADE;
CREATE INDEX idx_posts_class_id ON posts (class_id);

-- +goose Down
ALTER TABLE posts DROP COLUMN class_id;
```

### Migration 7: `0009_parent_student_links.sql` (Phase 4, Week 9)

```sql
-- +goose Up
CREATE TABLE parent_student_links (
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    parent_id  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    student_id uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (parent_id, student_id)
);
CREATE INDEX idx_psl_parent_id ON parent_student_links (parent_id);
CREATE INDEX idx_psl_student_id ON parent_student_links (student_id);

-- +goose Down
DROP TABLE IF EXISTS parent_student_links;
```

### Final MVP Schema — Entity Relationship Summary

```
users ──────────┬──── classes (teacher_id FK)
    │           │
    │           ├──── class_enrollments (student_id FK, class_id FK)
    │           │
    │           ├──── assignments (class_id FK)
    │           │         │
    │           │         └──── user_assignments (assignment_id FK, student_id FK)
    │           │                   ├── submission_text, submitted_at
    │           │                   ├── grade, feedback, graded_by, graded_at
    │           │                   └── status: assigned → submitted → graded | missing
    │           │
    │           ├──── posts (class_id FK, author_id FK, parent_id FK for threading)
    │           │
    │           └──── comments (post_id FK, author_id FK)
    │
    └──── parent_student_links (parent_id FK, student_id FK)
```

---

## 6. Phase 0 — Foundations (Weeks 1–2)

> **Dates:** Mar 2 – Mar 13, 2026
> **Goal:** Solidify dev tooling, fix known bugs, harden the schema, establish frontend architecture patterns.

### Week 1 — Dev Environment & Schema Hardening

| Day | Task                         | Detail                                                                                                                                                                      |
|-----|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Fix backend bugs             | Add missing `return` after every `if err != nil` error response in all handlers. Audit `createClass` for silent 500 bug.                                                    |
| Tue | Add Goose migration workflow | Install `pressly/goose`. Add `make migrate-up`, `make migrate-down`, `make migrate-status` targets. Convert existing schema files to use `-- +goose Up` / `-- +goose Down`. |
| Wed | Password column migration    | Apply `0003_add_password.sql`. Needed for auth in Phase 1.                                                                                                                  |
| Thu | Class color column migration | Apply `0004_add_class_color.sql`. Needed for frontend class card styling.                                                                                                   |
| Fri | Extend sqlc queries          | Write `GetUserByEmail`, `CreateUser`, `GetUserByID`, `UpdateClass`, `DeleteClass`, `GetClassByID`. Run `sqlc generate`.                                                     |

**Tools to install:**

| Tool            | Purpose               | Install                                                   |
|-----------------|-----------------------|-----------------------------------------------------------|
| `pressly/goose` | SQL migration runner  | `go install github.com/pressly/goose/v3/cmd/goose@latest` |
| `air`           | Live reload for Go    | Verify `.air.toml` config                                 |
| `sqlc`          | Query code generation | Already configured — verify `sqlc generate` passes        |

### Week 2 — Frontend Architecture & API Client

| Day | Task                              | Detail                                                                                                                      |
|-----|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Mon | Centralize API client             | Create `frontend/lib/api.ts` — typed `apiFetch<T>()` wrapper. No raw `fetch()` in components.                               |
| Tue | Solidify Zustand stores           | `useUserStore` (accessToken, type, clearUser) and `useClassesStore` (classes, fetchClasses, reset). Stores reset on logout. |
| Wed | Environment config                | Move API URLs to `NEXT_PUBLIC_API_URL` in `.env.local`. Mirror in Docker Compose.                                           |
| Thu | Error boundaries & loading states | Global `<ErrorBoundary>`. Skeleton loaders for class cards. Empty states with role-appropriate CTAs.                        |
| Fri | Testing baseline                  | Install `vitest` + `@testing-library/react` for frontend. Write one table-driven Go test for `createClass`.                 |

**Key Code — API Client Pattern:**

```typescript
// frontend/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = useUserStore.getState().accessToken
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    })
    if (res.status === 401) {
        useUserStore.getState().clearUser()
        throw new Error('Unauthorized')
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<T>
}
```

### Phase 0 Exit Criteria

- [ ] `make migrate-up` runs cleanly against a fresh database
- [ ] `make migrate-down` reverses all migrations without errors
- [ ] `sqlc generate` produces no errors
- [ ] `make dev` starts both Gin server and Next.js in watch mode
- [ ] `users.password` and `classes.color` columns exist
- [ ] `apiFetch` is the only way components call the API
- [ ] `NEXT_PUBLIC_API_URL` is read from `.env.local`, not hardcoded
- [ ] At least one Go handler test passes
- [ ] No handler has a missing `return` after an error response

---

## 7. Phase 1 — Authentication (Weeks 3–4)

> **Dates:** Mar 16 – Mar 27, 2026
> **Goal:** Real users can register, log in, stay logged in across refreshes. All API routes reject unauthenticated
> requests.
> **Depends on:** Phase 0 — `password` column migrated, `apiFetch` client ready.

### Week 3 — Backend Auth

| Day | Task                                    | Detail                                                                                                                                                                                                                                                                                                                       |
|-----|-----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Password hashing helpers                | `go get golang.org/x/crypto/bcrypt`. Create `HashPassword()` (cost 12) and `CheckPassword()` in `internal/auth/password.go`.                                                                                                                                                                                                 |
| Tue | `POST /v1/api/auth/register`            | Bind JSON (first_name, last_name, email, password, type). Hash password. Insert user. Return 201. Never return password hash — use `sanitizeUser()`.                                                                                                                                                                         |
| Wed | `POST /v1/api/auth/login`               | `go get github.com/golang-jwt/jwt/v5`. Look up user by email, compare bcrypt hash. Generate access token (15min) + refresh token (7d). Return access token in JSON; set refresh token as `httpOnly; Secure; SameSite=Strict` cookie. **Same error message for wrong email and wrong password** (prevents email enumeration). |
| Thu | `POST /v1/api/auth/refresh` & `/logout` | Refresh: read cookie, validate, issue new access + refresh tokens. Logout: overwrite cookie with expired value.                                                                                                                                                                                                              |
| Fri | `AuthMiddleware` + rate limiting        | Validate `Authorization: Bearer <token>`, set `userID` and `userRole` in `c.Set()`. Apply to all `/v1/api/...` routes except `/auth/...`. Rate limiter: 10 req/min on login.                                                                                                                                                 |

**Key Code — JWT Claims:**

```go
type Claims struct {
    UserID uuid.UUID `json:"user_id"`
    Role   string    `json:"role"`
    jwt.RegisteredClaims
}
```

**Key Code — CORS (required for cross-origin cookie flow):**

```go
// go get github.com/gin-contrib/cors
router.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"http://localhost:3000"},
    AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
    AllowCredentials: true, // CRITICAL — required for cookies
    MaxAge:           12 * time.Hour,
}))
```

### Week 4 — Frontend Auth

| Day | Task                           | Detail                                                                                                                                                |
|-----|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Wire login form                | Connect `app/auth/page.tsx` to `POST /v1/api/auth/login`. Store access token in Zustand. Redirect to `/dashboard`.                                    |
| Tue | Register form                  | Toggle between "Sign In" / "Create Account". Wire to `POST /v1/api/auth/register`. Auto-login on success.                                             |
| Wed | Silent token refresh           | Update `apiFetch` to retry on 401 — call `/v1/api/auth/refresh`, get new access token, retry original request. `credentials: 'include'` is essential. |
| Thu | Next.js route protection proxy | `proxy.ts` at frontend root. Check `refresh_token` cookie. Redirect unauthenticated users from `/dashboard` to `/auth`, and vice versa.               |
| Fri | Logout + session persistence   | Logout clears cookie server-side + Zustand store + redirects. On app load, attempt silent refresh to restore session.                                 |

**Security Architecture:**

| Token         | Storage           | JS Accessible                             | Expiry |
|---------------|-------------------|-------------------------------------------|--------|
| Access token  | Zustand (RAM)     | ✅ Yes — needed for `Authorization` header | 15 min |
| Refresh token | `httpOnly` cookie | ❌ No — XSS cannot steal it                | 7 days |

### Phase 1 Exit Criteria

- [ ] `POST /v1/api/auth/register` creates a user with bcrypt-hashed password
- [ ] `POST /v1/api/auth/login` returns access token + sets `httpOnly` refresh cookie
- [ ] `POST /v1/api/auth/refresh` issues a new access token from the cookie
- [ ] `POST /v1/api/auth/logout` clears the cookie
- [ ] All `/v1/api/classes` endpoints return 401 without a valid `Authorization` header
- [ ] Frontend login form works end-to-end → redirects to `/dashboard`
- [ ] Page refresh preserves session (silent refresh)
- [ ] `/dashboard` redirects to `/auth` without a token; `/auth` redirects to `/dashboard` with one
- [ ] Password hashes are never returned in any API response

---

## 8. Phase 2 — Classes & Assignments (Weeks 5–6)

> **Dates:** Mar 30 – Apr 10, 2026
> **Goal:** Teachers create/manage classes and assignments. Students see enrolled classes and classwork. Authorization
> enforced at API layer.
> **Depends on:** Phase 1 — JWT auth proxy in place.

### Week 5 — Class Management

| Day | Task                      | Detail                                                                                                                                                                                 |
|-----|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Class enrollment table    | Apply `0005_class_enrollments.sql`. Write sqlc queries: `EnrollStudent`, `UnenrollStudent`, `GetStudentClasses`, `GetClassStudents`, `GetEnrolledStudentIDs`, `IsStudentEnrolled`.     |
| Tue | Role-scoped class listing | Update `GET /v1/api/classes` — teachers see owned classes, students see enrolled classes. User ID comes from JWT claims, **not** query params. Remove the `teacherId` query parameter. |
| Wed | Class detail endpoint     | `GET /v1/api/classes/:id` — verify teacher owns it or student is enrolled before returning data.                                                                                       |
| Thu | Update & delete class     | `PUT /v1/api/classes/:id` and `DELETE /v1/api/classes/:id`. Teacher only, ownership verified.                                                                                          |
| Fri | Wire frontend to real API | `useClassesStore.fetchClasses()` calls `apiFetch`. Class cards render real data. Remove hardcoded mock data.                                                                           |

### Week 6 — Assignment Management

| Day | Task                                | Detail                                                                                                                                                                         |
|-----|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Assignment CRUD endpoints           | `POST /v1/api/classes/:id/assignments`, `GET /v1/api/classes/:id/assignments`, `GET /v1/api/assignments/:id`, `PUT /v1/api/assignments/:id`, `DELETE /v1/api/assignments/:id`. |
| Tue | Auto-create `user_assignments` rows | On assignment creation: bulk-insert a `user_assignments` row (`status = 'assigned'`) for every enrolled student. Use a DB transaction (all-or-nothing).                        |
| Wed | Missing assignment background job   | Go goroutine in `main()`, ticks every hour. Marks `status = 'missing'` where `status = 'assigned'` and `due_date < NOW()`.                                                     |
| Thu | Classwork page (frontend)           | `app/dashboard/class/[id]/classwork/page.tsx` — fetch and display assignments grouped by type. Status badges: 🔵 Assigned, 🟡 Submitted, 🟢 Graded, 🔴 Missing.                |
| Fri | Assignment detail page              | Teacher view: title, details, due date, student submission table. Student view: title, details, due date, their status badge (submission form wired in Phase 3).               |

**Key Design — Automatic Status Tracking:**

When a teacher creates an assignment, every enrolled student immediately gets a `user_assignments` row with
`status = 'assigned'`. The teacher can see at a glance which students have submitted, which are pending, and which are
missing — from the very first moment. No manual grade entry required to populate the gradebook.

### Phase 2 Exit Criteria

- [ ] `class_enrollments` table migrated and indexed
- [ ] `GET /v1/api/classes` returns only the calling user's classes (role-scoped)
- [ ] `teacherId` query parameter removed from classes endpoint
- [ ] Creating an assignment bulk-inserts `user_assignments` rows for all enrolled students
- [ ] Missing assignment background job runs without error
- [ ] Frontend classwork page renders real assignments from API
- [ ] Dashboard class cards show real data
- [ ] Teachers cannot access another teacher's class; students cannot access unenrolled classes

---

## 9. Phase 3 — Submissions & Grading (Weeks 7–8)

> **Dates:** Apr 13 – Apr 24, 2026
> **Goal:** Students submit text, teachers grade with feedback, students see returned grades. Gradebook renders the full
> matrix.
> **Depends on:** Phase 2 — enrollments, assignments, and `user_assignments` populated.

### Week 7 — Submissions

| Day | Task                                      | Detail                                                                                                                                                                                          |
|-----|-------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Submission columns migration              | Apply `0006_submission_content.sql`. Add `submission_text` and `submitted_at` to `user_assignments`. Write sqlc queries: `SubmitAssignment`, `GetUserAssignment`, `GetSubmissionsByAssignment`. |
| Tue | `POST /v1/api/assignments/:id/submit`     | Student only. Verify enrollment. Idempotent (resubmit overwrites). Guard: `status != 'graded'` prevents overwriting a returned grade.                                                           |
| Wed | `GET /v1/api/assignments/:id/submissions` | Teacher only. Returns all `user_assignments` rows joined with `users` (name, avatar). Verify teacher owns the class.                                                                            |
| Thu | Student submission form (frontend)        | Textarea + submit button. Draft auto-save to `localStorage` on every keystroke (keyed by `assignmentId_userId`). Restore on mount, clear after successful submit.                               |
| Fri | Submission list view (frontend)           | Teacher's assignment page: table of all students with status badges, submitted text preview, submission timestamps.                                                                             |

**Key Code — Draft Auto-Save (prevents student data loss):**

```typescript
const DRAFT_KEY = `lum_draft_${assignmentId}_${userId}`

// Save on every keystroke
const handleChange = (value: string) => {
    setText(value)
    localStorage.setItem(DRAFT_KEY, value)
}

// Restore on mount
useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) setText(saved)
}, [assignmentId])

// Clear after successful submit
localStorage.removeItem(DRAFT_KEY)
```

### Week 8 — Grading

| Day | Task                                       | Detail                                                                                                                                                                                                         |
|-----|--------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Grading columns migration                  | Apply `0007_grading_columns.sql`. Add `feedback`, `graded_by`, `graded_at` to `user_assignments`. Write sqlc queries: `GradeSubmission`, `GetUserAssignmentByID`.                                              |
| Tue | `PATCH /v1/api/user-assignments/:id/grade` | Teacher only. Body: `{ grade: int, feedback: string }`. Updates grade, feedback, graded_by, graded_at, status → 'graded'. Validates teacher owns the class.                                                    |
| Wed | `GET /v1/api/classes/:id/gradebook`        | `CROSS JOIN` query: every enrolled student × every assignment. `LEFT JOIN` on `user_assignments` fills `NULL` for unsubmitted work. Complete grid, no hidden students.                                         |
| Thu | Grading panel (frontend)                   | Inline panel on submission list: grade input (0–100), feedback textarea, Save button with ✓ confirmation.                                                                                                      |
| Fri | Student grade view + gradebook page        | Students see returned grade + feedback on assignment detail page. Teachers see full gradebook table at `/dashboard/class/[id]/gradebook`. Color-coded: 🟢 80–100, 🟡 60–79, 🔴 0–59, — not graded, 🔴 missing. |

**Key SQL — Gradebook Query:**

```sql
SELECT u.id AS student_id, u.first_name, u.last_name,
       a.id AS assignment_id, a.title, a.due_date,
       ua.grade, ua.status, ua.submitted_at, ua.graded_at, ua.feedback
FROM class_enrollments ce
    JOIN users u ON u.id = ce.student_id
    CROSS JOIN assignments a
    LEFT JOIN user_assignments ua ON ua.student_id = u.id AND ua.assignment_id = a.id
WHERE ce.class_id = $1 AND a.class_id = $1 AND a.type = 'assignment'
ORDER BY u.last_name, u.first_name, a.created_at;
```

### Phase 3 Exit Criteria

- [ ] `user_assignments` has `submission_text`, `submitted_at`, `feedback`, `graded_by`, `graded_at` columns
- [ ] Students can submit text; re-submission overwrites (idempotent)
- [ ] Students cannot submit for classes they're not enrolled in
- [ ] Teachers can grade with score + feedback
- [ ] Gradebook returns complete student × assignment matrix
- [ ] Draft auto-save works (save on keystroke, restore on mount, clear after submit)
- [ ] Students see returned grade and feedback on the assignment detail page
- [ ] Gradebook renders with color-coded cells

---

## 10. Phase 4 — Communication & Parent Portal (Week 9)

> **Dates:** Apr 27 – May 1, 2026
> **Goal:** Class stream with announcements. Parents link to children and view grades.
> **Depends on:** Phase 3 — full submission/grading cycle working.

### Week 9 — Stream & Parent View

| Day | Task                          | Detail                                                                                                                                                                                                                             |
|-----|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Announcements CRUD            | Apply `0008_posts_class_id.sql` (add `class_id` to `posts`). Endpoints: `POST /v1/api/classes/:id/announcements` (teacher only), `GET /v1/api/classes/:id/announcements` (teacher + enrolled students).                            |
| Tue | Class stream page (frontend)  | Wire `app/dashboard/class/[id]/page.tsx` (Stream tab) to announcements API. Teachers see compose box; all users see reverse-chronological feed.                                                                                    |
| Wed | Parent student link migration | Apply `0009_parent_student_links.sql`. Endpoint: `POST /v1/api/parent/link` — parent provides student's email, backend creates the link. Returns same vague error for non-existent and non-student emails (anti-enumeration).      |
| Thu | Parent-scoped API endpoints   | `ParentGuard` proxy validates parent ↔ student link. Endpoints: `GET /v1/api/parent/students`, `GET /v1/api/parent/students/:id/classes`, `GET /v1/api/parent/students/:id/grades`, `GET /v1/api/parent/students/:id/assignments`. |
| Fri | Parent dashboard (frontend)   | When `useUserStore().type === 'parent'`, render a completely different dashboard showing linked student cards with grade summaries, upcoming due dates, and class list.                                                            |

**Key Design — Parents are First-Class Users:**

Unlike Google Classroom (email summaries only) or Canvas (Observer role with too much access), Luminescence gives
parents a real login with a purpose-built dashboard. The `ParentGuard` proxy enforces that parents can **only** see data
for their linked children — FERPA-compliant by design. No other student's data is ever exposed.

### Phase 4 Exit Criteria

- [ ] `posts.class_id` column migrated and indexed
- [ ] `parent_student_links` table migrated and indexed
- [ ] Announcements scoped to class; stream renders from API
- [ ] Teachers see compose box; students see read-only feed
- [ ] Parent link by student email works
- [ ] `ParentGuard` rejects requests for unlinked students
- [ ] Parent dashboard renders when `type === 'parent'`
- [ ] Parents see their child's grades and upcoming assignments
- [ ] No parent can access another student's data via any endpoint

---

## 11. Phase 5 — Polish, Testing & Launch (Week 10)

> **Dates:** May 4 – May 9, 2026
> **Goal:** Stable, tested, secure. Not feature-complete — but reliable.

### Week 10 — Stabilisation

| Day | Task                                 | Detail                                                                                                                                                                                       |
|-----|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | End-to-end journey pass              | Walk through all 5 user journeys (§16) on a fresh database. Log every failure in `BACKLOG.md`. Do NOT fix mid-journey — complete all journeys first, then triage.                            |
| Tue | Input validation audit               | Backend: every handler has `binding:"required"` tags. Frontend: Zod schemas in `lib/schemas.ts` mirror backend constraints. Test edge cases: empty fields, wrong types, out-of-range values. |
| Wed | Error handling & empty states        | Every page handles: loading (skeleton), empty (role-appropriate CTA), error (retry button). Install `react-hot-toast`. Add `<Toaster />` to layout. Toast on every create/update/delete.     |
| Thu | Security checklist                   | Execute every item in §13 below. JWT secret from env (fatal if missing). All routes use AuthMiddleware. Teacher ownership checks. ParentGuard. Least-privilege DB user.                      |
| Fri | Docker Compose prod config + release | Write `docker-compose.prod.yml` with health checks. Create `.env.prod` template. Update `README.md`. Create `BACKLOG.md`. Tag `v0.1.0`.                                                      |

**Zod Schema Examples (must match Gin `binding:` tags):**

```typescript
// frontend/lib/schemas.ts
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
})
export const classSchema = z.object({
    subject: z.string().min(1).max(100),
    grade: z.number().int().min(1).max(12),
    color: z.string().optional(),
})
export const gradeSchema = z.object({
    grade: z.number().int().min(0).max(100),
    feedback: z.string().max(2000).optional(),
})
```

### Phase 5 Exit Criteria (= MVP Ship Criteria)

- [ ] All 5 QA journey scripts pass (§16)
- [ ] All backend security items verified (§13)
- [ ] All frontend security items verified (§13)
- [ ] `next build` — zero TypeScript errors
- [ ] `go test ./...` — passes
- [ ] All pages have loading, empty, and error states
- [ ] Toast notifications on every action
- [ ] `docker compose -f docker-compose.prod.yml up` starts cleanly
- [ ] DB health check passes before backend starts
- [ ] `README.md` complete; `BACKLOG.md` exists
- [ ] Git tag `v0.1.0` pushed

---

## 12. Complete API Reference

### Public Routes (no auth required)

| Method | Path                    | Description                             |
|--------|-------------------------|-----------------------------------------|
| `POST` | `/v1/api/auth/register` | Create account (teacher/student/parent) |
| `POST` | `/v1/api/auth/login`    | Login → access token + refresh cookie   |
| `POST` | `/v1/api/auth/refresh`  | Refresh access token via cookie         |
| `POST` | `/v1/api/auth/logout`   | Clear refresh cookie                    |

### Protected Routes — All Roles

| Method | Path                  | Role             | Description                                  |
|--------|-----------------------|------------------|----------------------------------------------|
| `GET`  | `/v1/api/classes`     | Teacher, Student | List classes (role-scoped)                   |
| `GET`  | `/v1/api/classes/:id` | Teacher, Student | Class detail (ownership/enrollment verified) |

### Protected Routes — Teacher Only

| Method   | Path                                  | Description                         |
|----------|---------------------------------------|-------------------------------------|
| `POST`   | `/v1/api/classes`                     | Create a class                      |
| `PUT`    | `/v1/api/classes/:id`                 | Update class (owner only)           |
| `DELETE` | `/v1/api/classes/:id`                 | Delete class (owner only)           |
| `POST`   | `/v1/api/classes/:id/enroll`          | Enroll a student by email           |
| `GET`    | `/v1/api/classes/:id/students`        | List enrolled students              |
| `POST`   | `/v1/api/classes/:id/assignments`     | Create assignment or material       |
| `PUT`    | `/v1/api/assignments/:id`             | Update assignment (owner only)      |
| `DELETE` | `/v1/api/assignments/:id`             | Delete assignment (owner only)      |
| `GET`    | `/v1/api/assignments/:id/submissions` | List all submissions + student info |
| `PATCH`  | `/v1/api/user-assignments/:id/grade`  | Grade a submission                  |
| `GET`    | `/v1/api/classes/:id/gradebook`       | Full gradebook matrix               |
| `POST`   | `/v1/api/classes/:id/announcements`   | Post announcement to stream         |

### Protected Routes — Teacher & Student

| Method | Path                                | Description                              |
|--------|-------------------------------------|------------------------------------------|
| `GET`  | `/v1/api/classes/:id/assignments`   | List classwork (assignments + materials) |
| `GET`  | `/v1/api/assignments/:id`           | Assignment detail                        |
| `GET`  | `/v1/api/classes/:id/announcements` | Class stream                             |

### Protected Routes — Student Only

| Method | Path                             | Description                   |
|--------|----------------------------------|-------------------------------|
| `POST` | `/v1/api/assignments/:id/submit` | Submit text for an assignment |

### Protected Routes — Parent Only

| Method | Path                                      | Description                    |
|--------|-------------------------------------------|--------------------------------|
| `POST` | `/v1/api/parent/link`                     | Link to a student by email     |
| `GET`  | `/v1/api/parent/students`                 | List linked students           |
| `GET`  | `/v1/api/parent/students/:id/classes`     | Student's classes              |
| `GET`  | `/v1/api/parent/students/:id/grades`      | Student's grades and feedback  |
| `GET`  | `/v1/api/parent/students/:id/assignments` | Student's upcoming assignments |

---

## 13. Security Playbook

### Backend Checklist

- [ ] No raw SQL strings — all queries via sqlc-generated functions
- [ ] No hardcoded secrets — all from `os.Getenv()`, fatal if missing
- [ ] `AuthMiddleware` on all `/v1/api/...` routes except `/v1/api/auth/...`
- [ ] Every teacher endpoint verifies `class.TeacherID == c.MustGet("userID")`
- [ ] Every student endpoint verifies enrollment
- [ ] Every parent endpoint passes through `ParentGuard`
- [ ] Login endpoint has rate limiting proxy (10 req/min)
- [ ] `sanitizeUser()` called before returning any user — no password hash in responses
- [ ] `httpOnly; Secure; SameSite=Strict` on refresh token cookie
- [ ] Error messages don't expose internals (no stack traces in JSON)
- [ ] `GIN_MODE=release` in production
- [ ] Database user is least-privilege (not `postgres` superuser)
- [ ] Same error message for wrong email and wrong password (anti-enumeration)

### Frontend Checklist

- [ ] `localStorage` only used for draft auto-save — never for auth tokens
- [ ] `credentials: 'include'` on all fetch calls that need the cookie
- [ ] `NEXT_PUBLIC_API_URL` is the only `NEXT_PUBLIC_` variable — no secrets in browser
- [ ] All inputs validated with Zod before API call
- [ ] Error boundaries prevent full-page crashes
- [ ] No student data rendered from unvalidated API responses

### FERPA / COPPA Considerations (K-12 Specific)

- No student's real name, email, or grade is exposed to another student via API
- All queries filter by the requesting user's class memberships
- Parent view shows only their linked child's data
- No third-party analytics on pages displaying student data

---

## 14. Risk Register & Mitigations

| # | Risk                                                     | Likelihood | Impact   | Mitigation                                                                                                              |
|---|----------------------------------------------------------|------------|----------|-------------------------------------------------------------------------------------------------------------------------|
| 1 | JWT + cookie + CORS debugging takes longer than expected | **High**   | **High** | Budget 3 days for Week 3 core endpoints. Test with Postman before wiring frontend. Install `gin-contrib/cors` on day 1. |
| 2 | `sqlc generate` breaks after schema changes              | Medium     | Medium   | Run `sqlc generate` immediately after every migration. Keep `go.sum` in version control.                                |
| 3 | Next.js proxy cookie reading behaves unexpectedly        | Medium     | Medium   | Test proxy in isolation before relying on it for auth routing.                                                          |
| 4 | Retroactive foreign keys cause migration issues          | Low        | Medium   | Always write both `-- +goose Up` and `-- +goose Down`. Test `migrate-down` before merging.                              |
| 5 | Gradebook `CROSS JOIN` performance degrades              | Low        | Low      | Add `LIMIT` during MVP. Index `user_assignments(student_id, assignment_id)`.                                            |
| 6 | **Scope creep** — adding features mid-phase              | **High**   | **High** | Strictly follow this guide. Log new ideas in `BACKLOG.md`. Do NOT implement during MVP sprint.                          |
| 7 | Frontend/backend data shapes go out of sync              | Medium     | Medium   | Define shared TypeScript types in `lib/types.ts`. Update immediately when backend responses change.                     |

---

## 15. Velocity Checkpoints

Self-assess at each date. If a checkpoint is missed by 3+ days, **cut the lowest-priority task** in the current phase
and move it to `BACKLOG.md`. Do not extend the timeline.

| Date       | Checkpoint                             | Pass Criteria                                                                                        |
|------------|----------------------------------------|------------------------------------------------------------------------------------------------------|
| **Mar 13** | Phase 0 complete                       | `sqlc generate` clean. `make dev` starts both services. Password + color columns migrated.           |
| **Mar 27** | Auth complete                          | Register, login, logout work. `/dashboard` redirects to `/auth` without token. JWT on all API calls. |
| **Apr 10** | Classes + assignments complete         | Teacher creates class and assignment via UI. Student sees assignment in classwork.                   |
| **Apr 24** | Submissions + grading complete         | Student submits text. Teacher grades it. Student sees grade. Gradebook renders.                      |
| **May 1**  | Communication + parent portal complete | Teacher posts announcement. Parent logs in and sees child's grades.                                  |
| **May 9**  | **MVP launch**                         | `v0.1.0` tagged. All journeys pass. Docker Compose prod config documented.                           |

---

## 16. QA User Journey Scripts

Run these against the production build (`GIN_MODE=release`) before tagging `v0.1.0`.

### QA-01: Registration & Login

```
[ ] Teacher registers with email, password, type: teacher
[ ] Redirected to /dashboard after register (auto-login)
[ ] Logout → redirected to /auth
[ ] Login with same credentials → /dashboard
[ ] Wrong password → "Invalid email or password" (NOT "user not found")
[ ] Access /dashboard without login → redirected to /auth
[ ] Login → access /auth → redirected to /dashboard
[ ] Page refresh → session preserved (silent refresh)
```

### QA-02: Class Lifecycle

```
[ ] Teacher creates class → appears on dashboard
[ ] Teacher edits class (subject, color) → updates
[ ] Teacher deletes class → removed
[ ] Student logs in → no classes (not yet enrolled)
[ ] Teacher enrolls student by email → student refreshes → class appears
[ ] Student accesses class → Stream, Classwork, People tabs load
[ ] Teacher accesses another teacher's class via API → 403
[ ] Student accesses unenrolled class via API → 403
```

### QA-03: Assignment & Submission

```
[ ] Teacher creates assignment with due date → appears in classwork
[ ] Student submits text → status changes to "Submitted"
[ ] Student resubmits → overwrites (no duplicate error)
[ ] Unenrolled student attempts to submit → 403
[ ] Close tab during draft → reopen → draft restored from localStorage
[ ] Due date passes on unsubmitted assignment → status becomes "Missing"
[ ] Teacher sees all submissions on assignment page
```

### QA-04: Grading

```
[ ] Teacher grades submission (87, "Great work!") → saved
[ ] Student sees grade: 87/100 on assignment page
[ ] Student sees feedback: "Great work!" below grade
[ ] Gradebook renders all students × assignments matrix
[ ] Teacher cannot grade submission in another teacher's class → 403
```

### QA-05: Parent Portal

```
[ ] Parent registers → parent dashboard renders (not teacher dashboard)
[ ] Parent links to student by email → linked
[ ] Parent links with non-existent email → "student not found"
[ ] Parent dashboard shows student card with grade summary
[ ] Parent views student's grades → correct data
[ ] Parent changes :student_id in URL to different student → 403
```

---

## 17. Post-MVP Roadmap

Features excluded from MVP, prioritized for future versions. See `LMS_CORE_FEATURES.md` for full implementation details.

### v1 — Next Sprint

| Feature                                         | Effort | Core Features Section            |
|-------------------------------------------------|--------|----------------------------------|
| File uploads for submissions (MinIO/S3 presign) | 1 week | §9 File & Media Management       |
| SSE real-time notifications                     | 1 week | §5 Communication & Notifications |
| Direct messaging (teacher ↔ student)            | 3 days | §5 Communication & Notifications |
| Rich text editor for announcements (TipTap)     | 3 days | §2 Course & Content Management   |
| Student enrollment UI (currently API-only)      | 2 days | §2 Course & Content Management   |
| Rubric-based grading                            | 1 week | §4 Grading & Feedback            |

### v2 — Growth

| Feature                                                | Effort    | Core Features Section    |
|--------------------------------------------------------|-----------|--------------------------|
| Analytics dashboard (submission rates, at-risk alerts) | 1 week    | §7 Analytics & Reporting |
| Global search (`/v1/api/search`)                       | 3 days    | §10 Search & Discovery   |
| Google OAuth SSO                                       | 2 days    | §12 Integration Layer    |
| Quiz / assessment engine                               | 2–3 weeks | §8 Assessment Engine     |
| OpenAPI / Swagger docs                                 | 2 days    | §12 Integration Layer    |

### v3 — Enterprise

| Feature                             | Effort    | Core Features Section           |
|-------------------------------------|-----------|---------------------------------|
| Progressive Web App (PWA) / offline | 1 week    | §14 Mobile & Offline Experience |
| LTI 1.3 third-party tools           | 3–4 weeks | §12 Integration Layer           |
| OneRoster SIS sync                  | 2 weeks   | §12 Integration Layer           |
| AI-powered at-risk prediction       | 1 week    | §7 Analytics & Reporting        |

---

## 18. Key Architectural Decisions

These decisions are made now and should not be revisited during the MVP sprint:

| Decision        | Choice                                             | Rationale                                                                            |
|-----------------|----------------------------------------------------|--------------------------------------------------------------------------------------|
| Auth tokens     | `httpOnly` cookie (refresh) + Zustand RAM (access) | Prevents XSS token theft. Never `localStorage` for JWTs.                             |
| API prefix      | `/v1/api/...`                                      | Already in use. Keep consistent across all handlers.                                 |
| IDs             | UUIDs everywhere                                   | Already in schema via `github.com/google/uuid`. Non-sequential, harder to enumerate. |
| SQL             | All through sqlc — no raw SQL in Go                | Type-safe, compile-time checked.                                                     |
| Migrations      | `pressly/goose` with explicit Up/Down blocks       | Versioned, reversible, team-friendly.                                                |
| File uploads    | Pre-signed URLs (MinIO dev / S3 prod)              | Backend not in data path — no memory pressure. Post-MVP.                             |
| Frontend state  | Zustand                                            | Lightweight, TypeScript-friendly, no boilerplate.                                    |
| API client      | Single `apiFetch<T>()` function                    | Consistent error handling, automatic token injection, type-safe.                     |
| CSS             | Tailwind CSS                                       | Already in use. Responsive prefixes for mobile.                                      |
| Background jobs | Go goroutines (`time.NewTicker`)                   | Lightweight, no external dependency for MVP.                                         |

---

## 19. Competitive Advantages Over Existing Platforms

Luminescence is designed to address specific weaknesses found in existing K-12 LMS platforms. These advantages are built
into the architecture from day one:

| Advantage                        | vs. Platform                                                  | Detail                                                                                                                     |
|----------------------------------|---------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| **Real parent login**            | Google Classroom (email-only guardians)                       | Parents get a full dashboard, not just email summaries.                                                                    |
| **Scoped parent view**           | Canvas (Observer sees everything)                             | Parents see only grades, assignments, and announcements for their linked child. FERPA-compliant.                           |
| **Email enumeration protection** | Most platforms                                                | Same error for wrong email and wrong password on login. Same error for non-existent and non-student emails on parent link. |
| **Automatic status tracking**    | Google Classroom (no "missing" concept)                       | `user_assignments` rows created at assignment time. Background job marks overdue as "missing" automatically.               |
| **Draft auto-save**              | Google Classroom (no drafts), Canvas (explicit save required) | Every keystroke saved to localStorage. Zero student data loss.                                                             |
| **Complete gradebook**           | Canvas (hides students without submissions)                   | `CROSS JOIN` ensures every student × assignment cell exists. No hidden students.                                           |
| **Idempotent resubmission**      | Canvas (locked after first submit)                            | Resubmit before grading simply overwrites. Sensible default, zero configuration.                                           |
| **Single-page grading**          | Canvas SpeedGrader (30 separate page loads)                   | All submissions fetched in one query. Grade inline, no page navigation.                                                    |
| **Feedback with grade**          | Canvas (separate "Submission Comments")                       | Grade and feedback shown together on the same page. Impossible to miss.                                                    |
| **10-minute production deploy**  | Canvas/Moodle (hours/days of setup)                           | Three env vars + `docker compose up`. No Rails, no PHP, no Redis, no Sidekiq.                                              |
| **Reversible migrations**        | Moodle (brittle upgrade scripts)                              | `goose` with Up/Down blocks. `make migrate-down` restores previous state.                                                  |
| **Stateless JWT auth**           | Moodle/Blackboard (server-side sessions)                      | Any server instance validates any request. Scales without shared session store.                                            |

---

## 20. References

### Go / Backend

| Resource                     | URL                                                                              |
|------------------------------|----------------------------------------------------------------------------------|
| Gin framework docs           | https://gin-gonic.com/docs/                                                      |
| `golang-jwt/jwt` v5          | https://github.com/golang-jwt/jwt                                                |
| `golang.org/x/crypto/bcrypt` | https://pkg.go.dev/golang.org/x/crypto/bcrypt                                    |
| `golang.org/x/time/rate`     | https://pkg.go.dev/golang.org/x/time/rate                                        |
| `gin-contrib/cors`           | https://github.com/gin-contrib/cors                                              |
| sqlc documentation           | https://docs.sqlc.dev/en/latest/                                                 |
| sqlc query annotations       | https://docs.sqlc.dev/en/latest/reference/query-annotations.html                 |
| sqlc transactions            | https://docs.sqlc.dev/en/latest/howto/transactions.html                          |
| pressly/goose migrations     | https://github.com/pressly/goose                                                 |
| `lib/pq` PostgreSQL driver   | https://github.com/lib/pq                                                        |
| air live reload              | https://github.com/air-verse/air                                                 |
| Gin handler testing          | https://gin-gonic.com/docs/testing/                                              |
| Go table-driven tests        | https://go.dev/blog/subtests                                                     |
| OWASP Password Storage       | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html |

### PostgreSQL

| Resource                   | URL                                                                    |
|----------------------------|------------------------------------------------------------------------|
| UUID functions             | https://www.postgresql.org/docs/current/functions-uuid.html            |
| `ON CONFLICT DO NOTHING`   | https://www.postgresql.org/docs/current/sql-insert.html                |
| `CROSS JOIN` / `LEFT JOIN` | https://www.postgresql.org/docs/current/queries-table-expressions.html |
| Indexes                    | https://www.postgresql.org/docs/current/indexes.html                   |

### Next.js / Frontend

| Resource                      | URL                                                                                     |
|-------------------------------|-----------------------------------------------------------------------------------------|
| Next.js App Router docs       | https://nextjs.org/docs/app                                                             |
| Next.js Middleware            | https://nextjs.org/docs/app/building-your-application/routing/middleware                |
| Next.js environment variables | https://nextjs.org/docs/app/building-your-application/configuring/environment-variables |
| Zustand docs                  | https://zustand.dev/                                                                    |
| Zod validation                | https://zod.dev/                                                                        |
| `react-hot-toast`             | https://react-hot-toast.com/                                                            |
| Vitest                        | https://vitest.dev/                                                                     |
| React Testing Library         | https://testing-library.com/docs/react-testing-library/intro/                           |

### Security & Compliance

| Resource                              | URL                                                                           |
|---------------------------------------|-------------------------------------------------------------------------------|
| OWASP Top 10                          | https://owasp.org/www-project-top-ten/                                        |
| FERPA — student data privacy          | https://studentprivacy.ed.gov/ferpa                                           |
| COPPA — parental consent for under-13 | https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy      |
| MDN — `credentials: 'include'`        | https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials          |
| MDN — `SameSite` cookie attribute     | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite |

### Industry Pacing References

| Reference                   | Finding                                                                   |
|-----------------------------|---------------------------------------------------------------------------|
| Open edX contribution guide | 6–9 months for a minimal functional LMS with a 2-person team              |
| Moodle core feature history | Auth + course + assignment cycle took ~18 months in v1.0 (2001, solo dev) |
| Indie Hackers LMS builders  | 3–6 months to a paying MVP for simple course platforms                    |
| Basecamp Shape Up           | 6-week cycles for meaningful features with a small team                   |

> **Bottom line:** A 10-week MVP for a K-12 LMS with auth, classes, assignments, submissions, grading, and a parent
> portal is **aggressive but achievable** for one experienced full-stack developer. The most common failure mode is
> underestimating auth (JWT + cookies + CORS) and database schema changes mid-build. This guide front-loads both.

---

*Complete MVP guide for Luminescence LMS — consolidated from LMS_RESEARCH.md, LMS_CORE_FEATURES.md,
LMS_MVP_PACING_GUIDE.md, and Phase 0–5 documents.*
*Stack: Next.js 15 · TypeScript · Tailwind CSS · Zustand · Go · Gin v1.11 · sqlc · lib/pq · PostgreSQL · Docker Compose*
*Target: v0.1.0 — May 9, 2026*

