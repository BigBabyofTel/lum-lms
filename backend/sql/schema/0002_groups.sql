-- +goose Up
CREATE TABLE groups
(
    id              uuid PRIMARY KEY,
    name            text        NOT NULL,
    num_students    integer,
    subject         text,
    organization_id uuid,
    educator_id     uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE groups;