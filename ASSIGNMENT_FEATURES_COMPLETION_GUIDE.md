# Assignment Features Completion Guide

> **Model:** `PHASE_2_CLASSES_AND_ASSIGNMENTS.md`  
> **Current route prefix:** `/api/v1`  
> **Current status:** class CRUD and enrollment are mostly in place; assignment tables exist, but assignment API routes, handlers, sqlc queries, submissions, grading, and real classwork UI are not complete.

---

## Goal

Complete the assignment workflow for Luminescence:

1. Teachers can create assignments and materials for classes they own.
2. Students can see assignments for classes they are enrolled in.
3. Creating an assignment creates `user_assignments` rows for enrolled students.
4. Students can submit text work.
5. Teachers can view submissions and grade work.
6. Classwork and assignment pages stop using mock data.

This guide assumes the existing class/enrollment foundation stays in place:

- `Handler` has `DB *database.Queries` and `DBconn *sql.DB`.
- Protected routes use `middleware.AuthMiddleware(os.Getenv("JWT_SECRET"))`.
- Class access must be enforced by teacher ownership or student enrollment.
- Frontend client API calls should use `frontend/lib/api-client.ts`, which uses `apiFetch()`.
- `frontend/lib/actions.ts` should remain a server-action file for form submissions, cookie work, and redirects.

---

## Table of Contents

