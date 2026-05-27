# Luminescence LMS — Detailed Implementation Plan

> Current date: **March 25, 2026** · Target MVP: **May 9, 2026** · ~6.5 weeks remaining

---

## 1. Current State Audit

### What's Already Built ✅

| Area                                                                                                                                       | Status                               |
|--------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------|
| Docker Compose (Postgres + Go + Next.js)                                                                                                   | ✅ Working                            |
| PostgreSQL schema via goose (`users`, `classes`, `assignments`, `topics`, `user_assignments`, `posts`, `comments`)                         | ✅ Migrated                           |
| Gin server — `POST/GET /v1/api/classes`, `GET /v1/api/users`                                                                               | ✅ Running                            |
| sqlc configured (`sqlc.yaml`, generated `.sql.go` files)                                                                                   | ✅ Working                            |
| Next.js 16 + Tailwind + dark-mode (portal, dashboard, class tabs)                                                                          | ✅ Scaffolded                         |
| Auth helpers — `HashPassword`, `VerifyPassword`, `MakeJWT`, `ValidateJWT`, `GetBearerToken`, `MakeRefreshToken` in `internal/auth/auth.go` | ✅ Written (build errors — see below) |
| `air` hot-reload config (`.air.toml`)                                                                                                      | ✅ Configured                         |

---

## 2. CRITICAL — Fix Before Doing Anything Else

The backend **does not compile**. Three issues must be patched right now:

### Bug 1 — Missing JWT dependency

`internal/auth/auth.go` calls `jwt.NewWithClaims`, `jwt.ParseWithClaims`, etc., but `github.com/golang-jwt/jwt/v5` is
absent from `go.mod`.

**Fix:**

```bash
cd backend
go get github.com/golang-jwt/jwt/v5
```

Then add the import to `auth.go`:

```go
import "github.com/golang-jwt/jwt/v5"
```

### Bug 2 — Corrupted `user_routes.go`

Lines 17–19 of `internal/routes/user_routes.go` contain the literal text of the user's IDE question (a shell echo
artifact). Delete those lines.

**Fix:** Truncate the file after the closing `}` on line 14.

### Bug 3 — Orphaned root `json.go`

`backend/json.go` declares `package main` with no `main()` function. This breaks `go build ./...`. The helpers (
`respondWithError`, `respondWithJSON`) are not used anywhere because Gin handlers return via `c.JSON()`. **Delete this
file.**

### Bug 4 — Missing `return` after error responses

In `class_handlers.go`:

- `CreateClass`: UUID parse error falls through → silent 500
- `CreateClass`: DB error response missing `return` → double-write panic risk

**Fix:** Add `return` after every `if err != nil { c.JSON(...); return }` block. Full handler audit needed.

---

## 3. Phase 0 — Foundations (Should be done; mostly NOT done)

> Guide target: **March 13**. Current status: **~20% complete**

### 3.1 Makefile + Goose Migration Workflow

Create `backend/Makefile`:

```makefile
DB_URL=postgres://postgres:dandadan@localhost:5432/postgres?sslmode=disable

migrate-up:
	goose -dir sql/schema postgres "$(DB_URL)" up

migrate-down:
	goose -dir sql/schema postgres "$(DB_URL)" down

migrate-status:
	goose -dir sql/schema postgres "$(DB_URL)" status

sqlc-gen:
	sqlc generate

dev-backend:
	air -c .air.toml

.PHONY: migrate-up migrate-down migrate-status sqlc-gen dev-backend
```

Install goose: `go install github.com/pressly/goose/v3/cmd/goose@latest`

> **Note:** `0002_basic_tables.sql` already has `-- +goose Up` / `-- +goose Down` tags. Goose can take over immediately.

### 3.2 Schema Migrations (New files)

#### `sql/schema/0003_add_password.sql`

```sql
-- +goose Up
ALTER TABLE users ADD COLUMN password varchar(255);
-- +goose Down
ALTER TABLE users DROP COLUMN password;
```

#### `sql/schema/0004_add_class_color.sql`

```sql
-- +goose Up
ALTER TABLE classes ADD COLUMN color varchar(50) NOT NULL DEFAULT 'bg-blue-600';
-- +goose Down
ALTER TABLE classes DROP COLUMN color;
```

Run: `make migrate-up` → `make sqlc-gen` (regenerates models with new columns)

### 3.3 New sqlc Queries

Create `sql/queries/0003_users.sql`:

```sql
-- name: CreateUser :one
INSERT INTO users (first_name, last_name, email, type, password)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;
```

Create `sql/queries/0004_classes_extended.sql`:

