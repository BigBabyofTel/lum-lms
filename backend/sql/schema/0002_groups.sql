-- +goose Up
CREATE TYPE role AS ENUM ('teacher', 'student', 'parent');

CREATE TABLE users
(
    id           uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    first_name   varchar(255) NOT NULL,
    last_name    varchar(255) NOT NULL,
    email        varchar(255) NOT NULL UNIQUE,
    type         role         NOT NULL,
    avatar       varchar(255),
    avatar_color varchar(255),
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz
);

CREATE TABLE classes
(
    id              uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    subject         varchar(255) NOT NULL,
    num_of_students int          NOT NULL,
    grade           int          NOT NULL,
    teacher_id      uuid REFERENCES users (id),
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz
);

CREATE TABLE posts
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    author_id  uuid REFERENCES users (id),
    post_id    uuid REFERENCES posts (id) ON DELETE CASCADE,
    content    text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE TABLE comments
(
    id         uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    post_id    uuid REFERENCES posts (id) ON DELETE CASCADE,
    author_id  uuid REFERENCES users (id) ON DELETE CASCADE,
    content    text,
    avatar     varchar(255),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz

);

CREATE TABLE topics
(
    id            uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    name          varchar(255) NOT NULL,
    assignment_id uuid REFERENCES assignments (id),
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz
);
CREATE TYPE type AS ENUM ('assignment', 'material');

CREATE TABLE assignments
(
    id               uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    type             type        NOT NULL,
    title            varchar(255),
    class_id         uuid REFERENCES classes (id),
    details          text,
    assign_date      text,
    due_date         text,
    attachment_count int,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz
);

CREATE TYPE status AS ENUM ('assigned', 'submitted', 'graded', 'missing');

CREATE TABLE user_assignments
(
    id            uuid PRIMARY KEY     DEFAULT gen_random_uuid(),
    assignment_id uuid REFERENCES assignments (id) ON DELETE CASCADE,
    class_id      uuid REFERENCES classes (id),
    student_id    uuid REFERENCES users (id),
    grade         int,
    type          status      NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz
);

CREATE TABLE class_details (
    class_id uuid REFERENCES classes (id),
    topics
)


-- +goose Down
DROP TABLE users;
DROP TABLE classes;
DROP TABLE posts;
DROP TABLE comments;
