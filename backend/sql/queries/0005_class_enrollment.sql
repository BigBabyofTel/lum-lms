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