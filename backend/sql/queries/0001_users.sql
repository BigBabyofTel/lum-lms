-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = sqlc.arg(email)
LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (id, first_name, last_name, email, password, type, grade, created_at)
VALUES (gen_random_uuid(),
        sqlc.arg(first_name),
        sqlc.arg(last_name),
        sqlc.arg(email),
        sqlc.arg(password),
        sqlc.arg(type),
        sqlc.arg(grade),
        NOW())
RETURNING *;

-- name: GetStudents :many
SELECT *
FROM users
WHERE type = 'student';

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = sqlc.arg(id)
LIMIT 1;

