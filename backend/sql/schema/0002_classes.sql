-- +goose Up

CREATE TABLE classes
(
    id         uuid PRIMARY KEY      DEFAULT gen_random_uuid(),
    subject    varchar(255) NOT NULL,
    grade      int          NOT NULL,
    teacher_id uuid         REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz
);

ALTER TABLE classes
    ADD COLUMN color varchar(50) NOT NULL DEFAULT 'bg-blue-600';

CREATE TABLE class_enrollments
(
    id          uuid PRIMARY KEY     default gen_random_uuid(),
    class_id    uuid        NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    student_id  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id)
);


-- +goose Down
ALTER TABLE IF EXISTS classes
    DROP COLUMN IF EXISTS color;

DROP TABLE IF EXISTS class_enrollments;
DROP TABLE IF EXISTS classes;