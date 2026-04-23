-- +goose Up

CREATE TABLE class_enrollments
(
    id          uuid PRIMARY KEY     default gen_random_uuid(),
    class_id    uuid        NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    student_id  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id)
);

CREATE INDEX idx_enrollments_class_id ON class_enrollments (class_id);
CREATE INDEX idx_enrollments_student_id ON class_enrollments (student_id);

-- +goose Down
DROP TABLE IF EXISTS class_enrollments;