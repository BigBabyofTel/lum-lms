# Current Codebase Pacing Guide

Checked against the local codebase on May 27, 2026.

This guide replaces the older pacing assumptions in the `LMS` folder with a current-state plan based on what is actually implemented in `frontend/` and `backend/`. The older documents are still useful as product direction, but many of their "planned" items are now partially built, fully built, or stale.

## Source Files Reviewed

Planning/reference files reviewed:

- `LMS/CLASS_ENROLLMENT_TASKS.md`
- `LMS/ENROLLMENT_MODAL_IMPLEMENTATION_PLAN.md`
- `LMS/IMPLEMENTATION_PLAN.md`
- `LMS/LMS_CORE_FEATURES.md`
- `LMS/LMS_MVP_COMPLETE_GUIDE.md`
- `LMS/LMS_MVP_PACING_GUIDE.md`
- `LMS/LMS_RESEARCH.md`
- `LMS/PHASE_0_EXIT_CRITERIA_LOG.md`
- `LMS/TESTING_GUIDE.md`
- `LMS/phases/PHASE_0_FOUNDATIONS.md`
- `LMS/phases/PHASE_1_AUTHENTICATION.md`
- `LMS/phases/PHASE_2_CLASSES_AND_ASSIGNMENTS.md`
- `LMS/phases/PHASE_3_SUBMISSIONS_AND_GRADING.md`
- `LMS/phases/PHASE_4_COMMUNICATION_AND_PARENTS.md`
- `LMS/phases/PHASE_5_POLISH_AND_LAUNCH.md`
- `LMS/phases/STREAM_COMMENTS_IMPLEMENTATION.md`

Code areas checked:

- backend schema, sqlc queries, generated database code
- backend auth, middleware, route registration, class/enrollment handlers
- backend handler tests
- frontend API helpers, stores, schemas, types
- frontend dashboard, admin/student management, class pages, classwork, people pages
- frontend modals, sidebar, class cards, login/register flow

## Verification Snapshot

Backend tests:

```bash
cd backend
go test ./...
```

Result: passed.

Note: the first sandboxed run passed tests but failed when Go tried to trim its build cache outside the workspace. Re-running with filesystem permission for the Go cache completed cleanly.

Frontend lint:

```bash
cd frontend
bun run lint
```

Current result: fails because of an existing `react-hooks/set-state-in-effect` error in `frontend/components/providers/theme-provider.tsx`. There are also existing hook dependency warnings in dashboard/layout and modal files. The enrollment modal no longer has the unescaped apostrophe lint error.

## Current Product State

The project is no longer at the original Phase 0/Phase 1 starting point. It is now best described as:

> Phase 2A: authentication, class CRUD, and enrollment are partially functional; assignment/submission/grading/parent portal remain mostly unimplemented.

### Completed Or Mostly Completed

Backend:

- Goose-style schema files exist with `-- +goose Up` / `-- +goose Down`.
- `users` has `password` and student `grade`.
- `classes` has `color`.
- `assignments`, `topics`, `user_assignments`, `posts`, `comments`, and `class_enrollments` tables exist.
- Auth routes exist for register, login, refresh, logout.
- Password hashing is implemented with Argon2id, not bcrypt.
- JWT access tokens are implemented.
- Refresh token cookie exists.
- Rate limiting exists on login.
- Auth middleware protects class routes.
- Class CRUD routes exist.
- Role-scoped `GET /api/v1/classes` exists for teacher/student.
- Class detail verifies teacher ownership or student enrollment.
- Enrollment routes exist:
  - `POST /api/v1/classes/:classId/enroll`
  - `GET /api/v1/classes/:classId/students`
  - `DELETE /api/v1/classes/:classId/students/:studentId`
  - `GET /api/v1/students/:studentId/classes`
  - `GET /api/v1/classes/:classId/students/:studentId/enrollment`
  - `POST /api/v1/students/:studentId/enrollments`
- Backend tests cover auth requirement, class listing/detail, class update/delete, enrollment, batch enrollment, and enrollment access guards.

Frontend:

