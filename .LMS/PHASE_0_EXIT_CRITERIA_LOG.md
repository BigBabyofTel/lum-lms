# Phase 0 Exit Criteria Log

> **Reference file:** [PHASE_0_FOUNDATIONS.md](./phases/PHASE_0_FOUNDATIONS.md)
> **Log date:** March 30, 2026
> **Status:** 9/10 criteria met — 1 item remaining

---

## Exit Criteria Results

| #  | Criteria                                                                       | Status    | Notes                                                                                                 |
|----|--------------------------------------------------------------------------------|-----------|-------------------------------------------------------------------------------------------------------|
| 1  | `make migrate-up` runs cleanly against a fresh database                        | ✅ Done    | `Makefile` has the target, reads credentials from `backend/.env` via `include .env`                   |
| 2  | `make migrate-down` reverses all migrations without errors                     | ✅ Done    | All 4 schema files have correct `-- +goose Down` blocks                                               |
| 3  | `sqlc generate` produces no errors                                             | ✅ Done    | `sqlc-gen` Makefile target added; stale `basic_queries.sql.go` deleted                                |
| 4  | `make dev` starts both the Gin server and Next.js in watch mode                | ❌ Missing | No `dev` target exists in any Makefile — see fix below                                                |
| 5  | `users.password` column exists in the database                                 | ✅ Done    | `password varchar(255)` on line 11 of `0001_users.sql`                                                |
| 6  | `classes.color` column exists in the database                                  | ✅ Done    | `color varchar(50) NOT NULL DEFAULT 'bg-blue-600'` on line 14 of `0002_classes.sql`                   |
| 7  | `actions.ts` is the only way components call the API (no raw `fetch`)          | ✅ Done    | Grep confirms all 3 `fetch()` calls are inside `frontend/lib/actions.ts` only                         |
| 8  | `NEXT_PUBLIC_API_URL` is read from `.env`, not hardcoded                       | ✅ Done    | `frontend/.env` exists with `NEXT_PUBLIC_API_URL=http://localhost:8080`; `actions.ts` line 7 reads it |
| 9  | At least one Go handler test passes with `go test ./...`                       | ✅ Done    | `backend/tests/handlers_test.go` has 2 passing validation tests                                       |
| 10 | No handler reaches a second `c.JSON()` call after an error (all have `return`) | ✅ Done    | All `if err != nil` blocks in `class_handlers.go` and `user_handlers.go` have `return`                |

---

## Remaining Item — `make dev`

### What's needed

A single command that starts both the Go backend (with live reload via `air`) and the Next.js frontend together.

### Fix — add to root-level `Makefile` (create at `/lum-lms/Makefile`)

```makefile
dev:
	cd backend && air & cd frontend && bun run dev
```

Or add to the existing `backend/Makefile`:

```makefile
dev:
	air & cd ../frontend && bun run dev
```

### Why this is the last item

`.air.toml` already exists in `backend/` and is correctly configured. `bun run dev` is the existing Next.js dev script
in `frontend/package.json`. The only missing piece is a single `make dev` entry point that runs both together.

---

## Additional Issues Found During Audit (Not Exit Criteria — Future Work)

These were flagged during the audit but do not block Phase 0 completion:

### 1. `classSchema` includes `id` field — breaks `submitForm`

**File:** `frontend/lib/schemas.ts`

`classSchema` requires an `id: z.uuid()` field, but the `submitForm` server action never sends an `id` (the server
generates it). Zod validation will silently fail on every create attempt.

**Fix:** Create a separate `createClassSchema` that omits `id`:

```typescript
export const createClassSchema = classSchema.omit({ id: true })
```

### 2. `ClassCard` links by subject name, not ID

**File:** `frontend/components/class-card.tsx` line 15

```tsx
// Current — broken routing
<Link href={`/dashboard/class/${name}`}>

// Should be
<Link href={`/dashboard/class/${id}`}>
```

Requires passing `id` as a prop to `ClassCard`.

### 3. Dashboard hardcodes teacher name and color

**File:** `frontend/app/dashboard/page.tsx` lines 59–60

```tsx
teacher={'Mr. Baker'}    // should come from user store
color={'bg-blue-400'}    // should come from data.color (DB has this column now)
```

### 4. `GetStudents` uses wrong HTTP status code

**File:** `backend/internal/handlers/user_handlers.go` line 12

```go
// Current — wrong status
c.JSON(http.StatusBadRequest, gin.H{"error": "could not get students"})

// Should be — DB failure is a server error, not a client error
c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get students"})
```

