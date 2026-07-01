-- name: CreatePost :one
INSERT INTO posts (id, class_id, author_id, content, created_at)
VALUES (gen_random_uuid(),
        sqlc.arg(class_id),
        sqlc.arg(author_id),
        sqlc.arg(content),
        NOW())
RETURNING *;

-- name: GetPostByID :one
SELECT *
FROM posts
WHERE id = sqlc.arg(id)
LIMIT 1;

-- name: GetPostsByClass :many
SELECT p.*,
       u.first_name,
       u.last_name
FROM posts p
         JOIN users u ON u.id = p.author_id
WHERE p.class_id = sqlc.arg(class_id)
ORDER BY p.created_at DESC;

-- name: DeletePost :exec
DELETE
FROM posts
WHERE id = sqlc.arg(id)
  AND author_id = sqlc.arg(author_id);

-- name: CreateComment :one
INSERT INTO comments (id, post_id, author_id, content, created_at)
VALUES (gen_random_uuid(),
        sqlc.arg(post_id),
        sqlc.arg(author_id),
        sqlc.arg(content),
        NOW())
RETURNING *;

-- name: GetCommentsByPost :many
SELECT c.*,
       u.first_name,
       u.last_name
FROM comments c
         JOIN users u ON u.id = c.author_id
WHERE c.post_id = sqlc.arg(post_id)
ORDER BY c.created_at;

-- name: DeleteComment :exec
DELETE
FROM comments
WHERE id = sqlc.arg(id)
  AND author_id = sqlc.arg(author_id);