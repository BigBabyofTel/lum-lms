# Testing Guide

## Types of Testing

### What is currently implemented

**Unit / Validation Testing** — `backend/tests/handlers_test.go`

Tests a single handler in isolation with no real DB. Verifies input validation logic only.

```go
// tests only that bad input returns 400
{"missing subject", `{"grade":5,"teacher_id":"..."}`, 400}
```

---

## All Testing Types

### Backend (Go)

#### 1. Unit Tests

Test a single function in complete isolation. The current `handlers_test.go` counts as this.

#### 2. Integration Tests

Test the full request → handler → real database flow. Requires a real test DB or Docker.

```go
// spins up a real postgres test DB, inserts a class, asserts it exists
func TestCreateClass_Integration(t *testing.T) { ... }
```

#### 3. Middleware Tests

Test your JWT auth proxy once added in Phase 1.

```go
// assert that a request without a Bearer token gets 401
{"no token", "", 401},
{"expired token", "Bearer expired.token.here", 401},
```

---

### Frontend (Next.js / TypeScript)

#### 4. Unit Tests (Vitest)

Test individual functions like Zod schemas or store actions.

```typescript
// schemas.test.ts
it('rejects grade over 12', () => {
    const result = classSchema.safeParse({ grade: 13, ... })
    expect(result.success).toBe(false)
})
```

#### 5. Component Tests (React Testing Library)

Render a component and assert what the user sees.

```typescript
// class-card.test.tsx
it('displays subject name', () => {
    render(<ClassCard name="Math" grade={5} teacher="Mr. Baker" />)
    expect(screen.getByText('Math')).toBeInTheDocument()
})
```

#### 6. End-to-End Tests (Playwright or Cypress)

Simulates a real user clicking through the browser.

```typescript
// auth.spec.ts
test('user can log in and see dashboard', async ({ page }) => {
    await page.goto('/auth')
    await page.fill('[name=email]', 'test@test.com')
    await page.fill('[name=password]', 'password')
    await page.click('button[type=submit]')
    await expect(page).toHaveURL('/dashboard')
})
```

---

## Recommended Order

| Phase             | Test Type                      | Priority |
|-------------------|--------------------------------|----------|
| Phase 0 (now)     | Validation unit tests (Go)     | ✅ Done   |
| Phase 1 (auth)    | Middleware / JWT tests (Go)    | 🔜 Next  |
| Phase 1 (auth)    | Zod schema tests (Vitest)      | 🔜 Next  |
| Phase 2 (classes) | Integration tests with test DB | Later    |
| Phase 3+          | Component + E2E tests          | Later    |

---

## Integration Test Options

### Option 1 — Real Test Database

Spin up a separate Postgres DB just for tests. Add a test database URL to `.env`:

```env
TEST_DATABASE_URL=postgres://postgres:password@localhost:5432/postgres_test?sslmode=disable
```

**Pros:** Tests real SQL queries, catches migration issues
**Cons:** Requires a running Postgres, slower, needs cleanup between tests

---

### Option 2 — Docker Test Container (Recommended)

Spin up a fresh Postgres container automatically per test run using `testcontainers-go`.

**Pros:** No manual DB setup, fully isolated, CI-friendly
**Cons:** More setup work, slower startup

> See full setup steps below.

---

### Option 3 — Mock the DB Interface

Generate a mock of the `database.Queries` interface instead of using a real DB.

```go
type MockDB struct{}

func (m *MockDB) CreateClass(ctx context.Context, arg database.CreateClassParams) (database.Class, error) {
    return database.Class{Subject: arg.Subject, Grade: arg.Grade}, nil
}
```

**Pros:** Fast, no DB required, fully controls return values
**Cons:** Doesn't test actual SQL — only tests that your handler uses the DB correctly

---

## Option 2 Full Setup — Docker Test Container

> **Note:** This is a Phase 2+ task. Phase 0 exit criteria is already met with the current validation tests. Come back
> to this once your class and user endpoints are stable.

### Prerequisites

Docker must be running on your machine.

```zsh
# verify Docker is running
docker --version
docker ps
```

---

### Step 1 — Install Dependencies

Run inside the `backend/` folder:

```zsh
cd backend
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
go get github.com/pressly/goose/v3
```

---

### Step 2 — Create Test Helper File

Create `backend/tests/testhelper_test.go`:

