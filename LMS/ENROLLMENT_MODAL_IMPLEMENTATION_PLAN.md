# Enrollment Modal Implementation Guide

This guide was checked against the current `frontend/components/modals/enrollment-modal.tsx` and `frontend/lib/actions.ts`.

The modal is still incomplete, but it has moved past the original stub. Some planned pieces have been added, some are only partially wired, and several current imports/state values are unused. This document reflects the current code state and the correct order to finish the work.

## Current Code State

### Current `enrollment-modal.tsx` status

The modal currently has:

- a backdrop,
- a modal card,
- a close button,
- title text of `Enrollment options`,
- a rough student block,
- local state for enrollment work,
- imports for `batchEnroll` and `fetchStudentClasses`,
- imports for `User` and `Class`,
- an image-based search icon using `/icons/search.svg`,
- placeholder text: `search bar available classes`.

The modal currently does not have:

- the screenshot title `Enroll Student in Class`,
- the subtitle text,
- a wide modal layout,
- a light bordered student summary card,
- initials avatar,
- access token from `useUserStore`,
- all available classes from `useClassStore`,
- an effect to fetch all classes,
- an effect to fetch the student's existing classes,
- derived enrollment state,
- a real search input,
- filtered class rows,
- checkboxes,
- `Already enrolled` / `Not enrolled` badges,
- submit behavior,
- footer actions,
- loading, empty, or error rendering.

### Current unused code in `enrollment-modal.tsx`

These are currently imported or declared but not used in the rendered behavior:

- `Search` from `lucide-react`
- `useEffect`
- `batchEnroll`
- `fetchStudentClasses`
- `studentClasses`
- `setStudentClasses`
- `selectedClassIds`
- `setSelectedClassIds`
- `searchTerm`
- `setSearchTerm`
- `isLoadingStudentClasses`
- `setIsLoadingStudentClasses`
- `isSubmitting`
- `setIsSubmitting`
- `error`
- `setError`

This likely causes TypeScript or ESLint warnings/errors depending on the project configuration.

### Current `batchEnroll` status

`batchEnroll` has been partially fixed.

It now accepts:

```ts
accessToken: string,
studentId: string,
classIds: string[]
```

It also sends:

```ts
body: JSON.stringify({
  class_ids: classIds,
})
```

However, it still needs two fixes:

- add `'Content-Type': 'application/json'`,
- avoid calling the backend when `classIds.length === 0`.

The backend rejects empty `class_ids`, and the request should explicitly declare JSON content.

## Backend Contract

The Go backend handler expects this request:

```txt
POST /api/v1/students/:studentId/enrollments
```

With headers:

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

With body:

```json
{
  "class_ids": ["class-id-1", "class-id-2"]
}
```

The backend handler binds this shape:

```go
var params struct {
    ClassIDs []uuid.UUID `json:"class_ids" binding:"required"`
}
```

It returns:

```json
{
  "student_id": "...",
  "enrolled": ["..."],
  "already_enrolled": ["..."],
  "failed": ["..."]
}
```

The frontend can ignore the response for a first pass, but using it later would improve error reporting.

## Data Limitations

The screenshot shows class metadata like:

```txt
Period 2 • Mr. Johnson
```

The current `Class` type only has:

```ts
export interface Class {
  id: string;
  subject: string;
  grade: number;
  teacher?: string;
  teacherId?: string | { UUID: string; Valid: boolean };
  createdAt?: string;
  updatedAt?: string;
}
```

There is no `period` field. Do not build production UI that depends on `period` unless the backend response and `Class` type are extended.

Recommended current metadata:

```tsx
Grade {classItem.grade} • {classItem.teacher ?? 'Teacher not assigned'}
```

Search placeholder should also match the available data:

```txt
Search classes by name, teacher, or grade
```

Use `period` in the placeholder only if the data model is extended.

## Recommended Product Behavior

Make this modal add-only for now.

Recommended behavior:

- already-enrolled classes render checked,
- already-enrolled classes show an `Already enrolled` badge,
- already-enrolled classes cannot be unchecked,
- not-enrolled classes can be checked or unchecked,
- submit sends only newly selected class IDs,
- no unenrollment happens from this modal.

Reason: the primary button says `Enroll Student`. If unchecking already-enrolled classes removes the student from those classes, the screen should be renamed to something like `Manage Enrollment` and the button should say `Save Changes`.

## Correct Implementation Order

Follow this order. It keeps the API contract, state, and UI aligned.

## Step 1: Finish `batchEnroll`

File:

```txt
frontend/lib/actions.ts
```

Current function is close, but update the guard and headers.

Target shape:

