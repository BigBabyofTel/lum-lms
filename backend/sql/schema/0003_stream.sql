-- +goose Up
CREATE TABLE posts
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    author_id  uuid REFERENCES users (id) ON DELETE CASCADE,
    parent_id  uuid REFERENCES posts (id) ON DELETE CASCADE, -- Renamed post_id to parent_id for clarity
    content    text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE TABLE comments
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    post_id    uuid REFERENCES posts (id) ON DELETE CASCADE,
    author_id  uuid REFERENCES users (id) ON DELETE CASCADE,
    content    text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- +goose Down

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
