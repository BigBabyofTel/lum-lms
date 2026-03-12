# Phase 3 — Submissions & Grading (Weeks 7–8)

> **Part of:** [LMS MVP Pacing Guide](../LMS_MVP_PACING_GUIDE.md)  
> **Dates:** Apr 13 – Apr 24, 2026  
> **Estimated hours:** 40–60 hrs (4–6 hrs/day × 10 days)  
> **Depends on:** [Phase 2](./PHASE_2_CLASSES_AND_ASSIGNMENTS.md) — `class_enrollments`, `assignments`, and
`user_assignments` tables populated

---

## Goal

Students can submit text responses to assignments. Teachers can see all submissions for an assignment in one view,
enter a grade and written feedback, and return it to the student. Students can then see their grade and read the
feedback. The gradebook renders every student × assignment combination with live statuses.

This phase is the core academic loop — the reason an LMS exists. Everything before it was scaffolding. Everything after
it is communication and visibility. Getting the submission → grade → return cycle right is what makes Luminescence
usable in a real classroom.

---

## Table of Contents

1. [Week 7 — Submissions](#week-7--submissions)
2. [Week 8 — Grading](#week-8--grading)
3. [Schema Changes Required](#schema-changes-required)
4. [API Endpoint Reference](#api-endpoint-reference)
5. [Where Luminescence Improves on Existing Platforms](#where-luminescence-improves-on-existing-platforms)
6. [Deliverables & Exit Criteria](#deliverables--exit-criteria)
7. [References](#references)

---

## Week 7 — Submissions

### Day-by-Day Breakdown

#### Monday — Submission Content Migration

The `user_assignments` table currently only tracks status and grade (integer). Students have no place to store their
work. Add the submission content columns:

```sql
-- 0006_submission_content.sql
-- +goose Up
ALTER TABLE user_assignments
    ADD COLUMN submission_text text,
    ADD COLUMN submitted_at    timestamptz;

-- +goose Down
ALTER TABLE user_assignments
    DROP COLUMN submission_text,
    DROP COLUMN submitted_at;
```

**sqlc query:**

```sql
-- sql/queries/user_assignments.sql

-- name: SubmitAssignment :one
UPDATE user_assignments
SET submission_text = sqlc.arg(submission_text),
    submitted_at    = NOW(),
    status          = 'submitted',
    updated_at      = NOW()
WHERE assignment_id = sqlc.arg(assignment_id)
  AND student_id = sqlc.arg(student_id)
  AND status != 'graded' -- prevent overwriting a returned grade
RETURNING *;

-- name: GetUserAssignment :one
SELECT *
FROM user_assignments
WHERE assignment_id = sqlc.arg(assignment_id)
  AND student_id = sqlc.arg(student_id)
LIMIT 1;

-- name: GetSubmissionsByAssignment :many
SELECT ua.*,
       u.first_name,
       u.last_name,
       u.avatar,
       u.avatar_color
FROM user_assignments ua
         JOIN users u ON u.id = ua.student_id
WHERE ua.assignment_id = sqlc.arg(assignment_id)
ORDER BY u.last_name, u.first_name;
```

---

#### Tuesday — `POST /v1/api/assignments/:id/submit`

```go
func (cfg *apiConfig) submitAssignment(c *gin.Context) {
assignmentID, err := uuid.Parse(c.Param("id"))
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment id"})
return
}
studentID := c.MustGet("userID").(uuid.UUID)

// Verify this is a student role
if c.MustGet("userRole").(string) != "student" {
c.JSON(http.StatusForbidden, gin.H{"error": "only students can submit assignments"})
return
}

// Fetch the assignment to check due date and get class_id
assignment, err := cfg.DB.GetAssignmentByID(c, assignmentID)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "assignment not found"})
return
}

// Verify the student is enrolled in the class
enrolled, _ := cfg.DB.IsStudentEnrolled(c, database.IsStudentEnrolledParams{
ClassID:   assignment.ClassID.UUID,
StudentID: studentID,
})
if !enrolled {
c.JSON(http.StatusForbidden, gin.H{"error": "not enrolled in this class"})
return
}

var params struct {
Text string `json:"text" binding:"required"`
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

result, err := cfg.DB.SubmitAssignment(c, database.SubmitAssignmentParams{
SubmissionText: sql.NullString{String: params.Text, Valid: true},
AssignmentID:   uuid.NullUUID{UUID: assignmentID, Valid: true},
StudentID:      uuid.NullUUID{UUID: studentID, Valid: true},
})
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, gin.H{"submission": result})
}
```

**Key behaviors:**

- Idempotent — re-submitting before a grade is returned overwrites the previous text
- Does **not** overwrite a graded submission (the `status != 'graded'` guard in the SQL)
- Late submissions are accepted by default — a `allow_late` flag can be added post-MVP

---

#### Wednesday — `GET /v1/api/assignments/:id/submissions`

Teacher-only endpoint — returns all submissions for an assignment with student info:

```go
func (cfg *apiConfig) getSubmissions(c *gin.Context) {
if c.MustGet("userRole").(string) != "teacher" {
c.JSON(http.StatusForbidden, gin.H{"error": "teachers only"})
return
}
assignmentID, err := uuid.Parse(c.Param("id"))
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assignment id"})
return
}

// Verify teacher owns the class this assignment belongs to
assignment, _ := cfg.DB.GetAssignmentByID(c, assignmentID)
class, _ := cfg.DB.GetClassByID(c, assignment.ClassID.UUID)
teacherID := c.MustGet("userID").(uuid.UUID)
if class.TeacherID.UUID != teacherID {
c.JSON(http.StatusForbidden, gin.H{"error": "not your class"})
return
}

submissions, err := cfg.DB.GetSubmissionsByAssignment(c, assignmentID)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"submissions": submissions})
}
```

---

#### Thursday — Student Submission Form (Frontend)

Add to `app/dashboard/class/[id]/assignment/[assignmentId]/page.tsx`:

```typescript
// Draft auto-save — saves on every keystroke
const DRAFT_KEY = `lum_draft_${assignmentId}_${userId}`

const [text, setText] = useState('')
const [submitted, setSubmitted] = useState(false)

// Restore draft on mount
useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) setText(saved)
}, [assignmentId])

const handleChange = (value: string) => {
    setText(value)
    localStorage.setItem(DRAFT_KEY, value)
}

const handleSubmit = async () => {
    await apiFetch(`/v1/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({text}),
    })
    localStorage.removeItem(DRAFT_KEY) // clear draft after successful submit
    setSubmitted(true)
}
```

**UI states to handle:**

| State                    | What to show                                                                            |
|--------------------------|-----------------------------------------------------------------------------------------|
| `status === 'assigned'`  | Textarea + Submit button. Draft auto-save indicator.                                    |
| `status === 'submitted'` | Read-only view of submitted text. "Submitted on [date]" label. Edit + Resubmit button.  |
| `status === 'missing'`   | Red banner "This assignment is past due". Textarea still available for late submission. |
| `status === 'graded'`    | Read-only submitted text. Grade badge. Feedback from teacher.                           |

---

#### Friday — Submission List View (Frontend)

Teacher's view of `app/dashboard/class/[id]/assignment/[assignmentId]/page.tsx`:

```
Submissions — Math Quiz (Due Apr 5)
─────────────────────────────────────────────────────────────
Student            Status       Submitted At    Grade    Action
─────────────────────────────────────────────────────────────
Jane Doe           ✅ Submitted  Apr 4, 9:32am   —       [Grade]
John Smith         🔴 Missing    —               —       [Excuse]
Amy Lee            ✅ Graded     Apr 3, 2:15pm   87      [Return]
─────────────────────────────────────────────────────────────
Submitted: 2/3    Missing: 1/3    Graded: 1/3
```

Clicking **[Grade]** opens the grading panel (built Thursday of Week 8).

---

## Week 8 — Grading

### Day-by-Day Breakdown

#### Monday — Grading Columns Migration

```sql
-- 0007_grading_columns.sql
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

**sqlc queries:**

```sql
-- name: GradeSubmission :one
UPDATE user_assignments
SET grade      = sqlc.arg(grade),
    feedback   = sqlc.arg(feedback),
    graded_by  = sqlc.arg(graded_by),
    graded_at  = NOW(),
    status     = 'graded',
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: GetUserAssignmentByID :one
SELECT *
FROM user_assignments
WHERE id = sqlc.arg(id)
LIMIT 1;
```

---

#### Tuesday — `PATCH /v1/api/user-assignments/:id/grade`

```go
func (cfg *apiConfig) gradeSubmission(c *gin.Context) {
if c.MustGet("userRole").(string) != "teacher" {
c.JSON(http.StatusForbidden, gin.H{"error": "teachers only"})
return
}

uaID, err := uuid.Parse(c.Param("id"))
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
return
}

var params struct {
Grade    int32  `json:"grade"    binding:"required,min=0,max=100"`
Feedback string `json:"feedback"`
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

teacherID := c.MustGet("userID").(uuid.UUID)

// Verify the teacher owns the class this submission belongs to
ua, err := cfg.DB.GetUserAssignmentByID(c, uaID)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
return
}
assignment, _ := cfg.DB.GetAssignmentByID(c, ua.AssignmentID.UUID)
class, _ := cfg.DB.GetClassByID(c, assignment.ClassID.UUID)
if class.TeacherID.UUID != teacherID {
c.JSON(http.StatusForbidden, gin.H{"error": "not your class"})
return
}

result, err := cfg.DB.GradeSubmission(c, database.GradeSubmissionParams{
ID:       uaID,
Grade:    sql.NullInt32{Int32: params.Grade, Valid: true},
Feedback: sql.NullString{String: params.Feedback, Valid: params.Feedback != ""},
GradedBy: uuid.NullUUID{UUID: teacherID, Valid: true},
})
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, gin.H{"graded": result})
}
```

---

#### Wednesday — `GET /v1/api/classes/:id/gradebook`

```sql
-- name: GetGradebook :many
SELECT u.id AS student_id,
       u.first_name,
       u.last_name,
       a.id AS assignment_id,
       a.title,
       a.due_date,
       ua.grade,
       ua.status,
       ua.submitted_at,
       ua.graded_at,
       ua.feedback
FROM class_enrollments ce
         JOIN users u ON u.id = ce.student_id
         CROSS JOIN assignments a
         LEFT JOIN user_assignments ua
                   ON ua.student_id = u.id
                       AND ua.assignment_id = a.id
WHERE ce.class_id = sqlc.arg(class_id)
  AND a.class_id = sqlc.arg(class_id)
  AND a.type = 'assignment' -- exclude materials from gradebook
ORDER BY u.last_name, u.first_name, a.created_at;
```

> **`CROSS JOIN` explained:** This joins every enrolled student with every assignment — even if they haven't submitted
> yet. The `LEFT JOIN` on `user_assignments` fills in `NULL` for students with no submission row. This ensures the
> gradebook shows a complete grid, not just submitted work.

---

#### Thursday — Grading Panel (Frontend)

Add an inline grading panel that slides in when a teacher clicks **[Grade]** on the submission list:

```tsx
// components/grading-panel.tsx
interface GradingPanelProps {
    userAssignmentId: string
    studentName: string
    submittedText: string
    currentGrade?: number
    currentFeedback?: string
    onSaved: () => void
}

export function GradingPanel({userAssignmentId, studentName, submittedText, onSaved}: GradingPanelProps) {
    const [grade, setGrade] = useState('')
    const [feedback, setFeedback] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        await apiFetch(`/v1/api/user-assignments/${userAssignmentId}/grade`, {
            method: 'PATCH',
            body: JSON.stringify({grade: parseInt(grade), feedback}),
        })
        setSaving(false)
        setSaved(true)
        onSaved()
    }

    return (
        <div className="border-l border-gray-200 dark:border-gray-700 pl-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{studentName}</h3>

            {/* Submitted text — read-only */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300">
                {submittedText ?? <span className="italic text-gray-400">No submission</span>}
            </div>

            {/* Grade input */}
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={0}
                    max={100}
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-20 border rounded px-2 py-1 text-center dark:bg-gray-800"
                    placeholder="0"
                />
                <span className="text-sm text-gray-500">/ 100</span>
            </div>

            {/* Feedback */}
            <textarea
                rows={4}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Written feedback for the student..."
                className="w-full border rounded p-2 text-sm dark:bg-gray-800"
            />

            <button
                onClick={handleSave}
                disabled={saving || !grade}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Grade'}
            </button>
        </div>
    )
}
```

---

#### Friday — Student Grade View + Gradebook Page

**Student grade view** on the assignment detail page:

```tsx
{
    userAssignment?.status === 'graded' && (
        <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
                <span className="font-semibold">Grade</span>
                <span className="text-2xl font-bold text-blue-600">{userAssignment.grade}/100</span>
            </div>
            {userAssignment.feedback && (
                <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
                    <p className="font-medium mb-1">Teacher feedback</p>
                    <p className="text-gray-700 dark:text-gray-300">{userAssignment.feedback}</p>
                </div>
            )}
        </div>
    )
}
```

**Gradebook page** at `app/dashboard/class/[id]/gradebook/page.tsx`:

```
         | Quiz 1 | Essay | Lab Report |
---------+--------+-------+------------+
Jane D.  |  87    |  92   |    —       |
John S.  |  🔴    |  74   |    55      |
Amy L.   |  95    |  —    |    88      |
---------+--------+-------+------------+
Average  |  91    |  83   |    71.5    |
```

Color coding:

- Green: 80–100
- Yellow: 60–79
- Red: 0–59
- `—`: Not yet graded
- `🔴`: Missing

---

## Schema Changes Required

| Migration File                | Change                                                                               | Reason                            |
|-------------------------------|--------------------------------------------------------------------------------------|-----------------------------------|
| `0006_submission_content.sql` | Add `submission_text text`, `submitted_at timestamptz` to `user_assignments`         | Store student text submissions    |
| `0007_grading_columns.sql`    | Add `feedback text`, `graded_by uuid`, `graded_at timestamptz` to `user_assignments` | Store teacher grades and feedback |

---

## API Endpoint Reference

| Method  | Path                                  | Role               | Description                         |
|---------|---------------------------------------|--------------------|-------------------------------------|
| `POST`  | `/v1/api/assignments/:id/submit`      | Student (enrolled) | Submit text for an assignment       |
| `GET`   | `/v1/api/assignments/:id/submissions` | Teacher (owner)    | List all submissions + student info |
| `PATCH` | `/v1/api/user-assignments/:id/grade`  | Teacher (owner)    | Grade a submission                  |
| `GET`   | `/v1/api/classes/:id/gradebook`       | Teacher (owner)    | Full gradebook matrix               |

---

## Where Luminescence Improves on Existing Platforms

### 1. Draft Auto-Save (vs. Google Classroom & Canvas)

**The problem:**  
Google Classroom does not save drafts at all — if a student accidentally closes the tab, their work is gone. Canvas
saves drafts but only if the student explicitly clicks "Save as Draft," which students rarely do because they don't
know it exists.

**Luminescence approach:**  
Every keystroke in the submission textarea writes to `localStorage` with a key scoped to the assignment and student ID.
On mount, the draft is restored. This is entirely client-side — no API call needed. A subtle "Draft saved" indicator
tells students their work is safe. After a successful submit, the draft is cleared. This alone prevents one of the most
common student complaints in every LMS.

---

### 2. Idempotent Resubmission (vs. Canvas Lock)

**The problem:**  
Canvas locks a submission after the first submit unless the teacher explicitly enables resubmission, and even then the
policy is buried in assignment settings. Teachers frequently forget to enable it. Moodle has a similar policy that
varies by assignment type and version.

**Luminescence approach:**  
Resubmitting before a grade is returned simply overwrites the previous text — the same `PATCH` query is idempotent.
The SQL guard (`status != 'graded'`) prevents overwriting a returned grade without needing a configuration option.
Post-MVP, a `allow_late_resubmit` flag can be added. For MVP: sensible default, zero configuration.

---

### 3. Side-by-Side Grading with Submission Text (vs. Canvas SpeedGrader Slow Load)

**The problem:**  
Canvas SpeedGrader loads each submission individually, fetching a full PDF preview or external content before the
teacher can see it. For a class of 30 students, this means 30 separate page loads. Teachers report spending 20-30
seconds per student just waiting for files to load.

**Luminescence approach:**  
`GET /v1/api/assignments/:id/submissions` fetches all student submissions in a single query. The grading panel renders
the submission text inline — no file download, no page navigation. A teacher can grade all 30 students on one page with
no additional network requests. For MVP (text submissions), this is dramatically faster than SpeedGrader. File
submission grading will require more thought (planned for v1).

---

### 4. Rubric Auto-Sum (vs. Manual Calculation in Most Platforms)

**The problem:**  
In Canvas, attaching a rubric to an assignment requires: create rubric → find assignment → attach rubric → grade using
rubric → total is calculated but not auto-applied to the grade field. Teachers must click "Use this score for the
assignment" as a separate step. Many miss this and end up with a rubric score that doesn't match the gradebook.

**Luminescence approach:**  
Rubrics are planned for v1 (see `LMS_CORE_FEATURES.md §4`), but the grading schema is designed so that when a rubric
is used, the sum of criterion scores automatically populates the `grade` integer field on `user_assignments`. No
separate "apply to grade" step. One flow, one save.

---

### 5. Student-Visible Feedback with Grade (vs. Separate Canvas "Submission Comments")

**The problem:**  
In Canvas, teacher feedback lives in "Submission Comments" — a separate section that students must navigate to
separately from the grade. Studies of Canvas usage show fewer than 40% of students read submission comments. Google
Classroom's private comment feature is similarly hidden.

**Luminescence approach:**  
The `feedback` column is returned alongside the `grade` in the same API response. On the student's assignment detail
page, the grade and feedback are displayed together in one view — visually connected, impossible to miss. The feedback
renders directly below the grade badge, not in a separate tab or comment thread.

---

### 6. Gradebook CROSS JOIN — No Hidden Students

**The problem:**  
Canvas's gradebook only shows students who have a submission row — students who never submitted simply don't appear in
some filtered views. Schoology's gradebook can become inconsistent if a student is enrolled after assignments are
created (the system doesn't always back-fill).

**Luminescence approach:**  
The `CROSS JOIN` in the gradebook query ensures every student appears for every assignment, regardless of whether a
`user_assignments` row exists. `LEFT JOIN` fills in `NULL` for unsubmitted work, which the frontend renders as `—`.
No student is hidden. No assignment is invisible. The grid is always complete.

---

## Deliverables & Exit Criteria

Phase 3 is complete when **all** of the following are true:

- [ ] `user_assignments` has `submission_text`, `submitted_at`, `feedback`, `graded_by`, `graded_at` columns
- [ ] `POST /v1/api/assignments/:id/submit` updates the student's `user_assignments` row
- [ ] Students cannot submit for assignments in classes they are not enrolled in
- [ ] `GET /v1/api/assignments/:id/submissions` is accessible only to the class teacher
- [ ] `PATCH /v1/api/user-assignments/:id/grade` saves grade, feedback, and `graded_at`
- [ ] `GET /v1/api/classes/:id/gradebook` returns a complete student × assignment matrix
- [ ] The submission form auto-saves drafts to `localStorage` on every keystroke
- [ ] Draft is restored on page mount and cleared after successful submit
- [ ] The grading panel saves without a page reload and shows a ✓ confirmation
- [ ] Students see their returned grade and feedback on the assignment detail page
- [ ] The gradebook table renders with color-coded grade cells

---

## References

| Resource                                 | URL                                                                    |
|------------------------------------------|------------------------------------------------------------------------|
| PostgreSQL `CROSS JOIN`                  | https://www.postgresql.org/docs/current/queries-table-expressions.html |
| PostgreSQL `LEFT JOIN`                   | https://www.postgresql.org/docs/current/tutorial-join.html             |
| sqlc nullable types                      | https://docs.sqlc.dev/en/latest/howto/named_parameters.html            |
| `sql.NullString` / `sql.NullInt32`       | https://pkg.go.dev/database/sql#NullString                             |
| React `localStorage` pattern             | https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage   |
| Canvas SpeedGrader performance criticism | https://community.canvaslms.com/t5/Canvas-Ideas/ct-p/canvas-ideas      |
| Gradescope bulk grading (inspiration)    | https://gradescope.com                                                 |
| Next.js `useEffect` cleanup              | https://react.dev/learn/synchronizing-with-effects                     |

---

*Phase 3 of 5 — Luminescence LMS MVP · Target completion: Apr 24, 2026*