```sql
-- name: GetClassByID :one
SELECT * FROM classes WHERE id = $1 LIMIT 1;

-- name: UpdateClass :one
UPDATE classes SET subject = $2, grade = $3, color = $4, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: DeleteClass :exec
DELETE FROM classes WHERE id = $1;
```

Run `make sqlc-gen` after every new `.sql` file.

### 3.4 Frontend — Install Zustand

```bash
cd frontend
npm install zustand zod react-hot-toast
npm install -D @types/node
```

### 3.5 Frontend — Create `lib/` Architecture

**`frontend/lib/api.ts`** — The ONLY place components call the API:

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    // get token from Zustand store
    const {accessToken} = useUserStore.getState()
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? {Authorization: `Bearer ${accessToken}`} : {}),
            ...options.headers,
        },
    })
    if (res.status === 401) {
        // attempt silent refresh before giving up
        try {
            const refreshRes = await fetch(`${BASE}/v1/api/auth/refresh`, {
                method: 'POST', credentials: 'include',
            })
            if (refreshRes.ok) {
                const {access_token} = await refreshRes.json()
                useUserStore.getState().setAccessToken(access_token)
                return apiFetch<T>(path, options) // retry
            }
        } catch {
        }
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

**`frontend/lib/stores/user-store.ts`**:

```typescript
import { create } from 'zustand'

interface UserState {
    accessToken: string | null
    user: { id: string; firstName: string; lastName: string; email: string; type: 'teacher' | 'student' | 'parent' } | null
    setAuth: (token: string, user: UserState['user']) => void
    setAccessToken: (token: string) => void
    clearUser: () => void
}

export const useUserStore = create<UserState>((set) => ({
    accessToken: null,
    user: null,
    setAuth: (accessToken, user) => set({ accessToken, user }),
    setAccessToken: (accessToken) => set({ accessToken }),
    clearUser: () => set({ accessToken: null, user: null }),
}))
```

**`frontend/lib/stores/classes-store.ts`**:

```typescript
import {create} from 'zustand'
import {apiFetch} from '@/lib/api'

interface Class {
    id: string;
    subject: string;
    grade: number;
    color: string;
    teacherId: string
}

interface ClassesState {
    classes: Class[]
    loading: boolean
    error: string | null
    fetchClasses: () => Promise<void>
    reset: () => void
}

export const useClassesStore = create<ClassesState>((set) => ({
    classes: [], loading: false, error: null,
    fetchClasses: async () => {
        set({loading: true, error: null})
        try {
            const data = await apiFetch<{ classes: Class[] }>('/v1/api/classes')
            set({classes: data.classes ?? [], loading: false})
        } catch (err) {
            set({error: String(err), loading: false})
        }
    },
    reset: () => set({classes: [], loading: false, error: null}),
}))
```

**`frontend/lib/types.ts`** — shared TypeScript types mirroring backend responses

**`frontend/lib/schemas.ts`** — Zod validation schemas (add in Phase 5 or earlier)

### 3.6 Frontend Environment Config

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Update `docker-compose.yml` frontend service with:

```yaml
environment:
  NEXT_PUBLIC_API_URL: http://backend:8080
```

### Phase 0 Exit Checklist

- [ ] `go build ./...` succeeds with zero errors
- [ ] `make migrate-up` runs cleanly on a fresh DB
- [ ] `users.password` and `classes.color` columns exist
- [ ] `sqlc generate` produces no errors; new queries available
- [ ] Zustand, Zod, react-hot-toast installed in frontend
- [ ] `apiFetch<T>()` created; no raw `fetch()` in components
- [ ] `NEXT_PUBLIC_API_URL` used throughout frontend
- [ ] No handler has a missing `return` after an error response

---

## 4. Phase 1 — Authentication

> Guide target: **March 27**. Current status: **~5% complete** (helpers written, no endpoints)

### 4.1 Backend — Dependencies

```bash
cd backend
go get github.com/golang-jwt/jwt/v5     # (needed for auth.go)
go get golang.org/x/time/rate           # rate limiting
go get github.com/gin-contrib/cors      # CORS
```

> **Note:** `golang.org/x/crypto/bcrypt` is implied by the guide, but the codebase already uses `argon2id` (which is
> cryptographically stronger). Keep argon2id — it's a better choice.

### 4.2 CORS — Wire Immediately (Day 1 of Phase 1)

In `cmd/server/main.go`, before any route registration:

```go
import "github.com/gin-contrib/cors"

router.Use(cors.New(cors.Config{
AllowOrigins:     []string{"http://localhost:3000"},
AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
AllowCredentials: true, // CRITICAL for httpOnly cookie flow
MaxAge:           12 * time.Hour,
}))
```

### 4.3 JWT Secret in Handler

Add `JWTSecret` to the `Handler` struct:

```go
type Handler struct {
    DB        *database.Queries
    DBconn    *sql.DB
    JWTSecret string
}
```

Load from env in `main.go`: `jwtSecret := os.Getenv("JWT_SECRET")` — fatal if empty.

Add to `.env`: `JWT_SECRET=your-secret-here`

### 4.4 New SQL Queries

Add to `sql/queries/0003_users.sql`:

```sql
-- name: CreateRefreshToken :one
-- Note: add a refresh_tokens table (optional for MVP — storing in cookie is sufficient)
-- For MVP: stateless refresh tokens — no DB table needed. Cookie IS the token.
```

> For MVP, refresh tokens are stateless JWTs stored in httpOnly cookies. No `refresh_tokens` DB table required.

### 4.5 Backend Auth Handlers

Create `internal/handlers/auth_handlers.go`:

**`POST /v1/api/auth/register`**

- Bind: `first_name`, `last_name`, `email`, `password`, `type`
- Hash password with argon2id
- Call `DB.CreateUser()`
- Return 201 + sanitized user object (no password hash)

**`POST /v1/api/auth/login`**

- Look up user by email
- Compare password with argon2id
- **Use same error for wrong email and wrong password** ("Invalid email or password")
- Generate access JWT (15min) with `Claims{ UserID, Role }`
- Generate refresh JWT (7d)
- Return: `{ access_token, user }` in JSON body
- Set: `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/v1/api/auth`

**`POST /v1/api/auth/refresh`**

- Read `refresh_token` cookie
- Validate JWT signature + expiry
- Issue new access token (15min) + new refresh token (7d) — rotate both
- Return: `{ access_token }`
- Set new refresh cookie

**`POST /v1/api/auth/logout`**

- Overwrite cookie with expired value: `Max-Age=-1`
- Return 200

Helper — `sanitizeUser()`:

```go
type SafeUser struct {
    ID        uuid.UUID `json:"id"`
    FirstName string    `json:"first_name"`
    LastName  string    `json:"last_name"`
    Email     string    `json:"email"`
    Type      string    `json:"type"`
}
func sanitizeUser(u database.User) SafeUser { ... }
```

### 4.6 AuthMiddleware

Create `internal/proxy/auth.go`:

```go
func AuthMiddleware(secret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        token, err := auth.GetBearerToken(c.Request.Header)
        if err != nil { c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"}); return }
        
        userID, role, err := auth.ValidateJWT(token, secret) // update ValidateJWT to return role
        if err != nil { c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"}); return }
        
        c.Set("userID", userID)
        c.Set("userRole", role)
        c.Next()
    }
}
```

Update `ValidateJWT` in `auth.go` to use custom `Claims` struct with `UserID` and `Role`.

### 4.7 Rate Limiting on Login

```go
import "golang.org/x/time/rate"

var loginLimiter = rate.NewLimiter(rate.Every(time.Minute/10), 10) // 10 req/min
```

Apply as proxy on login route only.

### 4.8 Update Routes

`RegisterUserRoutes` becomes:

```go
func RegisterAuthRoutes(router *gin.RouterGroup, h *handlers.Handler) {
    auth := router.Group("/auth")
    {
        auth.POST("/register", h.Register)
        auth.POST("/login", rateLimitMiddleware(), h.Login)
        auth.POST("/refresh", h.Refresh)
        auth.POST("/logout", h.Logout)
    }
}
```

Wrap all non-auth routes with `AuthMiddleware`:

```go
protected := v1.Group("")
protected.Use(proxy.AuthMiddleware(h.JWTSecret))
{
RegisterClassRoutes(protected, h)
// future: assignments, submissions, grading
}
```

### 4.9 Frontend — Auth Pages

Rename/update `app/portal/page.tsx` → `app/auth/page.tsx` (or add proper auth logic to portal):

- Login form: email + password → `apiFetch POST /v1/api/auth/login`
- Register form: toggle with login (first_name, last_name, email, password, type selector)
- On success: `useUserStore.getState().setAuth(token, user)` → `router.push('/dashboard')`
- Error toast on failure

### 4.10 Frontend — Session Restoration

In root `layout.tsx`, on mount:

```typescript
useEffect(() => {
    // attempt silent refresh on every page load
    fetch(`${BASE}/v1/api/auth/refresh`, { method: 'POST', credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.access_token) useUserStore.getState().setAccessToken(data.access_token) })
}, [])
```

### 4.11 Frontend — Next.js Route Middleware

Create `frontend/proxy.ts`:

```typescript
import {NextRequest, NextResponse} from 'next/server'

export function proxy(req: NextRequest) {
    const hasRefreshToken = req.cookies.has('refresh_token')
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth') || req.nextUrl.pathname.startsWith('/portal')
    const isDashboard = req.nextUrl.pathname.startsWith('/dashboard')

    if (isDashboard && !hasRefreshToken) return NextResponse.redirect(new URL('/portal', req.url))
    if (isAuthPage && hasRefreshToken) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
}

export const config = {matcher: ['/dashboard/:path*', '/portal', '/auth/:path*']}
```

### Phase 1 Exit Checklist

- [ ] `POST /v1/api/auth/register` → 201 + sanitized user (no password hash)
- [ ] `POST /v1/api/auth/login` → access token in JSON + httpOnly refresh cookie
- [ ] `POST /v1/api/auth/refresh` → new access token from cookie
- [ ] `POST /v1/api/auth/logout` → clears cookie
- [ ] All `/v1/api/classes` routes return 401 without valid Bearer token
- [ ] CORS allows `localhost:3000` with `credentials: true`
- [ ] Frontend login form works end-to-end → redirects to `/dashboard`
- [ ] Page refresh preserves session (silent refresh on mount)
- [ ] `/dashboard` redirects to `/portal` without token; `/portal` redirects to `/dashboard` with token
- [ ] Wrong email + wrong password both return "Invalid email or password"

---

## 5. Phase 2 — Classes & Assignments (Weeks 5–6)

> Guide target: **April 10**

### 5.1 Migration: `0005_class_enrollments.sql`

```sql
-- +goose Up
CREATE TABLE class_enrollments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id)
);
CREATE INDEX idx_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_enrollments_student_id ON class_enrollments(student_id);
-- +goose Down
DROP TABLE IF EXISTS class_enrollments;
```

### 5.2 New SQL Queries (Enrollments)

```sql
-- name: EnrollStudent :one
INSERT INTO class_enrollments (class_id, student_id) VALUES ($1, $2)
ON CONFLICT (class_id, student_id) DO NOTHING RETURNING *;

-- name: UnenrollStudent :exec
DELETE FROM class_enrollments WHERE class_id = $1 AND student_id = $2;

-- name: GetStudentClasses :many
SELECT c.* FROM classes c
JOIN class_enrollments ce ON ce.class_id = c.id
WHERE ce.student_id = $1;

-- name: GetClassStudents :many
SELECT u.* FROM users u
JOIN class_enrollments ce ON ce.student_id = u.id
WHERE ce.class_id = $1;

-- name: IsStudentEnrolled :one
SELECT EXISTS(
  SELECT 1 FROM class_enrollments
  WHERE class_id = $1 AND student_id = $2
) AS enrolled;

-- name: GetEnrolledStudentIDs :many
SELECT student_id FROM class_enrollments WHERE class_id = $1;
```

### 5.3 Backend — Class Endpoints (Hardened)

**Update `GET /v1/api/classes`** (role-scoped, no `teacherId` query param):

```go
// From JWT claims:
userID := c.MustGet("userID").(uuid.UUID)
role   := c.MustGet("userRole").(string)

switch role {
case "teacher":
    classes, err := h.DB.GetClasses(c, uuid.NullUUID{UUID: userID, Valid: true})
case "student":
    classes, err := h.DB.GetStudentClasses(c, userID)
case "parent":
    // handled by parent routes
}
```

**New: `GET /v1/api/classes/:id`** — verify teacher owns it OR student is enrolled

**New: `PUT /v1/api/classes/:id`** — teacher only, ownership check

**New: `DELETE /v1/api/classes/:id`** — teacher only, ownership check

**New: `POST /v1/api/classes/:id/enroll`** — teacher only, enroll student by email

**New: `GET /v1/api/classes/:id/students`** — teacher only, list enrolled students

### 5.4 Assignment Endpoints

**`POST /v1/api/classes/:id/assignments`** — teacher only:

```go
// 1. Verify teacher owns class
// 2. Create assignment
// 3. Begin DB transaction:
//    a. Get all enrolled student IDs for this class
//    b. Bulk INSERT into user_assignments (status='assigned') for each student
//    c. COMMIT
// Return 201 + assignment
```

**`GET /v1/api/classes/:id/assignments`** — teacher + enrolled students

**`GET /v1/api/assignments/:id`** — teacher + enrolled students

**`PUT /v1/api/assignments/:id`** — teacher only, ownership check

**`DELETE /v1/api/assignments/:id`** — teacher only, ownership check

### 5.5 Missing Assignment Background Job

In `cmd/server/main.go`, after DB setup:

```go
go func() {
    ticker := time.NewTicker(1 * time.Hour)
    defer ticker.Stop()
    for range ticker.C {
        if err := dbQueries.MarkMissingAssignments(context.Background()); err != nil {
            log.Printf("background job error: %v", err)
        }
    }
}()
```

SQL query:

```sql
-- name: MarkMissingAssignments :exec
UPDATE user_assignments ua
SET status = 'missing', updated_at = NOW()
FROM assignments a
WHERE ua.assignment_id = a.id
  AND ua.status = 'assigned'
  AND a.due_date < NOW();
```

### 5.6 Frontend — Wire to Real API

- Remove **all** mock data from `dashboard/page.tsx`, `sidebar.tsx`, class `[id]/layout.tsx`
- `dashboard/page.tsx`: call `useClassesStore.fetchClasses()` on mount; handle loading/empty/error states
- `sidebar.tsx`: read enrolled classes from `useClassesStore`
- `class/[id]/layout.tsx`: fetch class by ID from API, show real class name
- `class/[id]/classwork/page.tsx`: `apiFetch GET /v1/api/classes/:id/assignments`

### Phase 2 Exit Checklist

- [ ] `class_enrollments` table migrated and indexed
- [ ] `GET /v1/api/classes` is role-scoped — no `teacherId` query param
- [ ] Creating an assignment bulk-inserts `user_assignments` for all enrolled students
- [ ] Missing assignment background job runs every hour
- [ ] Frontend class cards render real data from API
- [ ] Teachers cannot access another teacher's class → 403
- [ ] Students cannot access unenrolled classes → 403

---

## 6. Phase 3 — Submissions & Grading (Weeks 7–8)

> Guide target: **April 24**

### 6.1 Migrations

**`0006_submission_content.sql`:**

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

**`0007_grading_columns.sql`:**

```sql
-- +goose Up
ALTER TABLE user_assignments
    ADD COLUMN feedback   text,
    ADD COLUMN graded_by  uuid REFERENCES users(id),
    ADD COLUMN graded_at  timestamptz;
-- +goose Down
ALTER TABLE user_assignments
    DROP COLUMN feedback,
    DROP COLUMN graded_by,
    DROP COLUMN graded_at;
```

### 6.2 New SQL Queries

```sql
-- name: SubmitAssignment :one
UPDATE user_assignments
SET submission_text = $2, submitted_at = NOW(), status = 'submitted', updated_at = NOW()
WHERE id = $1 AND status != 'graded'
RETURNING *;

-- name: GetUserAssignment :one
SELECT * FROM user_assignments WHERE assignment_id = $1 AND student_id = $2 LIMIT 1;

-- name: GetSubmissionsByAssignment :many
SELECT ua.*, u.first_name, u.last_name, u.email, u.avatar
FROM user_assignments ua
JOIN users u ON u.id = ua.student_id
WHERE ua.assignment_id = $1;

-- name: GradeSubmission :one
UPDATE user_assignments
SET grade = $2, feedback = $3, graded_by = $4, graded_at = NOW(), status = 'graded', updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetGradebook :many
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

### 6.3 New Endpoints

**`POST /v1/api/assignments/:id/submit`** — student only:

- Verify student is enrolled in the assignment's class
- Idempotent: re-submission overwrites previous text
- Guard: `status != 'graded'` — cannot overwrite a returned grade

**`GET /v1/api/assignments/:id/submissions`** — teacher only:

- Verify teacher owns the class
- Returns all submissions joined with student info

**`PATCH /v1/api/user-assignments/:id/grade`** — teacher only:

- Body: `{ grade: int (0-100), feedback: string }`
- Sets `status = 'graded'`

**`GET /v1/api/classes/:id/gradebook`** — teacher only:

- Full `CROSS JOIN` matrix (every student × every assignment)

### 6.4 Frontend

**Student submission form** (`app/dashboard/class/[id]/assignments/[assignmentId]/page.tsx`):

- Textarea with draft auto-save to `localStorage`
  ```typescript
  const DRAFT_KEY = `lum_draft_${assignmentId}_${userId}`
  // Save on keystroke, restore on mount, clear after submit
  ```
- Submit button → `POST /v1/api/assignments/:id/submit`
- Show returned grade + feedback if `status === 'graded'`

**Teacher submission list** (`/assignments/:id` view):

- Table: student name | status badge | submission text preview | timestamp | grade input
- Inline grading panel: integer input (0-100) + feedback textarea + Save

**Gradebook page** (`app/dashboard/class/[id]/gradebook/page.tsx`):

- Table matrix: students as rows, assignments as columns
- Color coding: 🟢 80-100, 🟡 60-79, 🔴 0-59, `—` not graded, 🔴 missing

### Phase 3 Exit Checklist

- [ ] `submission_text`, `submitted_at`, `feedback`, `graded_by`, `graded_at` columns exist
- [ ] Students can submit and re-submit (idempotent)
- [ ] Graded submissions cannot be overwritten by student
- [ ] Teachers can grade with score + feedback
- [ ] Gradebook returns full student × assignment matrix (no hidden students)
- [ ] Draft auto-save works (keystroke → localStorage → restore on mount → clear on submit)
- [ ] Students see grade + feedback on assignment detail page

---

## 7. Phase 4 — Communication & Parent Portal (Week 9)

> Guide target: **May 1**

### 7.1 Migrations

**`0008_posts_class_id.sql`:**

```sql
-- +goose Up
ALTER TABLE posts ADD COLUMN class_id uuid REFERENCES classes(id) ON DELETE CASCADE;
CREATE INDEX idx_posts_class_id ON posts(class_id);
-- +goose Down
DROP INDEX IF EXISTS idx_posts_class_id;
ALTER TABLE posts DROP COLUMN class_id;
```

**`0009_parent_student_links.sql`:**

```sql
-- +goose Up
CREATE TABLE parent_student_links (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (parent_id, student_id)
);
CREATE INDEX idx_psl_parent_id ON parent_student_links(parent_id);
CREATE INDEX idx_psl_student_id ON parent_student_links(student_id);
-- +goose Down
DROP TABLE IF EXISTS parent_student_links;
```

### 7.2 Announcements

SQL queries:

```sql
-- name: CreateAnnouncement :one
INSERT INTO posts (author_id, class_id, content)
VALUES ($1, $2, $3) RETURNING *;

-- name: GetClassAnnouncements :many
SELECT p.*, u.first_name, u.last_name, u.avatar
FROM posts p JOIN users u ON u.id = p.author_id
WHERE p.class_id = $1 AND p.parent_id IS NULL
ORDER BY p.created_at DESC;
```

Endpoints:

- `POST /v1/api/classes/:id/announcements` — teacher only
- `GET /v1/api/classes/:id/announcements` — teacher + enrolled students

**Wire Stream tab** (`class/[id]/page.tsx`): fetch from API, teacher sees compose box, students see read-only feed.

### 7.3 Parent Endpoints

**`ParentGuard` proxy** — verifies `parent_student_links` row exists before passing through.

SQL queries:

```sql
-- name: LinkParentToStudent :one
INSERT INTO parent_student_links (parent_id, student_id)
VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *;

-- name: GetLinkedStudents :many
SELECT u.* FROM users u
JOIN parent_student_links psl ON psl.student_id = u.id
WHERE psl.parent_id = $1;

-- name: IsParentLinked :one
SELECT EXISTS(
  SELECT 1 FROM parent_student_links
  WHERE parent_id = $1 AND student_id = $2
) AS linked;
```

Endpoints:

- `POST /v1/api/parent/link` — look up student by email, verify `type='student'`, create link. Same error for
  non-existent and non-student emails.
- `GET /v1/api/parent/students` — list linked students
- `GET /v1/api/parent/students/:id/classes` — ParentGuard + student's classes
- `GET /v1/api/parent/students/:id/grades` — ParentGuard + student's graded assignments
- `GET /v1/api/parent/students/:id/assignments` — ParentGuard + upcoming assignments

### 7.4 Parent Frontend

In dashboard layout, check `useUserStore().user?.type`:

- `'parent'` → render `ParentDashboard` component (linked student cards, grade summaries, upcoming assignments)
- `'teacher'` / `'student'` → render existing dashboard

### Phase 4 Exit Checklist

- [ ] `posts.class_id` migrated and indexed
- [ ] `parent_student_links` migrated and indexed
- [ ] Announcements scoped to class; stream renders from API
- [ ] Teachers see compose box; students see read-only feed
- [ ] Parent link by student email works
- [ ] `ParentGuard` rejects requests for unlinked students → 403
- [ ] Parent dashboard renders when `type === 'parent'`
- [ ] No parent can see another student's data

---

## 8. Phase 5 — Polish, Testing & Launch (Week 10)

> Guide target: **May 9**

### 8.1 Input Validation

**Backend:** All handlers must have `binding:"required"` tags + validated enum values.

**Frontend** — `frontend/lib/schemas.ts`:

```typescript
import { z } from 'zod'
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) })
export const registerSchema = loginSchema.extend({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    type: z.enum(['teacher', 'student', 'parent']),
})
export const classSchema = z.object({ subject: z.string().min(1).max(100), grade: z.number().int().min(1).max(12), color: z.string().optional() })
export const assignmentSchema = z.object({ title: z.string().min(1), type: z.enum(['assignment', 'material']), due_date: z.string().optional(), details: z.string().optional() })
export const gradeSchema = z.object({ grade: z.number().int().min(0).max(100), feedback: z.string().max(2000).optional() })
```

Validate in every form before calling `apiFetch`.

### 8.2 Error Handling & UI States

Every page must handle three states:

| State       | Implementation                                                                        |
|-------------|---------------------------------------------------------------------------------------|
| **Loading** | Skeleton loaders (Tailwind `animate-pulse`)                                           |
| **Empty**   | Role-appropriate CTA ("Create your first class", "No classes yet — ask your teacher") |
| **Error**   | Error message + retry button                                                          |

Install `react-hot-toast`, add `<Toaster />` to root layout. Toast on every create/update/delete action.

Create global `ErrorBoundary` component wrapping the app.

### 8.3 Security Audit Checklist

- [ ] No raw SQL strings — all via sqlc
- [ ] `JWT_SECRET` from `os.Getenv()`, `log.Fatal` if empty
- [ ] `AuthMiddleware` on ALL `/v1/api/...` routes except `/v1/api/auth/...`
- [ ] Every teacher endpoint checks `class.TeacherID == userID`
- [ ] Every student endpoint checks enrollment
- [ ] Every parent endpoint passes `ParentGuard`
- [ ] Rate limiting on login (10 req/min)
- [ ] `sanitizeUser()` called before every user response
- [ ] Refresh cookie: `HttpOnly; Secure; SameSite=Strict`
- [ ] Error messages reveal no internal stack traces
- [ ] `GIN_MODE=release` in `docker-compose.prod.yml`
- [ ] Same error for wrong email and wrong password
- [ ] `localStorage` only used for draft auto-save — never for tokens

### 8.4 Testing Baseline

**Backend** — Go table-driven tests:

```go
// backend/internal/handlers/auth_handlers_test.go
func TestRegister(t *testing.T) {
    tests := []struct { ... }{ ... }
    for _, tt := range tests { t.Run(tt.name, func(t *testing.T) { ... }) }
}
```

**Frontend** — Vitest + React Testing Library:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom @vitejs/plugin-react
```