- Next.js dashboard shell exists.
- Zustand user and class stores exist.
- Central `apiFetch` exists and retries one refresh on 401.
- Login/register actions exist.
- Dashboard fetches classes from the store.
- Sidebar renders classes from the class store.
- Class creation modal exists.
- Create student modal exists.
- Enrollment modal is now substantially implemented.
- Search SVG exists at `frontend/public/icons/search.svg`.
- Admin/student page opens the enrollment modal for a selected student.

## Stale Assumptions In Older LMS Docs

These older guide assumptions should no longer drive the next sprint unchanged:

- The old docs refer to `/v1/api/...`; the actual backend route prefix is `/api/v1/...`.
- Some docs say the backend does not compile; current backend tests pass.
- Some docs call for bcrypt; the current code uses Argon2id. Keep Argon2id unless there is a deliberate reason to switch.
- Some docs say password/color migrations are pending; those columns are already in current schema files.
- Some docs suggest class enrollment routes are still needed; they now exist.
- Some docs treat the enrollment UI as not started; it is now underway and should be finished/stabilized.
- Some docs assume assignments are wired; current assignment/classwork frontend is mock data and backend assignment routes do not exist.
- Some docs assume stream/announcements are wired; current stream frontend is mock data and `posts` does not have `class_id`.
- Some docs assume a parent portal; the current code has parent role validation but no parent-link schema, routes, or UI.

## High-Risk Gaps To Fix Before New Features

### 1. Frontend Route/API Inconsistency

The backend uses:

```txt
/api/v1
```

Some older docs and snippets use:

```txt
/v1/api
```

Current code mostly uses `/api/v1`, but future work must avoid copying old `/v1/api` snippets from the LMS docs.

### 2. `apiFetch` Base URL Typo

`frontend/lib/api.ts` has:

```ts
process.env.NEXT_PUBLIB_API_URL
```

That appears to be a typo. It should likely be:

```ts
process.env.NEXT_PUBLIC_API_URL
```

Because browser-side `getBaseUrl()` builds from the current hostname, this may only show up in server-side usage or tests. Still fix it early.

### 3. User Store Does Not Persist Role

`useUserStore.setUser()` does not set `type`, even though `type` exists in the store state.

Current consequence:

- role-based frontend rendering cannot reliably use `useUserStore((state) => state.type)`.
- admin page currently hardcodes `role` as `teacher`.

Fix before building student/parent views.

### 4. Student Fetch Endpoint Is Public-ish

`GET /api/v1/auth/` returns students and is registered under auth routes without auth middleware.

Current frontend `getAllStudents()` calls it without an access token.

Before production:

- move this to a protected teacher/admin route, or
- protect the existing route, and
- return sanitized users only.

### 5. Frontend Server Actions Mix Direct Fetch And `apiFetch`

`frontend/lib/actions.ts` uses direct `fetch` and manual token passing. Stores use `apiFetch`.

This makes auth refresh and error behavior inconsistent.

Preferred direction:

- use `apiFetch` for client-side API calls,
- keep server actions only where Next server action behavior is truly needed,
- do not duplicate API response parsing in multiple places.

### 6. Assignment Schema Exists But Assignment API Is Missing

Tables exist:

- `assignments`
- `topics`
- `user_assignments`

But backend routes/handlers/queries for assignment CRUD, submissions, and gradebook are not implemented.

### 7. Mock UI Still Dominates Class Pages

These pages are currently mock-driven:

- `frontend/app/dashboard/class/[id]/page.tsx`
- `frontend/app/dashboard/class/[id]/classwork/page.tsx`
- `frontend/app/dashboard/class/[id]/people/page.tsx`
- class layout title data

This should be resolved before Phase 3 features.

### 8. Lint Is Not Clean

`bun run lint` currently fails on:

- `frontend/components/providers/theme-provider.tsx`

And warns on hook dependencies in:

- `frontend/app/dashboard/layout.tsx`
- `frontend/components/modals/class-form-modal.tsx`
- `frontend/components/modals/create-student-modal.tsx`

This is a stabilization task before scaling frontend work.

## Revised MVP Definition

