# Luminescence LMS — MVP Pacing Guide

> A week-by-week build plan from the current working skeleton to a classroom-ready MVP.
> Estimates assume **one developer** working approximately **4–6 focused hours per day**.
> Adjust multipliers for team size, part-time schedules, or unfamiliar tooling.

**Current state (as of February 28, 2026):**

- ✅ Docker Compose environment running
- ✅ PostgreSQL schema migrated (`users`, `classes`, `assignments`, `topics`, `user_assignments`, `posts`, `comments`)
- ✅ Gin server with two live endpoints: `POST /v1/api/classes`, `GET /v1/api/classes`
- ✅ sqlc code generation configured
- ✅ Next.js 15 frontend scaffolded with Tailwind, Zustand, dashboard layout, class cards, auth page

**MVP definition:** A real teacher can log in, create a class, post an assignment, students can view and submit it, the
teacher can grade it, and parents can see their child's grades. No quiz engine, no LTI, no file uploads beyond text
submissions.

**Target MVP completion:** ~10 weeks from now → **~May 9, 2026**

---

## Table of Contents

1. [Phase 0 — Foundations (Weeks 1–2)](#phase-0--foundations-weeks-12)
2. [Phase 1 — Authentication (Weeks 3–4)](#phase-1--authentication-weeks-34)
3. [Phase 2 — Class & Assignment Management (Weeks 5–6)](#phase-2--class--assignment-management-weeks-56)
4. [Phase 3 — Submissions & Grading (Weeks 7–8)](#phase-3--submissions--grading-weeks-78)
5. [Phase 4 — Communication & Parent Portal (Week 9)](#phase-4--communication--parent-portal-week-9)
6. [Phase 5 — Polish, Testing & Launch (Week 10)](#phase-5--polish-testing--launch-week-10)
7. [Risk Register](#risk-register)
8. [Velocity Checkpoints](#velocity-checkpoints)
9. [Post-MVP Roadmap](#post-mvp-roadmap)
10. [References](#references)

---

## Phase 0 — Foundations (Weeks 1–2)

> **Goal:** Solidify the developer experience, tooling, and schema so every subsequent phase builds on a stable base.
> Bugs found here are cheap; bugs found in Phase 4 are expensive.

**Estimated duration:** 2 weeks  
**Dates:** Mar 2 – Mar 13, 2026

### Week 1 — Dev Environment & Schema Hardening

| Day | Task                            | Detail                                                                                                                                       |
|-----|---------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Fix known backend bugs          | `createClass` currently doesn't `return` after UUID parse error — silent 500. Audit all handlers for missing `return` after error responses. |
| Tue | Add `goose` migration workflow  | Install `pressly/goose` for repeatable up/down migrations. Wire `make migrate-up` and `make migrate-down` scripts.                           |
| Wed | Add `password` column migration | `ALTER TABLE users ADD COLUMN password varchar(255)` — needed for Phase 1.                                                                   |
| Thu | Add `color` column to `classes` | `ALTER TABLE classes ADD COLUMN color varchar(50) NOT NULL DEFAULT 'bg-blue-600'` — needed for frontend class cards.                         |
| Fri | Extend sqlc queries             | Write and generate queries for: `GetUserByEmail`, `CreateUser`, `GetUserByID`, `UpdateClass`, `DeleteClass`. Run `sqlc generate`.            |

**Key tools to install this week:**

- `pressly/goose` — SQL migration runner: https://github.com/pressly/goose
- `air` — live reload for Go (already referenced in project): https://github.com/air-verse/air
- `sqlc` CLI — already in use, verify `sqlc generate` passes cleanly

**Deliverable:** `make dev` starts both frontend and backend cleanly. `sqlc generate` runs without errors. All schema
migrations are versioned and reversible.

---

### Week 2 — Frontend Architecture & API Client

| Day | Task                            | Detail                                                                                                                                                                       |
|-----|---------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Centralize API client           | Create `frontend/lib/api.ts` — a typed fetch wrapper that attaches the JWT `Authorization` header and handles 401 by clearing the store. No raw `fetch` calls in components. |
| Tue | Solidify Zustand stores         | Review `useUserStore` and `useClassesStore`. Ensure they hydrate from API (not just localStorage) and reset cleanly on logout.                                               |
| Wed | Environment config              | Move all hardcoded API base URLs into `NEXT_PUBLIC_API_URL` in `.env.local`. Mirror in Docker Compose `environment:` block.                                                  |
| Thu | Error boundary + loading states | Add a global `<ErrorBoundary>` in `app/layout.tsx`. Add skeleton loaders for class cards and dashboard pages.                                                                |
| Fri | Set up testing baseline         | Install `vitest` + `@testing-library/react` for frontend; `go test ./...` passes with at least one table-driven test for `createClass` handler.                              |

**Reference — API client pattern:**

```typescript
// frontend/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = useUserStore.getState().accessToken
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
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
    return res.json()
}
```

**Deliverable:** All API calls go through one typed client. Stores reset on logout. Loading and error states show in the
UI.

---

## Phase 1 — Authentication (Weeks 3–4)

> **Goal:** Real users can register, log in, and stay logged in across page refreshes. Every protected API endpoint
> rejects unauthenticated requests.

**Estimated duration:** 2 weeks  
**Dates:** Mar 16 – Mar 27, 2026

### Week 3 — Backend Auth

| Day | Task                          | Detail                                                                                                                                                                                                     |
|-----|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Add bcrypt to `go.mod`        | `go get golang.org/x/crypto/bcrypt`. Write `HashPassword(plain string) (string, error)` and `CheckPassword(hash, plain string) bool` helpers.                                                              |
| Tue | `POST /v1/api/auth/register`  | Bind JSON `{ first_name, last_name, email, password, type }`. Hash password. Insert into `users`. Return 201. Validate `type` is one of `teacher/student/parent`.                                          |
| Wed | `POST /v1/api/auth/login`     | Look up user by email. Compare bcrypt hash. On success: generate access JWT (15 min) + refresh JWT (7 days). Return access token in JSON; set refresh token as `httpOnly; Secure; SameSite=Strict` cookie. |
| Thu | `POST /v1/api/auth/refresh`   | Read refresh token from cookie. Validate. Issue new access token. Rotate refresh token (issue new cookie, invalidate old).                                                                                 |
| Fri | `AuthMiddleware` Gin function | Validate `Authorization: Bearer <token>` header. Set `userID` and `userRole` in `c.Set()`. Apply to all `/v1/api/...` routes except `/auth/...`.                                                           |

**JWT library:** `github.com/golang-jwt/jwt/v5`

```bash
go get github.com/golang-jwt/jwt/v5
```

Reference: https://github.com/golang-jwt/jwt

**Token claims structure:**

```go
type Claims struct {
UserID uuid.UUID `json:"user_id"`
Role   string    `json:"role"`
jwt.RegisteredClaims
}
```

**Rate limiting on login:**

```go
// Add to go.mod: golang.org/x/time (already transitive)
var loginLimiter = rate.NewLimiter(rate.Every(time.Minute), 10)

func RateLimit() gin.HandlerFunc {
return func (c *gin.Context) {
if !loginLimiter.Allow() {
c.AbortWithStatusJSON(http.StatusTooManyRequests,
gin.H{"error": "too many requests, try again later"})
return
}
c.Next()
}
}
```

**Deliverable:** `POST /v1/api/auth/login` returns a JWT. All existing `/v1/api/classes` routes return 401 without a
valid token.

---

### Week 4 — Frontend Auth

| Day | Task                         | Detail                                                                                                                                                                    |
|-----|------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Auth page wiring             | Connect `app/auth/page.tsx` login form to `POST /v1/api/auth/login`. On success: store access token in `useUserStore`, redirect to `/dashboard`.                          |
| Tue | Register form                | Add a registration tab/toggle on the auth page. Wire to `POST /v1/api/auth/register`. Auto-login on success.                                                              |
| Wed | Token refresh logic          | In `api.ts`, on 401 response: call `POST /v1/api/auth/refresh` (cookie is sent automatically). On success, retry original request. On failure, redirect to `/auth`.       |
| Thu | Route protection middleware  | Add `middleware.ts` at the Next.js root. Redirect unauthenticated users from `/dashboard/...` to `/auth`. Redirect authenticated users away from `/auth`.                 |
| Fri | Logout + session persistence | `POST /v1/api/auth/logout` clears the cookie server-side. On frontend: clear Zustand store and redirect. On page load, attempt a silent token refresh to restore session. |

**Next.js middleware reference:**

```typescript
// middleware.ts (root of frontend/)
import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'

export function middleware(request: NextRequest) {
    const isAuth = request.cookies.has('refresh_token')
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth')

    if (!isAuth && !isAuthPage) {
        return NextResponse.redirect(new URL('/auth', request.url))
    }
    if (isAuth && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/auth'],
}
```

**Deliverable:** Full login/register/logout cycle works. Page refresh preserves session. Protected routes redirect
correctly.

---

## Phase 2 — Class & Assignment Management (Weeks 5–6)

> **Goal:** Teachers can create and manage classes, post assignments and materials, and students can see their enrolled
> classes and classwork.

**Estimated duration:** 2 weeks  
**Dates:** Mar 30 – Apr 10, 2026

### Week 5 — Class Management

| Day | Task                      | Detail                                                                                                                                                                                                                                 |
|-----|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Class enrollment table    | New migration: `CREATE TABLE class_enrollments (id uuid PK, class_id uuid FK, student_id uuid FK, enrolled_at timestamptz, UNIQUE(class_id, student_id))`. Add sqlc queries: `EnrollStudent`, `GetStudentClasses`, `GetClassStudents`. |
| Tue | Role-scoped class listing | Update `GET /v1/api/classes` — teachers get classes where `teacher_id = me`; students get classes via `class_enrollments`. Use `userRole` from JWT claims set by `AuthMiddleware`.                                                     |
| Wed | Class detail endpoint     | `GET /v1/api/classes/:id` — return class + enrolled student count + teacher info. Add `GetClassByID` sqlc query.                                                                                                                       |
| Thu | Update & delete class     | `PUT /v1/api/classes/:id` and `DELETE /v1/api/classes/:id`. Require `teacher` role. Add teacher ownership check (can't edit another teacher's class).                                                                                  |
| Fri | Frontend class store      | Wire `useClassesStore` to real API. `fetchClasses()` calls `GET /v1/api/classes`. Class cards render real data. Class form modal calls `POST /v1/api/classes`.                                                                         |

**Enrollment query (sqlc):**

```sql
-- sql/queries/enrollments.sql
-- name: EnrollStudent :one
INSERT INTO class_enrollments (id, class_id, student_id, enrolled_at)
VALUES (gen_random_uuid(), sqlc.arg(class_id), sqlc.arg(student_id), NOW())
ON CONFLICT (class_id, student_id) DO NOTHING
RETURNING *;

-- name: GetStudentClasses :many
SELECT c.*
FROM classes c
         JOIN class_enrollments e ON e.class_id = c.id
WHERE e.student_id = sqlc.arg(student_id);
```

---

### Week 6 — Assignment Management

| Day | Task                                | Detail                                                                                                                                                                                                                                          |
|-----|-------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Assignment CRUD endpoints           | `POST /v1/api/classes/:id/assignments`, `GET /v1/api/classes/:id/assignments`, `GET /v1/api/assignments/:id`, `PUT /v1/api/assignments/:id`, `DELETE /v1/api/assignments/:id`.                                                                  |
| Tue | Auto-create `user_assignments` rows | On assignment creation: bulk-insert a `user_assignments` row with `status = 'assigned'` for every student in `class_enrollments`. Use a DB transaction.                                                                                         |
| Wed | Missing assignment job              | Add a Go goroutine started in `main()` that ticks every hour. Queries: `UPDATE user_assignments SET status = 'missing', updated_at = NOW() WHERE status = 'assigned' AND assignment_id IN (SELECT id FROM assignments WHERE due_date < NOW())`. |
| Thu | Classwork page (frontend)           | `app/dashboard/class/[id]/classwork/page.tsx` — fetch assignments for the class. Group by `type` (assignment vs material). Render due dates. Teachers see an "Add" button; students see their submission status badge.                          |
| Fri | Assignment detail page              | `app/dashboard/class/[id]/assignment/[assignmentId]/page.tsx` — show title, details, due date, and submission status for the current user. Teacher view shows all student submission statuses.                                                  |

**sqlc queries needed this week:**

```sql
-- name: CreateAssignment :one
-- name: GetAssignmentsByClass :many
-- name: GetAssignmentByID :one
-- name: UpdateAssignment :one
-- name: DeleteAssignment :exec
-- name: BulkCreateUserAssignments :exec  (use a WITH clause or loop)
-- name: MarkMissingAssignments :exec
```

**Deliverable:** Teachers can create assignments. Students see them in classwork. Status badges (assigned / missing)
display correctly.

---

## Phase 3 — Submissions & Grading (Weeks 7–8)

> **Goal:** Students can submit text responses to assignments. Teachers can view all submissions for an assignment,
> enter a grade and feedback, and return it to students.

**Estimated duration:** 2 weeks  
**Dates:** Apr 13 – Apr 24, 2026

### Week 7 — Submissions

| Day | Task                                      | Detail                                                                                                                                                                                                                    |
|-----|-------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Submission content column                 | Migration: `ALTER TABLE user_assignments ADD COLUMN submission_text text, ADD COLUMN submitted_at timestamptz`. Add sqlc query: `SubmitAssignment` — updates `submission_text`, `submitted_at`, `status = 'submitted'`.   |
| Tue | `POST /v1/api/assignments/:id/submit`     | Gin handler: validate student is enrolled in the class, assignment is not past due (or allow late with a flag), upsert `user_assignments`. Idempotent — re-submitting overwrites.                                         |
| Wed | `GET /v1/api/assignments/:id/submissions` | Teacher-only endpoint. Returns all `user_assignments` rows for the assignment joined with `users` (first_name, last_name, avatar).                                                                                        |
| Thu | Student submission form (frontend)        | On the assignment detail page, students see a textarea + submit button. On submit: call `POST /v1/api/assignments/:id/submit`. Show confirmation + updated status badge. Save draft to `localStorage` on every keystroke. |
| Fri | Submission list view (frontend)           | Teacher's assignment detail page lists all students with their status (assigned / submitted / missing). Clicking a student opens their submission text.                                                                   |

**Draft auto-save pattern (frontend):**

```typescript
// Save to localStorage on every keystroke, keyed by assignment ID
const DRAFT_KEY = `draft_submission_${assignmentId}`

const handleChange = (text: string) => {
    setText(text)
    localStorage.setItem(DRAFT_KEY, text)
}

// Restore draft on mount
useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) setText(saved)
}, [assignmentId])

// Clear draft after successful submission
const handleSubmit = async () => {
    await apiFetch(`/v1/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({text}),
    })
    localStorage.removeItem(DRAFT_KEY)
}
```

---

### Week 8 — Grading

| Day | Task                                       | Detail                                                                                                                                                                        |
|-----|--------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Grading columns migration                  | `ALTER TABLE user_assignments ADD COLUMN feedback text, ADD COLUMN graded_by uuid REFERENCES users(id), ADD COLUMN graded_at timestamptz`. Add sqlc query: `GradeSubmission`. |
| Tue | `PATCH /v1/api/user-assignments/:id/grade` | Teacher-only. Body: `{ grade: int, feedback: string }`. Updates `grade`, `feedback`, `graded_by`, `graded_at`, `status = 'graded'`. Validates teacher owns the class.         |
| Wed | `GET /v1/api/classes/:id/gradebook`        | Returns a matrix: all assignments × all students with grades and statuses. Used to render the gradebook table.                                                                |
| Thu | Grading panel (frontend)                   | On the submission list view, add an inline grading panel: grade input (integer), feedback textarea, Save button. On save: PATCH the user_assignment. Show a ✓ when saved.     |
| Fri | Student grade view + gradebook (frontend)  | Students see their returned grade and feedback on the assignment detail page. Teachers see the full gradebook table at `app/dashboard/class/[id]/gradebook/page.tsx`.         |

**Gradebook SQL:**

```sql
-- name: GetGradebook :many
SELECT u.id AS student_id,
       u.first_name,
       u.last_name,
       a.id AS assignment_id,
       a.title,
       ua.grade,
       ua.status,
       ua.submitted_at,
       ua.graded_at
FROM class_enrollments ce
         JOIN users u ON u.id = ce.student_id
         CROSS JOIN assignments a
         LEFT JOIN user_assignments ua
                   ON ua.student_id = u.id AND ua.assignment_id = a.id
WHERE ce.class_id = sqlc.arg(class_id)
  AND a.class_id = sqlc.arg(class_id)
ORDER BY u.last_name, a.created_at;
```

**Deliverable:** Full submission → grade → return cycle works end to end. Gradebook renders all students and
assignments.

---

## Phase 4 — Communication & Parent Portal (Week 9)

> **Goal:** Teachers can post announcements to the class stream. Parents can log in and see their child's grades and
> upcoming assignments.

**Estimated duration:** 1 week  
**Dates:** Apr 27 – May 1, 2026

### Week 9 — Stream & Parent View

| Day | Task                          | Detail                                                                                                                                                                                                                                                                      |
|-----|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | Announcements CRUD            | `POST /v1/api/classes/:id/announcements`, `GET /v1/api/classes/:id/announcements`. The existing `posts` table covers this — add a `class_id` column to `posts` via migration, or use the existing structure. Sqlc queries: `CreateAnnouncement`, `GetAnnouncementsByClass`. |
| Tue | Class stream page (frontend)  | Wire `app/dashboard/class/[id]/page.tsx` (the Stream tab) to the announcements API. Teachers see a compose box; everyone sees the announcement feed in reverse-chronological order.                                                                                         |
| Wed | Parent student link migration | `CREATE TABLE parent_student_links (id uuid PK, parent_id uuid FK, student_id uuid FK, UNIQUE(parent_id, student_id))`. Add enrollment flow: when a parent registers, link them to a student by student email or code.                                                      |
| Thu | Parent-scoped API endpoints   | `GET /v1/api/parent/students` — list linked students. `GET /v1/api/parent/students/:id/classes` — classes the child is in. `GET /v1/api/parent/students/:id/grades` — child's `user_assignments` with grades. Add `ParentGuard` middleware.                                 |
| Fri | Parent dashboard (frontend)   | When `useUserStore().type === 'parent'`, render a parent dashboard at `/dashboard` showing linked student cards with grade summary and upcoming due dates.                                                                                                                  |

**Announcements migration note:** The existing `posts` table has `author_id` and `parent_id` (for threaded replies). Add
`class_id uuid REFERENCES classes(id)` to scope posts to a class:

```sql
ALTER TABLE posts
    ADD COLUMN class_id uuid REFERENCES classes (id) ON DELETE CASCADE;
```

**Deliverable:** Class stream shows announcements. Parents can log in and see their child's grades and assignments.

---

## Phase 5 — Polish, Testing & Launch (Week 10)

> **Goal:** The MVP is stable, tested, and ready for real users. Not feature-complete — but reliable.

**Estimated duration:** 1 week  
**Dates:** May 4 – May 9, 2026

### Week 10 — Stabilisation

| Day | Task                                      | Detail                                                                                                                                                                                                                          |
|-----|-------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Mon | End-to-end test pass                      | Manually walk through every user journey: Teacher registers → creates class → posts assignment → Student enrolls → submits → Teacher grades → Parent views grade. Log and fix every broken step.                                |
| Tue | Input validation audit                    | Ensure every Gin handler validates all inputs with `binding:"required"` tags or manual checks. Ensure every frontend form has Zod validation matching backend constraints.                                                      |
| Wed | Error handling & empty states             | Every page should handle: loading, empty (no classes yet), error (API down). No blank white screens. Add toast notifications for success/error actions.                                                                         |
| Thu | Security checklist                        | ① JWT secret is in `.env`, not hardcoded. ② All `/v1/api/...` routes use `AuthMiddleware`. ③ Teacher endpoints check class ownership. ④ Parent endpoints use `ParentGuard`. ⑤ No student can read another student's submission. |
| Fri | Docker Compose production config + README | Write a `docker-compose.prod.yml` with env vars from a `.env.prod` file. Update `README.md` with setup, migration, and run instructions. Tag `v0.1.0` in git.                                                                   |

**Security checklist (expand into PR template):**

- [ ] No raw SQL strings in Go handlers — all queries via sqlc
- [ ] `c.Set("userID")` used to scope all queries — no user-supplied IDs trusted without ownership check
- [ ] `httpOnly; Secure; SameSite=Strict` on refresh token cookie
- [ ] `NEXT_PUBLIC_API_URL` is the only public env var — no secrets exposed to browser
- [ ] `godotenv.Load()` not called in production (`GIN_MODE=release`)
- [ ] Database URL uses a least-privilege user (not `postgres` superuser)

**Deliverable:** Tagged `v0.1.0` release. A real teacher can use it in a classroom from day one.

---

## Risk Register

Risks most likely to delay the schedule, with mitigations.

| # | Risk                                                                                               | Likelihood | Impact | Mitigation                                                                                                                                                                                        |
|---|----------------------------------------------------------------------------------------------------|------------|--------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | JWT implementation takes longer than expected (cookie/CORS issues)                                 | High       | High   | Budget 3 days instead of 1 for cookie/CORS debugging. Test with Postman before wiring frontend. Reference: [Gin CORS middleware](https://github.com/gin-contrib/cors)                             |
| 2 | `sqlc generate` breaks after schema changes                                                        | Medium     | Medium | Always run `sqlc generate` immediately after every migration. Keep `go.sum` in version control.                                                                                                   |
| 3 | Next.js middleware cookie reading doesn't work as expected                                         | Medium     | Medium | Test middleware with a minimal reproduction before relying on it for auth routing. Reference: [Next.js Middleware docs](https://nextjs.org/docs/app/building-your-application/routing/middleware) |
| 4 | `class_enrollments` table not in original schema — retroactive foreign keys cause migration issues | Low        | Medium | Always write both `-- +goose Up` and `-- +goose Down` in every migration file. Test `migrate-down` before merging.                                                                                |
| 5 | Gradebook CROSS JOIN performance degrades with large classes                                       | Low        | Low    | Add `LIMIT` to the gradebook query during MVP. Index `user_assignments(student_id, assignment_id)`.                                                                                               |
| 6 | Scope creep (adding features mid-phase)                                                            | High       | High   | Strictly follow this guide. Log new ideas in a `BACKLOG.md` file — don't implement during MVP sprint.                                                                                             |
| 7 | Frontend and backend out of sync on data shapes                                                    | Medium     | Medium | Define shared TypeScript types in `frontend/lib/types.ts` and update them immediately when backend responses change.                                                                              |

---

## Velocity Checkpoints

Use these to self-assess whether you are on track. If a checkpoint is missed, cut scope — don't extend the timeline.

| Date       | Checkpoint                             | Pass Criteria                                                                                                  |
|------------|----------------------------------------|----------------------------------------------------------------------------------------------------------------|
| **Mar 13** | Phase 0 complete                       | `sqlc generate` clean. `make dev` starts both services. Password + color columns migrated.                     |
| **Mar 27** | Auth complete                          | Can register, login, logout. `/dashboard` redirects to `/auth` without a token. JWT attached to all API calls. |
| **Apr 10** | Class + assignment management complete | Teacher creates a class and assignment via the UI. Student sees the assignment in classwork.                   |
| **Apr 24** | Submissions + grading complete         | Student submits text. Teacher grades it. Student sees the grade. Gradebook renders.                            |
| **May 1**  | Communication + parent portal complete | Teacher posts an announcement. Parent logs in and sees child's grades.                                         |
| **May 9**  | MVP launch                             | `v0.1.0` tagged. All user journeys pass manual testing. Docker Compose production config documented.           |

**If you fall more than 3 days behind at any checkpoint:**

1. Cut the lowest-priority task in the current phase (usually the most UI-polish-heavy item)
2. Move it to `BACKLOG.md`
3. Do not add new features until the checkpoint is passed

---

## Post-MVP Roadmap

Features deliberately excluded from the MVP but planned for v1 and beyond. Reference `LMS_CORE_FEATURES.md` for full
implementation details.

| Priority  | Feature                                         | Phase in Core Features Doc       | Estimated Effort |
|-----------|-------------------------------------------------|----------------------------------|------------------|
| 🔴 High   | File upload (MinIO/S3 for submissions)          | §9 File & Media Management       | 1 week           |
| 🔴 High   | In-app notifications (polling → SSE)            | §5 Communication & Notifications | 1 week           |
| 🔴 High   | Direct messaging (teacher ↔ student)            | §5 Communication & Notifications | 3 days           |
| 🟡 Medium | Rubric-based grading                            | §4 Grading & Feedback            | 1 week           |
| 🟡 Medium | Analytics dashboard (submission rates, at-risk) | §7 Analytics & Reporting         | 1 week           |
| 🟡 Medium | Global search (`/v1/api/search`)                | §10 Search & Discovery           | 3 days           |
| 🟡 Medium | Google OAuth SSO                                | §12 Integration Layer            | 2 days           |
| 🟢 Low    | Quiz / assessment engine                        | §8 Assessment Engine             | 2–3 weeks        |
| 🟢 Low    | Progressive Web App (PWA)                       | §14 Mobile & Offline Experience  | 1 week           |
| 🟢 Low    | LTI 1.3 integration                             | §12 Integration Layer            | 3–4 weeks        |
| 🟢 Low    | OpenAPI / Swagger docs (`swaggo/gin-swagger`)   | §12 Integration Layer            | 2 days           |

---

## References

### Go / Backend

| Resource                                 | URL                                                              |
|------------------------------------------|------------------------------------------------------------------|
| Gin framework docs                       | https://gin-gonic.com/docs/                                      |
| Gin routing & middleware                 | https://gin-gonic.com/docs/examples/custom-middleware/           |
| `golang-jwt/jwt` v5                      | https://github.com/golang-jwt/jwt                                |
| `golang.org/x/crypto/bcrypt`             | https://pkg.go.dev/golang.org/x/crypto/bcrypt                    |
| `golang.org/x/time/rate` (rate limiting) | https://pkg.go.dev/golang.org/x/time/rate                        |
| `gin-contrib/cors`                       | https://github.com/gin-contrib/cors                              |
| `gin-contrib/sse` (SSE support)          | https://github.com/gin-contrib/sse                               |
| sqlc documentation                       | https://docs.sqlc.dev/en/latest/                                 |
| sqlc query annotations                   | https://docs.sqlc.dev/en/latest/reference/query-annotations.html |
| pressly/goose migrations                 | https://github.com/pressly/goose                                 |
| `lib/pq` PostgreSQL driver               | https://github.com/lib/pq                                        |
| air live reload                          | https://github.com/air-verse/air                                 |

### PostgreSQL

| Resource                           | URL                                                               |
|------------------------------------|-------------------------------------------------------------------|
| PostgreSQL UUID functions          | https://www.postgresql.org/docs/current/functions-uuid.html       |
| Full-text search (`tsvector`)      | https://www.postgresql.org/docs/current/textsearch.html           |
| `plainto_tsquery` reference        | https://www.postgresql.org/docs/current/functions-textsearch.html |
| Row-level security                 | https://www.postgresql.org/docs/current/ddl-rowsecurity.html      |
| `ON CONFLICT DO NOTHING` (upserts) | https://www.postgresql.org/docs/current/sql-insert.html           |

### Next.js / Frontend

| Resource                      | URL                                                                                     |
|-------------------------------|-----------------------------------------------------------------------------------------|
| Next.js App Router docs       | https://nextjs.org/docs/app                                                             |
| Next.js Middleware            | https://nextjs.org/docs/app/building-your-application/routing/middleware                |
| Next.js environment variables | https://nextjs.org/docs/app/building-your-application/configuring/environment-variables |
| Zustand docs                  | https://zustand.dev/                                                                    |
| Zustand with TypeScript       | https://zustand.dev/guides/typescript                                                   |
| Zod validation                | https://zod.dev/                                                                        |
| TipTap rich text editor       | https://tiptap.dev/                                                                     |
| `@dnd-kit/core` drag-and-drop | https://dndkit.com/                                                                     |

### Testing

| Resource                        | URL                                                           |
|---------------------------------|---------------------------------------------------------------|
| Go testing (table-driven tests) | https://go.dev/blog/subtests                                  |
| Go `httptest` package           | https://pkg.go.dev/net/http/httptest                          |
| Vitest (frontend unit testing)  | https://vitest.dev/                                           |
| React Testing Library           | https://testing-library.com/docs/react-testing-library/intro/ |

### Industry Pacing References

These are real-world estimates from similar open-source and indie LMS projects:

| Reference                                                                                        | Finding                                                                                                                |
|--------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| [Open edX contribution guide](https://openedx.org/developer-guide)                               | Estimates 6–9 months for a minimal functional LMS from scratch with a 2-person team                                    |
| [Moodle core feature history](https://docs.moodle.org/dev/History)                               | Auth + course + assignment cycle took ~18 months in v1.0 (2001, one developer)                                         |
| [Indie Hackers LMS builders](https://www.indiehackers.com/products?niche=Education+%26+Learning) | Solo builders report 3–6 months to a paying MVP for simple course platforms (no parent portal, no grading workflow)    |
| [Jason Lengstorf — "Build in public" 12-week projects](https://www.learnwithjason.dev/)          | Complex full-stack features (auth, real-time, DB) average 1–2 weeks each for an experienced developer                  |
| [Basecamp "Shape Up" methodology](https://basecamp.com/shapeup)                                  | Recommends 6-week cycles for meaningful product features with a small team — directly applicable to Phase 2 and 3 here |

> **Bottom line:** A 10-week MVP for a K-12 LMS with auth, classes, assignments, submissions, grading, and a parent
> portal is **aggressive but achievable** for one experienced full-stack developer. The most common failure mode is
> underestimating auth (JWT + cookies + CORS) and database schema changes mid-build. This guide front-loads both.

---

*Pacing guide for the Luminescence LMS MVP — generated February 28, 2026*
*Companion documents: `LMS_RESEARCH.md`, `LMS_CORE_FEATURES.md`*