1. [Current Codebase Baseline](#current-codebase-baseline)
2. [Implementation Order](#implementation-order)
3. [Schema Changes Required](#schema-changes-required)
4. [sqlc Query Plan](#sqlc-query-plan)
5. [API Endpoint Reference](#api-endpoint-reference)
6. [Backend Handler Details](#backend-handler-details)
7. [Frontend Implementation Details](#frontend-implementation-details)
8. [Testing Plan](#testing-plan)
9. [Deliverables and Exit Criteria](#deliverables-and-exit-criteria)
10. [Recommended File Checklist](#recommended-file-checklist)

---

## Current Codebase Baseline

Already present:

- `assignments`, `topics`, and `user_assignments` tables exist in `backend/sql/schema/0004_materials_assignments.sql`.
- `content_type` enum supports `assignment` and `material`.
- `assignment_status` enum supports `assigned`, `submitted`, `graded`, and `missing`.
- `class_enrollments` exists and supports class rosters.
- `GetEnrolledStudentIDs` exists and can be used to create per-student assignment rows.
- `Handler.DBconn` exists, so assignment creation can use transactions.

Missing or incomplete:

- `backend/sql/queries/0004_materials_assignments.sql` is not implemented.
- No assignment handlers exist.
- No assignment routes are registered.
- `classwork/page.tsx` still uses mock `topics`.
- No assignment detail route exists.
- `user_assignments` lacks submission and feedback fields.
- There is no gradebook endpoint.

---

## Implementation Order

### Step 1 - Harden Assignment Schema

Add a new migration instead of editing the existing migration if the database may already have been applied.

Recommended new migration:

```txt
backend/sql/schema/0006_assignment_completion.sql
```

Add submission and grading columns:

```sql
-- +goose Up

ALTER TABLE user_assignments
    ADD COLUMN submission_text text,
    ADD COLUMN submitted_at timestamptz,
    ADD COLUMN feedback text,
    ADD COLUMN graded_by uuid REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN graded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments (class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments (due_date);
CREATE INDEX IF NOT EXISTS idx_user_assignments_assignment_id ON user_assignments (assignment_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_student_id ON user_assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_status ON user_assignments (status);

-- Optional, only if no existing NULL class_id rows exist:
-- ALTER TABLE assignments ALTER COLUMN class_id SET NOT NULL;

-- +goose Down

DROP INDEX IF EXISTS idx_user_assignments_status;
DROP INDEX IF EXISTS idx_user_assignments_student_id;
DROP INDEX IF EXISTS idx_user_assignments_assignment_id;
DROP INDEX IF EXISTS idx_assignments_due_date;
DROP INDEX IF EXISTS idx_assignments_class_id;

ALTER TABLE user_assignments
    DROP COLUMN IF EXISTS graded_at,
    DROP COLUMN IF EXISTS graded_by,
    DROP COLUMN IF EXISTS feedback,
    DROP COLUMN IF EXISTS submitted_at,
    DROP COLUMN IF EXISTS submission_text;
```

Topic cleanup is optional for the first pass. The current `topics` table links one topic to one assignment through `topics.assignment_id`, which is awkward for a classwork page. The cleaner long-term model is:

```sql
ALTER TABLE topics ADD COLUMN class_id uuid REFERENCES classes (id) ON DELETE CASCADE;
ALTER TABLE assignments ADD COLUMN topic_id uuid REFERENCES topics (id) ON DELETE SET NULL;
```

For the MVP assignment flow, you can ship without topics and group classwork into `Assignments` and `Materials`.

---

### Step 2 - Add sqlc Assignment Queries

Complete:

```txt
backend/sql/queries/0004_materials_assignments.sql
```

Then run:

```bash
cd backend
sqlc generate
```

The generated methods should live under `backend/internal/database`.

---

### Step 3 - Add Backend Handlers

Recommended new file:

```txt
backend/internal/handlers/assignment_handlers.go
```

Keep assignment logic separate from `class_handlers.go`, but reuse existing patterns:

- parse UUIDs with `uuid.Parse`
- get current user ID with `c.MustGet("userID").(uuid.UUID)`
- fetch current user with `h.DB.GetUserByID`
- return sanitized users with `auth.SanitizeUser`
- use `h.DBconn.BeginTx` and `h.DB.WithTx(tx)` for assignment creation

---

### Step 4 - Register Assignment Routes

Recommended new route file:

```txt
backend/internal/routes/assignment_routes.go
```

Register it from `RegisterRoutes()` next to class and auth routes:

```go
func RegisterRoutes(router *gin.Engine, h *handlers.Handler) {
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "this link is working"})
    })

    v1 := router.Group("/api/v1")
    {
        RegisterClassRoutes(v1, h)
        RegisterAssignmentRoutes(v1, h)
        RegisterAuthRoutes(v1, h)
    }
}
```

Route file shape:

```go
package routes

import (
    "os"

    "github.com/BigBabyofTel/lum-lms/internal/handlers"
    "github.com/BigBabyofTel/lum-lms/internal/middleware"
    "github.com/gin-gonic/gin"
)

func RegisterAssignmentRoutes(router *gin.RouterGroup, h *handlers.Handler) {
    protected := router.Group("").Use(middleware.AuthMiddleware(os.Getenv("JWT_SECRET")))
    {
        protected.POST("/classes/:classId/assignments", h.CreateAssignment)
        protected.GET("/classes/:classId/assignments", h.GetClassAssignments)

        protected.GET("/assignments/:assignmentId", h.GetAssignment)
        protected.PUT("/assignments/:assignmentId", h.UpdateAssignment)
        protected.DELETE("/assignments/:assignmentId", h.DeleteAssignment)

        protected.POST("/assignments/:assignmentId/submit", h.SubmitAssignment)
        protected.GET("/assignments/:assignmentId/submissions", h.GetAssignmentSubmissions)
        protected.PATCH("/user-assignments/:userAssignmentId/grade", h.GradeUserAssignment)

        protected.GET("/classes/:classId/gradebook", h.GetClassGradebook)
    }
}
```

---

### Step 5 - Wire Frontend API Helpers

Add assignment helpers to:

```txt
frontend/lib/api-client.ts
```

Do not import these from `actions.ts`.

---

### Step 6 - Replace Mock UI

Replace mock data in:

```txt
frontend/app/dashboard/class/[id]/classwork/page.tsx
```

Add:

```txt
frontend/app/dashboard/class/[id]/assignment/[assignmentId]/page.tsx
```

Teacher creation modal can live at:

```txt
frontend/components/modals/assignment-form-modal.tsx
```

---

## Schema Changes Required

| Area | Current State | Required For Completion |
|---|---|---|
| `assignments` | Exists | Use for assignment/material CRUD |
| `topics` | Exists but relationship is awkward | Optional for MVP; improve later with `class_id` and `topic_id` |
| `user_assignments` | Exists with `grade` and `status` | Add `submission_text`, `submitted_at`, `feedback`, `graded_by`, `graded_at` |
| indexes | Missing for assignment flows | Add class, student, assignment, status indexes |

Do not store student submissions in a separate table for this MVP unless file uploads are added. The existing `user_assignments` table is enough for text submissions and grading.

---

## sqlc Query Plan

Add these queries to `backend/sql/queries/0004_materials_assignments.sql`.

### Assignment CRUD

```sql
-- name: CreateAssignment :one
INSERT INTO assignments (
    id,
    type,
    title,
    class_id,
    details,
    assign_date,
    due_date,
    attachment_count,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    sqlc.arg(type),
    sqlc.arg(title),
    sqlc.arg(class_id),
    sqlc.arg(details),
    NOW(),
    sqlc.arg(due_date),
    COALESCE(sqlc.arg(attachment_count), 0),
    NOW(),
    NOW()
)
RETURNING *;

-- name: GetClassAssignments :many
SELECT *
FROM assignments
WHERE class_id = sqlc.arg(class_id)
ORDER BY COALESCE(due_date, assign_date, created_at) DESC;

-- name: GetAssignmentByID :one
SELECT *
FROM assignments
WHERE id = sqlc.arg(id)
LIMIT 1;

-- name: UpdateAssignment :one
UPDATE assignments
SET type = sqlc.arg(type),
    title = sqlc.arg(title),
    details = sqlc.arg(details),
    due_date = sqlc.arg(due_date),
    attachment_count = COALESCE(sqlc.arg(attachment_count), attachment_count),
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteAssignment :exec
DELETE
FROM assignments
WHERE id = sqlc.arg(id);
```

### Per-Student Assignment Rows

Prefer a single `INSERT ... SELECT` query instead of looping student IDs one by one:

```sql
-- name: CreateUserAssignmentsForClass :exec
INSERT INTO user_assignments (
    id,
    assignment_id,
    student_id,
    status,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    sqlc.arg(assignment_id),
    e.student_id,
    'assigned',
    NOW(),
    NOW()
FROM class_enrollments e
WHERE e.class_id = sqlc.arg(class_id)
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- name: GetStudentUserAssignment :one
SELECT *
FROM user_assignments
WHERE assignment_id = sqlc.arg(assignment_id)
  AND student_id = sqlc.arg(student_id)
LIMIT 1;
```

### Submissions and Grading

```sql
-- name: SubmitAssignment :one
UPDATE user_assignments
SET submission_text = sqlc.arg(submission_text),
    submitted_at = NOW(),
    status = 'submitted',
    updated_at = NOW()
WHERE assignment_id = sqlc.arg(assignment_id)
  AND student_id = sqlc.arg(student_id)
  AND status <> 'graded'
RETURNING *;

-- name: GetAssignmentSubmissions :many
SELECT
    ua.id,
    ua.assignment_id,
    ua.student_id,
    ua.grade,
    ua.status,
    ua.submission_text,
    ua.submitted_at,
    ua.feedback,
    ua.graded_by,
    ua.graded_at,
    ua.created_at,
    ua.updated_at,
    u.first_name,
    u.last_name,
    u.email,
    u.grade AS student_grade
FROM user_assignments ua
JOIN users u ON u.id = ua.student_id
WHERE ua.assignment_id = sqlc.arg(assignment_id)
ORDER BY u.last_name, u.first_name;

-- name: GradeUserAssignment :one
UPDATE user_assignments
SET grade = sqlc.arg(grade),
    feedback = sqlc.arg(feedback),
    graded_by = sqlc.arg(graded_by),
    graded_at = NOW(),
    status = 'graded',
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: GetUserAssignmentByID :one
SELECT *
FROM user_assignments
WHERE id = sqlc.arg(id)
LIMIT 1;
```

### Missing Status and Gradebook

```sql
-- name: MarkMissingAssignments :exec
UPDATE user_assignments ua
SET status = 'missing',
    updated_at = NOW()
FROM assignments a
WHERE ua.assignment_id = a.id
  AND ua.status = 'assigned'
  AND a.type = 'assignment'
  AND a.due_date IS NOT NULL
  AND a.due_date < NOW();

-- name: GetClassGradebook :many
SELECT
    a.id AS assignment_id,
    a.title,
    a.due_date,
    ua.id AS user_assignment_id,
    ua.student_id,
    ua.grade,
    ua.status,
    ua.feedback,
    ua.submitted_at,
    u.first_name,
    u.last_name,
    u.email
FROM assignments a
JOIN user_assignments ua ON ua.assignment_id = a.id
JOIN users u ON u.id = ua.student_id
WHERE a.class_id = sqlc.arg(class_id)
  AND a.type = 'assignment'
ORDER BY a.due_date NULLS LAST, a.created_at, u.last_name, u.first_name;
```

---

## API Endpoint Reference

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/classes/:classId/assignments` | Teacher owner | Create assignment or material |
| `GET` | `/api/v1/classes/:classId/assignments` | Teacher owner, enrolled student | List class assignments/materials |
| `GET` | `/api/v1/assignments/:assignmentId` | Teacher owner, enrolled student | Get assignment detail |
| `PUT` | `/api/v1/assignments/:assignmentId` | Teacher owner | Update assignment/material |
| `DELETE` | `/api/v1/assignments/:assignmentId` | Teacher owner | Delete assignment/material |
| `POST` | `/api/v1/assignments/:assignmentId/submit` | Enrolled student | Submit text work |
| `GET` | `/api/v1/assignments/:assignmentId/submissions` | Teacher owner | List submissions |
| `PATCH` | `/api/v1/user-assignments/:userAssignmentId/grade` | Teacher owner | Grade one student assignment |
| `GET` | `/api/v1/classes/:classId/gradebook` | Teacher owner | Return class gradebook matrix rows |

Response shapes should be wrapped consistently:

```json
{ "assignment": {} }
{ "assignments": [] }
{ "submission": {} }
{ "submissions": [] }
{ "gradebook": [] }
```

---

## Backend Handler Details

### Shared Access Helpers

Add helper functions in `assignment_handlers.go` or near the existing class helper.

Recommended helper responsibilities:

- `getCurrentUser(c)` returns `database.User`.
- `requireClassAccess(c, classID)` allows teacher owner or enrolled student.
- `requireTeacherOwnedAssignment(c, assignmentID)` fetches assignment, fetches class, verifies teacher owns class.
- `requireAssignmentAccess(c, assignmentID)` allows teacher owner or enrolled student.

Keep all class/assignment access checks server-side. UI checks are not enough.

---

### `CreateAssignment`

Route:

```txt
POST /api/v1/classes/:classId/assignments
```

Rules:

- teacher only
- teacher must own class
- request `type` must be `assignment` or `material`
- `title` is required
- `due_date` is optional, but only meaningful for `assignment`
- creating `assignment` creates `user_assignments` rows for enrolled students
- creating `material` should not create `user_assignments` rows
- assignment creation and user row creation must be in one transaction

Request shape:

```json
{
  "type": "assignment",
  "title": "Chapter 4 Questions",
  "details": "Answer questions 1 through 10.",
  "due_date": "2026-06-20T23:59:00Z",
  "attachment_count": 0
}
```

Handler outline:

```go
func (h *Handler) CreateAssignment(c *gin.Context) {
    _, classID, ok := h.requireTeacherOwnedClass(c)
    if !ok {
        return
    }

    var params struct {
        Type            string `json:"type" binding:"required,oneof=assignment material"`
        Title           string `json:"title" binding:"required"`
        Details         string `json:"details"`
        DueDate         string `json:"due_date"`
        AttachmentCount int32  `json:"attachment_count"`
    }
    if err := c.ShouldBindJSON(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    var dueDate sql.NullTime
    if params.DueDate != "" {
        parsed, err := time.Parse(time.RFC3339, params.DueDate)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date"})
            return
        }
        dueDate = sql.NullTime{Time: parsed, Valid: true}
    }

    tx, err := h.DBconn.BeginTx(c, nil)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not start transaction"})
        return
    }
    defer tx.Rollback()

    qtx := h.DB.WithTx(tx)

    assignment, err := qtx.CreateAssignment(c, database.CreateAssignmentParams{
        Type:            database.ContentType(params.Type),
        Title:           params.Title,
        ClassID:         uuid.NullUUID{UUID: classID, Valid: true},
        Details:         sql.NullString{String: params.Details, Valid: params.Details != ""},
        DueDate:         dueDate,
        AttachmentCount: sql.NullInt32{Int32: params.AttachmentCount, Valid: true},
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create assignment"})
        return
    }

    if assignment.Type == database.ContentTypeAssignment {
        err = qtx.CreateUserAssignmentsForClass(c, database.CreateUserAssignmentsForClassParams{
            AssignmentID: assignment.ID,
            ClassID:      classID,
        })
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not assign students"})
            return
        }
    }

    if err := tx.Commit(); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save assignment"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{"assignment": assignment})
}
```

---

### `GetClassAssignments`

Route:

```txt
GET /api/v1/classes/:classId/assignments
```

Rules:

- teacher owner can list
- enrolled student can list
- unenrolled student cannot list
- parent access is future work

Student response should eventually include that student's `user_assignments.status`, but the first pass can return only assignments if classwork is read-only.

Recommended response:

```json
{
  "assignments": []
}
```

---

### `GetAssignment`

Route:

```txt
GET /api/v1/assignments/:assignmentId
```

Rules:

- teacher owner can view
- enrolled student can view
- if student is viewing an assignment, include that student's `user_assignment`

Recommended response:

```json
{
  "assignment": {},
  "user_assignment": null
}
```

For teachers, `user_assignment` can be `null`.

---

### `UpdateAssignment`

Route:

```txt
PUT /api/v1/assignments/:assignmentId
```

Rules:

- teacher owner only
- validate title, type, and due date
- do not let a teacher move an assignment into another teacher's class
- if type changes from `material` to `assignment`, create missing `user_assignments` rows
- if type changes from `assignment` to `material`, decide whether to delete user rows or keep them hidden. Prefer keeping them for audit safety and hiding them in UI.

---

### `DeleteAssignment`

Route:

```txt
DELETE /api/v1/assignments/:assignmentId
```

Rules:

- teacher owner only
- database cascade deletes `user_assignments`
- return `{ "message": "assignment deleted" }`

---

### `SubmitAssignment`

Route:

```txt
POST /api/v1/assignments/:assignmentId/submit
```

Rules:

- student only
- student must be enrolled in assignment class
- materials cannot be submitted
- reject empty submission text
- reject updates after status is `graded`
- status becomes `submitted`

Request:

```json
{
  "submission_text": "My completed response."
}
```

Response:

```json
{
  "submission": {}
}
```

---

### `GetAssignmentSubmissions`

Route:

```txt
GET /api/v1/assignments/:assignmentId/submissions
```

Rules:

- teacher owner only
- return one row per enrolled student assignment
- include sanitized student display fields
- do not include user password hashes

Response:

```json
{
  "submissions": [
    {
      "user_assignment_id": "...",
      "student_id": "...",
      "first_name": "Ada",
      "last_name": "Lovelace",
      "email": "ada@example.com",
      "status": "submitted",
      "submission_text": "Work...",
      "grade": null,
      "feedback": null,
      "submitted_at": "2026-06-20T20:00:00Z"
    }
  ]
}
```

---

### `GradeUserAssignment`

Route:

```txt
PATCH /api/v1/user-assignments/:userAssignmentId/grade
```

Rules:

- teacher only
- teacher must own the class that owns the assignment
- grade must be between `0` and `100`
- feedback should have a length limit
- status becomes `graded`

Request:

```json
{
  "grade": 92,
  "feedback": "Strong work. Review question 4."
}
```

Response:

```json
{
  "user_assignment": {}
}
```

---

### `GetClassGradebook`

Route:

```txt
GET /api/v1/classes/:classId/gradebook
```

Rules:

- teacher owner only for MVP
- return enough rows for a student x assignment table
- only include `type = assignment`, not materials

Response:

```json
{
  "gradebook": []
}
```

---

## Frontend Implementation Details

### Types

Update `frontend/lib/types.ts` to match backend JSON. Prefer snake_case if you render direct API responses:

```ts
export interface Assignment {
  id: string;
  type: 'assignment' | 'material';
  title: string;
  class_id: string;
  details?: string | null;
  assign_date?: string | null;
  due_date?: string | null;
  attachment_count?: number | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface UserAssignment {
  id: string;
  assignment_id: string;
  student_id: string;
  grade?: number | null;
  status: 'assigned' | 'submitted' | 'graded' | 'missing';
  submission_text?: string | null;
  submitted_at?: string | null;
  feedback?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
}
```

If you prefer camelCase on the frontend, add explicit mapper functions in `api-client.ts` instead of mixing both styles in components.

---

### API Client Helpers

Add to `frontend/lib/api-client.ts`:

```ts
export async function getClassAssignments(classId: string): Promise<Assignment[]> {
  const data = await apiFetch<{ assignments: Assignment[] }>(
    `/api/v1/classes/${classId}/assignments`
  );
  return Array.isArray(data.assignments) ? data.assignments : [];
}

export async function createAssignment(
  classId: string,
  payload: CreateAssignmentPayload
): Promise<Assignment> {
  const data = await apiFetch<{ assignment: Assignment }>(
    `/api/v1/classes/${classId}/assignments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return data.assignment;
}

export async function getAssignment(assignmentId: string) {
  return apiFetch<{
    assignment: Assignment;
    user_assignment: UserAssignment | null;
  }>(`/api/v1/assignments/${assignmentId}`);
}

export async function submitAssignment(
  assignmentId: string,
  submissionText: string
): Promise<UserAssignment> {
  const data = await apiFetch<{ submission: UserAssignment }>(
    `/api/v1/assignments/${assignmentId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ submission_text: submissionText }),
    }
  );
  return data.submission;
}

export async function getAssignmentSubmissions(assignmentId: string) {
  const data = await apiFetch<{ submissions: AssignmentSubmission[] }>(
    `/api/v1/assignments/${assignmentId}/submissions`
  );
  return Array.isArray(data.submissions) ? data.submissions : [];
}

export async function gradeUserAssignment(
  userAssignmentId: string,
  payload: { grade: number; feedback?: string }
): Promise<UserAssignment> {
  const data = await apiFetch<{ user_assignment: UserAssignment }>(
    `/api/v1/user-assignments/${userAssignmentId}/grade`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  return data.user_assignment;
}
```

---

### Classwork Page

Replace mock `topics` in:

```txt
frontend/app/dashboard/class/[id]/classwork/page.tsx
```

Use:

```ts
const { classInfo } = useClassInfo();
const role = useUserStore((state) => state.type);
const [assignments, setAssignments] = useState<Assignment[]>([]);
```

Fetch:

```ts
useEffect(() => {
  if (!classInfo) return;

  let cancelled = false;

  async function loadAssignments() {
    const data = await getClassAssignments(classInfo.id);
    if (!cancelled) {
      setAssignments(data);
    }
  }

  void loadAssignments();

  return () => {
    cancelled = true;
  };
}, [classInfo]);
```

Render:

- loading state
- empty state
- error state
- assignment cards
- material cards
- teacher-only create button

Do not show teacher create controls to students.

---

### Assignment Form Modal

Recommended fields:

- type segmented control: `Assignment` or `Material`
- title
- details
- due date for assignments
- attachment count hidden or read-only until uploads exist

Validation:

- title required
- type required
- due date optional
- material can omit due date

On success:

- close modal
- refresh assignment list
- show created item in Classwork

---

### Assignment Detail Page

Add:

```txt
frontend/app/dashboard/class/[id]/assignment/[assignmentId]/page.tsx
```

Teacher view:

- assignment title/details/due date
- submissions list
- status badges
- grading controls

Student view:

- assignment title/details/due date
- current status
- text submission form
- submitted/graded display
- grade and feedback after grading

---

### Gradebook View

This can be basic for MVP:

```txt
frontend/app/dashboard/class/[id]/gradebook/page.tsx
```

Or defer the page and only implement the backend endpoint first. If adding a page, render a dense table:

- rows: students
- columns: assignments
- cells: grade/status

---

## Testing Plan

### Backend Handler Tests

Continue the current `sqlmock` pattern in `backend/tests/handlers_test.go`.

Add tests for:

- unauthenticated users cannot hit assignment routes
- student cannot create assignment
- teacher can create assignment in owned class
- teacher cannot create assignment in another teacher's class
- assignment creation creates user assignment rows for enrolled students
- material creation does not create user assignment rows
- enrolled student can list class assignments
- unenrolled student cannot list class assignments
- teacher can update/delete own assignment
- teacher cannot update/delete another teacher's assignment
- student can submit own assignment
- student cannot submit material
- student cannot submit assignment for unenrolled class
- teacher can list submissions for own assignment
- teacher cannot list submissions for another teacher's assignment
- teacher can grade own assignment submission
- grade validation rejects values outside `0..100`

Run:

```bash
cd backend
go test ./...
```

### Frontend Checks

Run:

```bash
cd frontend
bun run lint
```

Manual browser QA:

1. Login as teacher.
2. Create class.
3. Create students.
4. Enroll students.
5. Create assignment.
6. Verify Classwork shows assignment.
7. Login as student.
8. Verify class and assignment appear.
9. Submit work.
10. Login as teacher.
11. Grade submitted work.
12. Login as student.
13. Verify grade and feedback appear.

---

## Deliverables and Exit Criteria

Assignment features are complete when all of the following are true:

- [ ] New migration adds submission and grading fields to `user_assignments`.
- [ ] Assignment sqlc queries exist and `sqlc generate` succeeds.
- [ ] Assignment routes are registered under `/api/v1`.
- [ ] `CreateAssignment` creates assignments and materials.
- [ ] Assignment creation uses a transaction.
- [ ] Assignment creation creates `user_assignments` rows for enrolled students.
- [ ] Materials do not create `user_assignments` rows.
- [ ] Class assignment listing enforces teacher ownership or student enrollment.
- [ ] Assignment detail enforces teacher ownership or student enrollment.
- [ ] Student submission endpoint works and prevents submitting graded work.
- [ ] Teacher submissions endpoint returns sanitized student data.
- [ ] Teacher grading endpoint validates ownership and grade range.
- [ ] Gradebook endpoint returns class assignment status/grade rows.
- [ ] Classwork page uses real API data, not mock `topics`.
- [ ] Assignment detail page exists.
- [ ] Teacher can create assignments from the UI.
- [ ] Student can submit text from the UI.
- [ ] Teacher can grade from the UI.
- [ ] Student can see grade and feedback.
- [ ] `go test ./...` passes.
- [ ] `bun run lint` passes.

---

## Recommended File Checklist

Backend:

- [ ] `backend/sql/schema/0006_assignment_completion.sql`
- [ ] `backend/sql/queries/0004_materials_assignments.sql`
- [ ] `backend/internal/database/*.go` regenerated by `sqlc generate`
- [ ] `backend/internal/handlers/assignment_handlers.go`
- [ ] `backend/internal/routes/assignment_routes.go`
- [ ] `backend/internal/routes/router.go`
- [ ] `backend/tests/handlers_test.go`

Frontend:

- [ ] `frontend/lib/types.ts`
- [ ] `frontend/lib/api-client.ts`
- [ ] `frontend/lib/schemas.ts`
- [ ] `frontend/app/dashboard/class/[id]/classwork/page.tsx`
- [ ] `frontend/app/dashboard/class/[id]/assignment/[assignmentId]/page.tsx`
- [ ] `frontend/components/modals/assignment-form-modal.tsx`
- [ ] optional `frontend/app/dashboard/class/[id]/gradebook/page.tsx`

---

## Notes

- Use `/api/v1`, not `/v1/api`.
- Keep `actions.ts` as a server-action module.
- Use `api-client.ts` for client-side dashboard API calls.
- Keep API response shapes wrapped and consistent.
- Sanitize users before returning them.
- Put authorization in handlers, not only in the UI.
- Do not start parent portal or stream work until assignment/submission/grading is usable.

---

*Assignment Features Completion Guide - Luminescence LMS MVP*
