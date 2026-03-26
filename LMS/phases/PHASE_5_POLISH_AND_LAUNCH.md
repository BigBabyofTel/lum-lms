# Phase 5 — Polish, Testing & Launch (Week 10)

> **Part of:** [LMS MVP Pacing Guide](../LMS_MVP_PACING_GUIDE.md)  
> **Dates:** May 4 – May 9, 2026  
> **Estimated hours:** 20–30 hrs (4–6 hrs/day × 5 days)  
> **Depends on:** [Phase 4](./PHASE_4_COMMUNICATION_AND_PARENTS.md) — all five user journeys working end-to-end

---

## Goal

The MVP is stable, tested, and ready for a real classroom. Not feature-complete — but reliable enough that a teacher
can use it on day one without fear of data loss, confusing errors, or security gaps.

> "A product that is 80% done and 100% stable beats a product that is 100% done and 80% stable. Ship the former."  
> — adapted from Basecamp's Shape Up methodology

This week is not about adding features. It is about making what exists trustworthy.

---

## Table of Contents

1. [Week 10 — Stabilisation](#week-10--stabilisation)
2. [Security Checklist](#security-checklist)
3. [Manual QA — User Journey Scripts](#manual-qa--user-journey-scripts)
4. [Production Readiness Checklist](#production-readiness-checklist)
5. [Where Luminescence Improves on Existing Platforms](#where-luminescence-improves-on-existing-platforms)
6. [Deliverables & Exit Criteria](#deliverables--exit-criteria)
7. [What Gets Cut (and Where It Goes)](#what-gets-cut-and-where-it-goes)
8. [References](#references)

---

## Week 10 — Stabilisation

### Day-by-Day Breakdown

#### Monday — End-to-End Journey Pass

Walk through every user journey manually from a fresh database. Use two browser profiles (or incognito tabs) to
simulate multiple roles simultaneously.

**Journey 1 — Teacher full cycle:**

```
1. Register as teacher (first_name, last_name, email, password, type: teacher)
2. Login → redirected to /dashboard
3. Create a class (subject: "Mathematics", grade: 5, color: bg-blue-600)
4. Class card appears on dashboard ✓
5. Open the class → Stream tab loads (empty) ✓
6. Post an announcement: "Welcome to class!" ✓
7. Go to Classwork → create an assignment (title, details, due date tomorrow) ✓
8. Assignment appears in classwork list ✓
9. Enroll a student (POST /v1/api/classes/:id/enroll with student email) ✓
10. Logout ✓
```

**Journey 2 — Student full cycle:**

```
1. Register as student (type: student)
2. Login → /dashboard (shows enrolled classes — should show the class from Journey 1) ✓
3. Open class → Stream shows announcement ✓
4. Open Classwork → assignment appears with status "Assigned" ✓
5. Click assignment → detail page loads ✓
6. Type submission text → "Draft saved" indicator appears ✓
7. Close and reopen the page → draft text is restored from localStorage ✓
8. Submit → status badge changes to "Submitted" ✓
9. Logout ✓
```

**Journey 3 — Teacher grades, student sees result:**

```
1. Login as teacher
2. Open class → Classwork → click assignment → Submissions tab
3. See student submission with "Submitted" status ✓
4. Enter grade (87) and feedback ("Great work on the intro!") → Save ✓
5. Status changes to "Graded" ✓
6. Login as student
7. Open assignment → see grade: 87/100, feedback displayed ✓
8. Open gradebook (if implemented in UI) → assignment shows 87 ✓
```

**Journey 4 — Parent portal:**

```
1. Register as parent (type: parent)
2. Login → parent dashboard renders (not teacher/student dashboard) ✓
3. POST /v1/api/parent/link with student email → linked ✓
4. Dashboard shows student card with grade summary ✓
5. Click "View Grades" → student's grades table loads ✓
6. Grades are visible only for the linked student ✓
7. Attempt to fetch grades for a different student ID → 403 Forbidden ✓
```

**Log every failure** in `BACKLOG.md` — do not fix mid-journey. Complete all four journeys first, then triage.

---

#### Tuesday — Input Validation Audit

Every endpoint must reject bad input cleanly. Check each one systematically:

**Backend audit (Gin binding tags):**

```go
// Every request struct should have binding tags:
var params struct {
Email    string `json:"email"    binding:"required,email"`
Password string `json:"password" binding:"required,min=8"`
Type     string `json:"type"     binding:"required,oneof=teacher student parent"`
Grade    int32  `json:"grade"    binding:"required,min=1,max=12"`
}
// If c.ShouldBindJSON fails, always return 400 and return immediately
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
```

**Frontend audit (Zod schemas):**

```typescript
// frontend/lib/schemas.ts — centralize all Zod schemas
import {z} from 'zod'

export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const classSchema = z.object({
    subject: z.string().min(1, 'Subject is required').max(100),
    grade: z.number().int().min(1).max(12),
    color: z.string().optional(),
})

export const assignmentSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    type: z.enum(['assignment', 'material']),
    details: z.string().optional(),
    due_date: z.string().datetime({offset: true}).optional(),
})

export const submissionSchema = z.object({
    text: z.string().min(1, 'Submission cannot be empty').max(10000),
})

export const gradeSchema = z.object({
    grade: z.number().int().min(0).max(100),
    feedback: z.string().max(2000).optional(),
})
```

**Validation in forms:**

```typescript
const result = loginSchema.safeParse({email, password})
if (!result.success) {
    setErrors(result.error.flatten().fieldErrors)
    return
}
```

**Test these edge cases manually for every endpoint:**

| Case                                    | Expected                   |
|-----------------------------------------|----------------------------|
| Empty required field                    | 400 with descriptive error |
| String where int expected               | 400                        |
| Grade > 100                             | 400                        |
| Email without `@`                       | 400                        |
| UUID in path that doesn't exist         | 404                        |
| Valid request but wrong role            | 403                        |
| Valid request for other user's resource | 403                        |

---

#### Wednesday — Error Handling & Empty States

Every page must handle three states. Audit the entire frontend:

**State audit checklist:**

| Page                        | Loading              | Empty                                                              | Error                            |
|-----------------------------|----------------------|--------------------------------------------------------------------|----------------------------------|
| `/dashboard`                | Skeleton cards       | "No classes yet" + CTA                                             | "Could not load classes. Retry." |
| `/class/:id` (Stream)       | Skeleton posts       | "No announcements yet"                                             | "Could not load stream"          |
| `/class/:id/classwork`      | Skeleton assignments | "No assignments yet" + CTA (teacher) / "Nothing due yet" (student) | "Could not load classwork"       |
| `/class/:id/assignment/:id` | Spinner              | —                                                                  | "Assignment not found"           |
| `/class/:id/gradebook`      | Skeleton table       | "No students or assignments yet"                                   | "Could not load gradebook"       |
| `/dashboard` (parent)       | Skeleton             | "No linked students — link your child to get started"              | "Could not load"                 |

**Toast notifications** — add a global toast system for action feedback:

```typescript
// Use a lightweight library like react-hot-toast (already minimal)
// Or implement a simple Zustand-based toast store

// frontend/store/useToastStore.ts
interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
}

// Usage:
useToastStore.getState().add({message: 'Grade saved!', type: 'success'})
useToastStore.getState().add({message: 'Failed to submit', type: 'error'})
```

**Install `react-hot-toast`:**

```bash
cd frontend && bun add react-hot-toast
```

Add `<Toaster />` to `app/layout.tsx`:

```tsx
import {Toaster} from 'react-hot-toast'

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html>
        <body>
        {children}
        <Toaster position="bottom-right"/>
        </body>
        </html>
    )
}
```

---

#### Thursday — Security Checklist Execution

Work through every item in the security checklist. Do not skip items or mark them as "later."

**Backend security:**

```go
// 1. JWT_SECRET is loaded from .env — never hardcoded
jwtSecret := os.Getenv("JWT_SECRET")
if jwtSecret == "" {
log.Fatal("JWT_SECRET environment variable is not set")
}

// 2. GIN_MODE from environment — debug logs disabled in production
// (gin.Default() respects GIN_MODE=release automatically)

// 3. All /v1/api/... routes use AuthMiddleware
protected := router.Group("/v1/api").Use(AuthMiddleware(jwtSecret))

// 4. Teacher ownership checks on every mutating class endpoint
// (verify class.TeacherID.UUID == c.MustGet("userID"))

// 5. ParentGuard on every parent/students/:id/* endpoint

// 6. Student isolation — verify student is enrolled before returning assignment
```

**Database security:**

```sql
-- Verify the app connects with a least-privilege user, not postgres superuser
-- In docker-compose.yml:
-- POSTGRES_USER: lum_app
-- POSTGRES_PASSWORD: <strong random password>
-- Grant only needed permissions:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lum_app;
-- REVOKE DROP, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM lum_app;
```

**Frontend security:**

```typescript
// 1. No access token in localStorage — only Zustand RAM store
// 2. NEXT_PUBLIC_ prefix only for non-sensitive config
// 3. credentials: 'include' on all fetch calls that need the cookie
// 4. No hardcoded API URLs — all from NEXT_PUBLIC_API_URL
```

---

#### Friday — Docker Compose Production Config + Release Tag

**`docker-compose.prod.yml`:**

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: lums
      POSTGRES_USER: lum_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U lum_app -d lums" ]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://lum_app:${DB_PASSWORD}@db:5432/lums?sslmode=disable
      JWT_SECRET: ${JWT_SECRET}
      GIN_MODE: release
      PORT: 8080
    ports:
      - "8080:8080"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

**`.env.prod` (never committed to git — add to `.gitignore`):**

```env
DB_PASSWORD=<strong-random-password-min-32-chars>
JWT_SECRET=<256-bit-random-hex>
API_URL=https://your-domain.com
```

**Run migrations in production:**

```bash
# One-time setup:
docker compose -f docker-compose.prod.yml run --rm backend \
  goose -dir ./sql/schema postgres "$DATABASE_URL" up
```

**Git tag:**

```bash
git add -A
git commit -m "feat: MVP v0.1.0 — auth, classes, assignments, submissions, grading, parent portal"
git tag -a v0.1.0 -m "Luminescence LMS MVP — May 2026"
git push origin main --tags
```

**Update `README.md`** to include:

1. Prerequisites (Docker, Docker Compose, Go 1.25, Bun)
2. `make dev` — local development with hot reload
3. `make migrate-up` — apply migrations
4. `make migrate-down` — roll back last migration
5. `docker compose -f docker-compose.prod.yml up -d` — production start
6. Environment variable reference table

---

## Security Checklist

Use this as a PR gate from now on. Every PR must pass every item before merging.

**Backend:**

- [ ] No raw SQL strings — all queries go through sqlc-generated functions
- [ ] No hardcoded secrets — all from `os.Getenv()`, fatal if missing
- [ ] `AuthMiddleware` applied to all `/v1/api/...` routes except `/v1/api/auth/...`
- [ ] Every teacher endpoint verifies `class.TeacherID == c.MustGet("userID")`
- [ ] Every student endpoint verifies enrollment before returning assignment/submission data
- [ ] Every parent endpoint passes through `ParentGuard`
- [ ] Login endpoint has rate limiting middleware
- [ ] `sanitizeUser()` called before returning any user object — no password hash in responses
- [ ] `httpOnly; Secure; SameSite=Strict` set on refresh token cookie
- [ ] Error messages don't expose internal details (no stack traces in JSON responses)
- [ ] `GIN_MODE=release` in production (disables debug logging)
- [ ] Database user is least-privilege (not superuser)

**Frontend:**

- [ ] `localStorage` is only used for draft auto-save — no auth tokens ever stored there
- [ ] `credentials: 'include'` on all fetch calls that need the cookie
- [ ] `NEXT_PUBLIC_API_URL` is the only `NEXT_PUBLIC_` variable — no secrets exposed to browser
- [ ] All user inputs validated with Zod before API call
- [ ] No student data rendered from unvalidated API responses (type-safe with TypeScript)
- [ ] Error boundaries prevent full-page crashes from API errors

---

## Manual QA — User Journey Scripts

These are repeatable test scripts. Run them against the production build (`GIN_MODE=release`) before tagging.

### QA-01: Registration & Login

```
[ ] Teacher registers → email, password, type: teacher
[ ] Redirected to /dashboard after register (auto-login)
[ ] Logout → redirected to /auth
[ ] Login with same credentials → /dashboard
[ ] Wrong password → "Invalid email or password" error (not "user not found")
[ ] Access /dashboard without login → redirected to /auth
[ ] Login → access /auth → redirected to /dashboard
```

### QA-02: Class Lifecycle

```
[ ] Teacher creates class → appears in dashboard
[ ] Teacher edits class (change subject, color) → updates on dashboard
[ ] Teacher deletes class → removed from dashboard
[ ] Student logs in → no classes visible (not yet enrolled)
[ ] Teacher enrolls student by email → student refreshes → class appears
[ ] Student accesses class detail → Stream, Classwork, People tabs load
[ ] Teacher accesses another teacher's class via API → 403
```

### QA-03: Assignment & Submission

```
[ ] Teacher creates assignment with due date → appears in classwork for enrolled students
[ ] Student submits text → status badge changes to "Submitted"
[ ] Student resubmits → overwrites previous text (not a duplicate error)
[ ] Unenrolled student attempts to submit → 403
[ ] Missing assignment job marks overdue unsubmitted rows → status "Missing" (test by setting due_date in past)
[ ] Teacher sees all submissions on assignment page
```

### QA-04: Grading

```
[ ] Teacher grades submission → grade and feedback saved
[ ] Student sees grade on assignment detail page
[ ] Student sees feedback displayed below grade
[ ] Gradebook renders all students × assignments matrix
[ ] Teacher cannot grade a submission for a class they don't own → 403
```

### QA-05: Parent Portal

```
[ ] Parent registers → parent dashboard renders (not teacher dashboard)
[ ] Parent links to student by student email → linked
[ ] Parent links with non-existent email → "student not found" (no enumeration)
[ ] Parent dashboard shows linked student card with grade summary
[ ] Parent views student's grades → correct data
[ ] Parent attempts to view a different student's grades by changing :student_id → 403
```

---

## Production Readiness Checklist

Run through this before tagging `v0.1.0`:

| Area         | Check                                                              | Status |
|--------------|--------------------------------------------------------------------|--------|
| **Database** | All migrations applied cleanly on fresh DB                         | 🔲     |
| **Database** | `migrate-down` reverses all migrations                             | 🔲     |
| **Backend**  | `GIN_MODE=release` removes debug output                            | 🔲     |
| **Backend**  | Server starts with only `DATABASE_URL` and `JWT_SECRET` set        | 🔲     |
| **Backend**  | All handlers return JSON — no plain text error strings             | 🔲     |
| **Frontend** | `next build` completes with no TypeScript errors                   | 🔲     |
| **Frontend** | No `console.error` in browser on any page load                     | 🔲     |
| **Frontend** | All pages have loading, empty, and error states                    | 🔲     |
| **Docker**   | `docker compose -f docker-compose.prod.yml up` starts all services | 🔲     |
| **Docker**   | Health check on DB passes before backend starts                    | 🔲     |
| **Security** | Full security checklist above passes                               | 🔲     |
| **QA**       | All 5 manual QA scripts pass                                       | 🔲     |
| **Docs**     | `README.md` has complete setup instructions                        | 🔲     |
| **Git**      | `v0.1.0` tag created and pushed                                    | 🔲     |

---

## Where Luminescence Improves on Existing Platforms

### 1. Release Tagging & Versioning (vs. Moodle's Opaque Upgrade Path)

**The problem:**  
Moodle releases are notoriously difficult to upgrade. The lack of clear database migration versioning means "upgrading"
Moodle often requires days of manual database work and testing. Canvas's open-source version has similar issues — the
main branch is always moving and there is no clear "stable" cut.

**Luminescence approach:**  
`goose` migrations are versioned with sequential numbered files. `v0.1.0` is a Git tag with a deterministic list of
migration files that produce a known schema state. To upgrade to `v0.2.0`, run `make migrate-up` — which applies only
the new migration files. Rolling back is `make migrate-down`. Any future developer or ops engineer can reason about
the database state from the migration history alone.

---

### 2. Environment-Parity Production Config (vs. Canvas's Complex Setup)

**The problem:**  
Canvas's self-hosted setup requires configuring Rails environments, multiple YAML config files, background job workers
(Sidekiq), Redis, and a separate storage service — a full day of configuration before writing a single line of
application code. Blackboard's on-premise setup requires engagement with Anthology's professional services team.

**Luminescence approach:**  
The entire production stack — Go backend, Next.js frontend, PostgreSQL — is described in `docker-compose.prod.yml`.
Three environment variables (`DB_PASSWORD`, `JWT_SECRET`, `API_URL`) are the only external configuration needed.
A new server can be stood up in under 10 minutes.

---

### 3. Typed Zod Validation Matching Backend Rules (vs. Silent Failures)

**The problem:**  
Most LMS platforms have a mismatch between what the frontend allows and what the backend accepts. Google Classroom's
API has historically accepted malformed input silently and returned cryptic errors. Canvas's frontend validation and
backend validation have diverged in several documented cases, causing confusing UX where the form submits successfully
but the data is never saved.

**Luminescence approach:**  
`frontend/lib/schemas.ts` contains Zod schemas that mirror the Gin `binding:` tags exactly. The `grade` field is
`z.number().int().min(0).max(100)` in Zod and `binding:"required,min=0,max=100"` in Go — same rules, both enforced.
The frontend prevents bad input before it leaves the browser; the backend rejects it even if the frontend is bypassed.

---

### 4. Explicit Empty States vs. Confusing Blank Screens

**The problem:**  
Blackboard Learn is notorious for showing empty white panels when there is no content — teachers think something is
broken. Canvas sometimes shows a spinner that never resolves when the API is slow. Google Classroom shows "No
classwork" but provides no guidance on what to do next.

**Luminescence approach:**  
Every page has a designed empty state with a role-appropriate call to action. The pattern is enforced as an exit
criterion in this phase — no page ships without all three states (loading, empty, error) implemented. This is a
significant UX differentiator in teacher training contexts where first impressions determine adoption.

---

### 5. Least-Privilege Database User (vs. Default Postgres Superuser)

**The problem:**  
Most tutorial-based deployments (including many real school servers) connect to PostgreSQL as the `postgres` superuser.
This means if the application is compromised, the attacker has full database admin access — including the ability to
drop tables, read all schemas, and create new superusers.

**Luminescence approach:**  
The production `docker-compose.prod.yml` creates a `lum_app` user with only `SELECT`, `INSERT`, `UPDATE`, and `DELETE`
permissions on application tables. `DROP`, `TRUNCATE`, and schema modifications are not available to the application
user. A compromised application session cannot destroy the database.

---

### 6. First-Run Production Health Check

**The problem:**  
Moodle, Canvas, and Blackboard all have race conditions where the application server starts before the database is
ready, causing cryptic startup errors that take time to diagnose. Blackboard's startup sequence is so complex that it
has a dedicated "Startup Dashboard" just to monitor it.

**Luminescence approach:**  
The `docker-compose.prod.yml` uses a `healthcheck` on the database container and `depends_on: condition:
service_healthy` on the backend. The backend does not start until PostgreSQL is accepting connections. On first run,
this eliminates the most common Docker deployment failure entirely.

---

## What Gets Cut (and Where It Goes)

Any feature not finished by May 9 goes into `BACKLOG.md` — not into this release. Common candidates:

| Feature                                     | Why it gets cut                                     | Where to build it          |
|---------------------------------------------|-----------------------------------------------------|----------------------------|
| File upload for submissions                 | Requires MinIO/S3 setup — out of scope for text MVP | `PHASE_V1_FILE_UPLOADS.md` |
| Rich text editor (TipTap) for announcements | Plain textarea works for MVP                        | v1                         |
| SSE real-time notifications                 | Polling (client refresh) works for MVP              | v1                         |
| Direct messaging (teacher ↔ student)        | Not needed for core academic loop                   | v1                         |
| Rubric-based grading                        | Integer grade works for MVP                         | v1                         |
| Analytics dashboard                         | Gradebook serves this purpose for MVP               | v2                         |
| Student enrollment UI (currently API-only)  | Teacher can POST to enroll; UI polish is v1         | v1                         |

**Creating `BACKLOG.md`:**

```markdown
# Luminescence LMS — Feature Backlog

Items deferred from MVP. Prioritized for v1 and beyond.
See LMS_CORE_FEATURES.md for implementation details.

## v1 (Next sprint)

- [ ] File uploads for submissions (MinIO/S3 presign flow — §9)
- [ ] SSE real-time notifications (§5)
- [ ] Direct messaging teacher ↔ student (§5)
- [ ] Rich text editor for announcements and assignment details (TipTap)
- [ ] Student enrollment UI (currently API-only)
- [ ] Rubric-based grading (§4)

## v2

- [ ] Analytics dashboard — submission rates, at-risk alerts (§7)
- [ ] Global search /v1/api/search (§10)
- [ ] Google OAuth SSO (§12)
- [ ] Quiz / assessment engine (§8)
- [ ] OpenAPI / Swagger docs (swaggo/gin-swagger)

## v3

- [ ] Progressive Web App / offline submissions (§14)
- [ ] LTI 1.3 third-party tool integration (§12)
- [ ] OneRoster SIS sync (§12)
- [ ] AI-powered at-risk prediction (§7)
```

---

## Deliverables & Exit Criteria

Phase 5 (and the entire MVP) is complete when **all** of the following are true:

- [ ] All 4 manual QA journey scripts pass against the production build
- [ ] All 5 manual QA scripts pass — QA-01 through QA-05
- [ ] All 12 backend security checklist items are verified
- [ ] All 6 frontend security checklist items are verified
- [ ] `next build` completes with zero TypeScript errors
- [ ] `go test ./...` passes with at least one test per handler
- [ ] All pages handle loading, empty, and error states — no blank screens
- [ ] Toast notifications display for every create/update/delete action
- [ ] `docker compose -f docker-compose.prod.yml up` starts all three services cleanly
- [ ] DB health check passes before backend starts
- [ ] `README.md` has complete and accurate setup instructions
- [ ] `BACKLOG.md` exists with all deferred features catalogued
- [ ] Git tag `v0.1.0` is created and pushed

---

## References

| Resource                                 | URL                                                                   |
|------------------------------------------|-----------------------------------------------------------------------|
| Basecamp Shape Up — "Shipping" chapter   | https://basecamp.com/shapeup/3.5-chapter-14                           |
| Semantic Versioning (v0.1.0 format)      | https://semver.org/                                                   |
| `react-hot-toast`                        | https://react-hot-toast.com/                                          |
| Zod — `safeParse` and error handling     | https://zod.dev/ERROR_HANDLING                                        |
| Docker Compose `healthcheck`             | https://docs.docker.com/compose/compose-file/05-services/#healthcheck |
| Docker Compose `depends_on: condition`   | https://docs.docker.com/compose/compose-file/05-services/#depends_on  |
| Go `log.Fatal` on missing env vars       | https://pkg.go.dev/log#Fatal                                          |
| Gin release mode                         | https://gin-gonic.com/docs/deployment/                                |
| OWASP Top 10 — relevant for K-12 systems | https://owasp.org/www-project-top-ten/                                |
| PostgreSQL least privilege               | https://www.postgresql.org/docs/current/sql-grant.html                |
| Git tagging                              | https://git-scm.com/book/en/v2/Git-Basics-Tagging                     |
| pressly/goose production usage           | https://github.com/pressly/goose#production                           |

---

*Phase 5 of 5 — Luminescence LMS MVP · Target completion: May 9, 2026*  
*Next step after launch: begin `BACKLOG.md` v1 sprint*

