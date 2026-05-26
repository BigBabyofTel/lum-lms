-- +goose Up

CREATE TYPE role AS ENUM ('teacher', 'student', 'parent');

CREATE TABLE users
(
    id           uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    first_name   varchar(255) NOT NULL,
    last_name    varchar(255) NOT NULL,
    email        varchar(255) NOT NULL UNIQUE,
    password     varchar(255),
    type         role         NOT NULL,
    grade        int
        CONSTRAINT users_grade_role_check
            CHECK (
                (type = 'student' AND grade IS NOT NULL)
                    OR
                (type <> 'student' AND grade IS NULL)
                ),
    avatar       varchar(255),
    avatar_color varchar(255),
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz
);

-- +goose Down

DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS role;