```go
package tests

import (
    "context"
    "database/sql"
    "path/filepath"
    "runtime"
    "testing"
    "time"

    _ "github.com/lib/pq"
    "github.com/pressly/goose/v3"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
    "github.com/testcontainers/testcontainers-go/wait"
)

// setupTestDB spins up a fresh Postgres container, runs all migrations,
// and returns a *sql.DB connected to it. Automatically cleaned up after test.
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()
    ctx := context.Background()

    // 1. Start a Postgres container
    pgContainer, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:latest"),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("postgres"),
        postgres.WithPassword("password"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").
                WithOccurrence(2).
                WithStartupTimeout(30*time.Second),
        ),
    )
    if err != nil {
        t.Fatalf("failed to start container: %v", err)
    }

    // 2. Automatically stop and remove the container when the test finishes
    t.Cleanup(func() {
        if err := pgContainer.Terminate(ctx); err != nil {
            t.Logf("failed to terminate container: %v", err)
        }
    })

    // 3. Get the connection string
    connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    if err != nil {
        t.Fatalf("failed to get connection string: %v", err)
    }

    // 4. Open the DB connection
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        t.Fatalf("failed to open DB: %v", err)
    }

    // 5. Run goose migrations so the schema is ready
    runMigrations(t, db)

    return db
}

func runMigrations(t *testing.T, db *sql.DB) {
    t.Helper()

    // navigate to the schema folder relative to the test file
    _, filename, _, _ := runtime.Caller(0)
    schemaPath := filepath.Join(filepath.Dir(filename), "../sql/schema")

    if err := goose.SetDialect("postgres"); err != nil {
        t.Fatalf("goose dialect error: %v", err)
    }

    if err := goose.Up(db, schemaPath); err != nil {
        t.Fatalf("goose migration failed: %v", err)
    }
}
```

---

### Step 3 — Write the Integration Test

Create `backend/tests/integration_test.go`:

```go
package tests

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/BigBabyofTel/lum-lms/internal/database"
    "github.com/BigBabyofTel/lum-lms/internal/handlers"
    "github.com/BigBabyofTel/lum-lms/internal/routes"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

func TestCreateClass_Integration(t *testing.T) {
    // 1. Spin up real Postgres, run migrations
    db := setupTestDB(t)
    dbQueries := database.New(db)

    // 2. Wire up the full router with a real DB
    gin.SetMode(gin.TestMode)
    h := handlers.New(dbQueries, db)
    router := gin.Default()
    routes.RegisterRoutes(router, h)

    // 3. Seed a teacher user to satisfy the foreign key constraint
    teacherID := uuid.New()
    _, err := db.Exec(`
        INSERT INTO users (id, first_name, last_name, email, password, type, avatar_color, created_at)
        VALUES ($1, 'Test', 'Teacher', 'teacher@test.com', 'hash', 'teacher', 'bg-blue-400', NOW())`,
        teacherID,
    )
    if err != nil {
        t.Fatalf("failed to seed teacher: %v", err)
    }

    // 4. Send a valid POST request
    body := fmt.Sprintf(`{"subject":"Math","grade":5,"teacher_id":"%s"}`, teacherID)
    req := httptest.NewRequest(http.MethodPost, "/api/v1/classes", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    router.ServeHTTP(w, req)

    // 5. Assert 200
    if w.Code != http.StatusOK {
        t.Errorf("got %d, want 200 — body: %s", w.Code, w.Body.String())
    }

    // 6. Log the response
    var resp map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &resp)
    t.Logf("response: %+v", resp)
}
```

---

### Step 4 — Run the Integration Test

```zsh
cd backend
go test ./tests/... -v -run TestCreateClass_Integration
```

---

### What Happens When You Run It

```
Pulling image postgres:latest       ← Docker pulls the image (first run only)
Starting container...               ← Postgres boots in Docker
Running goose migrations...         ← Your schema is applied
=== RUN TestCreateClass_Integration
POST /api/v1/classes → 200 OK
--- PASS
Stopping container...               ← Container is destroyed after test
```

---

### Files Added

| File                                | Purpose                            |
|-------------------------------------|------------------------------------|
| `backend/tests/testhelper_test.go`  | Container setup + migration runner |
| `backend/tests/integration_test.go` | The actual integration test        |
| `backend/go.mod`                    | Updated automatically by `go get`  |

---

## Current Test File Reference

`backend/tests/handlers_test.go` — Phase 0 validation tests (no DB required):

```go
func TestCreateClass(t *testing.T) {
    gin.SetMode(gin.TestMode)
    h := handlers.New(nil, nil)  // nil DB — validation only
    router := gin.Default()
    routes.RegisterRoutes(router, h)

    tests := []struct {
        name       string
        body       string
        wantStatus int
    }{
        {"missing subject", `{"grade":5,"teacher_id":"9518dd4e-49f6-4c4e-984f-24c0ab9f77ba"}`, 400},
        {"invalid uuid", `{}`, 400},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(http.MethodPost, "/api/v1/classes", strings.NewReader(tt.body))
            req.Header.Set("Content-Type", "application/json")
            w := httptest.NewRecorder()
            router.ServeHTTP(w, req)
            if w.Code != tt.wantStatus {
                t.Errorf("got status %d, want %d — body: %s", w.Code, tt.wantStatus, w.Body.String())
            }
        })
    }
}
```

