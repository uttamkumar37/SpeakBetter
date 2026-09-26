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