```ts
export async function batchEnroll(
  accessToken: string,
  studentId: string,
  classIds: string[]
): Promise<void> {
  if (!accessToken || classIds.length === 0) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/students/${studentId}/enrollments`,
      {
        method: 'POST',
        body: JSON.stringify({
          class_ids: classIds,
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return;
    return await response.json();
  } catch (err) {
    console.error(err);
  }
}
```

Why this comes first:

- the modal submit action depends on this helper,
- the Go backend requires `class_ids`,
- the backend rejects an empty class list.

## Step 2: Fix modal imports

File:

```txt
frontend/components/modals/enrollment-modal.tsx
```

Current imports:

```ts
import { X, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { batchEnroll, fetchStudentClasses } from '@/lib/actions';
import { User, Class } from '@/lib/types';
import Image from 'next/image';
```

Recommended final imports if using the saved SVG search icon:

```ts
import { X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { batchEnroll, fetchStudentClasses } from '@/lib/actions';
import { Class, User } from '@/lib/types';
import { useClassStore } from '@/store/useClassesStore';
import { useUserStore } from '@/store/useUserStore';
import Image from 'next/image';
```

Notes:

- Remove `Search` from `lucide-react` if using `/icons/search.svg`.
- Add `useMemo` for derived class lists and selected IDs.
- Add `useClassStore` to load all available classes.
- Add `useUserStore` to read `id` and `access_token`.
- Keep `Image` if rendering `/icons/search.svg`; remove it only if using inline initials and no SVG assets.

## Step 3: Read user state and class store state

The current modal no longer reads the user store or class store. It needs both.

Add:

```ts
const id = useUserStore((state) => state.id);
const accessToken = useUserStore((state) => state.access_token);
const fetchClasses = useClassStore((state) => state.fetchClasses);
const classes = useClassStore((state) => state.classes);
const isLoadingClasses = useClassStore((state) => state.isLoading);
const classLoadError = useClassStore((state) => state.error);
```

Why:

- `id` can guard initial class loading.
- `accessToken` is required by `fetchStudentClasses` and `batchEnroll`.
- `classes` is the source for `Available Classes`.
- loading/error values help render useful states.

## Step 4: Keep the existing local state

The modal already has the right state names:

```ts
const [studentClasses, setStudentClasses] = useState<Class[]>([]);
const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
const [searchTerm, setSearchTerm] = useState('');
const [isLoadingStudentClasses, setIsLoadingStudentClasses] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
```

Keep this state, but actually wire it into effects, derived values, and JSX.

## Step 5: Fetch all available classes

The screenshot requires an `Available Classes` list. That list should come from `useClassStore`.

Add:

```ts
useEffect(() => {
  if (!id) return;
  if (classes.length > 0) return;
  void fetchClasses();
}, [id, classes.length, fetchClasses]);
```

Without this, `filteredClasses` has no source data and the modal cannot render class rows.

## Step 6: Fetch the selected student's existing classes

Use the existing `fetchStudentClasses` helper.

Add:

```ts
useEffect(() => {
  if (!accessToken || !student.id) return;

  let cancelled = false;

  async function loadStudentClasses() {
    setIsLoadingStudentClasses(true);
    setError(null);

    try {
      const enrolledClasses = await fetchStudentClasses(accessToken, student.id);
      if (cancelled) return;

      setStudentClasses(enrolledClasses);
      setSelectedClassIds(new Set(enrolledClasses.map((classItem) => classItem.id)));
    } catch {
      if (!cancelled) {
        setError('Could not load this student enrollment status.');
      }
    } finally {
      if (!cancelled) {
        setIsLoadingStudentClasses(false);
      }
    }
  }

  void loadStudentClasses();

  return () => {
    cancelled = true;
  };
}, [accessToken, student.id]);
```

Why:

- the screenshot shows already-enrolled rows,
- this initializes those rows as checked,
- it allows badges to reflect real enrollment state.

## Step 7: Add derived values

Add these before `return`.

### Student initials

```ts
const studentInitials = `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}`.toUpperCase();
const initials = studentInitials || 'ST';
```

### Enrolled class IDs

```ts
const enrolledClassIds = useMemo(
  () => new Set(studentClasses.map((classItem) => classItem.id)),
  [studentClasses]
);
```

### Filtered classes

```ts
const filteredClasses = useMemo(() => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return classes;
  }

  return classes.filter((classItem) => {
    const subject = classItem.subject.toLowerCase();
    const teacher = classItem.teacher?.toLowerCase() ?? '';
    const grade = String(classItem.grade);

    return (
      subject.includes(normalizedSearch) ||
      teacher.includes(normalizedSearch) ||
      grade.includes(normalizedSearch)
    );
  });
}, [classes, searchTerm]);
```

### Newly selected IDs

```ts
const newClassIds = useMemo(
  () =>
    Array.from(selectedClassIds).filter(
      (classId) => !enrolledClassIds.has(classId)
    ),
  [selectedClassIds, enrolledClassIds]
);
```

## Step 8: Add checkbox selection logic

Add:

```ts
function toggleClassSelection(classId: string) {
  if (enrolledClassIds.has(classId)) {
    return;
  }

  setSelectedClassIds((current) => {
    const next = new Set(current);

    if (next.has(classId)) {
      next.delete(classId);
    } else {
      next.add(classId);
    }

    return next;
  });
}
```

This avoids mutating the existing `Set` in place and keeps React updates reliable.

## Step 9: Add submit behavior

Add:

```ts
async function handleSubmit() {
  if (!accessToken || newClassIds.length === 0) {
    return;
  }

  setIsSubmitting(true);
  setError(null);

  try {
    await batchEnroll(accessToken, student.id, newClassIds);
    const updatedStudentClasses = await fetchStudentClasses(accessToken, student.id);

    setStudentClasses(updatedStudentClasses);
    setSelectedClassIds(
      new Set(updatedStudentClasses.map((classItem) => classItem.id))
    );

    onClose?.();
  } catch {
    setError('Could not enroll student. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
}
```

Button should be disabled when:

```ts
isSubmitting || newClassIds.length === 0 || !accessToken
```

## Step 10: Replace the modal shell styling

Current card:

```tsx
className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full max-w-md mx-4"
```

Target:

```tsx
className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white p-6 shadow-xl"
```

Why:

- the screenshot modal is wider than `max-w-md`,
- `max-h-[90vh]` helps mobile and short viewports,
- class rows should scroll inside the modal instead of growing past the viewport.

## Step 11: Replace the header

Current title:

```tsx
Enrollment options
```

Target:

```tsx
<div className="mb-5 flex items-start justify-between">
  <div>
    <h2 className="text-2xl font-semibold text-slate-950">
      Enroll Student in Class
    </h2>
    <p className="mt-2 text-sm text-slate-600">
      Select the classes you'd like to enroll this student in.
    </p>
  </div>

  <button
    type="button"
    onClick={onClose}
    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
    aria-label="Close modal"
  >
    <X size={22} />
  </button>
</div>
```

## Step 12: Replace the student summary block

Current block uses:

```tsx
bg-slate-600
```

Target a light bordered card:

```tsx
<div className="mb-5 flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-base font-semibold text-violet-700">
    {initials}
  </div>

  <div className="min-w-0">
    <p className="font-semibold text-slate-950">
      {student.first_name} {student.last_name}
    </p>
    <p className="mt-1 text-sm text-slate-600">
      {student.grade ? `${student.grade}th Grade` : 'Grade not set'}
      {' '}• Student ID: {student.id}
    </p>
  </div>
</div>
```

Important:

- avoid `undefinedth Grade`,
- use initials instead of the generic user icon to match the screenshot.

## Step 13: Turn the search icon into a real search input

Current code renders only:

```tsx
<Image src="/icons/search.svg" ... />
search bar available classes
```

Replace it with a controlled input:

```tsx
<div className="relative mb-5">
  <Image
    src="/icons/search.svg"
    alt=""
    width={20}
    height={20}
    aria-hidden="true"
    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
  />
  <input
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
    placeholder="Search classes by name, teacher, or grade"
    className="h-12 w-full rounded-lg border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
  />
</div>
```

Note:

- `next/image` does not reliably apply `currentColor` to external SVG files the same way inline SVG does.
- If icon color control matters, use a CSS mask or inline the SVG as a React component.
- For this repo's current icon pattern, `Image` is acceptable if visual color control is not critical.

## Step 14: Add the available classes panel

Add:

```tsx
<div className="overflow-hidden rounded-lg border border-slate-200">
  <div className="border-b border-slate-200 px-4 py-3">
    <h3 className="text-sm font-semibold text-slate-800">
      Available Classes
    </h3>
  </div>

  <div className="max-h-96 overflow-y-auto">
    {/* loading, empty, and class rows go here */}
  </div>
</div>
```

## Step 15: Render class rows

Each row should include:

- checkbox,
- circular class icon or color marker,
- class subject,
- class metadata,
- enrollment badge.

Suggested badge classes:

```ts
const alreadyEnrolledBadge =
  'rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700';

const notEnrolledBadge =
  'rounded-md border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700';
```

Suggested row rendering:

```tsx
{filteredClasses.map((classItem, index) => {
  const isEnrolled = enrolledClassIds.has(classItem.id);
  const isSelected = selectedClassIds.has(classItem.id);
  const colorClass = classColors[index % classColors.length];

  return (
    <label
      key={classItem.id}
      className="flex cursor-pointer items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0"
    >
      <input
        type="checkbox"
        checked={isSelected}
        disabled={isEnrolled}
        onChange={() => toggleClassSelection(classItem.id)}
        className="h-5 w-5 rounded border-slate-300 text-blue-600"
      />

      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${colorClass}`}>
        {classItem.subject.slice(0, 1).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-950">{classItem.subject}</p>
        <p className="mt-1 text-sm text-slate-600">
          Grade {classItem.grade} • {classItem.teacher ?? 'Teacher not assigned'}
        </p>
      </div>

      <span className={isEnrolled ? alreadyEnrolledBadge : notEnrolledBadge}>
        {isEnrolled ? 'Already enrolled' : 'Not enrolled'}
      </span>
    </label>
  );
})}
```

Add colors before `return`:

```ts
const classColors = [
  'bg-emerald-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-blue-500',
  'bg-red-500',
  'bg-amber-500',
];
```

## Step 16: Add loading, empty, and error states

Inside the list panel:

```tsx
{(isLoadingClasses || isLoadingStudentClasses) && (
  <div className="px-4 py-8 text-center text-sm text-slate-500">
    Loading classes...
  </div>
)}

{!isLoadingClasses && !isLoadingStudentClasses && classes.length === 0 && (
  <div className="px-4 py-8 text-center text-sm text-slate-500">
    No classes available.
  </div>
)}

{!isLoadingClasses &&
  !isLoadingStudentClasses &&
  classes.length > 0 &&
  filteredClasses.length === 0 && (
    <div className="px-4 py-8 text-center text-sm text-slate-500">
      No classes match your search.
    </div>
  )}
```

Near the footer:

```tsx
{(error || classLoadError) && (
  <p className="mb-3 text-sm text-red-600">
    {error ?? classLoadError}
  </p>
)}
```

## Step 17: Add the footer

Add:

```tsx
<div className="mt-6 border-t border-slate-200 pt-4">
  {(error || classLoadError) && (
    <p className="mb-3 text-sm text-red-600">
      {error ?? classLoadError}
    </p>
  )}

  <div className="flex items-center justify-between gap-4">
    <p className="text-sm text-slate-700">
      {newClassIds.length} {newClassIds.length === 1 ? 'class' : 'classes'} selected
    </p>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || newClassIds.length === 0 || !accessToken}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Enrolling...' : 'Enroll Student'}
      </button>
    </div>
  </div>
</div>
```

The count uses `newClassIds.length`, so it reflects the number of new enrollments that will be submitted.

## Step 18: Clean up compile issues

After wiring the component, verify there are no unused values.

Common cleanup based on current code:

- remove `Search` import if using `/icons/search.svg`,
- keep `useEffect` only after effects are added,
- keep `batchEnroll` only after `handleSubmit` uses it,
- keep `fetchStudentClasses` only after the student enrollment effect uses it,
- keep local state only when the JSX or handlers use it.

## Step 19: Verification checklist

### Static checks

Run the frontend check used by the project.

Look for:

- no unused imports,
- no unused state declarations,
- no missing `Content-Type` on `batchEnroll`,
- no calls to `batchEnroll` without the third `classIds` argument,
- no direct mutation of `selectedClassIds`.

### Manual checks

1. Open the students page.
2. Open the enrollment modal.
3. Confirm title says `Enroll Student in Class`.
4. Confirm subtitle appears.
5. Confirm student card is light and bordered.
6. Confirm initials avatar is shown.
7. Confirm search input renders with `/icons/search.svg`.
8. Confirm all available classes render.
9. Confirm existing enrollments are checked and show `Already enrolled`.
10. Confirm not-enrolled classes show `Not enrolled`.
11. Search by subject, teacher, and grade.
12. Select a not-enrolled class.
13. Confirm selected count updates.
14. Submit.
15. Confirm request body contains `class_ids`.
16. Reopen modal and confirm newly enrolled class is now marked `Already enrolled`.

## Visual Acceptance Criteria

The completed modal should match the screenshot in these major ways:

- centered modal over dark backdrop,
- `max-w-2xl`-style width,
- title: `Enroll Student in Class`,
- subtitle under title,
- light bordered student summary card,
- initials avatar,
- search input under student summary,
- bordered `Available Classes` panel,
- scrollable class list,
- checkbox per class,
- colored circular marker per class,
- class subject and metadata,
- `Already enrolled` and `Not enrolled` badges,
- footer with selected count,
- `Cancel` button,
- blue `Enroll Student` button.

## Remaining Work Summary

Current modal progress is roughly:

- API helper: partially complete.
- Modal state: partially added.
- Search icon asset: complete.
- Class loading: missing.
- Existing enrollment loading: missing.
- Derived state: missing.
- Search input: missing.
- Class rows: missing.
- Submit handler: missing.
- Screenshot layout: mostly missing.

Recommended next action:

1. finish `batchEnroll`,
2. add `useClassStore` and `useUserStore`,
3. wire effects and derived values,
4. replace the JSX with the full screenshot structure.
