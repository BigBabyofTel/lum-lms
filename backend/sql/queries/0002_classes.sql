-- name: CreateClass :one
INSERT INTO classes (id, created_at, updated_at, subject, grade, teacher_id)
VALUES (gen_random_uuid(),
        NOW(),
        NOW(),
        sqlc.arg(subject),
        sqlc.arg(grade),
        sqlc.arg(teacher_id))
RETURNING *;

-- name: UpdateClass :one