Given the current code, the realistic next MVP should be:

1. Teacher can register/login/logout.
2. Teacher can create, view, update, and delete classes.
3. Teacher can create students.
4. Teacher can enroll students in classes from the enrollment modal.
5. Student can login and see enrolled classes.
6. Teacher can post assignments/materials to a class.
7. Student can view classwork and submit text.
8. Teacher can grade submissions.
9. Student can see grade and feedback.

Parent portal and announcement stream should move to post-MVP unless you want a longer MVP timeline.

## Revised Pacing Plan

Assumption: one developer, 4-6 focused hours per day.

Estimated duration from the current code state: 5-7 focused weeks.

## Phase A — Stabilize Current Foundation

Estimated duration: 3-5 days.

Goal: make the current auth/classes/enrollment foundation dependable before adding assignments.

### A1. Fix frontend lint blockers

Tasks:

- Fix `theme-provider.tsx` lint error.
- Resolve or explicitly suppress hook dependency warnings where safe.
- Run `bun run lint` cleanly.

Exit criteria:

- `bun run lint` has no errors.
- Remaining warnings, if any, are intentional and documented.

### A2. Fix frontend auth/store correctness

Tasks:

- Fix `NEXT_PUBLIB_API_URL` typo.
- Store user `type` in `useUserStore.setUser()`.
- Verify login sets `id`, `email`, `first_name`, `last_name`, `type`, and `access_token`.
- Remove hardcoded `role = 'teacher'` in admin page and use store role.

Exit criteria:

- Teacher-only UI uses real logged-in role.
- Student/parent users do not see teacher admin controls accidentally.

### A3. Protect student roster access

Tasks:

- Replace unprotected `GET /api/v1/auth/` student listing with a protected route.
- Restrict to teacher/admin intent.
- Update `getAllStudents()` to send auth or use `apiFetch`.

Exit criteria:

- Anonymous users cannot list students.
- Teacher can still open the admin students page.

### A4. Finish enrollment modal behavior

Current status: visually and behaviorally close, but still needs QA.

Tasks:

- Confirm `fetchStudentClasses()` unwraps `{ classes }` response.
- Confirm `batchEnroll()` sends `Content-Type` and `class_ids`.
- Verify mobile layout after recent changes.
- Verify already-enrolled rows are checked and disabled.
- Verify new selections submit and refresh correctly.
- Decide whether the modal is add-only or full manage-enrollment.

Exit criteria:

- Teacher can enroll one or more students into one or more classes from UI.
- Reopening modal shows correct enrollment state.
- No mobile overflow like the previous screenshot.

## Phase B — Replace Mock Class Views With Real Data

Estimated duration: 4-6 days.

Goal: class detail, people, and classwork pages should read real backend data before assignments are added.

### B1. Class layout real data

Tasks:

- Fetch `GET /api/v1/classes/:classId` in class layout or page-level state.
- Replace `classData` mock in `frontend/app/dashboard/class/[id]/layout.tsx`.
- Set navbar title from real class subject/grade.
- Handle loading, not found, and forbidden states.

Exit criteria:

- `/dashboard/class/:id` title and tabs reflect the real class.
- Unauthorized class access displays an appropriate error/redirect.

### B2. People page real data

Tasks:

- Fetch `GET /api/v1/classes/:classId/students`.
- Replace mock `teachers` and `students`.
- Show empty state when no students are enrolled.
- Show current teacher as class owner if backend response supports it; otherwise add endpoint data later.

Exit criteria:

- People tab reflects the actual roster.
- Teacher can verify enrollment from the People page.

### B3. Sidebar class scroll and mobile behavior

Tasks:

- Make the class list inside `frontend/components/sidebar.tsx` scroll independently.
- Keep user header, bottom nav, and help button fixed.
- Split To-do from scrollable enrolled classes if desired.

Exit criteria:

- Long class lists do not push bottom sidebar controls off-screen.

## Phase C — Assignment Backend

Estimated duration: 6-8 days.

Goal: implement the assignment/material API using the existing schema.

### C1. sqlc assignment queries

Add queries for:

