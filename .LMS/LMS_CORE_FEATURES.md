# Luminescence LMS — Core Features: Deep Dive & Build Guide

> This document expands on the high-level research in `LMS_RESEARCH.md` with deeper technical explanations of each core
> feature, concrete implementation guidance for the Luminescence LMS stack (Next.js + Go + PostgreSQL), and notes on
> where
> improvements can be made over existing platforms.

**Stack reference:**

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand
- **Backend:** Go — **Gin** framework (`github.com/gin-gonic/gin v1.11`), sqlc, `lib/pq` Postgres driver
- **Auth:** To be determined (JWT recommended)
- **Deployment:** Docker Compose

---

## Table of Contents

1. [User & Role Management](#1-user--role-management)
2. [Course & Content Management](#2-course--content-management)
3. [Assignment Management](#3-assignment-management)
4. [Grading & Feedback](#4-grading--feedback)
5. [Communication & Notifications](#5-communication--notifications)
6. [Parent / Guardian Portal](#6-parent--guardian-portal)
7. [Analytics & Reporting](#7-analytics--reporting)
8. [Assessment Engine](#8-assessment-engine)
9. [File & Media Management](#9-file--media-management)
10. [Search & Discovery](#10-search--discovery)
11. [Accessibility & Inclusivity](#11-accessibility--inclusivity)
12. [Integration Layer](#12-integration-layer)
13. [Authentication & Security](#13-authentication--security)
14. [Mobile & Offline Experience](#14-mobile--offline-experience)

---

## 1. User & Role Management

### What it is

Every LMS has multiple actor types — teachers create content and grade work, students consume and submit it, parents
observe, and admins manage the system. Each role sees a different version of the application with different permissions.

### How existing platforms do it

| Platform         | Role Model                                                                  |
|------------------|-----------------------------------------------------------------------------|
| Canvas           | `Teacher`, `Student`, `Observer (parent)`, `TA`, `Designer`, `Admin`        |
| Google Classroom | `Teacher`, `Student`, `Co-teacher` — guardians are external, not true users |
| Schoology        | `Teacher`, `Student`, `Parent` (full first-class role), `Admin`             |
| Moodle           | Fully configurable roles with granular capability overrides                 |
| Brightspace      | `Instructor`, `Learner`, `Parent & Guardian`, `Admin`, plus custom roles    |

### How to build it — Luminescence

**Database (PostgreSQL via sqlc) — current schema:**

```sql
-- sql/schema/0002_basic_tables.sql (already in place)
CREATE TYPE role AS ENUM ('teacher', 'student', 'parent');

CREATE TABLE users
(
    id           uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    first_name   varchar(255) NOT NULL,
    last_name    varchar(255) NOT NULL,
    email        varchar(255) NOT NULL UNIQUE,
    type         role         NOT NULL, -- column is named 'type', not 'role'
    avatar       varchar(255),
    avatar_color varchar(255),
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz
);
```

> **Planned additions:** `password` (bcrypt hash) and an `admin` value in the `role` enum are not yet in the schema —
> add them in the next migration when authentication is implemented.

**Backend (Go + Gin):**

- Gin's `c *gin.Context` is used instead of the standard `http.ResponseWriter`/`*http.Request` pair
- Route groups can be protected per role using Gin proxy: `router.Group("/v1/api").Use(AuthMiddleware())`
- A `RequireRole(roles ...string)` proxy wraps Gin handler groups

```go
// internal/proxy/auth.go
func RequireRole(roles ...string) gin.HandlerFunc {
return func (c *gin.Context) {
claims := GetClaims(c) // extracted from JWT stored in Authorization header
for _, role := range roles {
if claims.Role == role {
c.Next()
return
}
}
c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
}
}

// Usage in main.go
teacher := router.Group("/v1/api/teacher").Use(RequireRole("teacher"))
teacher.POST("/classes", cfg.createClass)
```

**Frontend (Next.js):**

- `useUserStore` (Zustand) holds the authenticated user's role
- Route layouts check role and redirect if unauthorized
- Components conditionally render based on role (e.g. grade input only for teachers)

### Where to improve on existing platforms

- **Google Classroom** has no true parent user account — guardians only receive email digests. Luminescence should give
  parents a real login and a dedicated dashboard view.
- **Canvas** TA and Designer roles are confusing for K-12. Simplify to: `Teacher`, `Student`, `Parent`, `Admin`. Add
  sub-roles (e.g. `Co-teacher`) later.
- Most platforms treat role-switching as an admin-only feature. Consider letting a user hold multiple roles (a parent
  who is also a teacher) without needing two accounts.

---

## 2. Course & Content Management

### What it is

The "classroom" itself — where teachers organize lessons, topics, materials, and resources that students consume. The
structural hierarchy is typically: **Course → Modules/Units → Topics → Items (assignments, materials, links)**.

### How existing platforms do it

- **Canvas:** Module-based with drag-and-drop ordering. Items can be prerequisites.
- **Google Classroom:** Topic-based Classwork tab — flat and simple. No prerequisites.
- **Schoology:** Folder-based organization inside a course. Supports nested folders.
- **Moodle:** "Section"-based with a huge variety of activity types per section.
- **Brightspace:** Table of contents style with units, lessons, and topics.

### How to build it — Luminescence

**Database — current schema:**

```sql
-- sql/schema/0002_basic_tables.sql (already in place)
CREATE TABLE classes
(
    id         uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    subject    varchar(255) NOT NULL,
    grade      int          NOT NULL, -- integer grade level (e.g. 2, 5, 11)
    teacher_id uuid         REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz
);
```

> **Planned additions:** `color` (card theme, e.g. `'bg-blue-600'`) is not yet in the schema — add it in the next
> migration so class cards can be styled per the frontend design.

**Planned tables (next migrations):**

```sql
-- Modules group content within a class
CREATE TABLE modules
(
    id         uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    class_id   uuid         NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    title      varchar(255) NOT NULL,
    position   int          NOT NULL DEFAULT 0, -- manual ordering
    is_visible boolean      NOT NULL DEFAULT TRUE,
    created_at timestamptz           DEFAULT now()
);

-- Materials belong to a module: 'file', 'link', 'text', 'video'
CREATE TABLE materials
(
    id         uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    module_id  uuid         NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
    title      varchar(255) NOT NULL,
    type       varchar(50)  NOT NULL,
    content    text,
    position   int          NOT NULL DEFAULT 0,
    created_at timestamptz           DEFAULT now()
);
```

> **Note:** The existing `topics` table in the schema links topics to individual assignments rather than to modules. It
> will need to be restructured to sit between modules and assignments as the content hierarchy grows.

**Backend API endpoints (Gin) — currently live:**

```
POST   /v1/api/classes    → create class (cfg.createClass)
GET    /v1/api/classes    → list classes by teacher_id query param (cfg.getClasses)
```

**Planned endpoints:**

```
GET    /v1/api/classes/:id           → get class detail
PUT    /v1/api/classes/:id           → update class
DELETE /v1/api/classes/:id           → delete class
GET    /v1/api/classes/:id/modules   → list modules for a class
POST   /v1/api/classes/:id/modules   → create module
PATCH  /v1/api/modules/:id/reorder   → update position
```

**Gin handler pattern (matches existing code style):**

```go
func (cfg *apiConfig) getClass(c *gin.Context) {
idStr := c.Param("id")
classUUID, err := uuid.Parse(idStr)
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
return
}
class, err := cfg.DB.GetClass(c, classUUID)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "class not found"})
return
}
c.JSON(http.StatusOK, gin.H{"class": class})
}
```

**Frontend:**

- Class cards on the dashboard link to `/dashboard/class/[id]`
- Inside the class, a tabbed layout: **Stream | Classwork | People**
- Classwork tab renders modules collapsed/expanded with their topics and materials
- Teachers see an edit/add mode; students see a read-only view

### Where to improve on existing platforms

- **Canvas** modules require multiple clicks to reorder. Implement a simple drag-and-drop list (e.g. using
  `@dnd-kit/core`) from day one.
- **Google Classroom** has no module concept — everything is a flat list. This works for simple classes but breaks down
  past 10+ assignments. Luminescence's module/topic hierarchy avoids this.
- **Moodle** allows too many content types, which overwhelms teachers. Start with 4 clear types: `File`, `Link`, `Text`,
  `Video` — and add more only when needed.
- Add **visibility scheduling** (show this module starting on date X) — Canvas has it, Google Classroom does not.

---

## 3. Assignment Management

### What it is

The workflow by which a teacher creates a task, sets a due date, distributes it to students, and collects submissions.
This is the most-used feature of any LMS day-to-day.

### How existing platforms do it

- **Canvas:** Rich assignment types — online text, file upload, external tool, no submission. SpeedGrader processes
  submissions one-by-one.
- **Google Classroom:** Simple — attach files from Drive or upload. One submission type per assignment.
- **Schoology:** Multi-type submissions, question-based assignments, media recordings.
- **Moodle:** "Assignment" activity with many submission options; separate from the quiz system.
- **Brightspace:** Dropbox folders with rubric attachment and group submissions.

### How to build it — Luminescence

**Database — current schema:**

```sql
-- sql/schema/0002_basic_tables.sql (already in place)
CREATE TYPE content_type AS ENUM ('assignment', 'material');
CREATE TYPE assignment_status AS ENUM ('assigned', 'submitted', 'graded', 'missing');

CREATE TABLE assignments
(
    id               uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    type             content_type NOT NULL, -- 'assignment' or 'material'
    title            varchar(255) NOT NULL,
    class_id         uuid REFERENCES classes (id) ON DELETE CASCADE,
    details          text,                  -- instructions / description
    assign_date      timestamptz,
    due_date         timestamptz,
    attachment_count int                   DEFAULT 0,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz
);

-- Tracks each student's submission and grade per assignment
CREATE TABLE user_assignments
(
    id            uuid PRIMARY KEY           DEFAULT gen_random_uuid(),
    assignment_id uuid REFERENCES assignments (id) ON DELETE CASCADE,
    student_id    uuid REFERENCES users (id) ON DELETE CASCADE,
    grade         int,
    status        assignment_status NOT NULL DEFAULT 'assigned',
    created_at    timestamptz       NOT NULL DEFAULT now(),
    updated_at    timestamptz,
    UNIQUE (assignment_id, student_id) -- one row per student per assignment
);
```

> **Notes on the current schema:**
> - `assignment_status` values: `assigned → submitted → graded` (or `missing` if overdue). A teacher-side `draft` state
    is not yet modelled — add it to the enum in a future migration.
> - Submission file content (URLs, text body) is not yet stored — `user_assignments` only tracks status and integer
    score. A `submission_content` text column or a separate `submission_files` table should be added.
> - `content_type` lets both assignments and materials live in the same table — useful for the classwork tab, but means
    `due_date` will be NULL for materials.

**Key backend logic (Gin):**

```go
func (cfg *apiConfig) createAssignment(c *gin.Context) {
var params struct {
Type    string `json:"type"     binding:"required,oneof=assignment material"`
Title   string `json:"title"    binding:"required"`
ClassID string `json:"class_id" binding:"required"`
Details string `json:"details"`
DueDate string `json:"due_date"` // RFC3339 string, parse to time.Time
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
// ... parse UUIDs, call cfg.DB.CreateAssignment, return result
c.JSON(http.StatusOK, gin.H{"assignment": result})
}
```

- When an assignment is created, insert a `user_assignments` row with status `assigned` for every student enrolled in
  the class (bulk insert).
- A background Go ticker checks for rows where `status = 'assigned'` and `due_date < NOW()` and marks them `missing`.
- `UNIQUE(assignment_id, student_id)` prevents duplicate rows at the DB level.

**Frontend assignment creation form fields:**

- Title (required)
- Type (radio: Assignment / Material)
- Details / instructions (rich text editor, e.g. TipTap)
- Due date (datetime picker — optional for materials)
- Attachment count (auto-incremented as files are attached)

### Where to improve on existing platforms

- **Google Classroom** has no draft state — assignments publish immediately or not at all. A proper draft → schedule →
  publish flow is essential.
- **Canvas** SpeedGrader is powerful but slow to load. Design the grading view to load the next submission immediately
  in the background (prefetching).
- Add **resubmission policy** settings (allow / disallow / allow until graded) — Canvas has it buried, most others lack
  it.
- **Differentiated assignments** (assign to specific students, not the whole class) are available in Canvas and
  Schoology. Add this from the start — it's critical for special education accommodations.

---

## 4. Grading & Feedback

### What it is

The process of reviewing student submissions, assigning a score, and returning written, audio, or annotation-based
feedback. This is where teacher time is most heavily spent.

### How existing platforms do it

- **Canvas SpeedGrader:** Side-by-side submission preview + grading panel. Supports inline PDF annotation, audio/video
  feedback, rubric scoring.
- **Google Classroom:** Simple points field + private comment. No rubric, no annotation.
- **Schoology:** Rubric-based grading, written comments, submission history.
- **Moodle:** Offline grading (download all, re-upload marked files), rubrics, annotated PDFs.
- **Brightspace:** Rubric-based with inline feedback and audio recording.

### How to build it — Luminescence

**Database — current schema:**

Grading is currently handled through the `user_assignments` table — the `grade int` column stores the raw score and
`status` transitions to `graded` when a grade is applied. A separate feedback column and rubric system are not yet
modelled.

```sql
-- Grading is an UPDATE on the existing user_assignments row
UPDATE user_assignments
SET grade      = $1,
    status     = 'graded',
    updated_at = NOW()
WHERE id = $2
  AND assignment_id = $3;
```

**Planned tables (next migrations):**

```sql
-- Richer grading: feedback text and who graded it
ALTER TABLE user_assignments
    ADD COLUMN feedback  text,
    ADD COLUMN graded_by uuid REFERENCES users (id),
    ADD COLUMN graded_at timestamptz;

-- Rubric definitions (reusable across assignments in a class)
CREATE TABLE rubrics
(
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   uuid         NOT NULL REFERENCES classes (id),
    title      varchar(255) NOT NULL,
    created_at timestamptz      DEFAULT now()
);

CREATE TABLE rubric_criteria
(
    id          uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    rubric_id   uuid         NOT NULL REFERENCES rubrics (id) ON DELETE CASCADE,
    title       varchar(255) NOT NULL,
    description text,
    points      int          NOT NULL,
    position    int          NOT NULL DEFAULT 0
);

CREATE TABLE rubric_ratings
(
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    criterion_id uuid         NOT NULL REFERENCES rubric_criteria (id) ON DELETE CASCADE,
    label        varchar(100) NOT NULL, -- e.g. "Excellent", "Satisfactory", "Needs Work"
    points       int          NOT NULL,
    description  text
);
```

**Grading view (frontend):**

```
┌──────────────────────┬────────────────────────┐
│  Submission Preview  │   Grading Panel         │
│  (PDF / text / link) │                         │
│                      │  Student: Jane Doe       │
│                      │  Submitted: Feb 28       │
│                      │                         │
│                      │  Score: [___] / 100     │
│                      │                         │
│                      │  [Rubric]               │
│                      │  ├─ Content: [4/5] ▼    │
│                      │  ├─ Structure: [3/5] ▼  │
│                      │  └─ Grammar: [5/5] ▼    │
│                      │                         │
│                      │  Feedback: [text area]  │
│                      │                         │
│                      │  [← Prev] [Save] [Next →]│
└──────────────────────┴────────────────────────┘
```

**Backend endpoints (Gin) — planned:**

```
GET   /v1/api/assignments/:id/submissions   → list all user_assignments for an assignment (teacher)
PATCH /v1/api/user-assignments/:id/grade   → update grade + status on user_assignments row
GET   /v1/api/classes/:id/gradebook        → full gradebook for a class (all assignments × all students)
```

### Where to improve on existing platforms

- **Canvas SpeedGrader** is slow on large file submissions. Implement lazy loading with a small file preview cap.
- **Google Classroom** has no rubric system at all — add one from day one.
- Most platforms require separate steps to attach a rubric and then grade with it. Combine into one flow: rubric
  auto-sums to score.
- Add **bulk grade actions** (mark all unsubmitted as missing, excuse all, etc.) — only Gradescope does this well.
- **Audio feedback** (record a voice note attached to a grade) is available in Canvas and Brightspace. Plan the file
  upload infrastructure to support this from the beginning.

---

## 5. Communication & Notifications

### What it is

The channels through which teachers, students, parents, and admins communicate: announcements broadcast to a whole
class, direct messages between individuals, and notifications that alert users to important events.

### How existing platforms do it

- **Canvas:** Inbox (internal DM system), Announcements (class-wide), Discussions (threaded, graded or ungraded).
  Notification preferences configurable per channel (email, SMS, push).
- **Google Classroom:** Stream for announcements. No internal DM — uses Gmail. No push notifications from the web.
- **Schoology:** Built-in messaging, announcements, and social-style activity feed.
- **Moodle:** Forums (very feature-rich), Messaging (basic), and Email for notifications.
- **Brightspace:** Announcements, Discussions, direct messages, and Brightspace Pulse push notifications.

### How to build it — Luminescence

**Database:**

```sql
CREATE TABLE announcements
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users (id),
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE messages
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    UUID NOT NULL REFERENCES users (id),
    recipient_id UUID NOT NULL REFERENCES users (id),
    body         TEXT NOT NULL,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE notifications
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       TEXT NOT NULL, -- 'assignment_due', 'grade_returned', 'announcement', 'message'
    title      TEXT NOT NULL,
    body       TEXT,
    link       TEXT,          -- frontend route to navigate to
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ      DEFAULT NOW()
);
```

**Real-time notifications:**

- Use **Server-Sent Events (SSE)** in Go for a lightweight push mechanism — no external dependency.
- Gin has built-in SSE support via the `github.com/gin-contrib/sse` package (already a transitive dependency in
  `go.mod`).
- Client subscribes to `/v1/api/events` on mount; server streams notification rows as they are inserted.
- Fall back to polling (`GET /v1/api/notifications?unread=true`) for clients that don't support SSE.

```go
// Lightweight SSE handler with Gin
func (cfg *apiConfig) NotificationStream(c *gin.Context) {
userID := GetUserID(c) // extracted from JWT claims set by auth proxy

c.Stream(func (w io.Writer) bool {
ch := notifier.Subscribe(userID)
defer notifier.Unsubscribe(userID, ch)

select {
case n := <-ch:
c.SSEvent("notification", n)
return true // keep stream open
case <-c.Request.Context().Done():
return false // client disconnected
}
})
}

// Register in main.go
router.GET("/v1/api/events", authMiddleware(), cfg.NotificationStream)
```

### Where to improve on existing platforms

- **Google Classroom** has no internal messaging at all — teachers send students to Gmail. Build internal messaging from
  day one; it keeps communication logged and searchable within the LMS.
- **Canvas inbox** notifications are notoriously delayed. Use SSE to make notifications appear within seconds.
- Most platforms show a generic notification count badge. Show **categorized counts** (2 grades returned, 1 message, 3
  announcements).
- **Moodle forums** are powerful but feel like old-school message boards. Model discussions more like modern threads (
  collapsible replies, like reactions, @mentions).

---

## 6. Parent / Guardian Portal

### What it is

A dedicated view for parents or guardians to monitor their child's academic progress — grades, upcoming assignments,
attendance, teacher messages — without having access to course content or other students' data.

### How existing platforms do it

- **Google Classroom:** Guardian email summaries only. No login, no real-time data.
- **Canvas:** Observer role — parents can see everything the student sees but cannot submit work. Good but gives too
  much noise.
- **Schoology:** Best-in-class parent portal — dedicated parent login, messaging with teachers, grade visibility, and
  assignment list. Available in the main app.
- **Brightspace:** `Pulse for Parents` — dedicated parent app with activity timeline, attendance, and messaging.
- **Blackboard/Moodle:** Very limited or plugin-dependent parent access.

### How to build it — Luminescence

**Approach:** Parents are first-class users (`type = 'parent'` in the `users` table) linked to one or more students. The
parent dashboard shows only data scoped to their linked student(s).

> **Current schema note:** The `users` table uses `type` (not `role`) as the column name for the role enum. There is no
`parent_of` field on `users` — a separate link table is needed (planned below).

**Database additions (planned migration):**

```sql
-- Allow one parent to link to multiple students
CREATE TABLE parent_student_links
(
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz      DEFAULT now(),
    UNIQUE (parent_id, student_id)
);
```

**Parent dashboard views:**

1. **Overview** — all linked students, with each card showing: current average grade, upcoming assignments this week,
   last login date.
2. **Grades** — per-class gradebook view (read-only) showing all assignments and scores from `user_assignments`.
3. **Schedule** — calendar of due dates for their child's assignments.
4. **Messages** — direct message teachers (rate-limited to avoid spam).
5. **Notifications** — alerts for missing assignments, new grades, announcements.

**Backend scoping (Gin):**

- All parent API calls go through `GET /v1/api/parent/students/:student_id/...`
- Gin proxy validates that `student_id` is in the parent's `parent_student_links` before calling `c.Next()`
- Parents can never modify any data — all their endpoints are GET-only

```go
func ParentGuard(db *database.Queries) gin.HandlerFunc {
return func (c *gin.Context) {
parentID := GetUserID(c)
studentID, _ := uuid.Parse(c.Param("student_id"))
linked, err := db.IsParentLinked(c, database.IsParentLinkedParams{
ParentID:  parentID,
StudentID: studentID,
})
if err != nil || !linked {
c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
return
}
c.Next()
}
}
```

### Where to improve on existing platforms

- **Schoology** forces parents to use the same mobile app as students and teachers — the UX is cluttered. Build a
  separate, simplified parent view within the same app.
- **Canvas Observer** shows the student's entire course including class discussions — parents don't need this. Scope the
  view to: grades, assignments, and announcements only.
- Add **weekly digest emails** generated server-side (cron job on Sunday evening) so parents who don't log in still get
  a summary.
- **Absence/attendance visibility** — most platforms rely on SIS integration for this. Include a simple teacher-reported
  attendance field from day one.

---

## 7. Analytics & Reporting

### What it is

Data surfaces that help teachers understand how well students are learning, and help admins understand how well teachers
are teaching. Effective analytics prevent students from falling behind unnoticed.

### How existing platforms do it

- **Canvas Analytics:** Per-student engagement (page views, submissions on time/late/missing). Course-level summary with
  grade distribution histogram.
- **Google Classroom:** Almost none — just submission status.
- **Schoology:** Basic tracking in free tier; advanced analytics in paid tier.
- **Moodle:** Detailed log-level reports; customizable via plugins.
- **Brightspace Insights:** Predictive at-risk scoring, class-level engagement heatmap, outcome mastery progress. Best
  in class.
- **Blackboard Retention Center:** Automated alerts when students miss assignments or fall below grade threshold.

### How to build it — Luminescence

**Key data points to track (event log table):**

```sql
CREATE TABLE activity_events
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id),
    class_id    UUID REFERENCES classes (id),
    event_type  TEXT NOT NULL, -- 'login', 'material_view', 'submission', 'grade_view'
    metadata    JSONB,         -- flexible event-specific data
    occurred_at TIMESTAMPTZ      DEFAULT NOW()
);
```

**Pre-built reports (start simple, expand later):**

| Report             | Description                                                  | Who sees it    |
|--------------------|--------------------------------------------------------------|----------------|
| Submission Status  | Table of students × assignments — submitted / missing / late | Teacher        |
| Grade Distribution | Histogram of scores for an assignment                        | Teacher        |
| Student Engagement | Logins and material views per week                           | Teacher        |
| At-Risk Alert      | Students with 2+ missing assignments                         | Teacher, Admin |
| My Progress        | Student's own grades and missing work                        | Student        |
| Parent Summary     | Child's weekly grades and missing work                       | Parent         |

**Computed with SQL (no heavy BI tool needed initially):**

```sql
-- At-risk students: 2 or more missing assignments in the last 14 days
-- Uses the actual table name 'user_assignments' and 'status' column
SELECT u.id,
       u.first_name || ' ' || u.last_name AS full_name,
       COUNT(*)                           AS missing_count
FROM user_assignments ua
         JOIN users u ON u.id = ua.student_id
WHERE ua.status = 'missing'
  AND ua.assignment_id IN (SELECT id
                           FROM assignments
                           WHERE class_id = $1
                             AND due_date < NOW()
                             AND due_date > NOW() - INTERVAL '14 days')
GROUP BY u.id, u.first_name, u.last_name
HAVING COUNT(*) >= 2
ORDER BY missing_count DESC;
```

### Where to improve on existing platforms

- Most platforms only surface analytics to teachers. Add a **student-facing progress view** — research shows students
  who see their own data engage more.
- **Brightspace Intelligent Agents** send automated emails when thresholds are hit. Replicate this with a simple rule
  engine: if `missing_count >= N`, create a notification for the teacher.
- **Grade distribution** charts are available in Canvas but hidden deep in the analytics tab. Surface key stats directly
  on the gradebook (average, median, high/low).
- Plan for a `metadata JSONB` column in `activity_events` from day one — retrofitting event granularity later is
  painful.

---

## 8. Assessment Engine

### What it is

The quiz and test system — allows teachers to create structured assessments with auto-gradeable question types (multiple
choice, true/false, fill-in-the-blank) and manually-graded types (short answer, essay).

### How existing platforms do it

- **Moodle:** Best-in-class quiz engine — 15+ question types, question banks, randomized questions, adaptive mode,
  detailed item analysis.
- **Canvas:** Quizzes.Next (New Quizzes) — good variety, item banks, partial credit. The transition from Classic Quizzes
  has been rough.
- **Google Classroom:** Uses Google Forms — simple, effective for basic quizzes, but no item banks or randomization.
- **Blackboard:** Advanced assessment tools with pools, partial credit, and adaptive testing.
- **Brightspace:** Comprehensive quiz engine with question libraries and adaptive release.

### How to build it — Luminescence

**Database (planned — quizzes are not yet in the schema; add in a future migration):**

```sql
-- New enum — quizzes have their own question type distinct from content_type
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'essay');

CREATE TABLE quizzes
(
    id             uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    class_id       uuid         NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    title          varchar(255) NOT NULL,
    instructions   text,
    time_limit_min int, -- NULL = no time limit
    attempts       int          NOT NULL DEFAULT 1,
    shuffle_q      boolean      NOT NULL DEFAULT FALSE,
    due_date       timestamptz,
    created_at     timestamptz           DEFAULT now()
);

CREATE TABLE questions
(
    id       uuid PRIMARY KEY       DEFAULT gen_random_uuid(),
    quiz_id  uuid          NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    type     question_type NOT NULL,
    body     text          NOT NULL,
    points   int           NOT NULL DEFAULT 1,
    position int           NOT NULL DEFAULT 0
);

CREATE TABLE question_options
(
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid    NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    body        text    NOT NULL,
    is_correct  boolean NOT NULL DEFAULT FALSE,
    position    int     NOT NULL DEFAULT 0
);

CREATE TABLE quiz_attempts
(
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id      uuid    NOT NULL REFERENCES quizzes (id),
    student_id   uuid    NOT NULL REFERENCES users (id),
    started_at   timestamptz      DEFAULT now(),
    submitted_at timestamptz,
    score        numeric(6, 2),
    auto_graded  boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE question_responses
(
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id      uuid NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
    question_id     uuid NOT NULL REFERENCES questions (id),
    selected_option uuid REFERENCES question_options (id), -- for multiple_choice / true_false
    text_response   text                                   -- for short_answer / essay
);
```

**Auto-grading logic (Go — pure function, called from a Gin handler after quiz submission):**

```go
func AutoGrade(responses []QuestionResponse, questions []Question) float64 {
var total, earned float64
for _, q := range questions {
total += float64(q.Points)
if q.Type == "multiple_choice" || q.Type == "true_false" {
for _, r := range responses {
if r.QuestionID == q.ID && r.SelectedOption != nil {
if isCorrect(*r.SelectedOption) {
earned += float64(q.Points)
}
}
}
}
// short_answer and essay are flagged for manual teacher review
}
if total == 0 {
return 0
}
return earned / total * 100
}

// Called from the Gin submission handler:
func (cfg *apiConfig) submitQuiz(c *gin.Context) {
// ... bind body, load questions, call AutoGrade ...
score := AutoGrade(responses, questions)
c.JSON(http.StatusOK, gin.H{"score": score, "requires_manual_review": hasEssay})
}
```

### Where to improve on existing platforms

- **Canvas "New Quizzes"** migration has been a source of teacher frustration — don't split quiz systems. Build one
  unified assessment engine from the start.
- **Google Forms quizzes** have no time limits or attempt tracking. Add both from day one.
- Implement a **question bank** (reusable questions across quizzes) even in v1 — it saves teachers enormous time.
- Add **shuffle questions and answers** randomization to deter cheating, which most platforms have but is often an
  afterthought in custom builds.

---

## 9. File & Media Management

### What it is

The infrastructure for uploading, storing, and serving files — student submission attachments, teacher-provided
materials, profile avatars, and feedback audio recordings.

### How existing platforms do it

- **Google Classroom:** Uses Google Drive — teachers and students have unlimited storage within their Google Workspace
  account.
- **Canvas:** Amazon S3-backed storage. Institutions purchase storage tiers.
- **Moodle:** Local server storage by default; can be configured for S3 or other backends.
- **Schoology:** Cloud-based file storage with Drive and OneDrive integration.

### How to build it — Luminescence

**Architecture (Docker Compose environment):**

- Local development: use a local `MinIO` container (S3-compatible API, free, self-hosted)
- Production: swap for AWS S3 or Cloudflare R2 (cheaper egress than S3)

```yaml
# docker-compose.yml addition
minio:
  image: minio/minio
  ports:
    - "9000:9000"
    - "9001:9001"
  environment:
    MINIO_ROOT_USER: lum_user
    MINIO_ROOT_PASSWORD: lum_password
  command: server /data --console-address ":9001"
  volumes:
    - minio_data:/data
```

**Upload flow:**

1. Client requests a pre-signed upload URL: `POST /v1/api/files/presign` → returns `{ url, key }`
2. Client uploads directly to MinIO/S3 (no Go server in the middle — avoids memory pressure on the Gin server)
3. Client confirms upload: `POST /v1/api/files/confirm { key, filename, size, mime_type }` → Gin handler records
   metadata in DB
4. File URL/key is stored as `content` in the `materials` table or as an attachment reference on `user_assignments`

**Database (planned — not yet in schema):**

```sql
CREATE TABLE files
(
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id uuid         NOT NULL REFERENCES users (id),
    key         text         NOT NULL UNIQUE, -- MinIO/S3 object key
    filename    varchar(255) NOT NULL,
    mime_type   varchar(100) NOT NULL,
    size_bytes  bigint       NOT NULL,
    created_at  timestamptz      DEFAULT now()
);
```

**Gin presign handler (Go):**

```go
func (cfg *apiConfig) presignUpload(c *gin.Context) {
var body struct {
Filename string `json:"filename" binding:"required"`
MimeType string `json:"mime_type" binding:"required"`
}
if err := c.ShouldBindJSON(&body); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
key := uuid.New().String() + "/" + body.Filename
url, err := cfg.Storage.PresignPut(key, 15*time.Minute)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate upload URL"})
return
}
c.JSON(http.StatusOK, gin.H{"url": url, "key": key})
}

### Where to improve on existing platforms

- Most platforms serve files through the LMS backend, which becomes a bottleneck.The pre-signed URL pattern removes the
backend from the data path entirely.
- **Canvas** gives each institution a storage quota that causes anxiety.Be transparent — show users their storage usage
per class.
- Add **virus scanning** on upload (ClamAV container) before confirming the file — a feature absent from most K-12
platforms but important for school security policies.

---

## 10. Search & Discovery

### What it is

The ability for users to quickly find content — assignments, materials, classes, people — without navigating menus.
Often overlooked in LMS design but critical for productivity.

### How existing platforms do it

- **Canvas:** Global search across assignments, discussions, pages, and files.Works well.
- **Google Classroom:** No global search — you must navigate to each class to find content.
- **Moodle:** Global search (requires configuration), searches all course content.
- **Schoology:** Basic search limited to courses, groups, and resources.

### How to build it — Luminescence

**PostgreSQL full-text search (no external dependency in v1):**

```sql
-- The assignments table uses 'title' and 'details' (not 'description') — match the real column name
ALTER TABLE assignments
    ADD COLUMN search_vec tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(title, '') || ' ' || coalesce(details, ''))
        ) STORED;

CREATE INDEX assignments_search_idx ON assignments USING GIN (search_vec);

-- Query example (used by the Gin /v1/api/search handler)
SELECT id, title, class_id
FROM assignments
WHERE search_vec @@ plainto_tsquery('english', $1)
ORDER BY ts_rank(search_vec, plainto_tsquery('english', $1)) DESC
LIMIT 20;
```

> **Note:** `plainto_tsquery` is safer than `to_tsquery` for user-supplied input — it handles punctuation and multi-word
> phrases without crashing on special characters.

**Frontend search UI:**

- Global search bar in the navbar (keyboard shortcut: `Cmd+K` / `Ctrl+K`)
- Results grouped by type: Classes, Assignments, Materials, People
- Debounced input (300ms) hits `GET /v1/api/search?q=...`

**Gin search handler:**

```go
func (cfg *apiConfig) search(c *gin.Context) {
q := c.Query("q")
if q == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "query param 'q' is required"})
return
}
results, err := cfg.DB.SearchAssignments(c, q)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"results": results})
}

// Registered in main.go:
router.GET("/v1/api/search", authMiddleware(), cfg.search)
```

### Where to improve on existing platforms

- **Google Classroom's lack of search** is its biggest UX failure. Make search a first-class feature from day one.
- Add **recent items** (last 5 visited classes/assignments) to the search dropdown even before the user types — reduces
  click depth significantly.
- Plan to migrate to **PostgreSQL full-text search with `pg_trgm`** for fuzzy matching in v2, without needing a separate
  search service.

---

## 11. Accessibility & Inclusivity

### What it is

Designing the LMS so that students with disabilities — visual, motor, cognitive, hearing — can fully participate. This
is both a legal requirement (ADA, Section 508, WCAG) and a pedagogical imperative.

### Standards to target

- **WCAG 2.1 AA** (minimum) — colour contrast, keyboard navigation, screen reader labels
- **WCAG 2.1 AAA** (aspirational) — enhanced contrast, no timing requirements
- **Section 508** — US federal accessibility standard for school-receiving federal funds

### How to build it — Luminescence

**Tailwind setup for accessibility:**

```tsx
// Ensure all interactive elements have focus styles
// tailwind.config.ts
module.exports = {
    theme: {
        extend: {
            // High contrast focus ring
            ringColor: {DEFAULT: '#2563eb'},
            ringWidth: {DEFAULT: '3px'},
        },
    },
}

// Every button/link component should have:
className = "... focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
```

**Key practices:**

- All images have meaningful `alt` text (or `alt=""` for decorative images)
- Form inputs always have associated `<label>` elements
- Color is never the sole indicator of state — use icons and text too
- All interactive elements reachable by keyboard (Tab, Enter, Space, Arrow keys)
- Announcements to screen readers via `role="alert"` or `aria-live="polite"`
- Modal dialogs trap focus correctly using `aria-modal="true"` and `aria-labelledby`

**Content accessibility checker (future feature):**

- When a teacher uploads a file or pastes text, run it through an accessibility check
- Warn if: images lack alt text, heading levels skip (h1 → h3), colour contrast fails
- D2L Brightspace does this — it is a meaningful differentiator

### Where to improve on existing platforms

- **Moodle** supports 120+ languages but its RTL (right-to-left) support is inconsistent. Build with RTL in mind from
  the start by using Tailwind's `rtl:` variant.
- Most LMS platforms bolt on accessibility at the end. Start with an **accessibility checklist** in the PR review
  process.
- **Reduced motion:** respect `prefers-reduced-motion` for animations — wrap all transitions in a media query check.

---

## 12. Integration Layer

### What it is

The set of APIs, protocols, and hooks that allow Luminescence to connect with external tools — video conferencing,
plagiarism checkers, digital textbooks, SIS systems — without rebuilding everything in-house.

### Key standards

| Standard             | Purpose                                                                      | Priority |
|----------------------|------------------------------------------------------------------------------|----------|
| **LTI 1.3**          | Embed third-party tools (quizzes, simulations, textbooks) into courses       | High     |
| **OneRoster**        | Sync student/teacher rosters from SIS (PowerSchool, Infinite Campus)         | High     |
| **OAuth 2.0 / OIDC** | SSO — let users log in with Google, Microsoft, or district identity provider | High     |
| **xAPI (Tin Can)**   | Track learning activities from external tools                                | Medium   |
| **REST Webhooks**    | Push events to external systems (e.g. grade passback to SIS)                 | Medium   |
| **SCORM 1.2 / 2004** | Run packaged eLearning content from third-party publishers                   | Low (v2) |

### How to build it — Luminescence

**OAuth 2.0 / Google SSO (highest-value, lowest effort first):**

```go
// Use golang.org/x/oauth2 — already available as a transitive dep via golang.org/x/crypto
var googleOAuthConfig = &oauth2.Config{
ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
Scopes:       []string{"openid", "email", "profile"},
Endpoint:     google.Endpoint,
}

// Gin route handlers in main.go:
router.GET("/auth/google", func (c *gin.Context) {
url := googleOAuthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOnline)
c.Redirect(http.StatusTemporaryRedirect, url)
})

router.GET("/auth/google/callback", func (c *gin.Context) {
// Exchange code → token → fetch user info → upsert user → issue JWT
code := c.Query("code")
token, err := googleOAuthConfig.Exchange(c, code)
// ... upsert user into users table, respond with JWT
_ = token
c.JSON(http.StatusOK, gin.H{"token": "..."})
})
```

**Webhook outbox pattern (reliable grade passback — planned):**

```sql
CREATE TABLE webhook_events
(
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text  NOT NULL, -- e.g. 'grade.updated', 'submission.created'
    payload    jsonb NOT NULL,
    target_url text  NOT NULL,
    sent_at    timestamptz,
    attempts   int   NOT NULL   DEFAULT 0,
    created_at timestamptz      DEFAULT now()
);
```

A background Go goroutine (started in `main.go` alongside `router.Run()`) polls `webhook_events WHERE sent_at IS NULL`,
sends the HTTP POST using the standard `net/http` client, and marks `sent_at`. Failed attempts retry with exponential
backoff.

### Where to improve on existing platforms

- **LTI 1.3** is complex to implement but eliminates the need to build video conferencing, advanced quizzing, and
  plagiarism detection in-house. Prioritize it in v2.
- **OneRoster** integration with PowerSchool alone covers ~50% of U.S. K-12 schools. Implement it before building a
  manual CSV import.
- Canvas has a great REST API but its documentation is disorganised. Document Luminescence's API from day one with
  OpenAPI/Swagger specs.

---

## 13. Authentication & Security

### What it is

How users prove they are who they say they are, and how the system protects data from unauthorised access.

### How to build it — Luminescence

**JWT-based auth (stateless — works well with Gin + Next.js):**

```
Login flow:
1. POST /v1/api/auth/login { email, password }
2. Gin handler: verify bcrypt hash against users.password, generate JWT
   - Access token: 15min expiry, signed with JWT_SECRET
   - Refresh token: 7d expiry, stored as httpOnly cookie
3. Access token returned in JSON body → stored in Zustand (in-memory only)
4. Every API request includes: Authorization: Bearer <access_token>
5. Gin auth proxy: validate JWT signature and expiry, set user claims in c.Set()
6. On 401: client silently uses refresh token cookie to fetch new access token
```

> **Current schema note:** The `users` table does not yet have a `password` column — add it in the next migration when
> implementing login. Use `varchar(255)` to store the bcrypt hash.

```sql
ALTER TABLE users
    ADD COLUMN password varchar(255);
```

**Gin auth proxy:**

```go
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
return func (c *gin.Context) {
authHeader := c.GetHeader("Authorization")
if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
return
}
tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
claims, err := parseJWT(tokenStr, jwtSecret)
if err != nil {
c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
return
}
c.Set("userID", claims.UserID)
c.Set("userRole", claims.Role)
c.Next()
}
}

// Applied in main.go:
protected := router.Group("/v1/api").Use(AuthMiddleware(os.Getenv("JWT_SECRET")))
protected.GET("/classes", cfg.getClasses)
protected.POST("/classes", cfg.createClass)
```

**Rate limiting on the login endpoint (Gin proxy):**

```go
// Using golang.org/x/time/rate — already available via golang.org/x/net transitive dep
var loginLimiter = rate.NewLimiter(rate.Every(time.Minute), 10) // 10 attempts/minute per process

func RateLimit() gin.HandlerFunc {
return func (c *gin.Context) {
if !loginLimiter.Allow() {
c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
return
}
c.Next()
}
}

router.POST("/v1/api/auth/login", RateLimit(), cfg.login)
```

**Environment variables (already loaded via `godotenv` in `main.go`):**

```env
JWT_SECRET=<random 256-bit hex string>
DATABASE_URL=postgres://user:pass@db:5432/lms
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**FERPA / COPPA considerations (K-12 specific):**

- Do not expose any student's real name, email, or grade to another student via API
- Enforce row-level scoping: all queries filter by the requesting user's class memberships
- Log all admin-level data access to an audit table
- Do not use third-party analytics (Google Analytics) on pages that display student data

### Where to improve on existing platforms

- **Moodle** still supports MD5 password hashing for legacy reasons — a security risk. Enforce bcrypt only.
- Most platforms expose student IDs in URL paths (`/student/12345/grades`). Use UUIDs (already in the schema) — they are
  non-sequential and harder to enumerate.
- Add **device session management** — let users see and revoke active sessions (like Google's "Signed in devices") — no
  major LMS has this for teachers/students.

---

## 14. Mobile & Offline Experience

### What it is

The quality of the LMS experience on a smartphone or tablet, and the ability to access content without an internet
connection — critical in schools with unreliable wifi.

### How existing platforms do it

- **Canvas:** Native iOS/Android apps (Student, Teacher, Parent). Offline limited to downloaded files.
- **Google Classroom:** Native app. Offline via Google Drive (files) + Docs (text). Works well.
- **Brightspace Pulse:** Excellent native app with offline reading and notification centre.
- **Moodle:** Native Moodle app with offline sync for course content.

### How to build it — Luminescence

**Phase 1 — Mobile-responsive web (current):**

- All Tailwind layouts use responsive prefixes: `sm:`, `md:`, `lg:`
- Touch targets ≥ 44×44px (WCAG 2.1 success criterion 2.5.5)
- Avoid hover-only interactions — use tap-friendly patterns

**Phase 2 — Progressive Web App (PWA):**

```js
// next.config.ts — enable PWA with next-pwa
const withPWA = require('next-pwa')({dest: 'public', disable: process.env.NODE_ENV === 'development'})
module.exports = withPWA({ /* existing config */})
```

Add a `manifest.json` with app name, icons, and `display: "standalone"`. Service worker caches:

- The app shell (layout, navigation)
- Recently visited class pages and their assignments
- Downloaded materials (PDFs, text)

**Offline-first for submissions:**

- Students type assignment text into a form; it saves to `localStorage` on every keystroke
- On reconnect, the client detects connectivity and auto-submits the draft
- Show a clear "Saved offline — will submit when connected" banner

### Where to improve on existing platforms

- **Google Classroom's** offline support only works because Drive handles it. A PWA with service workers can achieve the
  same without a third-party dependency.
- **Canvas Teacher app** has a reduced feature set compared to the web — mobile-responsive web (PWA) can eliminate this
  gap without maintaining a separate native codebase.
- Test on low-end Android devices (not just iPhones) — many K-12 students in lower-income districts rely on budget
  Android phones. Performance budget: First Contentful Paint < 2s on 3G.

---

## Summary: Build Priority Roadmap

| Phase        | Features                                                                           | Status / Goal                   |
|--------------|------------------------------------------------------------------------------------|---------------------------------|
| **v0 (Now)** | Gin server, `classes` CRUD (`/v1/api/classes`), basic DB schema, Docker Compose    | ✅ Live skeleton                 |
| **v1**       | Auth (JWT + bcrypt), user roles, assignments, submissions, gradebook, file uploads | MVP for a real classroom        |
| **v2**       | Grading UI, rubrics, announcements, parent portal, notifications (SSE), search     | Production-ready                |
| **v3**       | Quiz engine, LTI 1.3, OneRoster SIS sync, PWA/offline, AI features                 | Competitive with market leaders |

### Key architectural decisions to make early

1. **Storage backend:** MinIO locally → S3/R2 in production. Add the MinIO service to `docker-compose.yml` now —
   migration is painful later.
2. **Auth tokens:** httpOnly cookie for refresh token, Zustand in-memory for access token. Never `localStorage` for
   JWTs.
3. **Gin route prefix:** Current pattern is `/v1/api/...` — keep it consistent across all future handlers.
4. **Event log:** Add `activity_events` table now — you cannot reconstruct past behaviour without it.
5. **UUIDs everywhere:** Already in use via `github.com/google/uuid` — keep it, do not switch to integer IDs.
6. **OpenAPI spec:** Generate from the Gin handler signatures from the start (e.g. `swaggo/gin-swagger`) — the frontend
   and integration partners will thank you.
7. **sqlc queries:** Keep all SQL in `sql/queries/` and regenerate with `sqlc generate` after every schema change —
   never write raw SQL strings in Go handlers.

---

*Deep dive companion to `LMS_RESEARCH.md` — Luminescence LMS project, February 2026*
*Stack: Next.js 15 · TypeScript · Tailwind CSS · Zustand · Go · Gin v1.11 · sqlc · lib/pq · PostgreSQL · Docker Compose*

