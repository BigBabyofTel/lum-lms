-- +goose Up

CREATE TABLE classes
(
    id         uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    subject    varchar(255) NOT NULL,
    grade      int          NOT NULL,
    teacher_id uuid         REFERENCES users (id) ON DELETE SET NULL,
    color      varchar(50)  NOT NULL DEFAULT 'bg-blue-600',
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- +goose Down

DROP TABLE IF EXISTS classes;