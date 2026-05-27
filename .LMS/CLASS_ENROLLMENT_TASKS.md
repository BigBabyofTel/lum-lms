# Class Enrollment Tasks

## Goal

Build a complete class enrollment feature using `backend/sql/queries/0005_class_enrollment.sql`.

This feature needs backend routes, handlers, frontend fetch functions, UI wiring, and basic verification.

## Current SQL Queries Available

The project already has these database operations:

```sql
EnrollStudent
UnenrollStudent
GetStudentClasses
GetClassStudents
GetEnrolledStudentIDs
IsStudentEnrolled
```

These queries are enough to build:

- Enroll a student in a class.
- Unenroll a student from a class.
- Get all students in a class.
- Get all classes for a student.
- Check if a student is enrolled in a class.
- Batch enroll a student into many classes.

## Backend Routes Needed

Recommended route set:

```txt
POST   /api/v1/classes/:classId/enroll
DELETE /api/v1/classes/:classId/students/:studentId
GET    /api/v1/classes/:classId/students
GET    /api/v1/students/:studentId/classes
GET    /api/v1/classes/:classId/students/:studentId/enrollment
POST   /api/v1/students/:studentId/enrollments
```

The project already has:

```txt
POST /api/v1/classes/:id/enroll
GET  /api/v1/classes/:id/students
```

The main missing routes are:

```txt
DELETE /api/v1/classes/:classId/students/:studentId
GET    /api/v1/students/:studentId/classes
GET    /api/v1/classes/:classId/students/:studentId/enrollment
POST   /api/v1/students/:studentId/enrollments
```

## Backend Handlers Needed

### 1. UnenrollStudent

Purpose:

```txt
Remove a student from a class.
```

Uses SQL query:

```sql
UnenrollStudent
```

Handler responsibilities:

- Parse `classId` from the URL.
- Parse `studentId` from the URL.
- Get the logged-in user from the JWT.
- Verify the user is allowed to manage enrollment.
- Verify the teacher owns the class if teachers can only manage their own classes.
- Call `h.DB.UnenrollStudent`.
- Return success JSON.

Example response:

```json
{
  "message": "student unenrolled"
}
```

### 2. GetStudentClasses

Purpose:

```txt
Return all classes a student is enrolled in.
```

Uses SQL query:

```sql
GetStudentClasses
```

Handler responsibilities:

- Parse `studentId` from the URL.
- Verify the logged-in user is allowed to view this student.
- Call `h.DB.GetStudentClasses`.
- Return classes.

Example response:

```json
{
  "classes": []
}
```

### 3. CheckStudentEnrollment

Purpose:

```txt
Return true or false for whether a student is enrolled in one class.
```

Uses SQL query:

```sql
IsStudentEnrolled
```

Handler responsibilities:

- Parse `classId`.
- Parse `studentId`.
- Verify the logged-in user has access.
- Call `h.DB.IsStudentEnrolled`.
- Return the boolean result.

Example response:

```json
{
  "enrolled": true
}
```

### 4. BatchEnrollStudent

Purpose:

```txt
Enroll one student into multiple classes in one request.
```

Uses SQL query:

```sql
EnrollStudent
```

Request body:

```json
{
  "class_ids": [
    "class-id-1",
    "class-id-2",
    "class-id-3"
  ]
}
```

Handler responsibilities:

- Parse `studentId` from the URL.
- Parse `class_ids` from the JSON body.
- Verify the student exists.
- Verify the user type is `student`.
- Verify the logged-in user can manage each class.
- Loop over `class_ids`.
- Call `h.DB.EnrollStudent` for each class.
- Track successful enrollments.
- Track already-enrolled classes.
- Track failed classes.
- Return a summary.

Example response:

```json
{
  "student_id": "student-id",
  "enrolled": ["class-id-1"],
  "already_enrolled": ["class-id-2"],
  "failed": []
}
```

## Backend Permission Rules To Decide

Recommended for the current app:

- Teacher: can enroll or unenroll students only in classes they own.
- Student: can view their own enrolled classes.
- Student: cannot enroll or unenroll themselves.
- Parent: no enrollment management for now.
- Admin: if added later, can manage all classes.

The current `role` enum only has:

```sql
'teacher', 'student', 'parent'
```

Unless an `admin` role is added, use teacher-only management for enrollment changes.

## Backend Helper Functions

The backend already has this useful helper:

```go
requireTeacherOwnedClass
```

Use it for routes where the class ID is in the URL.

For batch enrollment, each class ID is in the JSON body, so use one of these approaches:

