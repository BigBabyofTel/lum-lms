-- +goose Up


CREATE TYPE role AS ENUM ('teacher', 'student', 'parent');
CREATE TYPE content_type AS ENUM ('assignment', 'material');
CREATE TYPE assignment_status AS ENUM ('assigned', 'submitted', 'graded', 'missing');


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
    id         uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    subject    varchar(255) NOT NULL,
    grade      int          NOT NULL,
    teacher_id uuid         REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE TABLE assignments
(
    id               uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    type             content_type NOT NULL,
    title            varchar(255) NOT NULL,
    class_id         uuid REFERENCES classes (id) ON DELETE CASCADE,
    details          text,
    assign_date      timestamptz,
    due_date         timestamptz,
    attachment_count int                   DEFAULT 0,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz
);

CREATE TABLE topics
(
    id            uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    name          varchar(255) NOT NULL,
    assignment_id uuid         REFERENCES assignments (id) ON DELETE SET NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz
);

CREATE TABLE user_assignments
(
    id            uuid PRIMARY KEY           DEFAULT gen_random_uuid(),
    assignment_id uuid REFERENCES assignments (id) ON DELETE CASCADE,
    student_id    uuid REFERENCES users (id) ON DELETE CASCADE,
    grade         int,
    status        assignment_status NOT NULL DEFAULT 'assigned',
    created_at    timestamptz       NOT NULL DEFAULT now(),
    updated_at    timestamptz,
    -- Prevent duplicate assignments for the same student
    UNIQUE (assignment_id, student_id)
);

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

CREATE TABLE class_enrollments
(
    id          uuid PRIMARY KEY     default gen_random_uuid(),
    class_id    uuid        NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    student_id  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id)
);

-- +goose Down
DROP TABLE IF EXISTS class_enrollments;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS user_assignments;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS assignment_status;
DROP TYPE IF EXISTS content_type;
DROP TYPE IF EXISTS role;