### 8.5 Docker Compose Production Config

Create `docker-compose.prod.yml`:

- `GIN_MODE=release`
- `JWT_SECRET` from env (not hardcoded)
- Postgres uses named volume + least-privilege user
- Backend health check before service starts
- Frontend `NODE_ENV=production`

### 8.6 Final Release Tasks

1. Walk through all 5 QA journey scripts (from guide §16) on a fresh DB
2. Create `BACKLOG.md` with deferred features (file uploads, SSE, rich text editor, etc.)
3. `next build` — zero TypeScript errors
4. `go test ./...` — passes
5. Update `README.md` with full setup instructions
6. `git tag v0.1.0 && git push --tags`

### Phase 5 Exit Checklist (= MVP Ship Criteria)

- [ ] All 5 QA journey scripts pass
- [ ] All security items verified
- [ ] `next build` zero TypeScript errors
- [ ] `go test ./...` passes
- [ ] All pages handle loading, empty, error states
- [ ] Toast notifications on every action
- [ ] `docker compose -f docker-compose.prod.yml up` starts cleanly
- [ ] `README.md` complete; `BACKLOG.md` exists
- [ ] Git tag `v0.1.0` pushed

---

## 9. File Creation Summary (All New Files)

### Backend — New Files

```
backend/
├── Makefile                                          # migrate-up, migrate-down, sqlc-gen
├── sql/
│   ├── schema/
│   │   ├── 0003_add_password.sql                   # users.password
│   │   ├── 0004_add_class_color.sql                # classes.color
│   │   ├── 0005_class_enrollments.sql              # class_enrollments table
│   │   ├── 0006_submission_content.sql             # submission_text, submitted_at
│   │   ├── 0007_grading_columns.sql                # feedback, graded_by, graded_at
│   │   ├── 0008_posts_class_id.sql                 # posts.class_id
│   │   └── 0009_parent_student_links.sql           # parent_student_links table
│   └── queries/
│       ├── 0003_users.sql                          # CreateUser, GetUserByEmail, GetUserByID
│       ├── 0004_classes_extended.sql               # GetClassByID, UpdateClass, DeleteClass
│       ├── 0005_enrollments.sql                    # EnrollStudent, GetStudentClasses, etc.
│       ├── 0006_assignments.sql                    # Assignment CRUD, MarkMissing
│       ├── 0007_submissions.sql                    # SubmitAssignment, GradeSubmission, Gradebook
│       └── 0008_announcements_parents.sql          # Posts, ParentLinks queries
├── internal/
│   ├── handlers/
│   │   ├── auth_handlers.go                        # Register, Login, Refresh, Logout
│   │   ├── assignment_handlers.go                  # Assignment CRUD
│   │   ├── submission_handlers.go                  # Submit, ListSubmissions, Grade
│   │   └── parent_handlers.go                      # Link, ListStudents, Grades, etc.
│   ├── proxy/
│   │   ├── auth.go                                 # AuthMiddleware
│   │   ├── rate_limit.go                           # Login rate limiter
│   │   └── parent_guard.go                         # ParentGuard
│   └── routes/
│       ├── auth_routes.go                          # /v1/api/auth/*
│       ├── assignment_routes.go                    # /v1/api/classes/:id/assignments, etc.
│       └── parent_routes.go                        # /v1/api/parent/*
```

