-- name: CreateClass :one
INSERT INTO classes (id, created_at, updated_at, subject, grade, teacher_id)
VALUES (gen_random_uuid(),
        NOW(),
        NOW(),
        sqlc.arg(subject),
        sqlc.arg(grade),
        sqlc.arg(teacher_id))
RETURNING *;

-- name: GetClassByID :one
SELECT *
FROM classes
WHERE id = sqlc.arg(id)
LIMIT 1;

-- name: GetClassByTeacherID :many
SELECT *
FROM classes
WHERE teacher_id = sqlc.arg(teacher_id);

-- name: UpdateClass :one
UPDATE classes
SET subject    = sqlc.arg(subject),
    grade      = sqlc.arg(grade),
    color      = sqlc.arg(color),
    updated_at = NOW()
WHERE id = sqlc.arg(id)
  AND teacher_id = sqlc.arg(teacher_id)
RETURNING *;

-- name: GetClasses :many
SELECT *
FROM classes
WHERE teacher_id = sqlc.arg(teacher_id);

-- name: DeleteClass :exec
DELETE
FROM classes
WHERE id = sqlc.arg(id)
  AND teacher_id = sqlc.arg(teacher_id);