# Phase 2 — Class & Assignment Management (Weeks 5–6)

> **Part of:** [LMS MVP Pacing Guide](../LMS_MVP_PACING_GUIDE.md)  
> **Dates:** Mar 30 – Apr 10, 2026  
> **Estimated hours:** 40–60 hrs (4–6 hrs/day × 10 days)  
> **Depends on:** [Phase 1](./PHASE_1_AUTHENTICATION.md) — JWT auth proxy in place, `AuthMiddleware` applied to
`/v1/api/...`

---

## Goal

Teachers can create classes, enroll students, and post assignments. Students can view their enrolled classes and see
classwork organized by type. Both roles see only the data they are authorized to see — enforced at the API layer, not
just the UI.

This phase covers the two most-used teacher workflows in any LMS: **class setup** and **assignment posting**. Getting
these right — with proper role scoping, enrollment tracking, and automatic status management — makes everything in
Phases 3 and 4 straightforward.

---

## Table of Contents

1. [Week 5 — Class Management](#week-5--class-management)
2. [Week 6 — Assignment Management](#week-6--assignment-management)
3. [Schema Changes Required](#schema-changes-required)
4. [API Endpoint Reference](#api-endpoint-reference)
5. [Where Luminescence Improves on Existing Platforms](#where-luminescence-improves-on-existing-platforms)
6. [Deliverables & Exit Criteria](#deliverables--exit-criteria)
7. [References](#references)

---

## Week 5 — Class Management

### Day-by-Day Breakdown

#### Monday — Class Enrollment Table

The current schema has no way to track which students are in which class. Add this now — every subsequent feature
(assignments, submissions, gradebook) depends on it.

```sql
-- 0005_class_enrollments.sql
-- +goose Up
CREATE TABLE class_enrollments
(
    id          uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    class_id    uuid        NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    student_id  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id) -- prevent duplicate enrollment
);

CREATE INDEX idx_enrollments_class_id ON class_enrollments (class_id);
CREATE INDEX idx_enrollments_student_id ON class_enrollments (student_id);

-- +goose Down
DROP TABLE IF EXISTS class_enrollments;
```

**sqlc queries:**

```sql
-- sql/queries/enrollments.sql

-- name: EnrollStudent :one
INSERT INTO class_enrollments (id, class_id, student_id, enrolled_at)
VALUES (gen_random_uuid(), sqlc.arg(class_id), sqlc.arg(student_id), NOW())
ON CONFLICT (class_id, student_id) DO NOTHING
RETURNING *;

-- name: UnenrollStudent :exec
DELETE
FROM class_enrollments
WHERE class_id = sqlc.arg(class_id)
  AND student_id = sqlc.arg(student_id);

-- name: GetStudentClasses :many
SELECT c.*
FROM classes c
         JOIN class_enrollments e ON e.class_id = c.id
WHERE e.student_id = sqlc.arg(student_id);

-- name: GetClassStudents :many
SELECT u.*
FROM users u
         JOIN class_enrollments e ON e.student_id = u.id
WHERE e.class_id = sqlc.arg(class_id);

-- name: GetEnrolledStudentIDs :many
SELECT student_id
FROM class_enrollments
WHERE class_id = sqlc.arg(class_id);

-- name: IsStudentEnrolled :one
SELECT EXISTS (SELECT 1
               FROM class_enrollments
               WHERE class_id = sqlc.arg(class_id)
                 AND student_id = sqlc.arg(student_id)) AS enrolled;
```

---

#### Tuesday — Role-Scoped Class Listing

Update `GET /v1/api/classes` to return different data depending on the caller's role:

```go
func (cfg *apiConfig) getClasses(c *gin.Context) {
userID := c.MustGet("userID").(uuid.UUID)
userRole := c.MustGet("userRole").(string)

switch userRole {
case "teacher":
// Teachers see only classes they own
classes, err := cfg.DB.GetClasses(c, uuid.NullUUID{UUID: userID, Valid: true})
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"classes": classes})

case "student":
// Students see only classes they are enrolled in
classes, err := cfg.DB.GetStudentClasses(c, userID)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"classes": classes})

default:
c.JSON(http.StatusForbidden, gin.H{"error": "role not permitted"})
}
}
```

> **Remove the `teacherId` query parameter** from the current implementation — it was an unauthenticated shortcut.
> The teacher's ID now comes from the JWT claims, which the backend controls. User-supplied IDs should never be trusted
> for authorization.

---

#### Wednesday — Class Detail Endpoint

```go
// GET /v1/api/classes/:id
func (cfg *apiConfig) getClassByID(c *gin.Context) {
classID, err := uuid.Parse(c.Param("id"))
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
return
}

class, err := cfg.DB.GetClassByID(c, classID)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "class not found"})
return
}

// Verify access: teacher owns it OR student is enrolled
userID := c.MustGet("userID").(uuid.UUID)
userRole := c.MustGet("userRole").(string)

if userRole == "teacher" && class.TeacherID.UUID != userID {
c.JSON(http.StatusForbidden, gin.H{"error": "not your class"})
return
}
if userRole == "student" {
enrolled, _ := cfg.DB.IsStudentEnrolled(c, database.IsStudentEnrolledParams{
ClassID:   classID,
StudentID: userID,
})
if !enrolled {
c.JSON(http.StatusForbidden, gin.H{"error": "not enrolled in this class"})
return
}
}

c.JSON(http.StatusOK, gin.H{"class": class})
}
```

---

#### Thursday — Update & Delete Class

```go
// PUT /v1/api/classes/:id — teacher only, must own the class
func (cfg *apiConfig) updateClass(c *gin.Context) {
classID, err := uuid.Parse(c.Param("id"))
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
return
}
teacherID := c.MustGet("userID").(uuid.UUID)

var params struct {
Subject string `json:"subject" binding:"required"`
Grade   int32  `json:"grade"   binding:"required"`
Color   string `json:"color"`
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

updated, err := cfg.DB.UpdateClass(c, database.UpdateClassParams{
ID:        classID,
TeacherID: uuid.NullUUID{UUID: teacherID, Valid: true},
Subject:   params.Subject,
Grade:     params.Grade,
Color:     params.Color,
})
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "class not found or not authorized"})
return
}
c.JSON(http.StatusOK, gin.H{"class": updated})
}

// DELETE /v1/api/classes/:id — teacher only, must own the class
func (cfg *apiConfig) deleteClass(c *gin.Context) {
classID, _ := uuid.Parse(c.Param("id"))
teacherID := c.MustGet("userID").(uuid.UUID)
cfg.DB.DeleteClass(c, database.DeleteClassParams{
ID:        classID,
TeacherID: uuid.NullUUID{UUID: teacherID, Valid: true},
})
c.JSON(http.StatusOK, gin.H{"message": "class deleted"})
}
```

---

#### Friday — Wire Frontend Class Store to Real API

Update `useClassesStore`:

```typescript
// store/useClassesStore.ts
interface ClassesStore {
    classes: Class[]
    isLoading: boolean
    error: string | null
    fetchClasses: () => Promise<void>
    addClass: (cls: Class) => void
    reset: () => void
}

fetchClasses: async () => {
    set({isLoading: true, error: null})
    try {
        const data = await apiFetch<{ classes: Class[] }>('/v1/api/classes')
        set({classes: data.classes ?? [], isLoading: false})
    } catch (err) {
        set({error: (err as Error).message, isLoading: false})
    }
}
```

Update `dashboard/page.tsx` to call `fetchClasses()` on mount and remove the hardcoded `initialClasses` mock data.

---

## Week 6 — Assignment Management

### Day-by-Day Breakdown

#### Monday — Assignment CRUD Endpoints

```go
// POST /v1/api/classes/:id/assignments
func (cfg *apiConfig) createAssignment(c *gin.Context) {
classID, err := uuid.Parse(c.Param("id"))
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
return
}
teacherID := c.MustGet("userID").(uuid.UUID)

// Verify teacher owns this class
class, err := cfg.DB.GetClassByID(c, classID)
if err != nil || class.TeacherID.UUID != teacherID {
c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this class"})
return
}

var params struct {
Type    string `json:"type"    binding:"required,oneof=assignment material"`
Title   string `json:"title"   binding:"required"`
Details string `json:"details"`
DueDate string `json:"due_date"` // RFC3339 or empty
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

// Parse optional due date
var dueDate sql.NullTime
if params.DueDate != "" {
t, err := time.Parse(time.RFC3339, params.DueDate)
if err == nil {
dueDate = sql.NullTime{Time: t, Valid: true}
}
}

assignment, err := cfg.DB.CreateAssignment(c, database.CreateAssignmentParams{
Type:    database.ContentType(params.Type),
Title:   params.Title,
ClassID: uuid.NullUUID{UUID: classID, Valid: true},
Details: sql.NullString{String: params.Details, Valid: params.Details != ""},
DueDate: dueDate,
})
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusCreated, gin.H{"assignment": assignment})
}
```

---

#### Tuesday — Auto-Create `user_assignments` Rows on Assignment Creation

When an assignment is created, every currently enrolled student needs a `user_assignments` row so their status can be
tracked. This must happen in a **database transaction** — either all rows are created or none are.

```go
// After creating the assignment, inside the same handler:
func (cfg *apiConfig) bulkCreateUserAssignments(
ctx context.Context,
assignmentID, classID uuid.UUID,
) error {
studentIDs, err := cfg.DB.GetEnrolledStudentIDs(ctx, classID)
if err != nil || len(studentIDs) == 0 {
return err
}

tx, err := cfg.DBConn.BeginTx(ctx, nil)
if err != nil {
return err
}
defer tx.Rollback()

qtx := cfg.DB.WithTx(tx)
for _, studentID := range studentIDs {
err = qtx.CreateUserAssignment(ctx, database.CreateUserAssignmentParams{
AssignmentID: uuid.NullUUID{UUID: assignmentID, Valid: true},
StudentID:    uuid.NullUUID{UUID: studentID, Valid: true},
})
if err != nil {
return err
}
}
return tx.Commit()
}
```

> **Why a transaction?** If the server crashes halfway through inserting 30 student rows, you end up with some students
> having a trackable assignment and others not — leading to invisible missing assignments. Transactions guarantee
> all-or-nothing.

---

#### Wednesday — Missing Assignment Background Job

Add a ticker to `main()` that runs every hour and marks overdue unsubmitted assignments as `missing`:

```go
func startMissingAssignmentJob(db *database.Queries) {
go func () {
ticker := time.NewTicker(1 * time.Hour)
defer ticker.Stop()
for range ticker.C {
ctx := context.Background()
err := db.MarkMissingAssignments(ctx)
if err != nil {
log.Printf("missing assignment job error: %v", err)
} else {
log.Printf("missing assignment job ran at %s", time.Now().Format(time.RFC3339))
}
}
}()
}

// Call in main() after db setup:
startMissingAssignmentJob(dbQueries)
```

**sqlc query:**

```sql
-- name: MarkMissingAssignments :exec
UPDATE user_assignments
SET status     = 'missing',
    updated_at = NOW()
WHERE status = 'assigned'
  AND assignment_id IN (SELECT id
                        FROM assignments
                        WHERE due_date IS NOT NULL
                          AND due_date < NOW());
```

---

#### Thursday — Classwork Page (Frontend)

`app/dashboard/class/[id]/classwork/page.tsx`:

```typescript
// Fetch assignments for the class
const {data} = await apiFetch<{ assignments: Assignment[] }>(
    `/v1/api/classes/${classId}/assignments`
)

// Separate assignments from materials
const assignments = data.assignments.filter(a => a.type === 'assignment')
const materials = data.assignments.filter(a => a.type === 'material')
```

**UI layout:**

```
Classwork
├── Assignments
│   ├── [Assignment Card] Math Quiz        Due: Apr 5   [Assigned]
│   └── [Assignment Card] Essay Draft      Due: Apr 8   [Missing]
└── Materials
    └── [Material Card] Chapter 3 Notes    No due date
```

**Status badge colors:**

| Status      | Badge                |
|-------------|----------------------|
| `assigned`  | Blue — "Assigned"    |
| `submitted` | Yellow — "Submitted" |
| `graded`    | Green — "Graded"     |
| `missing`   | Red — "Missing"      |

---

#### Friday — Assignment Detail Page

`app/dashboard/class/[id]/assignment/[assignmentId]/page.tsx`:

**Teacher view:**

- Assignment title, details, due date
- Table of all students: `first_name`, `last_name`, `status` badge
- "Grade" button per student (links to grading panel in Phase 3)

**Student view:**

- Assignment title, details, due date
- Their current status badge
- Text submission form (wired in Phase 3)
- Their grade and feedback (shown after grading in Phase 3)

---

## Schema Changes Required

| Migration File               | Change                           | Reason                           |
|------------------------------|----------------------------------|----------------------------------|
| `0005_class_enrollments.sql` | Create `class_enrollments` table | Track student → class membership |

**New sqlc queries needed:**

| Query name               | File                   | Purpose                             |
|--------------------------|------------------------|-------------------------------------|
| `EnrollStudent`          | `enrollments.sql`      | Add a student to a class            |
| `UnenrollStudent`        | `enrollments.sql`      | Remove a student from a class       |
| `GetStudentClasses`      | `enrollments.sql`      | List classes for a student          |
| `GetClassStudents`       | `enrollments.sql`      | List students in a class            |
| `GetEnrolledStudentIDs`  | `enrollments.sql`      | Bulk `user_assignments` creation    |
| `IsStudentEnrolled`      | `enrollments.sql`      | Access control check                |
| `CreateAssignment`       | `assignments.sql`      | Create assignment + material        |
| `GetAssignmentsByClass`  | `assignments.sql`      | List assignments for classwork page |
| `GetAssignmentByID`      | `assignments.sql`      | Assignment detail page              |
| `UpdateAssignment`       | `assignments.sql`      | Edit assignment                     |
| `DeleteAssignment`       | `assignments.sql`      | Delete assignment                   |
| `CreateUserAssignment`   | `user_assignments.sql` | Insert per-student tracking row     |
| `MarkMissingAssignments` | `user_assignments.sql` | Background job                      |

---

## API Endpoint Reference

| Method   | Path                              | Role             | Description                   |
|----------|-----------------------------------|------------------|-------------------------------|
| `GET`    | `/v1/api/classes`                 | Teacher, Student | List classes (role-scoped)    |
| `POST`   | `/v1/api/classes`                 | Teacher          | Create a class                |
| `GET`    | `/v1/api/classes/:id`             | Teacher, Student | Get class detail              |
| `PUT`    | `/v1/api/classes/:id`             | Teacher (owner)  | Update class                  |
| `DELETE` | `/v1/api/classes/:id`             | Teacher (owner)  | Delete class                  |
| `POST`   | `/v1/api/classes/:id/enroll`      | Teacher (owner)  | Enroll a student by email     |
| `GET`    | `/v1/api/classes/:id/students`    | Teacher (owner)  | List enrolled students        |
| `GET`    | `/v1/api/classes/:id/assignments` | Teacher, Student | List assignments (classwork)  |
| `POST`   | `/v1/api/classes/:id/assignments` | Teacher (owner)  | Create assignment or material |
| `GET`    | `/v1/api/assignments/:id`         | Teacher, Student | Get assignment detail         |
| `PUT`    | `/v1/api/assignments/:id`         | Teacher (owner)  | Update assignment             |
| `DELETE` | `/v1/api/assignments/:id`         | Teacher (owner)  | Delete assignment             |

---

## Where Luminescence Improves on Existing Platforms

### 1. JWT-Scoped Role Authorization (vs. URL-Based Trust)

**The problem:**  
The current `GET /v1/api/classes?teacherId=<uuid>` endpoint trusts a user-supplied UUID. Any user who knows another
teacher's UUID can fetch their class list. This exact vulnerability exists in older versions of Moodle (CVE-2020-14321
— a role assignment bypass) and Google Classroom's early API (student could supply any teacher ID).

**Luminescence approach:**  
The teacher's ID comes exclusively from the verified JWT claims — `c.MustGet("userID")`. User-supplied IDs in query
parameters are only used for non-auth lookups (e.g. "show me class with this ID") and are always validated against the
token identity before any sensitive data is returned.

---

### 2. Enrollment as a First-Class Concept (vs. Google Classroom Invite Codes)

**The problem:**  
Google Classroom uses a class code that anyone with the code can use to enroll. If a code is shared publicly, anyone
can join. Canvas's enrollment is SIS-driven — teachers cannot manually enroll students without admin intervention.
Schoology has good enrollment management but it is tied to the PowerSchool SIS.

**Luminescence approach:**  
`class_enrollments` is a proper join table. Enrollment can be teacher-initiated (by student email) or
student-initiated (via invite code — post-MVP). The `UNIQUE(class_id, student_id)` constraint prevents double
enrollment at the database level. Teachers have full control over their rosters without needing admin access.

---

### 3. Automatic `user_assignments` Row Creation (vs. Manual Grade Entry)

**The problem:**  
Google Classroom has no concept of tracking which students have not submitted — teachers must manually check the
assignment and count. Canvas requires the gradebook to be opened separately to see missing assignments at scale.

**Luminescence approach:**  
When a teacher creates an assignment, a `user_assignments` row is immediately created for every enrolled student with
`status = 'assigned'`. This means the teacher can see at a glance — from the first moment — which students have
submitted, which are pending, and (after the due date passes) which are missing. The gradebook view is populated from
day one with no manual intervention.

---

### 4. Background `missing` Status Job (vs. Passive Status in Canvas)

**The problem:**  
Canvas marks assignments as "missing" but only reflects this in the gradebook passively — teachers must manually look.
Google Classroom has no "missing" concept at all. Brightspace has Intelligent Agents but they require configuration
and paid tiers.

**Luminescence approach:**  
A background Go goroutine ticks every hour and automatically updates `status = 'missing'` for overdue unsubmitted
assignments. This is free, requires no configuration, and works from MVP day one. The at-risk query in the Analytics
phase builds directly on this status.

---

### 5. Drag-and-Drop Ordering from Day One (vs. Canvas Multi-Click Reorder)

**The problem:**  
Canvas requires multiple clicks to reorder modules — you click a drag handle, drag, then release, and sometimes the
page re-renders and loses your position. Google Classroom has no ordering at all — materials appear in creation order
only. Moodle's ordering is hidden in a separate "Turn editing on" mode that confuses new teachers.

**Luminescence approach:**  
The `position` column on `assignments` and (future) `modules` tables enables drag-and-drop ordering. Using
`@dnd-kit/core` on the frontend, teachers can drag assignments within their classwork view. A single `PATCH` to
`/v1/api/assignments/:id/reorder` updates the position. This is planned for post-MVP but the schema supports it from
day one.

---

### 6. Role-Appropriate Empty States (vs. Generic Loading Screens)

**The problem:**  
Most LMS platforms show a blank screen or a generic spinner while loading. Google Classroom shows "You have no classes"
with no guidance on what to do next. New teachers on Canvas are often confused by the empty dashboard.

**Luminescence approach:**  
Every empty state is role-aware and actionable:

- **Teacher + no classes:** "Create your first class to get started" with a prominent button
- **Student + no classes:** "Ask your teacher for an enrollment code" with instructions
- **Teacher + no assignments:** "Add your first assignment" with a button that opens the form

---

## Deliverables & Exit Criteria

Phase 2 is complete when **all** of the following are true:

- [ ] `class_enrollments` table is migrated and indexed
- [ ] `GET /v1/api/classes` returns only the calling user's classes (teacher-owned or student-enrolled)
- [ ] `teacherId` query parameter is **removed** from the classes endpoint
- [ ] `POST /v1/api/classes/:id/enroll` enrolls a student and returns the enrollment row
- [ ] Creating an assignment bulk-inserts `user_assignments` rows for all enrolled students
- [ ] The missing assignment background job runs without error on `go run ./cmd/server`
- [ ] The frontend classwork page renders real assignments from the API
- [ ] The dashboard class cards show real data (no hardcoded `initialClasses`)
- [ ] Teachers cannot access another teacher's class via any API endpoint
- [ ] Students cannot access a class they are not enrolled in

---

## References

| Resource                            | URL                                                                          |
|-------------------------------------|------------------------------------------------------------------------------|
| sqlc transactions                   | https://docs.sqlc.dev/en/latest/howto/transactions.html                      |
| PostgreSQL `ON CONFLICT DO NOTHING` | https://www.postgresql.org/docs/current/sql-insert.html                      |
| PostgreSQL indexes                  | https://www.postgresql.org/docs/current/indexes.html                         |
| Go `database/sql` transactions      | https://pkg.go.dev/database/sql#DB.BeginTx                                   |
| `@dnd-kit/core` drag-and-drop       | https://dndkit.com/                                                          |
| Next.js dynamic routes              | https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes |
| Gin path parameters                 | https://gin-gonic.com/docs/examples/param-in-path/                           |
| Go `time.NewTicker`                 | https://pkg.go.dev/time#NewTicker                                            |
| Canvas enrollment API (reference)   | https://canvas.instructure.com/doc/api/enrollments.html                      |

---

*Phase 2 of 5 — Luminescence LMS MVP · Target completion: Apr 10, 2026*