- Loop over class IDs and verify each class belongs to the teacher.
- Create a helper like `requireTeacherOwnedClassByID(c, classID)`.

That helper would:

- Get the logged-in user ID.
- Verify the user is a teacher.
- Get the class by ID.
- Verify `class.teacher_id` equals the logged-in user ID.
- Return the class or an error.

## Frontend API Functions Needed

### 1. Fetch Classes

The backend returns:

```json
{
  "classes": []
}
```

So the frontend should unwrap it:

```ts
return data.classes ?? [];
```

### 2. Fetch Student Classes

Route:

```txt
GET /api/v1/students/:studentId/classes
```

Purpose:

```txt
Know which classes should display as already enrolled.
```

### 3. Batch Enroll Student

Route:

```txt
POST /api/v1/students/:studentId/enrollments
```

Body:

```ts
{
  class_ids: selectedIds;
}
```

### 4. Unenroll Student

Route:

```txt
DELETE /api/v1/classes/:classId/students/:studentId
```

Purpose:

```txt
Remove a student from a class if the UI supports unenrollment.
```

## Frontend Modal State Needed

The modal needs these state values:

```ts
const [classes, setClasses] = useState<Class[]>([]);
const [studentClasses, setStudentClasses] = useState<Class[]>([]);
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [query, setQuery] = useState('');
const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
```

## Frontend Modal Data Flow

When the modal opens:

1. Fetch all classes.
2. Fetch classes the selected student is already enrolled in.
3. Save all classes in `classes` state.
4. Save the student's enrolled classes in `studentClasses` state.
5. Preselect already-enrolled class IDs.

Example logic:

```ts
const enrolledIds = studentClasses.map((classItem) => classItem.id);
setSelectedIds(enrolledIds);
```

## Frontend Display Logic

For each class row, show:

- Checkbox.
- Class subject.
- Grade or period.
- Teacher if available.
- Status badge.

Status badge logic:

```ts
const alreadyEnrolled = enrolledIds.includes(classItem.id);
```

Show either:

```txt
Already enrolled
```

or:

```txt
Not enrolled
```

## Frontend Submit Logic

When clicking `Enroll Student`:

1. Compare `selectedIds` to `enrolledIds`.
2. Only submit newly selected class IDs.
3. Send those IDs to the batch enroll endpoint.
4. Show an error if the request fails.
5. Refresh student classes or close the modal.

Do not resend already-enrolled class IDs unless the backend handles them gracefully.

Use:

```ts
const newClassIds = selectedIds.filter((id) => !enrolledIds.includes(id));
```

Then submit:

```ts
body: JSON.stringify({
  class_ids: newClassIds,
});
```

## Optional Unenroll Behavior

If the modal should also remove unchecked classes:

```txt
Compare enrolledIds to selectedIds.
Anything enrolled before but unchecked now should be unenrolled.
```

Logic:

```ts
const classIdsToUnenroll = enrolledIds.filter(
  (id) => !selectedIds.includes(id)
);
```

Then call:

```txt
DELETE /api/v1/classes/:classId/students/:studentId
```

for each one.

If the button should only enroll, do not allow unchecking already-enrolled classes, or ignore unenroll behavior.

## Recommended First Version

Keep it simple:

- Already-enrolled classes are checked and disabled.
- Not-enrolled classes can be checked.
- `Enroll Student` only enrolls newly checked classes.
- Unenroll is handled somewhere else later.

This avoids accidental removal.

## Testing Checklist

### Backend

- Teacher can enroll a student in an owned class.
- Teacher cannot enroll a student in another teacher's class.
- Student cannot enroll another student.
- Duplicate enrollment does not crash.
- Get class students returns the correct students.
- Get student classes returns the correct classes.
- Unenroll removes enrollment.
- `IsStudentEnrolled` returns true or false correctly.
- Batch enroll works with multiple class IDs.
- Batch enroll reports already-enrolled classes.

### Frontend

- Modal loads all classes.
- Modal shows the selected student.
- Already-enrolled classes show as checked.
- Already-enrolled classes show `Already enrolled`.
- Search filters classes.
- Selecting classes updates the selected count.
- Submit sends only new selected classes.
- Submit disables the button while loading.
- Errors display in the modal.
- After success, the modal closes or refreshes.

## Suggested Build Order

1. Confirm SQL queries generate correctly with sqlc.
2. Add missing backend handlers.
3. Add missing backend routes.
4. Test backend routes with HTTP requests.
5. Add frontend API functions.
6. Build modal data loading.
7. Add checkbox and selected state logic.
8. Wire `Enroll Student` button.
9. Add loading and error states.
10. Verify the full flow in the browser.