### 5. Duplicate SQL queries

**File:** `backend/sql/queries/0002_classes.sql`

`GetClassByTeacherID` and `GetClasses` are identical queries. One should be removed.

### 6. `ClassState` extends `Class` — unnecessary fields

**File:** `frontend/store/storeTypes.ts`

`ClassState extends Class` inherits `id`, `subject`, `grade` as top-level fields that serve no purpose. Should be a
standalone interface.

### 7. `clearUser` does not clear `useClassesStore`

**File:** `frontend/store/useUserStore.ts`

The plan requires that logout clears all stores. Currently `clearUser()` only resets user fields. On a shared device,
the next user would see the previous user's classes.

**Fix — call `clearClasses` inside `clearUser`:**

```typescript
clearUser: () => {
    set(() => ({ id: '', accessToken: '', ... }))
    useClassStore.getState().clearClasses()  // ← add this
}
```

### 8. `JWT_SECRET` has no value in `backend/.env`

**File:** `backend/.env` line 12

```env
# Current — missing value
JWT_SECRET

# Required
JWT_SECRET=<output of: openssl rand -hex 32>
```

---

## Files Modified During Phase 0

| File                                             | Change Made                                                                                |
|--------------------------------------------------|--------------------------------------------------------------------------------------------|
| `backend/Makefile`                               | Added `migrate-up`, `migrate-down`, `migrate-status`, `migrate-create`, `sqlc-gen` targets |
| `backend/.env`                                   | Added `JWT_SECRET`, `GIN_MODE=debug`, `PORT=8080`                                          |
| `backend/.gitignore`                             | Added `.env` to prevent secrets from being committed                                       |
| `backend/cmd/server/main.go`                     | Added `PORT` env read; `router.Run(":" + port)`                                            |
| `backend/internal/database/basic_queries.sql.go` | **Deleted** — stale duplicate of generated files                                           |
| `backend/tests/handlers_test.go`                 | Created — 2 passing validation tests for `CreateClass`                                     |
| `frontend/.env`                                  | Created — `NEXT_PUBLIC_API_URL=http://localhost:8080`                                      |
| `frontend/lib/actions.ts`                        | Centralized all `fetch()` calls; Zod validation; redirect after create                     |
| `frontend/lib/schemas.ts`                        | Added `classSchema`, `testUserSchema`, `userSchema`                                        |
| `frontend/store/storeTypes.ts`                   | Added `isLoading`, `error`, `setLoading`, `setError`, `clearClasses` to `ClassState`       |
| `frontend/store/useClassesStore.ts`              | Implemented `isLoading`, `error`, `setLoading`, `setError`, `clearClasses`                 |
| `frontend/store/useUserStore.ts`                 | Implemented `clearUser`, `setUser`, `setAccessToken` with `persist` proxy                  |
| `frontend/components/class-card-skeleton.tsx`    | Created — animated loading skeleton for class cards                                        |
| `frontend/app/dashboard/page.tsx`                | Added loading, error, and empty states using store flags                                   |
| `docker-compose.yml`                             | Added `NEXT_PUBLIC_API_URL=http://backend:8080` to frontend service environment            |
| `LMS/TESTING_GUIDE.md`                           | Created — documents all testing types and full Docker container integration test setup     |

---

## Week-by-Week Summary

### Week 1 — Backend & Schema

- ✅ Monday: Handler `return` bug fixed across all handlers
- ✅ Tuesday: Goose migration workflow added to Makefile
- ✅ Wednesday: `password` column already in `0001_users.sql` at table creation
- ✅ Thursday: `color` column added to `0002_classes.sql`
- ✅ Friday: All sqlc queries exist — `GetUserByEmail`, `GetUserByID`, `CreateUser`, `GetClassByID`, `UpdateClass`,
  `DeleteClass`, `GetClasses`

### Week 2 — Frontend Architecture

- ✅ Monday: `actions.ts` confirmed as sole API entry point (no raw `fetch` in components)
- ✅ Tuesday: Zustand stores solidified — `setUser`, `clearUser`, `setClasses`, `clearClasses`, `isLoading`, `error`
- ✅ Wednesday: `.env` files created; `docker-compose.yml` updated; `PORT` read from env in `main.go`
- ✅ Thursday: `ClassCardSkeleton` created; loading, error, and empty states implemented in dashboard
- ✅ Friday: `handlers_test.go` written and passing — 2 validation tests for `CreateClass`

---

*Phase 0 audit completed March 30, 2026 — 1 item remaining: `make dev` target*

