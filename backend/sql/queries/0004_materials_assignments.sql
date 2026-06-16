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
    sqlc.arg(attachment_count),
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
    attachment_count = sqlc.arg(attachment_count),
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteAssignment :exec
DELETE
FROM assignments
WHERE id = sqlc.arg(id);

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
    ua.feedback,
    ua.submitted_at,
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
    status = 'graded',
    updated_at = NOW()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: GetUserAssignmentByID :one
SELECT *
FROM user_assignments
WHERE id = sqlc.arg(id)
LIMIT 1;

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