- create assignment/material
- list class assignments/materials
- get assignment by id
- update assignment
- delete assignment
- create user assignment rows for enrolled students
- get user assignment for one student

Exit criteria:

- `sqlc generate` succeeds.
- Generated code is used by handlers, no raw SQL in handlers.

### C2. Assignment routes and handlers

Add protected routes:

```txt
POST   /api/v1/classes/:classId/assignments
GET    /api/v1/classes/:classId/assignments
GET    /api/v1/assignments/:assignmentId
PUT    /api/v1/assignments/:assignmentId
DELETE /api/v1/assignments/:assignmentId
```

Rules:

- teacher can create/update/delete only in owned classes,
- teacher and enrolled student can list/view,
- creating an assignment should create `user_assignments` rows for currently enrolled students,
- materials may not need user assignment rows.

Exit criteria:

- Backend tests cover each route and access rule.
- Teachers cannot mutate another teacher's assignment.
- Students cannot view assignments for unenrolled classes.

### C3. Assignment frontend API helpers

Tasks:

- Add typed API helpers or store methods.
- Update `Class`/`Assignment` TypeScript types to match backend JSON.
- Add Zod schema for assignment/material form.

Exit criteria:

- Frontend can fetch assignment data without mock arrays.

## Phase D — Classwork UI

Estimated duration: 4-6 days.

Goal: replace mock classwork page with real assignment/material data.

Tasks:

- Replace mock `topics` in `classwork/page.tsx`.
- Fetch class assignments from API.
- Render loading, empty, and error states.
- Add teacher create-assignment/create-material modal.
- Add assignment detail route.
- Keep student view read-only for assignment list.

Exit criteria:

- Teacher can create an assignment and see it in Classwork.
- Student can see assignments for enrolled classes.
- Empty classwork state is polished.

## Phase E — Submissions

Estimated duration: 5-7 days.

Goal: student can submit text work.

### E1. Schema migration

Add to `user_assignments`:

- `submission_text`
- `submitted_at`

Optional but useful:

- `feedback`
- `graded_by`
- `graded_at`

The old Phase 3 docs split these across submission and grading. It is reasonable to add all columns in one migration if you are already touching the table.

### E2. Backend submission route

Add:

```txt
POST /api/v1/assignments/:assignmentId/submit
```

Rules:

- student only,
- verify student is enrolled in the assignment's class,
- prevent overwriting graded work,
- update status to `submitted`.

### E3. Student assignment detail UI

Tasks:

- Build `/dashboard/class/:classId/assignment/:assignmentId`.
- Add textarea.
- Add local draft autosave.
- Show submitted/graded/missing states.

Exit criteria:

- Student can submit and re-open the assignment to see current state.

## Phase F — Grading

Estimated duration: 5-7 days.

Goal: teacher can grade submitted work and student can see feedback.

Backend routes:

```txt
GET   /api/v1/assignments/:assignmentId/submissions
PATCH /api/v1/user-assignments/:userAssignmentId/grade
GET   /api/v1/classes/:classId/gradebook
```

Rules:

- teacher only,
- teacher must own class,
- grade range validation,
- feedback length validation.

Frontend tasks:

- submission list for teacher,
- grading panel/form,
- student grade/feedback display,
- gradebook page or table.

Exit criteria:

- Teacher can grade.
- Student sees grade and feedback.
- Gradebook returns a complete student x assignment matrix.

## Phase G — Stream And Parent Portal

Estimated duration: 2-3 weeks.

Recommendation: move this out of the immediate MVP unless parent visibility is a hard requirement.

### G1. Stream

Current state:

- `posts` and `comments` tables exist.
- `posts` does not have `class_id`.
- stream frontend uses mock posts.

Needed:

- add `posts.class_id`,
- add announcement queries,
- add class announcement routes,
- wire stream page.

### G2. Parent portal

Current state:

- role enum includes `parent`.
- register/login can create parent users.
- no parent/student link schema,
- no parent routes,
- no parent dashboard.

Needed:

- `parent_student_links` table,
- parent link endpoint,
- parent-scoped class/grade/assignment endpoints,
- parent dashboard UI,
- strict access tests.

