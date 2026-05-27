# Phase 0 — Foundations (Weeks 1–2)

> **Part of:** [LMS MVP Pacing Guide](../LMS_MVP_PACING_GUIDE.md)  
> **Dates:** Mar 2 – Mar 13, 2026  
> **Estimated hours:** 40–60 hrs (4–6 hrs/day × 10 days)

---

## Goal

Solidify the developer experience, tooling, database schema, and frontend architecture so every subsequent phase builds
on a stable, consistent base. Bugs and bad decisions found here are cheap to fix. The same bugs found in Phase 3 cost
3× as long to unwind.

> "Make it work, make it right, make it fast — in that order. Phase 0 is 'make it right'."

---

## Table of Contents

1. [Week 1 — Dev Environment & Schema Hardening](#week-1--dev-environment--schema-hardening)
2. [Week 2 — Frontend Architecture & API Client](#week-2--frontend-architecture--api-client)
3. [Schema Changes Required](#schema-changes-required)
4. [Tooling Checklist](#tooling-checklist)
5. [Where Luminescence Improves on Existing Platforms](#where-luminescence-improves-on-existing-platforms)
6. [Deliverables & Exit Criteria](#deliverables--exit-criteria)
7. [References](#references)

---

## Week 1 — Dev Environment & Schema Hardening

### Day-by-Day Breakdown

#### Monday — Fix Known Backend Bugs

The current `createClass` handler has a silent failure: after a failed UUID parse it logs an error but does **not**
`return`, so the handler continues executing and sends a confusing response or panics.

**Fix pattern — apply to every handler:**

```go
teacherUUID, err := uuid.Parse(parameters.TeacherId)
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "TeacherId is not a valid UUID"})
return // ← this return is currently missing
}
```

**Audit checklist for all handlers:**

- [ ] Every `if err != nil` block has a `return` after responding
- [ ] No handler can reach a second `c.JSON()` call after an error response (Gin warns, browser receives garbage)
- [ ] `cfg.DB.CreateClass` error response uses `http.StatusInternalServerError`, not `http.StatusForbidden` (current
  bug)

---

#### Tuesday — Add Goose Migration Workflow

Currently migrations appear to be applied manually. Goose gives you versioned, reversible, team-friendly migrations.

**Install:**

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

**Makefile targets:**

```makefile
DB_URL=postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

migrate-up:
	goose -dir ./sql/schema postgres "$(DB_URL)" up

migrate-down:
	goose -dir ./sql/schema postgres "$(DB_URL)" down

migrate-status:
	goose -dir ./sql/schema postgres "$(DB_URL)" status

migrate-create:
	goose -dir ./sql/schema create $(name) sql
```

**Convert existing schema files** by adding Goose directives to the top:

```sql
-- +goose Up
-- (existing CREATE TABLE statements)

-- +goose Down
DROP TABLE IF EXISTS comments;
-- (existing DROP statements — already present in 0002_basic_tables.sql)
```

> **Note:** The existing `0002_basic_tables.sql` already has `-- +goose Up` / `-- +goose Down` directives — verify they
> are correct and test `make migrate-down` before proceeding.

---

#### Wednesday — Add `password` Column Migration

The `users` table has no `password` column yet. Auth in Phase 1 depends on it.

```sql
-- +goose Up
ALTER TABLE users
    ADD COLUMN password varchar(255);

-- +goose Down
ALTER TABLE users
    DROP COLUMN password;
```

> **Why `varchar(255)` not `text`?** bcrypt hashes are always 60 characters. Using `varchar(255)` signals intent and
> reserves a reasonable bound. Either works with `lib/pq`.

---

#### Thursday — Add `color` Column to `classes`

The frontend class cards use a Tailwind color class (e.g. `bg-blue-600`) that is not yet stored in the database.
Without it, every card defaults to the same color and the `color` prop in `ClassCard` is always the default.

```sql
-- +goose Up
ALTER TABLE classes
    ADD COLUMN color varchar(50) NOT NULL DEFAULT 'bg-blue-600';

-- +goose Down
ALTER TABLE classes
    DROP COLUMN color;
```

**Supported color values** (must match the `COLOR_MAP` in `class-card.tsx` when that redesign is implemented):

```
bg-blue-600 | bg-green-600 | bg-purple-600 | bg-red-600 | bg-orange-500 | bg-pink-600
```

---

#### Friday — Extend sqlc Queries

Run `sqlc generate` after every schema change. Write the following queries in `sql/queries/`:

```sql
-- sql/queries/users.sql

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = sqlc.arg(email)
LIMIT 1;

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = sqlc.arg(id)
LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (id, first_name, last_name, email, password, type, avatar_color, created_at)
VALUES (gen_random_uuid(),
        sqlc.arg(first_name),
        sqlc.arg(last_name),
        sqlc.arg(email),
        sqlc.arg(password),
        sqlc.arg(type),
        sqlc.arg(avatar_color),
        NOW())
RETURNING *;

-- sql/queries/classes.sql (extend existing)

-- name: UpdateClass :one
UPDATE classes
SET subject    = sqlc.arg(subject),
    grade      = sqlc.arg(grade),
    color      = sqlc.arg(color),
    updated_at = NOW()
WHERE id = sqlc.arg(id)
  AND teacher_id = sqlc.arg(teacher_id)
RETURNING *;

-- name: DeleteClass :exec
DELETE
FROM classes
WHERE id = sqlc.arg(id)
  AND teacher_id = sqlc.arg(teacher_id);

-- name: GetClassByID :one
SELECT *
FROM classes
WHERE id = sqlc.arg(id)
LIMIT 1;
```

---

## Week 2 — Frontend Architecture & API Client

### Day-by-Day Breakdown

#### Monday — Centralize the API Client

Currently, components likely call `fetch()` directly with hardcoded URLs. This makes token injection, error handling,
and base URL changes a maintenance nightmare.

Create `frontend/lib/api.ts`:

```typescript
// frontend/lib/api.ts
import {useUserStore} from '@/store/useUserStore'

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

    // Trigger a silent token refresh on 401 (implemented in Phase 1)
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

**Rule:** No raw `fetch()` calls anywhere in the component tree. All calls go through `apiFetch`.

---

#### Tuesday — Solidify Zustand Stores

Review `useUserStore` and `useClassesStore`:

**`useUserStore` must expose:**

```typescript
interface UserStore {
    id: string | null
    accessToken: string | null
    type: 'teacher' | 'student' | 'parent' | null
    // ... other user fields
    setUser: (user: UserPayload) => void
    clearUser: () => void       // called on logout or 401
}
```

**`useClassesStore` must expose:**

```typescript
interface ClassesStore {
    classes: Class[]
    isLoading: boolean
    error: string | null
    fetchClasses: () => Promise<void>  // calls apiFetch, not fetch directly
    addClass: (cls: Class) => void
}
```

> **Key rule:** Stores should never hold stale data after logout. `clearUser()` must also clear `useClassesStore`.

---

#### Wednesday — Environment Config

Move all hardcoded values into environment variables:

**`frontend/.env.local` (not committed to git):**

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**`docker-compose.yml` update:**

```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=http://backend:8080
```

**`backend/.env` (already loaded by `godotenv` in `main.go`):**

```env
DATABASE_URL=postgres://user:pass@db:5432/lums?sslmode=disable
JWT_SECRET=replace_with_256_bit_random_hex
GIN_MODE=debug   # change to 'release' in production
PORT=8080
```

---

#### Thursday — Error Boundaries & Loading States

Every data-fetching page needs three states: **loading**, **error**, and **empty**.

**Loading skeleton for class cards:**

```tsx
// components/class-card-skeleton.tsx
export function ClassCardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
            <div className="h-32 bg-gray-300 dark:bg-gray-600"/>
            <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"/>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"/>
            </div>
        </div>
    )
}
```

**Dashboard empty state:**

```tsx
// When classes.length === 0 and !isLoading
<div className="text-center py-16 text-gray-500 dark:text-gray-400">
    <p className="text-lg font-medium">No classes yet</p>
    <p className="text-sm mt-1">Create your first class to get started.</p>
</div>
```

---

#### Friday — Testing Baseline

**Backend (Go table-driven test):**

```go
// backend/cmd/server/main_test.go
func TestCreateClass(t *testing.T) {
tests := []struct {
name       string
body       string
wantStatus int
}{
{"valid input", `{"subject":"Math","grade":5,"teacher_id":"<valid-uuid>"}`, 200},
{"missing subject", `{"grade":5,"teacher_id":"<valid-uuid>"}`, 400},
{"invalid uuid", `{"subject":"Math","grade":5,"teacher_id":"not-a-uuid"}`, 400},
}
for _, tt := range tests {
t.Run(tt.name, func (t *testing.T) {
// use httptest.NewRecorder + gin.Default()
})
}
}
```

**Frontend (Vitest install):**

```bash
cd frontend
bun add -D vitest @testing-library/react @testing-library/dom jsdom @vitejs/plugin-react
```

---

## Schema Changes Required

Summary of all migrations needed in Phase 0:

| Migration File             | Change                                                                            | Reason               |
|----------------------------|-----------------------------------------------------------------------------------|----------------------|
| `0003_add_password.sql`    | `ALTER TABLE users ADD COLUMN password varchar(255)`                              | Auth (Phase 1)       |
| `0004_add_class_color.sql` | `ALTER TABLE classes ADD COLUMN color varchar(50) NOT NULL DEFAULT 'bg-blue-600'` | Frontend class cards |

---

## Tooling Checklist

| Tool              | Purpose                  | Status                                             |
|-------------------|--------------------------|----------------------------------------------------|
| `pressly/goose`   | Versioned SQL migrations | 🔲 Install                                         |
| `air`             | Live reload for Go       | 🔲 Verify `.air.toml` config                       |
| `sqlc`            | Query code generation    | ✅ Configured — verify `sqlc generate` passes       |
| `make`            | Dev workflow scripts     | 🔲 Add `migrate-up`, `migrate-down`, `dev` targets |
| `vitest`          | Frontend unit testing    | 🔲 Install                                         |
| `go test`         | Backend unit testing     | 🔲 Write first test                                |
| `Postman / Bruno` | API manual testing       | 🔲 Import existing `.http` test file               |

---

## Where Luminescence Improves on Existing Platforms

These improvements are enabled by the architectural decisions made in Phase 0 — they don't add features yet, but they
prevent the technical debt that makes features harder to add in mature platforms.

### 1. No Split Migration Systems

**Problem in existing platforms:**  
Moodle's upgrade scripts are notoriously brittle — a failed upgrade mid-way can leave the database in an inconsistent
state. Canvas has had multiple painful DB migration incidents in its open-source history.

**Luminescence approach:**  
`pressly/goose` with explicit `Up`/`Down` blocks means every schema change is reversible. Running `make migrate-down`
restores the previous state. This is not a feature most LMS platforms offer their self-hosting users.

---

### 2. Typed, Centralized API Client from Day One

**Problem in existing platforms:**  
Google Classroom's web client has been criticized for inconsistent error messages because different parts of the app
handle API errors differently. Schoology's JavaScript client evolved organically and has multiple places where network
errors silently fail.

**Luminescence approach:**  
A single `apiFetch<T>()` function means every API error is handled identically. TypeScript generics catch shape
mismatches at compile time, not at runtime in a production classroom.

---

### 3. Environment Parity

**Problem in existing platforms:**  
Moodle is infamous for configuration values that behave differently in development vs. production because settings are
stored in `config.php` and inconsistently applied. Canvas has a complex Rails environment configuration that trips up
new contributors.

**Luminescence approach:**  
All config is in `.env` files, loaded by `godotenv` on the backend and `NEXT_PUBLIC_` variables on the frontend. The
same Docker Compose file drives both dev and production — reducing "works on my machine" failures.

---

### 4. Testing Culture Established Early

**Problem in existing platforms:**  
Google Classroom has zero public test coverage. Blackboard's legacy codebase is known to have extensive manual QA
processes because automated test coverage was added too late. Canvas has good test coverage but it required years of
retrofitting.

**Luminescence approach:**  
Table-driven Go tests and React Testing Library tests are set up in Week 2, before any real features exist. This costs
~4 hours now and saves days of debugging later.

---

## Deliverables & Exit Criteria

Phase 0 is complete when **all** of the following are true:

- [ ] `make migrate-up` runs cleanly against a fresh database
- [ ] `make migrate-down` reverses all migrations without errors
- [ ] `sqlc generate` produces no errors
- [ ] `make dev` starts both the Gin server and Next.js in watch mode
- [ ] `users.password` column exists in the database
- [ ] `classes.color` column exists in the database
- [ ]  action.ts file is the only way components call the API (no raw `fetch`)
- [ ] `NEXT_PUBLIC_API_URL` is read from `.env.local`, not hardcoded
- [ ] At least one Go handler test passes with `go test ./...`
- [ ] No handler reaches a second `c.JSON()` call after an error (all have `return`)

---

## References

| Resource                            | URL                                                                                     |
|-------------------------------------|-----------------------------------------------------------------------------------------|
| pressly/goose — migration runner    | https://github.com/pressly/goose                                                        |
| sqlc documentation                  | https://docs.sqlc.dev/en/latest/                                                        |
| sqlc query annotations reference    | https://docs.sqlc.dev/en/latest/reference/query-annotations.html                        |
| air live reload                     | https://github.com/air-verse/air                                                        |
| Gin handler testing with `httptest` | https://gin-gonic.com/docs/testing/                                                     |
| Go table-driven tests               | https://go.dev/blog/subtests                                                            |
| Next.js environment variables       | https://nextjs.org/docs/app/building-your-application/configuring/environment-variables |
| Zustand TypeScript guide            | https://zustand.dev/guides/typescript                                                   |
| Vitest setup                        | https://vitest.dev/guide/                                                               |
| bcrypt cost factor guidance         | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html        |

---

*Phase 0 of 5 — Luminescence LMS MVP · Target completion: Mar 13, 2026*