### Frontend — New Files

```
frontend/
├── .env.local                                       # NEXT_PUBLIC_API_URL
├── proxy.ts                                    # Route protection
├── lib/
│   ├── api.ts                                       # apiFetch<T>()
│   ├── types.ts                                     # Shared TypeScript types
│   ├── schemas.ts                                   # Zod validation schemas
│   └── stores/
│       ├── user-store.ts                            # Zustand user/auth store
│       └── classes-store.ts                         # Zustand classes store
├── components/
│   ├── error-boundary.tsx                           # Global error boundary
│   └── skeletons/
│       ├── class-card-skeleton.tsx                  # Loading states
│       └── assignment-skeleton.tsx
└── app/
    ├── auth/
    │   └── page.tsx                                  # Login/register form (wired)
    └── dashboard/
        └── class/
            └── [id]/
                ├── assignments/
                │   └── [assignmentId]/
                │       └── page.tsx                  # Assignment detail + submit form
                └── gradebook/
                    └── page.tsx                      # Gradebook matrix
```

---

## 10. Immediate Next Steps (Do Today)

Priority order to get the project back on track:

1. **Fix build errors** — `go get github.com/golang-jwt/jwt/v5`, fix `user_routes.go`, delete `json.go`
2. **Fix missing `return` statements** in `class_handlers.go`
3. **Add JWT import** to `auth.go`, update `ValidateJWT` to return `role` from claims
4. **Run `go build ./...`** — should succeed
5. **Apply Phase 0 migrations** — `make migrate-up` adds `password` + `color` columns
6. **Add new sqlc queries** + `make sqlc-gen`
7. **Install Zustand/Zod in frontend** — `npm install zustand zod react-hot-toast`
8. **Create `frontend/lib/api.ts`** and Zustand stores
9. **Start Phase 1 auth endpoints** — register → login → refresh → logout
10. **Wire CORS** before testing any auth from the browser