## Updated Priority Backlog

### P0 — Must Fix Before More Feature Work

- Fix frontend lint blocker in `theme-provider.tsx`.
- Fix `NEXT_PUBLIC_API_URL` typo.
- Store and use real user role in `useUserStore`.
- Protect student roster endpoint.
- Confirm enrollment modal works end-to-end.
- Make sidebar class list independently scrollable.

### P1 — MVP Core Academic Loop

- Assignment sqlc queries.
- Assignment CRUD routes.
- Real classwork page.
- Assignment detail page.
- Submission columns and submit route.
- Grading route and UI.
- Gradebook endpoint.

### P2 — Polish Needed Before Classroom Trial

- Loading/empty/error states on every dashboard/class page.
- Toasts or action feedback.
- Better API error messages.
- Mobile QA across dashboard/sidebar/modals/class pages.
- Remove mock data.
- Ensure all protected frontend routes redirect correctly.

### P3 — Post-MVP

- Announcement stream.
- Parent portal.
- File uploads.
- Notifications.
- Analytics/reporting.
- Admin console.

## Recommended 4-Week Sprint Plan

This assumes a smaller MVP focused on teacher/student academic flow, not parent portal.

### Week 1: Stabilization And Enrollment

Deliverables:

- clean frontend lint,
- role stored and used correctly,
- protected student roster endpoint,
- enrollment modal verified,
- sidebar scroll fixed,
- dashboard/class links verified.

### Week 2: Assignment API And Classwork

Deliverables:

- assignment sqlc queries,
- assignment CRUD handlers and tests,
- classwork page fetches real API data,
- teacher can create assignment/material.

### Week 3: Submission Flow

Deliverables:

- submission/feedback schema migration,
- submit endpoint,
- assignment detail page,
- student can submit text,
- draft autosave.

### Week 4: Grading And MVP QA

Deliverables:

- submissions endpoint,
- grade endpoint,
- gradebook endpoint,
- teacher grading UI,
- student grade/feedback UI,
- full teacher/student QA script passes.

## QA Journey For The Revised MVP

Use this as the acceptance test.

### Journey 1: Teacher Setup

1. Register/login as teacher.
2. Create a class.
3. Create two student accounts.
4. Enroll both students into the class.
5. Verify People tab shows both students.

### Journey 2: Assignment Creation

1. Open class as teacher.
2. Create assignment.
3. Verify Classwork shows assignment.
4. Verify each enrolled student receives a `user_assignments` row.

### Journey 3: Student Work

1. Login as student.
2. Verify enrolled class appears on dashboard.
3. Open classwork.
4. Open assignment.
5. Submit text.
6. Reopen assignment and verify submission persists.

### Journey 4: Teacher Grading

1. Login as teacher.
2. Open assignment submissions.
3. See submitted student work.
4. Enter grade and feedback.
5. Save.

### Journey 5: Student Feedback

1. Login as student.
2. Open assignment.
3. Confirm grade and feedback are visible.

## Technical Notes For Future Work

### Route Prefix

Use `/api/v1`, not `/v1/api`.

### Password Hashing

Keep Argon2id unless intentionally changing the auth package. Do not copy bcrypt-specific implementation tasks from older docs without updating them.

### Response Shapes

Current class list APIs return wrapped responses:

```json
{
  "classes": []
}
```

Frontend helpers should unwrap this consistently.

### Access Control

Every handler that touches a class should verify one of:

- teacher owns the class,
- student is enrolled,
- parent is linked to the student.

The parent condition is future work.

### Testing

Continue the current sqlmock pattern for handler tests. It is already covering access control well and should be extended to assignments/submissions.

## Current Status Summary

The project has made meaningful progress beyond the original documents:

- Auth is implemented enough for protected routes.
- Class CRUD exists.
- Enrollment backend is strong and tested.
- Enrollment frontend is close.
- Backend tests pass.

The next mistake to avoid is jumping to parent portal or stream before assignment/submission/grading exists. The fastest path to a usable LMS is to finish the teacher/student academic loop first.
