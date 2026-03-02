# Phase 4 — Communication & Parent Portal (Week 9)

> **Part of:** [LMS MVP Pacing Guide](../LMS_MVP_PACING_GUIDE.md)  
> **Dates:** Apr 27 – May 1, 2026  
> **Estimated hours:** 20–30 hrs (4–6 hrs/day × 5 days)  
> **Depends on:** [Phase 3](./PHASE_3_SUBMISSIONS_AND_GRADING.md) — full submission/grading cycle working

---

## Goal

Teachers can post announcements to the class stream. Parents can create an account, link to their child, log in, and
see a focused view of their child's grades, upcoming assignments, and class announcements — without having access to
any other student's data.

This phase adds the two stakeholder groups most often neglected in LMS builds: the **class community** (stream) and
**parents**. Done well, these two features significantly increase engagement and district satisfaction scores.

---

## Table of Contents

1. [Week 9 — Stream & Parent View](#week-9--stream--parent-view)
2. [Schema Changes Required](#schema-changes-required)
3. [API Endpoint Reference](#api-endpoint-reference)
4. [Where Luminescence Improves on Existing Platforms](#where-luminescence-improves-on-existing-platforms)
5. [Deliverables & Exit Criteria](#deliverables--exit-criteria)
6. [References](#references)

---

## Week 9 — Stream & Parent View

### Day-by-Day Breakdown

#### Monday — Announcements CRUD

The existing `posts` table in the schema has `author_id`, `parent_id` (for threaded replies), `content`, and
timestamps. It is missing a `class_id` to scope posts to a class. Add it:

```sql
-- 0008_posts_class_id.sql
-- +goose Up
ALTER TABLE posts
    ADD COLUMN class_id uuid REFERENCES classes (id) ON DELETE CASCADE;

CREATE INDEX idx_posts_class_id ON posts (class_id);

-- +goose Down
ALTER TABLE posts
    DROP COLUMN class_id;
```

**sqlc queries:**

```sql
-- sql/queries/posts.sql

-- name: CreateAnnouncement :one
INSERT INTO posts (id, author_id, class_id, content, created_at)
VALUES (gen_random_uuid(),
        sqlc.arg(author_id),
        sqlc.arg(class_id),
        sqlc.arg(content),
        NOW())
RETURNING *;

-- name: GetAnnouncementsByClass :many
SELECT p.*,
       u.first_name AS author_first_name,
       u.last_name  AS author_last_name,
       u.avatar,
       u.avatar_color
FROM posts p
         JOIN users u ON u.id = p.author_id
WHERE p.class_id = sqlc.arg(class_id)
  AND p.parent_id IS NULL -- top-level posts only (not replies)
ORDER BY p.created_at DESC;

-- name: GetPostReplies :many
SELECT p.*,
       u.first_name AS author_first_name,
       u.last_name  AS author_last_name
FROM posts p
         JOIN users u ON u.id = p.author_id
WHERE p.parent_id = sqlc.arg(parent_id)
ORDER BY p.created_at ASC;

-- name: DeleteAnnouncement :exec
DELETE
FROM posts
WHERE id = sqlc.arg(id)
  AND author_id = sqlc.arg(author_id); -- only the author can delete their post
```

**Announcement endpoints:**

```go
// POST /v1/api/classes/:id/announcements — teacher only
func (cfg *apiConfig) createAnnouncement(c *gin.Context) {
if c.MustGet("userRole").(string) != "teacher" {
c.JSON(http.StatusForbidden, gin.H{"error": "teachers only"})
return
}
classID, _ := uuid.Parse(c.Param("id"))
teacherID := c.MustGet("userID").(uuid.UUID)

// Verify teacher owns this class
class, err := cfg.DB.GetClassByID(c, classID)
if err != nil || class.TeacherID.UUID != teacherID {
c.JSON(http.StatusForbidden, gin.H{"error": "not your class"})
return
}

var params struct {
Content string `json:"content" binding:"required"`
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

post, err := cfg.DB.CreateAnnouncement(c, database.CreateAnnouncementParams{
AuthorID: teacherID,
ClassID:  uuid.NullUUID{UUID: classID, Valid: true},
Content:  params.Content,
})
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusCreated, gin.H{"post": post})
}

// GET /v1/api/classes/:id/announcements — teacher and enrolled students
func (cfg *apiConfig) getAnnouncements(c *gin.Context) {
classID, _ := uuid.Parse(c.Param("id"))
announcements, err := cfg.DB.GetAnnouncementsByClass(c, uuid.NullUUID{UUID: classID, Valid: true})
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"announcements": announcements})
}
```

---

#### Tuesday — Class Stream Page (Frontend)

Wire `app/dashboard/class/[id]/page.tsx` — this is the default Stream tab when opening a class:

```typescript
// Fetch announcements on mount
const {data} = await apiFetch<{ announcements: Announcement[] }>(
    `/v1/api/classes/${classId}/announcements`
)
```

**Stream UI layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Stream                                                     │
├─────────────────────────────────────────────────────────────┤
│  [Teacher only: compose box]                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ What would you like to announce to your class?       │  │
│  │                                                       │  │
│  │                                          [Post]       │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌ Mr. Baker ─── Apr 28 at 9:00am ─────────────────────┐   │
│  │ Reminder: Math Quiz on Friday. Please review Ch.4.  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌ Mr. Baker ─── Apr 25 at 2:30pm ─────────────────────┐   │
│  │ Welcome to Mathematics! Syllabus is posted below.   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Role-based rendering:**

```tsx
const userRole = useUserStore(s => s.type)

{
    userRole === 'teacher' && (
        <ComposeBox onPost={handlePost}/>
    )
}

{
    announcements.map(post => (
        <AnnouncementCard key={post.id} post={post} canDelete={userRole === 'teacher'}/>
    ))
}
```

---

#### Wednesday — Parent Student Link Migration

```sql
-- 0009_parent_student_links.sql
-- +goose Up
CREATE TABLE parent_student_links
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    parent_id  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    student_id uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (parent_id, student_id)
);

CREATE INDEX idx_psl_parent_id ON parent_student_links (parent_id);
CREATE INDEX idx_psl_student_id ON parent_student_links (student_id);

-- +goose Down
DROP TABLE IF EXISTS parent_student_links;
```

**sqlc queries:**

```sql
-- sql/queries/parent_links.sql

-- name: LinkParentToStudent :one
INSERT INTO parent_student_links (id, parent_id, student_id, created_at)
VALUES (gen_random_uuid(), sqlc.arg(parent_id), sqlc.arg(student_id), NOW())
ON CONFLICT (parent_id, student_id) DO NOTHING
RETURNING *;

-- name: GetLinkedStudents :many
SELECT u.*
FROM users u
         JOIN parent_student_links psl ON psl.student_id = u.id
WHERE psl.parent_id = sqlc.arg(parent_id);

-- name: IsParentLinked :one
SELECT EXISTS (SELECT 1
               FROM parent_student_links
               WHERE parent_id = sqlc.arg(parent_id)
                 AND student_id = sqlc.arg(student_id)) AS linked;
```

**Enrollment flow for parents:**  
When a parent registers, they supply their child's email address. The backend looks up the student by email and creates
the link:

```go
// POST /v1/api/parent/link
func (cfg *apiConfig) linkParentToStudent(c *gin.Context) {
if c.MustGet("userRole").(string) != "parent" {
c.JSON(http.StatusForbidden, gin.H{"error": "parents only"})
return
}
parentID := c.MustGet("userID").(uuid.UUID)

var params struct {
StudentEmail string `json:"student_email" binding:"required,email"`
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

student, err := cfg.DB.GetUserByEmail(c, params.StudentEmail)
if err != nil || string(student.Type) != "student" {
// Return same vague error to prevent email enumeration
c.JSON(http.StatusNotFound, gin.H{"error": "student not found"})
return
}

link, err := cfg.DB.LinkParentToStudent(c, database.LinkParentToStudentParams{
ParentID:  parentID,
StudentID: student.ID,
})
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusCreated, gin.H{"link": link})
}
```

---

#### Thursday — Parent-Scoped API Endpoints

**`ParentGuard` middleware** — validates the parent is linked to the student in the path:

```go
func (cfg *apiConfig) ParentGuard() gin.HandlerFunc {
return func (c *gin.Context) {
if c.MustGet("userRole").(string) != "parent" {
c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "parents only"})
return
}
parentID := c.MustGet("userID").(uuid.UUID)
studentID, err := uuid.Parse(c.Param("student_id"))
if err != nil {
c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid student id"})
return
}
linked, err := cfg.DB.IsParentLinked(c, database.IsParentLinkedParams{
ParentID:  parentID,
StudentID: studentID,
})
if err != nil || !linked {
c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "not linked to this student"})
return
}
c.Set("studentID", studentID)
c.Next()
}
}
```

**Parent endpoints:**

```go
parentGroup := protected.Group("/parent")

// List linked students
parentGroup.GET("/students", cfg.getLinkedStudents)

// Student-scoped endpoints — all pass through ParentGuard
studentGroup := parentGroup.Group("/students/:student_id").Use(cfg.ParentGuard())
studentGroup.GET("/classes", cfg.getStudentClassesForParent)
studentGroup.GET("/grades", cfg.getStudentGradesForParent)
studentGroup.GET("/assignments", cfg.getStudentUpcomingAssignments)
```

**Grade endpoint (parent view):**

```sql
-- name: GetStudentGradesForParent :many
SELECT a.title,
       a.due_date,
       ua.grade,
       ua.status,
       ua.feedback,
       ua.graded_at,
       c.subject AS class_subject
FROM user_assignments ua
         JOIN assignments a ON a.id = ua.assignment_id
         JOIN classes c ON c.id = a.class_id
WHERE ua.student_id = sqlc.arg(student_id)
ORDER BY a.due_date DESC NULLS LAST;
```

---

#### Friday — Parent Dashboard (Frontend)

Role-based routing: when a user logs in with `type === 'parent'`, the dashboard renders a completely different layout:

```typescript
// app/dashboard/page.tsx
const userType = useUserStore(s => s.type)

if (userType === 'parent') {
    return <ParentDashboard / >
}
return <TeacherStudentDashboard / >
```

**`ParentDashboard` component:**

```
Parent Dashboard
────────────────
My Children

┌─────────────────────────────────────────────────────────────┐
│  Jane Doe                                            Grade 5 │
│                                                              │
│  Classes: Mathematics · Science · English                    │
│                                                              │
│  📋 3 assignments due this week                              │
│  ✅ 12 graded · 🔴 1 missing · ⏳ 2 pending                  │
│                                                              │
│  [View Grades]   [View Assignments]                          │
└─────────────────────────────────────────────────────────────┘
```

**Grades view** (per child):

```
Jane Doe — Grades
─────────────────────────────────────────────────────────
Subject       Assignment          Due       Grade  Status
─────────────────────────────────────────────────────────
Mathematics   Math Quiz           Apr 5     87     ✅ Graded
Mathematics   Essay Draft         Apr 8     —      ⏳ Submitted
Science       Lab Report          Apr 2     91     ✅ Graded
English       Reading Response    Apr 10    —      🔴 Missing
─────────────────────────────────────────────────────────
```

---

## Schema Changes Required

| Migration File                  | Change                               | Reason                               |
|---------------------------------|--------------------------------------|--------------------------------------|
| `0008_posts_class_id.sql`       | Add `class_id uuid` to `posts` table | Scope announcements to a class       |
| `0009_parent_student_links.sql` | Create `parent_student_links` table  | Track parent → student relationships |

---

## API Endpoint Reference

| Method   | Path                                      | Role                        | Description                   |
|----------|-------------------------------------------|-----------------------------|-------------------------------|
| `POST`   | `/v1/api/classes/:id/announcements`       | Teacher (owner)             | Create announcement           |
| `GET`    | `/v1/api/classes/:id/announcements`       | Teacher, Student (enrolled) | Get class stream              |
| `DELETE` | `/v1/api/announcements/:id`               | Author only                 | Delete own announcement       |
| `POST`   | `/v1/api/parent/link`                     | Parent                      | Link to a student by email    |
| `GET`    | `/v1/api/parent/students`                 | Parent                      | List linked students          |
| `GET`    | `/v1/api/parent/students/:id/classes`     | Parent (linked)             | Student's classes             |
| `GET`    | `/v1/api/parent/students/:id/grades`      | Parent (linked)             | Student's grades and feedback |
| `GET`    | `/v1/api/parent/students/:id/assignments` | Parent (linked)             | Upcoming assignments          |

---

## Where Luminescence Improves on Existing Platforms

### 1. Parents as First-Class Users (vs. Google Classroom Email-Only)

**The problem:**  
Google Classroom's guardian system sends automated weekly or daily email summaries — but only if a Guardian Summary is
enabled by the district admin. Parents cannot log in, see real-time data, or message teachers. The email summaries are
often delayed and contain outdated information.

**Luminescence approach:**  
Parents register with `type: 'parent'` and have a full login. Their dashboard is a real-time view of their child's
grades and upcoming work, sourced from the same database as the teacher's gradebook. No delay, no email setup, no
admin configuration required. A parent who checks the app at 10pm sees exactly what the teacher sees.

---

### 2. Scoped Parent View (vs. Canvas Observer Over-Exposure)

**The problem:**  
Canvas's Observer role gives parents access to everything the student sees — every assignment, every discussion post,
every classmate's name in the People tab. This exposes more data than most parents need and raises privacy concerns
(FERPA) since discussion posts from other students are visible.

**Luminescence approach:**  
The parent view is explicitly scoped to: **grades**, **assignments**, and **announcements** for their linked child
only. The `ParentGuard` middleware enforces this at the API layer — parents cannot request data for students they are
not linked to, and the frontend never renders classmate information. This is FERPA-compliant by design.

---

### 3. Student Email Linking (vs. Schoology's SIS-Dependent Enrollment)

**The problem:**  
Schoology's best-in-class parent portal requires parents to be linked via PowerSchool SIS — meaning the district IT
team must set up the integration. Schools without PowerSchool or with a delayed SIS rollout have no parent access at
all. This excludes smaller schools and independent schools entirely.

**Luminescence approach:**  
Parents link to students by typing their child's email address. No SIS, no admin intervention, no delay. The backend
looks up the student by email and creates the `parent_student_links` row. A parent can be linked within 2 minutes of
registering. Post-MVP, a teacher-issued link code can be added as an additional option.

---

### 4. Class Stream Threaded Replies (vs. Google Classroom's Flat Comments)

**The problem:**  
Google Classroom's Stream has flat comments — students can reply to an announcement but all replies appear at the same
level with no threading. When a teacher posts an announcement and 25 students comment, the stream becomes an unreadable
wall of text.

**Luminescence approach:**  
The `posts` table has a `parent_id` self-referential foreign key — replies are proper child rows. The API returns
top-level announcements and their replies separately. The frontend can render threaded conversations with visual
indentation. For MVP, replies are read-only; composing replies is a v1 feature.

---

### 5. Role-Based Dashboard Routing (vs. One-Size-Fits-All Dashboards)

**The problem:**  
Most LMS platforms show the same dashboard to all users with role-specific elements hidden or shown via CSS. Moodle
shows a "My courses" block to everyone. Canvas shows the same course card grid to teachers, students, and admins — the
difference is only which courses appear. This leads to a cluttered experience for each role.

**Luminescence approach:**  
`app/dashboard/page.tsx` routes to a completely different component tree based on `useUserStore().type`. The parent
dashboard is a purpose-built component — not a filtered version of the teacher dashboard. This means each role can
evolve independently without affecting the others, and no role sees irrelevant UI.

---

### 6. Anti-Enumeration on Student Lookup (vs. Canvas's Verbose Errors)

**The problem:**  
If Canvas's parent linking flow returned "student not found" for non-existent emails and "incorrect role" for existing
non-student emails, an attacker could enumerate the entire user database. Several LMS platforms have had this exact
vulnerability reported.

**Luminescence approach:**  
The parent link endpoint returns `"student not found"` for both cases — email doesn't exist, and email exists but
belongs to a teacher or admin. An attacker cannot tell the difference. This is consistent with the same principle
applied to the login endpoint in Phase 1.

---

## Deliverables & Exit Criteria

Phase 4 is complete when **all** of the following are true:

- [ ] `posts.class_id` column is migrated and indexed
- [ ] `parent_student_links` table is migrated and indexed
- [ ] `POST /v1/api/classes/:id/announcements` creates a post scoped to the class
- [ ] `GET /v1/api/classes/:id/announcements` returns posts with author info in reverse-chronological order
- [ ] The class Stream tab renders real announcements from the API
- [ ] Teachers see a compose box; students see the feed read-only
- [ ] `POST /v1/api/parent/link` links a parent to a student by student email
- [ ] `ParentGuard` middleware rejects requests from parents not linked to the student in the path
- [ ] `GET /v1/api/parent/students/:id/grades` returns the student's grades scoped to the parent's linked child only
- [ ] The parent dashboard renders when `type === 'parent'` after login
- [ ] Parents can see their child's grade list and upcoming assignments
- [ ] No parent can view another student's data via any API endpoint

---

## References

| Resource                                        | URL                                                                      |
|-------------------------------------------------|--------------------------------------------------------------------------|
| FERPA — what parents can access                 | https://studentprivacy.ed.gov/faq/what-rights-does-ferpa-give-parents    |
| COPPA — parental consent for under-13           | https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy |
| Schoology parent portal overview                | https://uc.powerschool-docs.com/en/schoology/latest/                     |
| Canvas Observer role documentation              | https://community.canvaslms.com/t5/Observer-Guide/tkb-p/observer         |
| Gin middleware chaining                         | https://gin-gonic.com/docs/examples/custom-middleware/                   |
| PostgreSQL self-referential FK (threaded posts) | https://www.postgresql.org/docs/current/ddl-constraints.html             |
| Next.js conditional rendering by role           | https://nextjs.org/docs/app/building-your-application/rendering          |

---

*Phase 4 of 5 — Luminescence LMS MVP · Target completion: May 1, 2026*