---

## 11. Timeline Snapshot

| Week      | Dates        | Focus                                                                     | Status         |
|-----------|--------------|---------------------------------------------------------------------------|----------------|
| 0 (fixes) | Mar 25–26    | Build errors, goose, password migration, sqlc queries, apiFetch, Zustand  | 🔴 Not started |
| 1         | Mar 27–28    | Auth backend (register, login, refresh, logout, CORS, proxy)              | 🔴 Not started |
| 2         | Mar 30–Apr 4 | Auth frontend (forms, session, route protection)                          | 🔴 Not started |
| 3         | Apr 6–10     | Classes (enrollment, role-scoped API, frontend wired to real data)        | 🔴 Not started |
| 4         | Apr 13–17    | Assignments (CRUD, auto user_assignments, background job, classwork page) | 🔴 Not started |
| 5         | Apr 20–24    | Submissions (submit, grade, gradebook)                                    | 🔴 Not started |
| 6         | Apr 27–May 1 | Stream (announcements) + parent portal                                    | 🔴 Not started |
| 7         | May 4–9      | Polish, testing, security audit, Docker prod, v0.1.0 tag                  | 🔴 Not started |

> The original Phase 0 target (March 13) and Phase 1 target (March 27) are now compressed into a tight catch-up sprint.
> The most critical bottleneck is Phase 1 authentication — it blocks everything else.
