-- +goose Up

CREATE TYPE content_type AS ENUM ('assignment', 'material');
CREATE TYPE assignment_status AS ENUM ('assigned', 'submitted', 'graded', 'missing');



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
    id              uuid PRIMARY KEY           DEFAULT gen_random_uuid(),
    assignment_id   uuid REFERENCES assignments (id) ON DELETE CASCADE,
    student_id      uuid REFERENCES users (id) ON DELETE CASCADE,
    grade           int,
    status          assignment_status NOT NULL DEFAULT 'assigned',
    submission_text text,
    feedback        text,
    submitted_at    timestamptz,
    created_at      timestamptz       NOT NULL DEFAULT now(),
    updated_at      timestamptz,
    -- Prevent duplicate assignments for the same student
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments (class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments (due_date);
CREATE INDEX IF NOT EXISTS idx_user_assignments_assignment_id ON user_assignments (assignment_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_student_id ON user_assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_status ON user_assignments (status);

-- +goose Down
DROP INDEX IF EXISTS idx_user_assignments_status;
DROP INDEX IF EXISTS idx_user_assignments_student_id;
DROP INDEX IF EXISTS idx_user_assignments_assignment_id;
DROP INDEX IF EXISTS idx_assignments_due_date;
DROP INDEX IF EXISTS idx_assignments_class_id;

DROP TABLE IF EXISTS user_assignments;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS assignments;


DROP TYPE IF EXISTS assignment_status;
DROP TYPE IF EXISTS content_type;
