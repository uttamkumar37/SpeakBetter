-- Fresh database bootstrap matching the existing REST data contracts.
BEGIN;
CREATE TABLE practice_sessions (
    id                  UUID PRIMARY KEY,
    topic               VARCHAR(255)  NOT NULL,
    file_path           VARCHAR(512)  NOT NULL,
    original_mime_type  VARCHAR(100)  NOT NULL,
    file_size_bytes     BIGINT        NOT NULL,
    duration_seconds    INTEGER       NOT NULL,
    created_at          TIMESTAMP     NOT NULL,
    expires_at          TIMESTAMP     NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX idx_practice_sessions_topic ON practice_sessions (topic);
CREATE INDEX idx_practice_sessions_expires_at ON practice_sessions (expires_at);
CREATE INDEX idx_practice_sessions_created_at ON practice_sessions (created_at DESC);

ALTER TABLE practice_sessions
    ADD COLUMN went_well          VARCHAR(2000),
    ADD COLUMN needs_improvement  VARCHAR(2000),
    ADD COLUMN filler_word_count  INTEGER,
    ADD COLUMN notes              VARCHAR(2000);

CREATE TABLE interview_sessions (
    id                      UUID PRIMARY KEY,
    role                    VARCHAR(50)   NOT NULL,
    level                   VARCHAR(30)   NOT NULL,
    category                VARCHAR(50)   NOT NULL,
    question_id             VARCHAR(120)  NOT NULL,
    question_text_snapshot  TEXT          NOT NULL,
    file_path               VARCHAR(512)  NOT NULL,
    original_mime_type      VARCHAR(100)  NOT NULL,
    file_size_bytes         BIGINT        NOT NULL,
    duration_seconds        INTEGER       NOT NULL,
    status                  VARCHAR(30)   NOT NULL,
    transcript_status       VARCHAR(30)   NOT NULL,
    transcript              TEXT,
    analysis_status         VARCHAR(30)   NOT NULL,
    analysis_result         TEXT,
    went_well               VARCHAR(2000),
    needs_improvement       VARCHAR(2000),
    filler_word_count       INTEGER,
    notes                   VARCHAR(2000),
    created_at              TIMESTAMP     NOT NULL,
    updated_at              TIMESTAMP     NOT NULL,
    expires_at              TIMESTAMP     NOT NULL
);

CREATE INDEX idx_interview_sessions_status_created_at ON interview_sessions (status, created_at DESC);
CREATE INDEX idx_interview_sessions_expires_at ON interview_sessions (expires_at);
CREATE INDEX idx_interview_sessions_question_id ON interview_sessions (question_id);
CREATE INDEX idx_interview_sessions_role_level_category ON interview_sessions (role, level, category);

ALTER TABLE interview_sessions
    ALTER COLUMN file_path DROP NOT NULL,
    ALTER COLUMN original_mime_type DROP NOT NULL,
    ALTER COLUMN file_size_bytes DROP NOT NULL,
    ALTER COLUMN duration_seconds DROP NOT NULL;

COMMIT;
